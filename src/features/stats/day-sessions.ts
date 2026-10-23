import { timeOfDay } from '@/lib/format'
import { activeMinutes } from '@/lib/logic/session-time'
import { dayKey, effectiveSets, type FinishedWorkout, finished } from '@/lib/logic/stats'
import type { Workout } from '@/lib/types'

/** The calendar groups by the local finish date; keep every session, including repeated plan days. */
export function sessionsOnDay(workouts: Workout[], date: string): FinishedWorkout[] {
  return finished(workouts)
    .filter((w) => dayKey(w.finishedAt) === date)
    .reverse()
}

/** Distinguishes two workouts with the same name without repeating the date in the dialog title. */
export function sessionChoiceLine(workout: FinishedWorkout): string {
  const sets = workout.entries.reduce((count, entry) => count + effectiveSets(entry).length, 0)
  const parts = [timeOfDay(workout.startedAt), `${sets} ${sets === 1 ? 'set' : 'sets'}`]
  const minutes = activeMinutes(workout, new Date(workout.finishedAt))
  if (minutes > 0 && minutes < 300) parts.push(`${minutes} min`)
  return parts.join(' · ')
}
