import { and, desc, eq, gte, lt } from 'drizzle-orm'

import { DEFAULT_SPLIT, emptyDays } from '@/lib/content'
import { buildCustomDays, buildDay } from '@/lib/day-blocks'
import { findLibraryByName } from '@/lib/library'
import { type Alert, bodyweightAlert, reviewAlerts, shownAlerts, stallAlerts } from '@/lib/logic/alerts'
import {
  addExerciseTo,
  type ExercisePatch,
  lineOf,
  removeExerciseFrom,
  swapExerciseIn,
  swapLine,
  updateExerciseIn,
} from '@/lib/logic/day-edit'
import { FACT_SESSIONS, lastTimeSet, liftStart, type PastEntry } from '@/lib/logic/facts'
import { nextDayId, rollingCursor } from '@/lib/logic/next-day'
import { assertPlanRanges } from '@/lib/logic/plan-ranges'
import { barOf, stepsOf } from '@/lib/logic/progression'
import { rampOffer } from '@/lib/logic/ramp'
import { assignWeekdays, type Finished } from '@/lib/logic/schedule'
import { setsLeft, swapEntries, syncEntries } from '@/lib/logic/session-sync'
import { type Pause, setPaused } from '@/lib/logic/session-time'
import {
  allTimeBests,
  attachBodyweight,
  dayKey,
  plannedSetsFor,
  plannedVolumeByMuscle,
  startOfWeek,
} from '@/lib/logic/stats'
import { finishSummary, type SessionSummary } from '@/lib/logic/summary'
import { must } from '@/lib/must'
import {
  type BodyweightLog,
  type DayType,
  type Exercise,
  type LoggedSet,
  MAX_DAYS,
  type MeasurementLog,
  type NudgeKind,
  type Plan,
  type PlanDay,
  type PlanSource,
  type Schedule,
  type Settings,
  type SplitId,
  type Workout,
  type WorkoutEntry,
} from '@/lib/types'
import { readContent, splitTemplate } from './content'
import { type AppDb, getDb, withTransaction } from './handle'
import { newId } from './ids'
import { bodyweights, measurements, plans, settings, workouts } from './schema'

/*
 * The phone's data layer: the web app's `server/repo.ts` on SQLite through Drizzle, with the same
 * function names and the same tests. One user, so no user id anywhere. Nested data (plan days,
 * session entries, settings) is stored as JSON and read and written whole, as the logic does.
 */

type WorkoutRow = typeof workouts.$inferSelect
const HISTORY_REVISION = 1

const DEFAULT_SETTINGS: Settings = { units: 'kg', trainingAge: 'over1', setupDone: false }
const SETTINGS_ROW = 1

/** Sessions stored before October 2026 hold null for a value never entered; the app treats that as absent. */
function cleanSet(s: LoggedSet): LoggedSet {
  const out: LoggedSet = { done: s.done }
  if (s.weight != null) out.weight = s.weight
  if (s.reps != null) out.reps = s.reps
  if (s.seconds != null) out.seconds = s.seconds
  if (s.left != null) out.left = s.left
  return out
}

function toWorkout(row: WorkoutRow): Workout {
  const w: Workout = {
    id: row.id,
    dayId: row.dayId,
    dayName: row.dayName,
    dayType: row.dayType,
    startedAt: row.startedAt,
    status: row.status,
    entries: row.entries.map((e) => ({ ...e, sets: e.sets.map(cleanSet) })),
  }
  if (row.finishedAt != null) w.finishedAt = row.finishedAt
  if (row.pausedAt != null) w.pausedAt = row.pausedAt
  if (row.pausedMs != null) w.pausedMs = row.pausedMs
  if (row.effort != null) w.effort = row.effort
  if (row.note != null) w.note = row.note
  return w
}

// ---- settings ----

async function storedSettings(db: AppDb): Promise<Partial<Settings>> {
  const rows = await db.select().from(settings).where(eq(settings.id, SETTINGS_ROW)).limit(1)
  return rows[0]?.value ?? {}
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb()
  return { ...DEFAULT_SETTINGS, ...(await storedSettings(db)) }
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const db = await getDb()
  const current = await storedSettings(db)
  const set: Partial<Settings> = { ...patch }
  // The join date is stamped once, the first time setup completes, and never moves.
  if (patch.setupDone && !current.joinedAt) set.joinedAt = new Date().toISOString()
  const value = { ...DEFAULT_SETTINGS, ...current, ...set }
  await db
    .insert(settings)
    .values({ id: SETTINGS_ROW, value })
    .onConflictDoUpdate({ target: settings.id, set: { value } })
  return value
}

// ---- plan ----
//
// One plan per split the user has been on, in `plans`, keyed by split id (`custom` for an imported
// plan). Settings name the current split. Switching away keeps the plan; switching back finds it
// as it was left.

/** The split the user is on: a template id, `custom`, or the default before anything was chosen. */
async function currentSource(): Promise<PlanSource> {
  const s = await getSettings()
  return s.split ?? DEFAULT_SPLIT
}

async function findPlan(split: PlanSource): Promise<Plan | null> {
  const db = await getDb()
  const rows = await db.select().from(plans).where(eq(plans.split, split)).limit(1)
  const row = rows[0]
  return row ? { days: row.days, updatedAt: row.updatedAt } : null
}

/** Writes the days into the slot for one split, creating the slot when it is new. */
async function savePlanFor(split: PlanSource, days: PlanDay[]): Promise<Plan> {
  assertPlanRanges(days)
  const db = await getDb()
  const updated = { days, updatedAt: new Date().toISOString() }
  await db
    .insert(plans)
    .values({ split, ...updated })
    .onConflictDoUpdate({ target: plans.split, set: updated })
  return updated
}

/** The plan for the split the user is on, built from its template the first time. */
export async function getPlan(): Promise<Plan> {
  let source = await currentSource()
  const found = await findPlan(source)
  if (found) return found
  if (source === 'custom') {
    // Nothing imported survives; fall back to the default template.
    source = DEFAULT_SPLIT
    await saveSettings({ split: source })
  }
  return savePlanFor(source, splitTemplate(source))
}

/** Saves the plan for the split the user is on. */
async function savePlan(next: Plan): Promise<Plan> {
  return savePlanFor(await currentSource(), next.days)
}

/** Back to the template of the split the user is on, edits and swaps gone. Logged workouts stay. */
export async function resetPlan(): Promise<Plan> {
  const source = await currentSource()
  if (source === 'custom') throw new Error('A custom plan has no template to go back to')
  return savePlanFor(source, splitTemplate(source))
}

/**
 * Moves to another split: remembers the choice and shows that split's plan, as the user left it,
 * or fresh from the template the first time. The plan being left stays for when they come back.
 * With `empty`, the split starts as its days with no lifts, in place of whatever plan it had.
 */
export async function applySplit(split: SplitId, { empty = false } = {}): Promise<Plan> {
  return withTransaction(async () => {
    if (split === 'custom') {
      // The plan of your own has no template: it can only be returned to, never started from here.
      const own = await findPlan('custom')
      if (!own) throw new Error('No plan of your own yet')
      await saveSettings({ split })
      return own
    }
    // Read the template first: an unknown id throws before anything is written.
    const template = splitTemplate(split)
    await saveSettings({ split })
    if (empty) return savePlanFor(split, emptyDays(template))
    const existing = await findPlan(split)
    return existing ?? savePlanFor(split, template)
  })
}

/** Every split the user has a plan for, with its day count. */
export async function planSlots(): Promise<{ split: PlanSource; days: number }[]> {
  const db = await getDb()
  const rows = await db.select({ split: plans.split, days: plans.days }).from(plans)
  return rows.map((r) => ({ split: r.split, days: r.days.length }))
}

/** Rolling or by weekday. Going by weekday gives every day without one a sensible weekday. */
export async function setSchedule(schedule: Schedule): Promise<{ settings: Settings; plan: Plan }> {
  return withTransaction(async () => {
    const saved = await saveSettings({ schedule })
    let plan = await getPlan()
    if (schedule === 'weekday') {
      const days = assignWeekdays(plan.days)
      if (days !== plan.days) plan = await savePlan({ ...plan, days })
    }
    return { settings: saved, plan }
  })
}

export async function setDayWeekday(dayId: string, weekday: number): Promise<Plan> {
  const plan = await getPlan()
  const day = plan.days.find((d) => d.id === dayId)
  if (!day) throw new Error('Day not found')
  day.weekday = weekday
  return savePlan(plan)
}

/**
 * An imported plan. `split` is the template it was exported as, and the plan takes that split's
 * slot; without one the plan is custom. Logged workouts are untouched.
 */
export async function replacePlan(days: PlanDay[], split?: SplitId): Promise<Plan> {
  return withTransaction(async () => {
    if (days.length === 0) throw new Error('The plan needs at least one day')
    assertPlanRanges(days)
    if (split) splitTemplate(split) // an unknown template id throws here
    const source: PlanSource = split ?? 'custom'
    await saveSettings({ split: source })
    return savePlanFor(source, days)
  })
}

export type { ExercisePatch }

/** Saves a plan with one day replaced by `edit` of it (see lib/logic/day-edit.ts). */
async function editDay(dayId: string, edit: (day: PlanDay) => PlanDay): Promise<Plan> {
  const plan = await getPlan()
  const i = plan.days.findIndex((d) => d.id === dayId)
  if (i < 0) throw new Error('Day not found')
  plan.days[i] = edit(must(plan.days[i], 'the day'))
  return savePlan(plan)
}

export function updateExercise(dayId: string, exerciseId: string, patch: ExercisePatch): Promise<Plan> {
  return editDay(dayId, (day) => updateExerciseIn(day, exerciseId, patch))
}

/** Replace an exercise with one of its alternates. The old one becomes an alternate so you can swap back. */
export function swapExercise(dayId: string, exerciseId: string, newName: string): Promise<Plan> {
  const { library } = readContent()
  return editDay(dayId, (day) => swapExerciseIn(day, exerciseId, newName, library))
}

/** Adds an exercise to the end of a day. A day holds `MAX_EXERCISES_PER_DAY` at most. */
export function addExercise(dayId: string, input: Omit<Exercise, 'id'>): Promise<Plan> {
  return editDay(dayId, (day) => addExerciseTo(day, input))
}

/** Takes an exercise off a day. Logged sessions keep their copy. */
export function removeExercise(dayId: string, exerciseId: string): Promise<Plan> {
  return editDay(dayId, (day) => removeExerciseFrom(day, exerciseId))
}

/** Puts a day's exercises in the given order. `order` names every exercise on the day, once. */
export async function reorderExercises(dayId: string, order: string[]): Promise<Plan> {
  const plan = await getPlan()
  const day = plan.days.find((d) => d.id === dayId)
  if (!day) throw new Error('Day not found')
  const byId = new Map(day.exercises.map((e) => [e.id, e]))
  if (order.length !== byId.size || new Set(order).size !== order.length || !order.every((id) => byId.has(id))) {
    throw new Error('The order must name every exercise on the day once')
  }
  day.exercises = order.map((id) => must(byId.get(id), 'an exercise in the order'))
  return savePlan(plan)
}

// ---- days ----

/** A new day of one type at the end of the plan, with the block's exercises. Up to 14 days. */
export async function addDay(type: DayType): Promise<Plan> {
  const [plan, s] = await Promise.all([getPlan(), getSettings()])
  if (plan.days.length >= MAX_DAYS) throw new Error(`A plan holds up to ${MAX_DAYS} days`)
  plan.days.push(buildDay(type, plan.days))
  if (s.schedule === 'weekday') plan.days = assignWeekdays(plan.days)
  return savePlan(plan)
}

/** Renames a day or changes its kind. The exercises stay. */
export async function updateDay(dayId: string, patch: { name?: string; type?: DayType }): Promise<Plan> {
  const plan = await getPlan()
  const day = plan.days.find((d) => d.id === dayId)
  if (!day) throw new Error('Day not found')
  if (patch.name !== undefined) day.name = patch.name
  if (patch.type !== undefined) day.type = patch.type
  return savePlan(plan)
}

/** Takes a day out of the plan. Logged sessions keep their copy. A plan keeps at least one day. */
export async function removeDay(dayId: string): Promise<Plan> {
  const plan = await getPlan()
  if (!plan.days.some((d) => d.id === dayId)) throw new Error('Day not found')
  if (plan.days.length <= 1) throw new Error('A plan needs at least one day')
  plan.days = plan.days.filter((d) => d.id !== dayId)
  return savePlan(plan)
}

/** Moves a day one place up or down the rolling order. */
export async function moveDay(dayId: string, direction: 'up' | 'down'): Promise<Plan> {
  const plan = await getPlan()
  const i = plan.days.findIndex((d) => d.id === dayId)
  if (i < 0) throw new Error('Day not found')
  const j = direction === 'up' ? i - 1 : i + 1
  if (j < 0 || j >= plan.days.length) return plan
  const days = [...plan.days]
  const a = must(days[i], 'the day')
  const b = must(days[j], 'its neighbour')
  days[i] = b
  days[j] = a
  plan.days = days
  return savePlan(plan)
}

/** A plan of the user's own, one block per chosen type, in the custom slot. */
export async function createCustomPlan(types: DayType[], { empty = false } = {}): Promise<Plan> {
  const days = buildCustomDays(types)
  return replacePlan(empty ? emptyDays(days) : days)
}

// ---- workouts ----

async function activeRow(db: AppDb): Promise<WorkoutRow | null> {
  const rows = await db
    .select()
    .from(workouts)
    .where(eq(workouts.status, 'in_progress'))
    .orderBy(desc(workouts.startedAt))
    .limit(1)
  return rows[0] ?? null
}

async function rowById(db: AppDb, id: string): Promise<WorkoutRow | null> {
  const rows = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1)
  return rows[0] ?? null
}

export async function getActiveWorkout(): Promise<Workout | null> {
  const db = await getDb()
  const row = await activeRow(db)
  if (!row) return null
  if (row.historyRevision >= HISTORY_REVISION) return toWorkout(row)
  const s = await getSettings()
  const { library } = readContent()
  const entries = await Promise.all(
    row.entries.map(async (entry) => {
      const ex = lineOf(entry, entry.sets.length)
      const start = await startFor(ex, entry.sets.length, s, library)
      const { hint: _hint, prefill: _prefill, ...kept } = entry
      return {
        ...kept,
        ...(start.hint ? { hint: start.hint } : {}),
        ...(start.prefill ? { prefill: start.prefill } : {}),
      }
    }),
  )
  await db.update(workouts).set({ entries, historyRevision: HISTORY_REVISION }).where(eq(workouts.id, row.id))
  return toWorkout({ ...row, entries, historyRevision: HISTORY_REVISION })
}

/** The plan day of the session in progress, if any: what Plan needs to ask whether an edit should follow today. */
export async function activeDayId(): Promise<string | null> {
  const row = await activeRow(await getDb())
  return row?.dayId ?? null
}

/** The last finished session as the rolling order and Today's footer read it: its day and when it ended. */
export async function lastFinishedMark(): Promise<Pick<Workout, 'dayId' | 'dayName' | 'finishedAt'> | null> {
  const db = await getDb()
  const rows = await db
    .select({ dayId: workouts.dayId, dayName: workouts.dayName, finishedAt: workouts.finishedAt })
    .from(workouts)
    .where(eq(workouts.status, 'done'))
    .orderBy(desc(workouts.finishedAt))
    .limit(1)
  const row = rows[0]
  if (!row) return null
  return { dayId: row.dayId, dayName: row.dayName, ...(row.finishedAt != null ? { finishedAt: row.finishedAt } : {}) }
}

/** Every finished session, newest first: the ids, how each felt and its lifts. What a lift's history is read from. */
async function finishedSessions(db: AppDb): Promise<Pick<WorkoutRow, 'effort' | 'entries' | 'finishedAt'>[]> {
  return db
    .select({ effort: workouts.effort, entries: workouts.entries, finishedAt: workouts.finishedAt })
    .from(workouts)
    .where(eq(workouts.status, 'done'))
    .orderBy(desc(workouts.finishedAt), desc(workouts.id))
}

type LiftMatch = { exerciseId: string; loadType?: Exercise['loadType'] }

const matchesLift = (e: WorkoutEntry, lift: LiftMatch): boolean =>
  e.exerciseId === lift.exerciseId &&
  e.sets.some((s) => s.done) &&
  (lift.loadType === undefined || e.loadType === lift.loadType)

/** `recentEntries` over sessions already read, so a whole session's lifts share one read. */
function recentEntriesFrom(
  sessions: Pick<WorkoutRow, 'effort' | 'entries' | 'finishedAt'>[],
  exerciseId: string,
  loadType: Exercise['loadType'] | undefined,
  limit: number,
  before?: Date,
): PastEntry[] {
  const found: PastEntry[] = []
  for (const session of sessions) {
    if (before && (!session.finishedAt || session.finishedAt >= before.toISOString())) continue
    const entry = session.entries.find((candidate) => matchesLift(candidate, { exerciseId, loadType }))
    if (!entry) continue
    found.push({
      entry: { ...entry, sets: entry.sets.map(cleanSet) },
      ...(session.effort != null ? { effort: session.effort } : {}),
    })
    if (found.length >= limit) break
  }
  return found
}

/**
 * The last few finished sessions of an exercise, newest first, with how each felt. A lift's line of progress runs
 * across every plan day and rep range, so a newer completed session is not skipped when another day uses a different
 * range. The load type still has to match.
 */
export async function recentEntries(
  exerciseId: string,
  { limit = FACT_SESSIONS, before, loadType }: { limit?: number; before?: Date; loadType?: Exercise['loadType'] } = {},
): Promise<PastEntry[]> {
  return recentEntriesFrom(await finishedSessions(await getDb()), exerciseId, loadType, limit, before)
}

async function startFor(
  ex: Exercise,
  targetSets: number,
  s: Settings,
  library: ReturnType<typeof readContent>['library'],
  before?: Date,
) {
  const history = await recentEntries(ex.id, { before, loadType: ex.loadType })
  const known = findLibraryByName(library, ex.name)
  return liftStart(ex, targetSets, history, s.units, {
    equipment: known?.equipment,
    plateLoaded: known?.plateLoaded === true,
    steps: stepsOf(s),
    bar: barOf(s),
  })
}

/**
 * A session's entries for these lifts of a plan day: blank sets to the plan's number, the targets and hint the
 * coach works out from the lift's history, and the ramp's offer. What a new session starts with, and what a lift
 * added to the day mid-session comes in as.
 */
async function sessionEntries(plan: Plan, s: Settings, exercises: Exercise[], at?: Date): Promise<WorkoutEntry[]> {
  if (exercises.length === 0) return []
  const db = await getDb()
  const [past, weighIns, sessions] = await Promise.all([
    listWorkouts({ sinceDays: 90 }),
    listBodyweights(60),
    finishedSessions(db),
  ])
  // The set ramp reads the last weeks of every lift: trained often, completed, felt fine, still moving.
  const now = new Date()
  const scored = attachBodyweight(past, weighIns)
  const weekly = plannedVolumeByMuscle(plan, s.trainingAge)
  // A lift gains one set a week: a lift on two plan days that took its set on one of them is done for the week.
  const week = dayKey(startOfWeek(now))
  const rampedThisWeek = new Set(
    plan.days.flatMap((d) => d.exercises.filter((e) => e.ramp?.at === week).map((e) => e.id)),
  )
  const { library } = readContent()
  const entries: WorkoutEntry[] = []
  for (const ex of exercises) {
    const targetSets = plannedSetsFor(ex.sets, s.trainingAge)
    const history = recentEntriesFrom(sessions, ex.id, ex.loadType, FACT_SESSIONS, at)
    // The library knows what the lift is done on: with the gym's smallest steps that sizes the next step a fact
    // names, and the gym's empty bar is where a barbell lift's first session starts.
    const known = findLibraryByName(library, ex.name)
    const plateLoaded = known?.plateLoaded === true
    const next = liftStart(ex, targetSets, history, s.units, {
      equipment: known?.equipment,
      plateLoaded,
      steps: stepsOf(s),
      bar: barOf(s),
    })
    entries.push({
      exerciseId: ex.id,
      name: ex.name,
      muscle: ex.muscle,
      loadType: ex.loadType,
      ...(known ? { equipment: known.equipment } : {}),
      ...(plateLoaded ? { plateLoaded: true as const } : {}),
      repMin: ex.repMin,
      repMax: ex.repMax,
      ...(next.hint ? { hint: next.hint } : {}),
      ...(next.prefill ? { prefill: next.prefill } : {}),
      ...(!rampedThisWeek.has(ex.id) && rampOffer(ex, weekly, scored, now, s.trainingAge) ? { rampOffer: true } : {}),
      sets: next.sets,
    })
  }
  return entries
}

export async function startWorkout(dayId: string): Promise<Workout> {
  return withTransaction(async () => {
    const [plan, s] = await Promise.all([getPlan(), getSettings()])
    const day = plan.days.find((d) => d.id === dayId)
    if (!day) throw new Error('Day not found')
    if (day.exercises.length === 0) throw new Error(`${day.name} has no lifts yet. Add some on Plan first.`)
    const db = await getDb()
    await db.delete(workouts).where(eq(workouts.status, 'in_progress'))
    const entries = await sessionEntries(plan, s, day.exercises)
    const row: WorkoutRow = {
      id: newId(),
      dayId: day.id,
      dayName: day.name,
      dayType: day.type,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      pausedAt: null,
      pausedMs: null,
      status: 'in_progress',
      effort: null,
      note: null,
      entries,
      historyRevision: HISTORY_REVISION,
    }
    await db.insert(workouts).values(row)
    return toWorkout(row)
  })
}

/**
 * The session in progress brought up to its plan day, after the plan changed and the lifter asked for today too.
 * Logged sets are never touched (see `syncEntries`). `kept` names the started lifts the plan no longer has, which
 * stay for today.
 */
export async function syncSession(): Promise<{ workout: Workout; kept: string[] }> {
  const db = await getDb()
  const row = await activeRow(db)
  if (!row) throw new Error('No session is in progress')
  const [plan, s] = await Promise.all([getPlan(), getSettings()])
  const day = plan.days.find((d) => d.id === row.dayId)
  if (!day) throw new Error("Today's day is no longer in the plan")
  const fresh = await sessionEntries(plan, s, day.exercises)
  const { entries, kept } = syncEntries(row.entries, day.exercises, fresh, s.trainingAge)
  await db.update(workouts).set({ entries, dayName: day.name, dayType: day.type }).where(eq(workouts.id, row.id))
  return { workout: toWorkout({ ...row, entries, dayName: day.name, dayType: day.type }), kept }
}

/**
 * Takes the set the ramp offered: one more set on the plan's exercise (remembering the plan's own
 * number and this week), and one more blank set on the session, aiming where the set before it aims.
 * A lift the plan day no longer holds (removed mid-session, with sets ticked) takes the set for today only.
 */
export async function acceptRamp(workoutId: string, exerciseId: string): Promise<WorkoutEntry> {
  return withTransaction(async () => {
    const db = await getDb()
    const row = await rowById(db, workoutId)
    if (row?.status !== 'in_progress') throw new Error('Workout not found')
    const entry = row.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry?.rampOffer) throw new Error('No set to add')
    const plan = await getPlan()
    const ex = plan.days.find((d) => d.id === row.dayId)?.exercises.find((e) => e.id === exerciseId)
    if (ex) {
      ex.ramp = { base: ex.ramp?.base ?? ex.sets, at: dayKey(startOfWeek(new Date())) }
      ex.sets += 1
      await savePlan(plan)
    }
    const last = entry.sets.length - 1
    entry.sets = [...entry.sets, { done: false }]
    const lastStart = entry.prefill?.[last]
    if (entry.prefill && lastStart) {
      const added = lastTimeSet(await recentEntries(exerciseId, { loadType: entry.loadType }), last + 1) ?? lastStart
      entry.prefill = [...entry.prefill, { ...added }]
    }
    delete entry.rampOffer
    await db.update(workouts).set({ entries: row.entries }).where(eq(workouts.id, row.id))
    return must(
      toWorkout(row).entries.find((e) => e.exerciseId === exerciseId),
      'the entry that took the extra set',
    )
  })
}

/**
 * One lift of the session in progress swapped for another, by name (the machine is taken). The new lift comes in
 * as at the start of a session, with its own targets and, when the library knows it, its own sets and range; sets
 * ticked on the old lift stay (see `swapEntries`). With `alsoPlan`, the plan day swaps too, so the next session
 * starts with the new lift. Returns the session as it is now.
 */
export async function swapSessionExercise(
  workoutId: string,
  exerciseId: string,
  newName: string,
  alsoPlan: boolean,
): Promise<Workout> {
  return withTransaction(async () => {
    const db = await getDb()
    const row = await rowById(db, workoutId)
    if (row?.status !== 'in_progress') throw new Error('Workout not found')
    const entry = row.entries.find((e) => e.exerciseId === exerciseId)
    if (!entry) throw new Error('Exercise not found')
    const [plan, s] = await Promise.all([getPlan(), getSettings()])
    const { library } = readContent()
    const day = plan.days.find((d) => d.id === row.dayId)
    const planned = day?.exercises.find((e) => e.id === exerciseId)
    // The line the new lift is built from: the plan's, or the session's own when the plan no longer has the lift.
    const line = planned ?? lineOf(entry, entry.sets.length)
    // The new id must be free on the session and on the day, so a later "Plan and today" finds the same lift. The old
    // lift's own id is free only when it goes; with sets ticked it stays, and the new lift must not share its id.
    const ticked = entry.sets.some((set) => set.done)
    const taken = [...row.entries.map((e) => e.exerciseId), ...(day?.exercises.map((e) => e.id) ?? [])].filter(
      (id) => ticked || id !== exerciseId,
    )
    const swapped = swapLine(line, newName, library, taken)
    // With sets ticked, only what was left goes to the new lift.
    if (ticked) swapped.sets = setsLeft(entry)
    const built = must((await sessionEntries(plan, s, [swapped]))[0], 'the swapped-in lift')
    const onPlan = alsoPlan && planned !== undefined && day !== undefined
    // The ramp raises the plan's number of sets: a lift here for today only has no plan line to raise.
    const { rampOffer: _offer, ...forToday } = built
    const entries = swapEntries(row.entries, exerciseId, onPlan ? built : forToday)
    await db.update(workouts).set({ entries }).where(eq(workouts.id, row.id))
    if (onPlan) {
      await editDay(day.id, (d) => {
        const next = swapExerciseIn(d, exerciseId, newName, library)
        // The plan's line takes the session's id, so the ramp and the next session find one lift, not two.
        const at = d.exercises.findIndex((e) => e.id === exerciseId)
        must(next.exercises[at], 'the swapped plan line').id = swapped.id
        return next
      })
    }
    return toWorkout({ ...row, entries })
  })
}

/** Pauses or resumes the session in progress (see `lib/logic/session-time.ts`). Returns the pause fields. */
export async function pauseWorkout(workoutId: string, paused: boolean): Promise<Pause> {
  const db = await getDb()
  const row = await rowById(db, workoutId)
  if (row?.status !== 'in_progress') throw new Error('Workout not found')
  const next = setPaused(toWorkout(row), paused, new Date())
  await db
    .update(workouts)
    .set({ pausedAt: next.pausedAt ?? null, pausedMs: next.pausedMs ?? 0 })
    .where(eq(workouts.id, row.id))
  return next
}

/** The deload: every ramped lift goes back to the plan's own number of sets. Returns how many did. */
export async function resetRamp(): Promise<number> {
  const plan = await getPlan()
  let n = 0
  for (const day of plan.days) {
    for (const ex of day.exercises) {
      if (!ex.ramp) continue
      ex.sets = ex.ramp.base
      delete ex.ramp
      n++
    }
  }
  if (n > 0) await savePlan(plan)
  return n
}

export async function saveEntrySets(workoutId: string, exerciseId: string, sets: LoggedSet[]): Promise<void> {
  const db = await getDb()
  const row = await rowById(db, workoutId)
  const at = row?.entries.findIndex((e) => e.exerciseId === exerciseId) ?? -1
  if (!row || at < 0) throw new Error('Workout or exercise not found')
  const entries = row.entries.map((e, i) => (i === at ? { ...e, sets } : e))
  await db.update(workouts).set({ entries }).where(eq(workouts.id, row.id))
}

export interface FinishExtra {
  effort?: number
  note?: string
}

/**
 * Marks the workout done and says what it did: each lift's best set, new bests, and the week's count.
 * A workout with nothing checked is deleted instead.
 */
export async function finishWorkout(
  workoutId: string,
  extra: FinishExtra = {},
): Promise<{ finished: boolean; summary?: SessionSummary }> {
  return withTransaction(async () => {
    const db = await getDb()
    const row = await rowById(db, workoutId)
    if (!row) throw new Error('Workout not found')
    const anyDone = row.entries.some((e) => e.sets.some((set) => set.done))
    if (!anyDone) {
      await db.delete(workouts).where(eq(workouts.id, row.id))
      return { finished: false }
    }
    const now = new Date()
    const patch: Partial<WorkoutRow> = { status: 'done', finishedAt: now.toISOString() }
    if (extra.effort !== undefined) patch.effort = extra.effort
    if (extra.note) patch.note = extra.note
    // A session finished while paused: the pause ends with it, so its minutes read right.
    if (row.pausedAt) {
      patch.pausedMs = setPaused(toWorkout(row), false, now).pausedMs ?? 0
      patch.pausedAt = null
    }
    // Earlier sessions are read before this one joins them: the year for the week's count, and every session before
    // it for the bests, so "new best" means better than ever, not better than this year.
    const [past, older, s, plan, weighIns] = await Promise.all([
      listWorkouts({ sinceDays: 365 }),
      olderSessions(365),
      getSettings(),
      getPlan(),
      listBodyweights(ALL_LOGS),
    ])
    await db.update(workouts).set(patch).where(eq(workouts.id, row.id))
    const done = toWorkout({ ...row, ...patch })
    return { finished: true, summary: finishSummary(done, [...past, ...older], weighIns, plan, s, now) }
  })
}

export async function discardWorkout(workoutId: string): Promise<void> {
  const db = await getDb()
  await db.delete(workouts).where(and(eq(workouts.id, workoutId), eq(workouts.status, 'in_progress')))
}

/** Today moves past `dayId` on the rolling schedule without a session: Next up becomes the day after it. */
export async function skipDay(dayId: string): Promise<void> {
  const plan = await getPlan()
  if (!plan.days.some((d) => d.id === dayId)) throw new Error('Day not found')
  await saveSettings({ rolledPast: { dayId, at: new Date().toISOString() } })
}

/**
 * A session for a plan day as one would start, dated `at`, not saved: its lifts with their targets and blank sets.
 * The editor fills it in for a day trained without the app, and `logPastWorkout` stores the result.
 */
export async function draftWorkout(dayId: string, at: string): Promise<Workout> {
  if (new Date(at) > new Date()) throw new Error('That day has not happened yet.')
  const [plan, s] = await Promise.all([getPlan(), getSettings()])
  const day = plan.days.find((d) => d.id === dayId)
  if (!day) throw new Error('Day not found')
  if (day.exercises.length === 0) throw new Error(`${day.name} has no lifts yet. Add some on Plan first.`)
  const entries = await sessionEntries(plan, s, day.exercises, new Date(at))
  return {
    id: `draft-${day.id}`,
    dayId: day.id,
    dayName: day.name,
    dayType: day.type,
    startedAt: at,
    finishedAt: at,
    status: 'done',
    // The ramp's offer is for a session in progress; a session written after the fact takes no extra set.
    entries: entries.map(({ rampOffer: _offer, ...e }) => e),
  }
}

/**
 * Stores a session logged after the fact: the draft's lifts with the sets as ticked, started and finished at `at`
 * (so it has no minutes). Refused with nothing ticked, like a live finish.
 */
export async function logPastWorkout(
  dayId: string,
  at: string,
  changes: { exerciseId: string; sets: LoggedSet[] }[],
): Promise<Workout> {
  const draft = await draftWorkout(dayId, at)
  const byId = new Map(changes.map((c) => [c.exerciseId, c.sets]))
  const entries = draft.entries.map((e) => {
    const sets = byId.get(e.exerciseId)
    return sets ? { ...e, sets } : e
  })
  if (!entries.some((e) => e.sets.some((set) => set.done))) throw new Error('Nothing is ticked.')
  const db = await getDb()
  const row: WorkoutRow = {
    id: newId(),
    dayId: draft.dayId,
    dayName: draft.dayName,
    dayType: draft.dayType,
    startedAt: at,
    finishedAt: at,
    pausedAt: null,
    pausedMs: null,
    status: 'done',
    effort: null,
    note: null,
    entries,
    historyRevision: HISTORY_REVISION,
  }
  await db.insert(workouts).values(row)
  return toWorkout(row)
}

/** Replaces the sets of the named exercises in a finished session. Unknown exercises are ignored. */
export async function updateWorkoutSets(
  workoutId: string,
  changes: { exerciseId: string; sets: LoggedSet[] }[],
): Promise<Workout> {
  const db = await getDb()
  const row = await rowById(db, workoutId)
  if (!row) throw new Error('Workout not found')
  const byId = new Map(changes.map((c) => [c.exerciseId, c.sets]))
  const entries = row.entries.map((e) => {
    const sets = byId.get(e.exerciseId)
    return sets ? { ...e, sets } : e
  })
  await db.update(workouts).set({ entries }).where(eq(workouts.id, row.id))
  return toWorkout({ ...row, entries })
}

/** One finished session by id, for the editor; null when it is gone. */
export async function getWorkout(workoutId: string): Promise<Workout | null> {
  const db = await getDb()
  const row = await rowById(db, workoutId)
  return row ? toWorkout(row) : null
}

export async function deleteWorkout(workoutId: string): Promise<void> {
  const db = await getDb()
  await db.delete(workouts).where(eq(workouts.id, workoutId))
}

export async function listWorkouts(opts: { sinceDays?: number; limit?: number } = {}): Promise<Workout[]> {
  const db = await getDb()
  const conditions = [eq(workouts.status, 'done')]
  if (opts.sinceDays) {
    const since = new Date()
    since.setDate(since.getDate() - opts.sinceDays)
    conditions.push(gte(workouts.finishedAt, since.toISOString()))
  }
  const rows = await db
    .select()
    .from(workouts)
    .where(and(...conditions))
    .orderBy(desc(workouts.finishedAt))
    .limit(opts.limit ?? 500)
  return rows.map(toWorkout)
}

/** Enough weigh-ins for every session ever logged to carry the one in force at the time. */
const ALL_LOGS = 10_000

/**
 * The sessions finished more than `beforeDays` ago, slim: the lifts and their sets, without the hints and targets.
 * What the bests are read from beyond the year a page loads, so a best from three years ago still counts.
 */
async function olderSessions(beforeDays: number): Promise<Workout[]> {
  const db = await getDb()
  const before = new Date()
  before.setDate(before.getDate() - beforeDays)
  const rows = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.status, 'done'), lt(workouts.finishedAt, before.toISOString())))
    .orderBy(desc(workouts.finishedAt))
  return rows.map((row) => {
    const w = toWorkout(row)
    delete w.note
    w.entries = w.entries.map(({ hint: _hint, prefill: _prefill, ...e }) => e)
    return w
  })
}

/** Each lift's best score from before the year a page loads, with the weigh-in in force at the time. */
async function bestsBeforeYear(): Promise<Record<string, number>> {
  const [older, weighIns] = await Promise.all([olderSessions(365), listBodyweights(ALL_LOGS)])
  return allTimeBests(attachBodyweight(older, weighIns))
}

// ---- body ----

function localDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export type Measures = { arm?: number; chest?: number; waist?: number }

function definedOnly<T extends object>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>
}

/** Settings carry the most recent weigh-in, so a backfilled older entry never overwrites it. */
async function syncSettingsWeight(): Promise<void> {
  const db = await getDb()
  const rows = await db
    .select({ weight: bodyweights.weight })
    .from(bodyweights)
    .orderBy(desc(bodyweights.date), desc(bodyweights.day))
    .limit(1)
  const latest = rows[0]
  if (latest) await saveSettings({ bodyweight: latest.weight })
}

/**
 * One weigh-in per calendar day. Logging again the same day replaces the earlier value.
 * `date` is when it happened: now by default, or an earlier instant for a day that was missed.
 */
export async function logBodyweight(
  weight: number,
  day?: string,
  date = new Date(),
): Promise<BodyweightLog & { replaced: boolean }> {
  return withTransaction(async () => {
    const db = await getDb()
    const key = day ?? localDay(date)
    const existing = (
      await db.select({ id: bodyweights.id }).from(bodyweights).where(eq(bodyweights.day, key)).limit(1)
    )[0]
    if (existing) {
      await db.update(bodyweights).set({ weight, date: date.toISOString() }).where(eq(bodyweights.id, existing.id))
      await syncSettingsWeight()
      return { id: existing.id, date: date.toISOString(), day: key, weight, replaced: true }
    }
    const row = { id: newId(), date: date.toISOString(), day: key, weight }
    await db.insert(bodyweights).values(row)
    await syncSettingsWeight()
    return { ...row, replaced: false }
  })
}

export async function updateBodyweight(id: string, weight: number): Promise<void> {
  const db = await getDb()
  const found = (await db.select({ id: bodyweights.id }).from(bodyweights).where(eq(bodyweights.id, id)).limit(1))[0]
  if (!found) throw new Error('Log not found')
  await db.update(bodyweights).set({ weight }).where(eq(bodyweights.id, id))
  await syncSettingsWeight()
}

export async function deleteBodyweight(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(bodyweights).where(eq(bodyweights.id, id))
}

export async function listBodyweights(limit = 120): Promise<BodyweightLog[]> {
  const db = await getDb()
  // Two logs in the same instant (a backfill, a test) still come out in calendar order.
  const rows = await db.select().from(bodyweights).orderBy(desc(bodyweights.date), desc(bodyweights.day)).limit(limit)
  return rows.reverse()
}

function toMeasurement(row: typeof measurements.$inferSelect): MeasurementLog {
  const m: MeasurementLog = { id: row.id, date: row.date, day: row.day }
  if (row.arm != null) m.arm = row.arm
  if (row.chest != null) m.chest = row.chest
  if (row.waist != null) m.waist = row.waist
  return m
}

/** One tape entry per calendar day. Logging again the same day merges into it. */
export async function logMeasurement(
  m: Measures,
  day?: string,
  date = new Date(),
): Promise<MeasurementLog & { replaced: boolean }> {
  const db = await getDb()
  const key = day ?? localDay(date)
  const values = definedOnly(m)
  const existing = (await db.select().from(measurements).where(eq(measurements.day, key)).limit(1))[0]
  if (existing) {
    await db
      .update(measurements)
      .set({ ...values, date: date.toISOString() })
      .where(eq(measurements.id, existing.id))
    return { ...toMeasurement(existing), ...values, date: date.toISOString(), replaced: true }
  }
  const row = { id: newId(), date: date.toISOString(), day: key, arm: null, chest: null, waist: null, ...values }
  await db.insert(measurements).values(row)
  return { ...toMeasurement(row), replaced: false }
}

export async function updateMeasurement(id: string, m: Measures): Promise<void> {
  const db = await getDb()
  const found = (await db.select({ id: measurements.id }).from(measurements).where(eq(measurements.id, id)).limit(1))[0]
  if (!found) throw new Error('Log not found')
  await db.update(measurements).set(definedOnly(m)).where(eq(measurements.id, id))
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(measurements).where(eq(measurements.id, id))
}

export async function listMeasurements(limit = 24): Promise<MeasurementLog[]> {
  const db = await getDb()
  const rows = await db
    .select()
    .from(measurements)
    .orderBy(desc(measurements.date), desc(measurements.day))
    .limit(limit)
  return rows.map(toMeasurement).reverse()
}

/** When the tape was last used, for the reminder and Today; nothing else of the entry. */
async function lastMeasurementAt(): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select({ date: measurements.date }).from(measurements).orderBy(desc(measurements.date)).limit(1)
  return rows[0]?.date ?? null
}

/** Wipes the plans, settings and every log. Device preferences (the look) stay; setup runs again. */
export async function startFresh(): Promise<void> {
  return withTransaction(async () => {
    const db = await getDb()
    await db.delete(settings)
    await db.delete(plans)
    await db.delete(workouts)
    await db.delete(bodyweights)
    await db.delete(measurements)
  })
}

// ---- reminders and alerts ----

/**
 * A reminder on Today was waved away: quiet for a while, longer each time it is waved away again
 * before the thing is logged (`snoozeDays` in `lib/logic/nudges.ts`). A log in between starts the count over.
 */
export async function dismissNudge(kind: NudgeKind): Promise<void> {
  const [s, weighIns, lastMeasure] = await Promise.all([getSettings(), listBodyweights(1), lastMeasurementAt()])
  const lastLog = kind === 'weight' ? (weighIns.at(-1)?.date ?? null) : lastMeasure
  const prev = s.nudges?.[kind]
  const times = prev && (!lastLog || prev.at > lastLog) ? prev.times + 1 : 1
  await saveSettings({ nudges: { ...s.nudges, [kind]: { at: new Date().toISOString(), times } } })
}

/**
 * A Today alert was dismissed: it stays hidden until the thing it is about changes, since the key holds the lift,
 * the week or the period. Entries older than 90 days are pruned, so the record cannot grow without bound.
 */
export async function dismissAlert(key: string): Promise<void> {
  const s = await getSettings()
  const now = new Date()
  const cutoff = now.getTime() - 90 * 86_400_000
  const kept = Object.fromEntries(
    Object.entries(s.alertsDismissed ?? {}).filter(([, at]) => new Date(at).getTime() >= cutoff),
  )
  kept[key] = now.toISOString()
  await saveSettings({ alertsDismissed: kept })
}

// ---- screen data ----

export interface TodayData {
  settings: Settings
  plan: Plan
  active: Workout | null
  nextDayId: string
  lastFinished: { dayName: string; finishedAt: string } | null
  /** Sessions finished in the last year: this week's for the weekday schedule, all of them for the calendar. */
  recent: Finished[]
  lastBodyweightAt: string | null
  lastMeasurementAt: string | null
  /** Lifts that stopped moving, a week running out, a scale that is not moving. */
  alerts: Alert[]
}

export async function getTodayData(): Promise<TodayData> {
  const now = new Date()
  const [s, plan, active, last, recent, weighIns, lastMeasurementDate, bestBefore] = await Promise.all([
    getSettings(),
    getPlan(),
    getActiveWorkout(),
    lastFinishedMark(),
    listWorkouts({ sinceDays: 365 }),
    listBodyweights(60),
    lastMeasurementAt(),
    bestsBeforeYear(),
  ])
  const alerts = shownAlerts(
    [
      // The report on a week or month just finished, for its first two days.
      ...reviewAlerts(now, {
        settings: s,
        plan,
        workouts: attachBodyweight(recent, weighIns),
        bodyweights: weighIns,
        bestBefore,
      }),
      ...stallAlerts(attachBodyweight(recent, weighIns), now),
      bodyweightAlert(weighIns, s.goal, s.units, now),
    ].filter((a): a is Alert => a !== null),
    s.alertsDismissed,
  )
  return {
    settings: s,
    plan,
    active,
    nextDayId: nextDayId(
      plan.days,
      rollingCursor(last?.finishedAt ? { dayId: last.dayId, at: last.finishedAt } : null, s.rolledPast),
    ),
    lastFinished: last?.finishedAt ? { dayName: last.dayName, finishedAt: last.finishedAt } : null,
    recent: recent.flatMap((w) => (w.finishedAt ? [{ dayId: w.dayId, finishedAt: w.finishedAt }] : [])),
    lastBodyweightAt: weighIns.at(-1)?.date ?? null,
    lastMeasurementAt: lastMeasurementDate,
    alerts,
  }
}

export interface ExportData {
  settings: Settings
  plan: Plan
  workouts: Workout[]
  bodyweights: BodyweightLog[]
  measurements: MeasurementLog[]
}

/** Everything the phone holds, for the exports: settings, plan, every finished session and body log. */
/** Sessions, weigh-ins and tape read from a file, added beside what is there; the caller has left out the duplicates. */
export async function importLogs(input: {
  workouts: Workout[]
  bodyweights: BodyweightLog[]
  measurements: MeasurementLog[]
}): Promise<void> {
  const db = await getDb()
  await withTransaction(async () => {
    for (const w of input.workouts) {
      await db.insert(workouts).values({
        id: w.id,
        dayId: w.dayId,
        dayName: w.dayName,
        dayType: w.dayType,
        startedAt: w.startedAt,
        finishedAt: w.finishedAt ?? null,
        pausedAt: w.pausedAt ?? null,
        pausedMs: w.pausedMs ?? null,
        status: w.status,
        effort: w.effort ?? null,
        note: w.note ?? null,
        entries: w.entries,
      })
    }
    for (const l of input.bodyweights) {
      await db.insert(bodyweights).values({ id: l.id, date: l.date, day: l.day ?? dayKey(l.date), weight: l.weight })
    }
    for (const m of input.measurements) {
      await db.insert(measurements).values({
        id: m.id,
        date: m.date,
        day: m.day ?? dayKey(m.date),
        arm: m.arm ?? null,
        chest: m.chest ?? null,
        waist: m.waist ?? null,
      })
    }
  })
}

export async function getExportData(): Promise<ExportData> {
  const [s, plan, done, weighIns, tape] = await Promise.all([
    getSettings(),
    getPlan(),
    listWorkouts({ limit: -1 }),
    listBodyweights(-1),
    listMeasurements(-1),
  ])
  return { settings: s, plan, workouts: done, bodyweights: weighIns, measurements: tape }
}

export interface StatsData {
  settings: Settings
  plan: Plan
  workouts: Workout[]
  bodyweights: BodyweightLog[]
  measurements: MeasurementLog[]
  /** Each lift's best score from the sessions older than the year here: the one a new best must still beat. */
  bestBefore: Record<string, number>
}

export async function getStatsData(): Promise<StatsData> {
  const [s, plan, done, weighIns, tape, bestBefore] = await Promise.all([
    getSettings(),
    getPlan(),
    listWorkouts({ sinceDays: 365 }),
    listBodyweights(),
    listMeasurements(),
    bestsBeforeYear(),
  ])
  return {
    settings: s,
    plan,
    workouts: attachBodyweight(done, weighIns),
    bodyweights: weighIns,
    measurements: tape,
    bestBefore,
  }
}
