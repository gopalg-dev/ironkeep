import { type LiftPerformance, performanceChange } from './lift-performance'
import type { WeeklyPoint } from './stats'
export const TRENDS = ['climbing', 'stuck', 'slipping', 'idle', 'new'] as const
export type Trend = (typeof TRENDS)[number]

export const TREND_LABEL: Record<Trend, string> = {
  climbing: 'Climbing',
  stuck: 'Holding',
  slipping: 'Slipping',
  idle: 'Idle',
  new: 'New',
}

/** Days without a session before a lift is idle. */
export const IDLE_DAYS = 14
/** Product noise threshold, not a clinical or research-defined diagnosis. */
export const SLIP_CHANGE = -0.05

function sessions(weeks: WeeklyPoint[], now: Date): LiftPerformance[] {
  return weeks
    .flatMap(
      (p): LiftPerformance[] =>
        // Aggregate-only callers can supply a score; production points retain every session.
        p.performances ?? [{ date: p.date, loadType: 'time', sets: [{ done: true, seconds: p.score }] }],
    )
    .filter((p) => Number.isFinite(Date.parse(p.date)) && Date.parse(p.date) <= now.getTime() && p.sets.length > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
}

function trendOf(history: LiftPerformance[], now: Date): Trend {
  const last = history.at(-1)
  if (!last) return 'new'
  if (now.getTime() - Date.parse(last.date) > IDLE_DAYS * 86_400_000) return 'idle'
  const previous = history.at(-2)
  if (!previous) return 'new'
  const change = performanceChange(previous, last)
  if (change === undefined) return 'new'
  if (change > 0) return 'climbing'
  if (change <= SLIP_CHANGE + 1e-9) return 'slipping'
  return 'stuck'
}

/** Latest completed session against the previous one, separate from all-time best-set records. */
export function liftTrend(weeks: WeeklyPoint[], now: Date): Trend {
  return trendOf(sessions(weeks, now), now)
}

/** Consecutive calendar weeks with the current trend; missing weeks break the run. */
export function liftTrendDuration(weeks: WeeklyPoint[], now: Date): number {
  const history = sessions(weeks, now)
  const current = trendOf(history, now)
  const last = history.at(-1)
  if (!last) return 1
  if (current === 'idle') {
    return Math.max(1, Math.ceil((now.getTime() - Date.parse(last.date) - IDLE_DAYS * 86_400_000) / (7 * 86_400_000)))
  }
  const monday = (date: string) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d
  }
  let count = 0
  let expected: Date | undefined
  for (let i = history.length - 1; i >= 0; i--) {
    const p = history[i]
    const week = monday(p.date)
    if (expected && week.getTime() > expected.getTime()) continue
    if (expected && week.getTime() !== expected.getTime()) break
    if (trendOf(history.slice(0, i + 1), new Date(p.date)) !== current) break
    count++
    expected = new Date(week)
    expected.setDate(expected.getDate() - 7)
  }
  return Math.max(count, 1)
}
