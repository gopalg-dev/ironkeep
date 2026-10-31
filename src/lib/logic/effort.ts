import type { Workout } from '../types'
import { improvedDuring, performanceChange, performanceHistory } from './lift-performance'
import { addDays, finished, startOfWeek } from './stats'

/** How a session felt, picked once at Finish. */
export type Effort = 1 | 2 | 3 | 4

export const EFFORTS: Effort[] = [1, 2, 3, 4]

export const EFFORT_LABEL: Record<Effort, string> = {
  1: 'Easy',
  2: 'OK',
  3: 'Hard',
  4: 'Too much',
}

function inRange(iso: string, start: Date, end: Date): boolean {
  const t = new Date(iso).getTime()
  return t >= start.getTime() && t < end.getTime()
}

/** Average rating of finished sessions in [start, end). Undefined when none was rated. */
export function averageEffort(ws: Workout[], start: Date, end: Date): number | undefined {
  const rated = finished(ws).filter((w) => inRange(w.finishedAt, start, end) && typeof w.effort === 'number')
  if (rated.length === 0) return undefined
  return rated.reduce((sum, w) => sum + (w.effort as number), 0) / rated.length
}

export function effortThisWeek(ws: Workout[], now: Date): number | undefined {
  const start = startOfWeek(now)
  return averageEffort(ws, start, addDays(start, 7))
}

export function effortLabel(avg: number): string {
  const e = Math.min(4, Math.max(1, Math.round(avg))) as Effort
  return EFFORT_LABEL[e]
}

/** Compare only lifts with a compatible baseline in the preceding window. */
function movement(ws: Workout[], now: Date, days: number): boolean[] {
  const since = addDays(now, -days)
  const start = addDays(now, -2 * days)
  const out: boolean[] = []
  for (const history of performanceHistory(ws, now).values()) {
    const before = history.filter((p) => Date.parse(p.date) >= start.getTime() && Date.parse(p.date) < since.getTime())
    const recent = history.filter((p) => Date.parse(p.date) >= since.getTime())
    const baseline = before.at(-1)
    const first = recent[0]
    if (!baseline || !first || performanceChange(baseline, first) === undefined) continue
    out.push(improvedDuring([...before, ...recent], since, now))
  }
  return out
}

/** Any comparable lift improved during the recent window, including reps beyond its best set. */
export function strengthMoved(ws: Workout[], now: Date, days = 14): boolean | undefined {
  const compared = movement(ws, now, days)
  return compared.length ? compared.some(Boolean) : undefined
}

/** Share of comparable lifts without a session improvement in the recent window. */
export function stuckShare(ws: Workout[], now: Date, days = 14): number | undefined {
  const compared = movement(ws, now, days)
  return compared.length ? compared.filter((moved) => !moved).length / compared.length : undefined
}

/** Lifts stuck out of those compared before a deload is called for: three in four. */
export const DELOAD_STUCK_SHARE = 0.75

/**
 * What Stats and the reports say when `deloadHint` holds: the fact, and that a lighter week is part of training, not
 * a failure. Coaches agree a deload mostly cuts sets and reps, and that it can be planned or taken when tired.
 */
export const DELOAD_NOTE =
  'Two hard weeks, most lifts holding. A lighter week is part of training: fewer sets, same weights.'

/**
 * Two hard weeks in a row and most lifts stuck: take a deload week. "No lift moved at all" was the
 * rule before; with a dozen lifts something always creeps, and a two-year simulation saw the hint
 * once in twenty-four lifter-years.
 */
export function deloadHint(ws: Workout[], now: Date): boolean {
  const thisWeek = startOfWeek(now)
  const lastWeek = averageEffort(ws, addDays(thisWeek, -7), thisWeek)
  const weekBefore = averageEffort(ws, addDays(thisWeek, -14), addDays(thisWeek, -7))
  if (lastWeek === undefined || weekBefore === undefined) return false
  if (lastWeek < 3 || weekBefore < 3) return false
  const share = stuckShare(ws, now)
  return share !== undefined && share >= DELOAD_STUCK_SHARE
}
