import type { LoadType, Workout, WorkoutEntry } from '../types'

/** IDs can change after imports or swaps. Match the same named movement and logging mode only. */
export function liftIdentity(lift: { name: string; loadType: LoadType }): string {
  return JSON.stringify([lift.name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(), lift.loadType])
}

/** A derived Stats view: combine aliases within a workout without changing stored IDs or sets. */
export function groupedWorkouts(workouts: Workout[]): Workout[] {
  return workouts.map((w) => {
    const entries = new Map<string, WorkoutEntry>()
    for (const e of w.entries) {
      const id = liftIdentity(e)
      const previous = entries.get(id)
      entries.set(id, { ...e, exerciseId: id, sets: [...(previous?.sets ?? []), ...e.sets] })
    }
    return { ...w, entries: [...entries.values()] }
  })
}
