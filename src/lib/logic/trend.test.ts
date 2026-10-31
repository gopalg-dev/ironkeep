import { describe, expect, it } from '@jest/globals'
import type { WeeklyPoint } from '@/lib/logic/stats'
import { liftTrend, liftTrendDuration } from '@/lib/logic/trend'

const now = new Date(2026, 9, 12, 18, 0, 0)

/** One week per score, the last one `lastDaysAgo` days back, a week apart before that. */
function weeks(scores: number[], lastDaysAgo = 1): WeeklyPoint[] {
  return scores.map((score, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - lastDaysAgo - (scores.length - 1 - i) * 7)
    return { week: '', weekNo: i + 1, date: d.toISOString(), weight: score, reps: 8, seconds: 0, score, sessions: 1 }
  })
}

describe('liftTrend', () => {
  it('is new until there are two comparable sessions', () => {
    expect(liftTrend([], now)).toBe('new')
    expect(liftTrend(weeks([60]), now)).toBe('new')
    expect(liftTrend(weeks([60, 62.5]), now)).toBe('climbing')
  })

  it('is idle after two weeks without a session, whatever the history', () => {
    expect(liftTrend(weeks([60, 62.5, 65, 67.5], 15), now)).toBe('idle')
    expect(liftTrend(weeks([60, 62.5, 65, 67.5], 14), now)).not.toBe('idle')
  })

  it('climbs when the latest session improves', () => {
    expect(liftTrend(weeks([60, 60, 60, 60, 60, 62.5, 62.5, 65]), now)).toBe('climbing')
  })

  it('is holding when the latest two sessions match', () => {
    expect(liftTrend(weeks([60, 65, 65, 65, 65, 65, 65, 65]), now)).toBe('stuck')
  })

  it('slips on a decline of at least five percent, then holds when performance stabilizes', () => {
    expect(liftTrend(weeks([70, 70, 65]), now)).toBe('slipping')
    expect(liftTrend(weeks([70, 70, 65, 65]), now)).toBe('stuck')
    expect(liftTrend(weeks([100, 95]), now)).toBe('slipping')
    expect(liftTrend(weeks([100, 96]), now)).toBe('stuck')
  })

  it('recognizes recovery below an old personal best', () => {
    expect(liftTrend(weeks([60, 62.5, 65]), now)).toBe('climbing')
    expect(liftTrend(weeks([65, 65, 65]), now)).toBe('stuck')
    expect(liftTrend(weeks([70, 70, 60]), now)).toBe('slipping')
    expect(liftTrend(weeks([100, 60, 65]), now)).toBe('climbing')
    expect(liftTrend(weeks([60, 100, 90]), now)).toBe('slipping')
  })
})

describe('liftTrendDuration', () => {
  it('returns at least 1 when empty or new', () => {
    expect(liftTrendDuration([], now)).toBe(1)
    expect(liftTrendDuration(weeks([60, 62.5]), now)).toBe(1)
  })

  it('counts consecutive weeks in the same trend', () => {
    // 6 consecutive stuck weeks:
    const stuckWeeks = weeks([60, 65, 65, 65, 65, 65, 65, 65])
    expect(liftTrend(stuckWeeks, now)).toBe('stuck')
    expect(liftTrendDuration(stuckWeeks, now)).toBe(6)
  })

  it('does not count missing calendar weeks as continuous holding', () => {
    const points = weeks([60, 60, 60, 60])
    points.splice(2, 1)
    expect(liftTrendDuration(points, now)).toBe(1)
  })

  it('ignores input ordering and future points', () => {
    const points = weeks([60, 65, 70])
    expect(liftTrend([...points].reverse(), now)).toBe('climbing')
    expect(liftTrend([...points, { ...points[0], date: new Date(now.getTime() + 86400000).toISOString() }], now)).toBe(
      'climbing',
    )
  })
})
