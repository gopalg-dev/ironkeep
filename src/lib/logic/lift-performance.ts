import type { LoadType, LoggedSet, Workout, WorkoutEntry } from '../types'
import { groupedWorkouts } from './lift-identity'
import { setScore } from './set-score'

/** Completed work in one session. Kept separate from the best-set chart and PR records. */
export interface LiftPerformance {
  date: string
  loadType: LoadType
  sets: LoggedSet[]
  bodyweight?: number
}

function positive(n: number | undefined): n is number {
  return n !== undefined && Number.isFinite(n) && n > 0
}

export function performanceOf(entry: WorkoutEntry, date: string, bodyweight?: number): LiftPerformance | undefined {
  if (!Number.isFinite(Date.parse(date))) return undefined
  const sets = entry.sets.filter(
    (s) =>
      s.done &&
      (entry.loadType === 'time'
        ? positive(s.seconds)
        : positive(s.reps) && (entry.loadType === 'bodyweight' || positive(s.weight))),
  )
  return sets.length ? { date, loadType: entry.loadType, sets, bodyweight } : undefined
}

/** Chronological, finished sessions only; never mutate the workout or include future sessions. */
export function performanceHistory(ws: Workout[], now: Date): Map<string, LiftPerformance[]> {
  const out = new Map<string, LiftPerformance[]>()
  const ordered = groupedWorkouts(ws)
    .filter((w) => w.status === 'done' && w.finishedAt && Date.parse(w.finishedAt) <= now.getTime())
    .sort((a, b) => Date.parse(a.finishedAt ?? '') - Date.parse(b.finishedAt ?? ''))
  for (const w of ordered) {
    if (!w.finishedAt) continue
    for (const e of w.entries) {
      const p = performanceOf(e, w.finishedAt, w.bodyweight)
      if (p) out.set(e.exerciseId, [...(out.get(e.exerciseId) ?? []), p])
    }
  }
  return out
}

/**
 * Compare the same number of strongest completed sets, so adding a set or a session cannot
 * manufacture progress. Fewer completed sets cannot earn an improvement through selection alone.
 * At identical loads compare reps directly; holds compare seconds. Across loads use mean Epley
 * scores as a performance estimate. Bodyweight is used only when both sessions have a weigh-in;
 * otherwise both sides use reps. A changed load type starts a new comparison baseline.
 * This describes logged performance, not measured strength or the cause of a change.
 */
export function performanceChange(before: LiftPerformance, after: LiftPerformance): number | undefined {
  if (before.loadType !== after.loadType || before.sets.length === 0 || after.sets.length === 0) return undefined
  const withBodyweight = positive(before.bodyweight) && positive(after.bodyweight)
  const scores = (p: LiftPerformance) =>
    p.sets
      .map((set) => ({ set, score: setScore(p, set, withBodyweight ? p.bodyweight : undefined) }))
      .sort(
        (a, b) =>
          b.score - a.score || (b.set.weight ?? 0) - (a.set.weight ?? 0) || (b.set.reps ?? 0) - (a.set.reps ?? 0),
      )
      .slice(0, Math.min(before.sets.length, after.sets.length))
  const old = scores(before)
  const next = scores(after)
  const sameLoad =
    before.loadType === 'weight'
      ? old.every((p, i) => Math.abs((p.set.weight ?? 0) - (next[i].set.weight ?? 0)) <= 1e-9)
      : before.loadType === 'bodyweight' &&
        (!withBodyweight || Math.abs((before.bodyweight ?? 0) - (after.bodyweight ?? 0)) <= 1e-9)
  const value = (p: { set: LoggedSet; score: number }) => {
    if (!sameLoad) return p.score
    // A rep at the heavier load in a pyramid must not cancel a rep lost at a lighter load.
    return (p.set.reps ?? 0) * (before.loadType === 'weight' ? (p.set.weight ?? 0) : 1)
  }
  const baseline = old.reduce((sum, p) => sum + value(p), 0)
  const current = next.reduce((sum, p) => sum + value(p), 0)
  if (!(baseline > 0) || !Number.isFinite(baseline) || !Number.isFinite(current)) return undefined
  const change = (current - baseline) / baseline
  if (Math.abs(change) <= 1e-9) return 0
  return change > 0 && after.sets.length < before.sets.length ? 0 : change
}

/** Whether any comparable session improved during [start, end], including recovery below an old PR. */
export function improvedDuring(history: LiftPerformance[], start: Date, end: Date): boolean {
  return history.some((p, i) => {
    const previous = history[i - 1]
    const at = Date.parse(p.date)
    return (
      previous !== undefined &&
      at >= start.getTime() &&
      at <= end.getTime() &&
      (performanceChange(previous, p) ?? 0) > 0
    )
  })
}
