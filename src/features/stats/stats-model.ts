import type { Family } from '@/components/day-icon'
import { shortDate, signed, timeOfDay, weekdayDate } from '@/lib/format'
import { EFFORT_LABEL, type Effort } from '@/lib/logic/effort'
import { type LiftData, liftsFrom, trendsOf } from '@/lib/logic/lift-groups'
import { NUDGE_EVERY } from '@/lib/logic/nudges'
import { activeMinutes } from '@/lib/logic/session-time'
import {
  type BodyweightTrend,
  dayKey,
  effectiveSets,
  keyTime,
  MUSCLE_LABEL,
  MUSCLES,
  startOfWeek,
  type WeeklyPoint,
} from '@/lib/logic/stats'
import { fmtWeight } from '@/lib/logic/units'
import type { BodyweightLog, LoadType, MeasurementLog, Muscle, Units, Workout } from '@/lib/types'

/*
 * What the Stats tabs show, worked out from the data. Pure, so it is tested without a screen. The
 * words follow the boards: "Best this week, × 10", "+2.5 kg", "same", "7-day average 73.2, down 0.3%
 * on last week", "Measured Oct 16. Next tape day Nov 13.", "Monday, Oct 19, 6:05 PM, 41 min, effort ok".
 */

export type { Lift, LiftData } from '@/lib/logic/lift-groups'
export { liftsFrom, trendsOf }

type SetLike = Pick<WeeklyPoint, 'weight' | 'reps' | 'seconds'>

/** The lift shown first: the one with the longest record among those listed. */
export function longestRecord(lifts: LiftData[]): LiftData | undefined {
  return lifts.reduce<LiftData | undefined>(
    (best, l) => (!best || l.weeks.length > best.weeks.length ? l : best),
    undefined,
  )
}

/** The number the chart plots: weight for weighted lifts, reps or seconds otherwise. */
export function liftValue(loadType: LoadType, p: SetLike): number {
  if (loadType === 'weight') return p.weight
  if (loadType === 'bodyweight') return p.reps
  return p.seconds
}

/** The big figure and the line under it: "62.5" + "kg", "Best this week, × 10". */
export function bigSet(
  loadType: LoadType,
  p: WeeklyPoint,
  units: Units,
  now: Date,
): { value: string; unit: string; line: string } {
  const when = weekLabel(p.week, now)
  if (loadType === 'weight')
    return { value: fmtWeight(p.weight), unit: units, line: `Best ${when.toLowerCase()}, × ${p.reps}` }
  if (loadType === 'bodyweight')
    return { value: String(p.reps), unit: p.reps === 1 ? 'rep' : 'reps', line: `Best ${when.toLowerCase()}` }
  return { value: String(p.seconds), unit: 's', line: `Best ${when.toLowerCase()}` }
}

const repsText = (n: number): string => `${signed(n, 0)} ${Math.abs(n) === 1 ? 'rep' : 'reps'}`

/** How `to` compares with `from`: the weight first, then the reps when the weight held. */
export function changeOf(loadType: LoadType, from: SetLike, to: SetLike, units: Units): { text: string; up: boolean } {
  if (loadType === 'weight') {
    const dw = to.weight - from.weight
    if (dw !== 0) return { text: `${signed(dw, 1)} ${units}`, up: dw > 0 }
    const dr = to.reps - from.reps
    if (dr !== 0) return { text: repsText(dr), up: dr > 0 }
    return { text: 'same', up: false }
  }
  if (loadType === 'bodyweight') {
    const dr = to.reps - from.reps
    return dr === 0 ? { text: 'same', up: false } : { text: repsText(dr), up: dr > 0 }
  }
  const ds = to.seconds - from.seconds
  return ds === 0 ? { text: 'same', up: false } : { text: `${signed(ds, 0)} s`, up: ds > 0 }
}

/** "This week", "Last week", "3 weeks ago": the week of `key` counted back from the week of `now`. */
export function weekLabel(key: string, now: Date): string {
  const ago = Math.round((keyTime(dayKey(startOfWeek(now))) - keyTime(key)) / (7 * 86_400_000))
  if (ago <= 0) return 'This week'
  if (ago === 1) return 'Last week'
  return `${ago} weeks ago`
}

/** The table's first column: "Week of Oct 19" for the latest, then the Monday's date. */
export function weekCell(key: string, index: number): string {
  const monday = shortDate(`${key}T12:00:00`)
  return index === 0 ? `Week of ${monday}` : monday
}

/** "Monday, Oct 19, 6:05 PM, 41 min, effort ok": when, how long, how it felt. */
export function sessionLine(w: Workout): string {
  const at = w.finishedAt ?? w.startedAt
  const parts = [weekdayDate(at), timeOfDay(at)]
  const minutes = w.finishedAt ? activeMinutes(w, new Date(w.finishedAt)) : 0
  if (minutes > 0 && minutes < 300) parts.push(`${minutes} min`)
  if (w.effort) parts.push(`effort ${EFFORT_LABEL[w.effort as Effort].toLowerCase()}`)
  return parts.join(', ')
}

/** "2 weeks in a row, effort ok": the streak and the week's effort, whichever are known. */
export function thisWeekLine(streak: number, effort: number | undefined): string {
  const parts: string[] = []
  if (streak > 0) parts.push(`${streak} ${streak === 1 ? 'week' : 'weeks'} in a row`)
  if (effort !== undefined)
    parts.push(`effort ${EFFORT_LABEL[Math.min(4, Math.max(1, Math.round(effort))) as Effort].toLowerCase()}`)
  return parts.join(', ')
}

/** Sets logged in a session, the editor's and the summary's count. */
export function sessionSets(w: Workout): number {
  return w.entries.reduce((n, e) => n + effectiveSets(e).length, 0)
}

/** "9,420": a big total with thousands marked. */
export const thousands = (n: number): string => Math.round(n).toLocaleString('en-US')

/** "7-day average 73.2, down 0.3% on last week" (no advice: the number only). */
export function bodyweightLine(t: BodyweightTrend): string | null {
  if (t.weekAvg === undefined) return null
  const avg = `7-day average ${fmtWeight(t.weekAvg)}`
  if (t.changePct === undefined) return avg
  const pct = Math.abs(t.changePct).toFixed(1).replace(/\.0$/, '')
  if (Number(pct) === 0) return `${avg}, level with last week`
  return `${avg}, ${t.changePct > 0 ? 'up' : 'down'} ${pct}% on last week`
}

/** "Measured Oct 16. Next tape day Nov 13." or, once due, "Measured Oct 16. Tape day is due." */
export function tapeLine(last: MeasurementLog | undefined, now: Date): string | null {
  if (!last) return null
  const due = new Date(last.date)
  due.setDate(due.getDate() + NUDGE_EVERY.measure)
  const measured = `Measured ${shortDate(last.date)}.`
  return due.getTime() <= now.getTime()
    ? `${measured} Tape day is due.`
    : `${measured} Next tape day ${shortDate(due.toISOString())}.`
}

export const RANGES = ['4', '12', 'all'] as const
export type Range = (typeof RANGES)[number]
export const RANGE_LABEL: Record<Range, string> = { '4': '4 weeks', '12': '12 weeks', all: 'All' }

/** The weigh-ins of the range, oldest first, as chart points. */
export function weighInsIn(logs: BodyweightLog[], range: Range, now: Date): { date: string; value: number }[] {
  const since = range === 'all' ? 0 : now.getTime() - Number(range) * 7 * 86_400_000
  return [...logs]
    .filter((l) => new Date(l.date).getTime() >= since)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({ date: l.date, value: l.weight }))
}

export const TAPES = ['arm', 'chest', 'waist'] as const
export type Tape = (typeof TAPES)[number]
export const TAPE_LABEL: Record<Tape, string> = { arm: 'Arm', chest: 'Chest', waist: 'Waist' }

/** One tape's entries, oldest first, as chart points. */
export function tapePoints(logs: MeasurementLog[], tape: Tape): { date: string; value: number }[] {
  return [...logs]
    .filter((l) => l[tape] !== undefined)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((l) => ({ date: l.date, value: l[tape] as number }))
}

/** The latest value of each tape, from whichever entry last had it. */
export function latestTapes(logs: MeasurementLog[]): Partial<Record<Tape, number>> {
  const out: Partial<Record<Tape, number>> = {}
  for (const t of TAPES) {
    const last = tapePoints(logs, t).at(-1)
    if (last) out[t] = last.value
  }
  return out
}

/** The tape's unit follows the weight unit: centimetres with kilograms, inches with pounds. */
export const lengthUnit = (units: Units): 'cm' | 'in' => (units === 'kg' ? 'cm' : 'in')

export interface HardSetRow {
  muscle: Muscle
  label: string
  done: number
  planned: number
}

/** The week's hard sets against the plan, the biggest plans first, muscles with nothing planned and nothing done left out. */
export function hardSetRows(done: Record<Muscle, number>, planned: Record<Muscle, number>): HardSetRow[] {
  return MUSCLES.map((m) => ({ muscle: m, label: MUSCLE_LABEL[m], done: done[m] ?? 0, planned: planned[m] ?? 0 }))
    .filter((r) => r.planned > 0 || r.done > 0)
    .sort((a, b) => b.planned - a.planned || b.done - a.done)
}

/** Which plate colour a muscle takes: the day family that trains it. */
export const MUSCLE_FAMILY: Record<Muscle, Family> = {
  chest: 'push',
  shoulders: 'push',
  triceps: 'push',
  back: 'pull',
  biceps: 'pull',
  quads: 'legs',
  hamstrings: 'legs',
  calves: 'legs',
  abs: 'mixed',
}

/** How a muscle is painted on the body map: trained in full, partly, planned and not yet, or not in the plan. */
export type MapState = 'trained' | 'partly' | 'planned' | 'off'
export function mapState(done: number, planned: number): MapState {
  if (done <= 0 && planned <= 0) return 'off'
  if (done <= 0) return 'planned'
  return done >= planned ? 'trained' : 'partly'
}

/** "48 of 64": the week's hard sets against the plan's, over every muscle. */
export function hardSetsTotal(rows: HardSetRow[]): string {
  const done = rows.reduce((n, r) => n + r.done, 0)
  const planned = rows.reduce((n, r) => n + r.planned, 0)
  return `${done} of ${planned}`
}

/** Months counted from year zero, so a span across years compares as one number. */
export const monthIndex = (d: Date): number => d.getFullYear() * 12 + d.getMonth()

/** The calendar's reach: from the month the user joined (three years back when unknown) to this month. */
export function monthBounds(now: Date, joinedAt: string | undefined): { lowest: number; highest: number } {
  const highest = monthIndex(now)
  const lowest = joinedAt ? monthIndex(new Date(joinedAt)) : highest - 36
  return { lowest: Math.min(lowest, highest), highest }
}
