import { describe, expect, it } from '@jest/globals'
import { strengthMoved, stuckShare } from '@/lib/logic/effort'
import { liftsFrom, trendsOf } from '@/lib/logic/lift-groups'
import { liftIdentity } from '@/lib/logic/lift-identity'
import { performanceChange, performanceHistory, performanceOf } from '@/lib/logic/lift-performance'
import { recentPRs, weeklyStrength } from '@/lib/logic/stats'
import { liftTrend, liftTrendDuration } from '@/lib/logic/trend'
import type { LoadType, LoggedSet, Workout } from '@/lib/types'

const now = new Date('2026-10-31T18:00:00Z')
function session(
  days: number,
  values: number[],
  loadType: LoadType = 'weight',
  weight = 100,
  bodyweight?: number,
): Workout {
  const date = new Date(now.getTime() - days * 86400000).toISOString()
  return {
    id: `${days}-${values}`,
    dayId: 'pull',
    dayName: 'Pull',
    dayType: 'pull',
    startedAt: date,
    finishedAt: date,
    status: 'done',
    bodyweight,
    entries: [
      {
        exerciseId: 'conventional-deadlift',
        name: 'Conventional deadlift',
        muscle: 'back',
        loadType,
        repMin: 5,
        repMax: 8,
        sets: values.map((v) => (loadType === 'time' ? { seconds: v, done: true } : { weight, reps: v, done: true })),
      },
    ],
  }
}
function change(before: Workout, after: Workout) {
  const a = performanceOf(before.entries[0], before.finishedAt ?? '', before.bodyweight)
  const b = performanceOf(after.entries[0], after.finishedAt ?? '', after.bodyweight)
  if (!a || !b) throw new Error('Missing test performance')
  return performanceChange(a, b)
}
function trend(ws: Workout[]) {
  return liftTrend(weeklyStrength(ws, 'conventional-deadlift'), now)
}

describe('completed-set performance', () => {
  it('counts the deadlift 5,5,6 → 6,6,6 at the same load as climbing, without inventing a best-set PR', () => {
    const ws = [session(21, [5, 5, 6]), session(7, [5, 5, 6]), session(0, [6, 6, 6])]
    expect(change(ws[1], ws[2])).toBeCloseTo(0.125)
    expect(trend(ws)).toBe('climbing')
    expect(recentPRs(ws, now)).toEqual([])
    expect(strengthMoved(ws, now)).toBe(true)
    expect(stuckShare(ws, now)).toBe(0)
  })

  it.each<LoadType>(['weight', 'bodyweight', 'time'])('recognizes improvements beyond the best set for %s', (type) => {
    expect(trend([session(7, [5, 5, 6], type), session(0, [6, 6, 6], type)])).toBe('climbing')
    expect(trend([session(7, [6, 6, 6], type), session(0, [5, 5, 6], type)])).toBe('slipping')
    expect(trend([session(7, [6, 6, 6], type), session(0, [6, 6, 6], type)])).toBe('stuck')
  })

  it('retains improvements in the same calendar week even when the top set ties', () => {
    const ws = [session(2, [5, 5, 6]), session(0, [6, 6, 6])]
    const weeks = weeklyStrength(ws, 'conventional-deadlift')
    expect(weeks).toHaveLength(1)
    expect(weeks[0].sessions).toBe(2)
    expect(weeks[0].performances).toHaveLength(2)
    expect(trend(ws)).toBe('climbing')
    expect(liftTrendDuration(weeks, now)).toBe(1)
  })

  it('does not infer inactivity from an older best-set date', () => {
    expect(trend([session(20, [6, 6, 6]), session(1, [6, 6, 6])])).toBe('stuck')
    expect(trend([session(15, [6, 6, 6])])).toBe('idle')
    expect(trend([session(14, [6, 6, 6])])).toBe('new')
  })

  it('uses the latest session date when the best set and the latest session share a week', () => {
    const ws = [session(17, [6, 6, 6]), session(13, [5, 5, 5])]
    const weeks = weeklyStrength(ws, 'conventional-deadlift')
    expect(weeks).toHaveLength(1)
    expect(weeks[0].date).toBe(ws[0].finishedAt)
    expect(liftTrend(weeks, now)).toBe('slipping')
  })

  it('counts idle weeks from the exact inactivity boundary, independently of old trend duration', () => {
    const ws = [session(28, [6, 6, 6]), session(22, [6, 6, 6])]
    expect(liftTrendDuration(weeklyStrength(ws, 'conventional-deadlift'), now)).toBe(2)
    const boundary = [session(14, [6, 6, 6])]
    const weeks = weeklyStrength(boundary, 'conventional-deadlift')
    expect(liftTrend(weeks, new Date(now.getTime() + 1))).toBe('idle')
    expect(liftTrendDuration(weeks, new Date(now.getTime() + 1))).toBe(1)
  })

  it('does not manufacture progress from extra sets, extra sessions or dropping weak sets', () => {
    expect(trend([session(7, [6, 6, 6]), session(0, [6, 6, 6, 6])])).toBe('stuck')
    expect(trend([session(7, [6, 6, 6]), session(0, [6, 6])])).toBe('stuck')
    expect(trend([session(7, [6, 5, 4]), session(0, [6, 6])])).toBe('stuck')
    expect(trend([session(7, [6, 6, 6]), session(2, [6, 6, 6]), session(0, [6, 6, 6])])).toBe('stuck')
  })

  it('recognizes added work when existing sets also improve', () => {
    expect(trend([session(7, [6, 5, 5]), session(0, [6, 6, 6, 4])])).toBe('climbing')
  })

  it('compares differing loads using estimated performance rather than tonnage alone', () => {
    expect(trend([session(7, [6, 6, 6]), session(0, [5, 5, 5], 'weight', 105)])).toBe('climbing')
    expect(trend([session(7, [6, 6, 6]), session(0, [7, 7, 7], 'weight', 80)])).toBe('slipping')
  })

  it('uses reps on both sides if either bodyweight is missing', () => {
    const before = session(7, [8, 8, 8], 'bodyweight', 0, 80)
    expect(change(before, session(0, [8, 8, 8], 'bodyweight', 0))).toBe(0)
    expect(change(session(7, [8, 8, 8], 'bodyweight', 0), session(0, [8, 8, 8], 'bodyweight', 0, 80))).toBe(0)
    expect(change(before, session(0, [8, 8, 8], 'bodyweight', 0, 82))).toBeGreaterThan(0)
  })

  it('starts a new baseline after load-type changes instead of comparing seconds with kilograms', () => {
    expect(trend([session(7, [6, 6, 6]), session(0, [30, 30, 30], 'time')])).toBe('new')
    expect(strengthMoved([session(21, [6, 6, 6]), session(0, [30, 30, 30], 'time')], now)).toBeUndefined()
  })

  it('ignores unfinished, invalid and future work and does not mutate input', () => {
    const invalid = session(1, [0, NaN, Infinity, -1])
    const unfinished = { ...session(1, [20, 20, 20]), status: 'in_progress' as const }
    const ws = [session(7, [5, 5, 6]), session(0, [6, 6, 6]), session(-1, [30, 30, 30]), invalid, unfinished]
    const original = JSON.stringify(ws)
    expect(trend(ws)).toBe('climbing')
    expect(performanceHistory(ws, now).get(liftIdentity(ws[0].entries[0]))).toHaveLength(2)
    expect(JSON.stringify(ws)).toBe(original)
  })

  it('ignores unticked sets and fields belonging to another load type', () => {
    const w = session(0, [6])
    const sets: LoggedSet[] = [
      { reps: 100, weight: 100, done: false },
      { seconds: 30, done: true },
      { weight: 100, reps: 6, done: true },
    ]
    expect(performanceOf({ ...w.entries[0], sets }, w.finishedAt ?? '')?.sets).toHaveLength(1)
  })

  it('is invariant to set ordering and consistent unit conversion', () => {
    const a = session(7, [5, 5, 6])
    const b = session(0, [6, 6, 6])
    const expected = change(a, b)
    a.entries[0].sets.reverse()
    expect(change(a, b)).toBe(expected)
    for (const w of [a, b]) for (const set of w.entries[0].sets) set.weight = (set.weight ?? 0) * 2.2046226218
    expect(change(a, b)).toBeCloseTo(expected ?? 0)
  })

  it('returns no movement verdict when the windows contain different lifts', () => {
    const after = session(0, [6, 6, 6])
    after.entries[0].exerciseId = 'another-lift'
    after.entries[0].name = 'Another lift'
    expect(strengthMoved([session(21, [6, 6, 6]), after], now)).toBeUndefined()
    expect(stuckShare([session(21, [6, 6, 6]), after], now)).toBeUndefined()
  })

  it('combines Dead Bug IDs, case and whitespace into one history with one status', () => {
    const old = session(20, [10, 10, 10], 'bodyweight')
    const recent = session(0, [10, 10, 10], 'bodyweight')
    old.entries[0] = { ...old.entries[0], exerciseId: 'dead-bug', name: 'Dead Bug' }
    recent.entries[0] = { ...recent.entries[0], exerciseId: 'dead-bug-2', name: '  DEAD   BUG  ' }
    const plan = { days: [], updatedAt: now.toISOString() }
    const lifts = liftsFrom(plan, [old, recent])
    expect(lifts).toHaveLength(1)
    expect(lifts[0].weeks).toHaveLength(2)
    expect(liftTrend(lifts[0].weeks, now)).toBe('stuck')
    expect(performanceHistory([old, recent], now)).toHaveProperty('size', 1)
  })

  it('keeps distinct movement variants and logging modes separate even if IDs collide', () => {
    const weighted = session(7, [6, 6, 6])
    const timed = session(0, [30, 30, 30], 'time')
    const variant = session(0, [6, 6, 6])
    variant.entries[0].name = 'Romanian deadlift'
    expect(liftsFrom({ days: [], updatedAt: '' }, [weighted, timed, variant])).toHaveLength(3)
  })

  it('combines aliases within one session and counts it once', () => {
    const w = session(0, [10], 'bodyweight')
    w.entries.push({ ...w.entries[0], exerciseId: 'second-id' })
    const grouped = liftsFrom({ days: [], updatedAt: '' }, [w])
    expect(grouped).toHaveLength(1)
    expect(grouped[0].weeks[0].sessions).toBe(1)
    expect(grouped[0].weeks[0].performances?.[0].sets).toHaveLength(2)
  })

  it('cannot have one identity in two status buckets; bucket counts partition All', () => {
    const ws = [session(20, [5, 5, 6]), session(0, [6, 6, 6])]
    const duplicate = session(7, [5, 5, 6])
    duplicate.entries[0].exerciseId = 'retired-deadlift-id'
    const lifts = liftsFrom({ days: [], updatedAt: '' }, [...ws, duplicate])
    const statuses = new Map(lifts.map((lift) => [lift.key, liftTrend(lift.weeks, now)]))
    expect(statuses.size).toBe(lifts.length)
    expect([...statuses.values()]).toEqual(['climbing'])
    const { byLift, counts } = trendsOf(lifts, now)
    expect([...counts.values()].reduce((sum, n) => sum + n, 0)).toBe(lifts.length)
    expect(byLift.size).toBe(lifts.length)
  })

  it('exhaustively counts rep increases at unchanged load and count, including ties in the best set', () => {
    for (const type of ['weight', 'bodyweight', 'time'] as const) {
      for (let first = 1; first <= 12; first++)
        for (let second = 1; second <= 12; second++) {
          const a = session(7, [first, second, 12], type)
          const b = session(0, [first + 1, second, 12], type)
          expect(change(a, b)).toBeGreaterThan(0)
          expect(change(a, b)).toBeCloseTo(-((change(b, a) ?? 0) / (1 + (change(b, a) ?? 0))))
        }
    }
  })

  it('counts mixed-load work at unchanged loads without losing improvements in heavier sets', () => {
    const before = session(7, [6, 10])
    before.entries[0].sets[1].weight = 80
    const after = session(0, [7, 9])
    after.entries[0].sets[1].weight = 80
    expect(change(before, after)).toBeGreaterThan(0)
  })

  it('keeps every status bucket disjoint across a varied population and alias ordering', () => {
    const ws: Workout[] = []
    for (let i = 0; i < 50; i++) {
      for (const [days, reps] of [
        [21, 6],
        [7, 6],
        [0, i % 3 === 0 ? 7 : i % 3 === 1 ? 6 : 4],
      ]) {
        const w = session(days, [reps, reps, reps])
        w.entries[0].name = `Lift ${i}`
        w.entries[0].exerciseId = `id-${i}-${days}`
        ws.push(w)
      }
    }
    const lifts = liftsFrom({ days: [], updatedAt: '' }, ws.reverse())
    const { byLift, counts } = trendsOf(lifts, now)
    expect(lifts).toHaveLength(50)
    expect(byLift.size).toBe(50)
    expect(counts.get('climbing')).toBe(17)
    expect(counts.get('stuck')).toBe(17)
    expect(counts.get('slipping')).toBe(16)
    for (const lift of lifts) expect([...counts.keys()].filter((t) => byLift.get(lift.key) === t)).toHaveLength(1)
  })
})
