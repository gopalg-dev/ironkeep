import { BACKUP_APP, BACKUP_VERSION, type Backup, isBackup } from '@/db/backup'
import type {
  BodyweightLog,
  DayType,
  LoggedSet,
  MeasurementLog,
  Muscle,
  Plan,
  Settings,
  Workout,
  WorkoutEntry,
} from '../types'
import { DAY_TYPES } from '../types'
import { EFFORT_LABEL } from './effort'
import { guessDayType } from './plan-sheet'
import { MUSCLES } from './stats'

/*
 * Reading files back in: a backup of this app, the web app's `everything.json` (schema version 0),
 * and the logs as the Log layout (one row per set) or the Tracker layout (a sheet per plan day).
 * Pure, so every reader is tested on rows; the files are read on the page.
 */

export type SheetRow = Record<string, unknown>

/** A row the reader could not use, and why. `row` counts from the header row as 1, as a spreadsheet does. */
export interface ImportWarning {
  row: number
  message: string
}

/** A stable id for a row imported twice, so the second import finds the first. */
export function importId(prefix: string, ...parts: (string | number)[]): string {
  return `${prefix}-${parts.join('-')}`.toLowerCase().replace(/[^a-z0-9:-]+/g, '-')
}

// ---------------------------------------------------------------- backups

interface WebEverything {
  exportedAt?: string
  settings?: Partial<Settings>
  plan?: Plan
  workouts?: Workout[]
  bodyweights?: BodyweightLog[]
  measurements?: MeasurementLog[]
}

/**
 * A backup from parsed JSON: this app's own envelope, or the web app's `everything.json`, which
 * carried one plan and no slots. Null for anything else.
 */
export function backupFromJson(value: unknown): Backup | null {
  if (isBackup(value)) return value
  if (!value || typeof value !== 'object') return null
  const v = value as WebEverything
  if (!Array.isArray(v.workouts) || !v.plan || !Array.isArray(v.plan.days)) return null
  const settings = { ...(v.settings ?? {}) }
  const split = settings.split ?? 'custom'
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: v.exportedAt ?? new Date().toISOString(),
    settings: { ...settings, split, setupDone: true },
    plans: [{ split, days: v.plan.days, updatedAt: v.plan.updatedAt ?? v.exportedAt ?? new Date().toISOString() }],
    workouts: v.workouts,
    bodyweights: v.bodyweights ?? [],
    measurements: v.measurements ?? [],
    prefs: {},
  }
}

// ---------------------------------------------------------------- the Log layout

const num = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v).trim())

/** The weight column, whatever unit the header names: "Weight (kg)", "Weight (lb)", "Weight". */
function weightOf(row: SheetRow): number | undefined {
  const key = Object.keys(row).find((k) => k.toLowerCase().startsWith('weight'))
  return key ? num(row[key]) : undefined
}

function effortOf(label: string): number | undefined {
  const found = (Object.entries(EFFORT_LABEL) as [string, string][]).find(
    ([, l]) => l.toLowerCase() === label.toLowerCase(),
  )
  return found ? Number(found[0]) : undefined
}

const asDayType = (v: string): DayType => (DAY_TYPES.includes(v as DayType) ? (v as DayType) : 'full')
const asMuscle = (v: string): Muscle => (MUSCLES.includes(v as Muscle) ? (v as Muscle) : 'chest')

/** "2026-10-05" from a sheet cell: a string, or a spreadsheet date already turned into one. */
function dayOf(v: unknown): string | null {
  const s = str(v)
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  const d = new Date(s)
  return Number.isNaN(d.getTime())
    ? null
    : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** The Log layout read back: rows grouped by day, time and plan day into sessions, their sets in order. */
export function logRowsToWorkouts(rows: SheetRow[], warnings: ImportWarning[] = []): Workout[] {
  const sessions = new Map<string, Workout>()
  rows.forEach((row, i) => {
    const day = dayOf(row.Date)
    const exercise = str(row.Exercise)
    if (!day || !exercise) {
      warnings.push({ row: i + 2, message: day ? 'No exercise name, row skipped.' : 'No date, row skipped.' })
      return
    }
    const time = str(row.Time) || '12:00'
    const dayName = str(row.Day) || 'Session'
    const key = `${day} ${time} ${dayName}`
    const at = new Date(`${day}T${time.length === 5 ? time : '12:00'}:00`).toISOString()
    let w = sessions.get(key)
    if (!w) {
      w = {
        id: importId('log', day, time, dayName),
        dayId: importId('day', dayName),
        dayName,
        dayType: asDayType(str(row.Type)),
        startedAt: at,
        finishedAt: at,
        status: 'done',
        entries: [],
      }
      const effort = effortOf(str(row.Effort))
      if (effort) w.effort = effort
      const note = str(row.Note)
      if (note) w.note = note
      sessions.set(key, w)
    }
    let entry = w.entries.find((e) => e.name === exercise)
    if (!entry) {
      const weight = weightOf(row)
      const seconds = num(row.Seconds)
      entry = {
        exerciseId: importId('ex', exercise),
        name: exercise,
        muscle: asMuscle(str(row.Muscle)),
        loadType: seconds !== undefined ? 'time' : weight !== undefined ? 'weight' : 'bodyweight',
        repMin: 0,
        repMax: 0,
        sets: [],
      }
      w.entries.push(entry)
    }
    const set: LoggedSet = { done: true }
    const weight = weightOf(row)
    const reps = num(row.Reps)
    const seconds = num(row.Seconds)
    if (weight !== undefined) set.weight = weight
    if (reps !== undefined) set.reps = reps
    if (seconds !== undefined) set.seconds = seconds
    const index = num(row.Set)
    if (index !== undefined && index >= 1) entry.sets[index - 1] = set
    else entry.sets.push(set)
  })
  for (const w of sessions.values()) for (const e of w.entries) e.sets = e.sets.filter(Boolean).map(withRange(e))
  return [...sessions.values()].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
}

/** A rep range from the sets themselves, so the lift reads sensibly on Stats. */
function withRange(entry: WorkoutEntry): (s: LoggedSet) => LoggedSet {
  const reps = entry.sets.map((s) => s?.reps).filter((r): r is number => r !== undefined)
  if (reps.length > 0) {
    entry.repMin = Math.min(...reps)
    entry.repMax = Math.max(...reps)
  }
  return (s) => s
}

export type TrackerInput = { name: string; rows: SheetRow[] }

/**
 * The Tracker layout read back: a sheet per plan day, one row per lift per session, the sets across
 * as "Set 1", "Set 2"; one weight for the lot, or weights in order split on "/". The sheet's name
 * is the plan day; its kind is guessed from that name, as a plan sheet's is.
 */
export function trackerToWorkouts(sheets: TrackerInput[], warnings: ImportWarning[] = []): Workout[] {
  const rows: SheetRow[] = []
  for (const sheet of sheets) {
    sheet.rows.forEach((row, i) => {
      const day = dayOf(row.Date)
      const exercise = str(row.Exercise)
      if (!day || !exercise) {
        warnings.push({ row: i + 2, message: `${sheet.name}: ${day ? 'no exercise name' : 'no date'}, row skipped.` })
        return
      }
      const weightKey = Object.keys(row).find((k) => k.toLowerCase().startsWith('weight'))
      const weights = str(weightKey ? row[weightKey] : '')
        .split('/')
        .map((w) => num(w.trim()))
      const setKeys = Object.keys(row)
        .filter((k) => /^Set \d+$/.test(k))
        .sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))
      setKeys.forEach((k, i) => {
        const cell = str(row[k])
        if (!cell) return
        const seconds = cell.endsWith(' s') ? num(cell.slice(0, -2)) : undefined
        const weight = weights.length === 1 ? weights[0] : (weights[i] ?? weights[weights.length - 1])
        rows.push({
          Date: day,
          Time: '12:00',
          Day: sheet.name,
          Type: guessDayType(sheet.name),
          Exercise: exercise,
          Set: i + 1,
          Weight: weight ?? '',
          Reps: seconds === undefined ? (num(cell) ?? '') : '',
          Seconds: seconds ?? '',
          Effort: str(row.Effort),
          Note: str(row.Note),
        })
      })
    })
  }
  return logRowsToWorkouts(rows)
}

/** Weigh-ins from a "Date, Weight" sheet. */
export function rowsToBodyweights(rows: SheetRow[]): BodyweightLog[] {
  const out: BodyweightLog[] = []
  for (const row of rows) {
    const day = dayOf(row.Date)
    const weight = weightOf(row) ?? num(row.Weight)
    if (!day || weight === undefined) continue
    out.push({ id: importId('bw', day), date: `${day}T12:00:00.000Z`, day, weight })
  }
  return out
}

/** Tape entries from a "Date, Arm, Chest, Waist" sheet. */
export function rowsToMeasurements(rows: SheetRow[]): MeasurementLog[] {
  const out: MeasurementLog[] = []
  for (const row of rows) {
    const day = dayOf(row.Date)
    if (!day) continue
    const m: MeasurementLog = { id: importId('tape', day), date: `${day}T12:00:00.000Z`, day }
    const arm = num(row.Arm)
    const chest = num(row.Chest)
    const waist = num(row.Waist)
    if (arm !== undefined) m.arm = arm
    if (chest !== undefined) m.chest = chest
    if (waist !== undefined) m.waist = waist
    if (arm !== undefined || chest !== undefined || waist !== undefined) out.push(m)
  }
  return out
}

// ---------------------------------------------------------------- what an import would do

export interface ImportPreview {
  sessions: number
  sets: number
  /** Sessions already on the phone (same day and plan day), left out. */
  duplicates: number
  weighIns: number
  tapeDays: number
  from?: string
  to?: string
}

/** The day and plan day of a session, the key two imports of one session share. */
const sessionKey = (w: Workout): string => `${(w.finishedAt ?? w.startedAt).slice(0, 10)} ${w.dayName}`

/** The sessions not already on the phone, by day and plan day; weigh-ins and tape by their day. */
export function dedupe(
  incoming: { workouts: Workout[]; bodyweights: BodyweightLog[]; measurements: MeasurementLog[] },
  existing: { workouts: Workout[]; bodyweights: BodyweightLog[]; measurements: MeasurementLog[] },
): { workouts: Workout[]; bodyweights: BodyweightLog[]; measurements: MeasurementLog[]; duplicates: number } {
  const have = new Set(existing.workouts.map(sessionKey))
  const ids = new Set(existing.workouts.map((w) => w.id))
  const workouts = incoming.workouts.filter((w) => !have.has(sessionKey(w)) && !ids.has(w.id))
  const bwDays = new Set(existing.bodyweights.map((b) => b.day ?? b.date.slice(0, 10)))
  const tapeDays = new Set(existing.measurements.map((m) => m.day ?? m.date.slice(0, 10)))
  return {
    workouts,
    bodyweights: incoming.bodyweights.filter((b) => !bwDays.has(b.day ?? b.date.slice(0, 10))),
    measurements: incoming.measurements.filter((m) => !tapeDays.has(m.day ?? m.date.slice(0, 10))),
    duplicates: incoming.workouts.length - workouts.length,
  }
}

export function previewOf(
  kept: { workouts: Workout[]; bodyweights: BodyweightLog[]; measurements: MeasurementLog[] },
  duplicates: number,
): ImportPreview {
  const days = kept.workouts.map((w) => (w.finishedAt ?? w.startedAt).slice(0, 10)).sort()
  return {
    sessions: kept.workouts.length,
    sets: kept.workouts.reduce((n, w) => n + w.entries.reduce((k, e) => k + e.sets.filter((s) => s.done).length, 0), 0),
    duplicates,
    weighIns: kept.bodyweights.length,
    tapeDays: kept.measurements.length,
    ...(days[0] ? { from: days[0], to: days[days.length - 1] } : {}),
  }
}
