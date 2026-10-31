import type { DayType, Exercise, Plan, Workout } from '../types'
import { groupedWorkouts, liftIdentity } from './lift-identity'
import { type WeeklyPoint, weeklyStrength } from './stats'
import { liftTrend, type Trend } from './trend'

export type Lift = Pick<Exercise, 'id' | 'name' | 'loadType'> & { type: DayType }
export interface LiftData {
  key: string
  ex: Lift
  weeks: WeeklyPoint[]
}

/** One history and one status per named lift/mode, across plan days, imports and retired IDs. */
export function liftsFrom(plan: Plan, workouts: Workout[]): LiftData[] {
  const planned: Lift[] = plan.days.flatMap((d) => d.exercises.map((e) => ({ ...e, type: d.type })))
  const keyFirst: Lift[] = plan.days.flatMap((d) => {
    const first = d.exercises[0]
    return first ? [{ ...first, type: d.type }] : []
  })
  const logged: Lift[] = workouts.flatMap((w) =>
    w.entries.map((e) => ({ id: e.exerciseId, name: e.name, loadType: e.loadType, type: w.dayType })),
  )
  const grouped = groupedWorkouts(workouts)
  const seen = new Set<string>()
  const lifts: LiftData[] = []
  for (const ex of [...keyFirst, ...planned, ...logged]) {
    const identity = liftIdentity(ex)
    if (seen.has(identity)) continue
    seen.add(identity)
    const weeks = weeklyStrength(grouped, identity)
    if (weeks.length) lifts.push({ key: identity, ex, weeks })
  }
  return lifts
}

/** Each identity receives exactly one bucket; the counts therefore partition the All list. */
export function trendsOf(lifts: LiftData[], now: Date): { byLift: Map<string, Trend>; counts: Map<Trend, number> } {
  const byLift = new Map(lifts.map((l) => [l.key, liftTrend(l.weeks, now)]))
  const counts = new Map<Trend, number>()
  for (const trend of byLift.values()) counts.set(trend, (counts.get(trend) ?? 0) + 1)
  return { byLift, counts }
}
