import type { LoggedSet, WorkoutEntry } from '../types'

/** Epley estimate of a one-rep max. */
export function epley(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

/**
 * One number to rank sets by. Weight lifts: the Epley estimate. Bodyweight work: the same estimate
 * at the session's bodyweight when one is known, so 8 pull-ups at 80 kg beat 8 at 70 kg; plain reps
 * when no weigh-in exists. Holds: seconds.
 */
export function setScore(entry: Pick<WorkoutEntry, 'loadType'>, s: LoggedSet, bodyweight?: number): number {
  if (entry.loadType === 'weight') return epley(s.weight ?? 0, s.reps ?? 0)
  if (entry.loadType === 'bodyweight') return bodyweight ? epley(bodyweight, s.reps ?? 0) : (s.reps ?? 0)
  return s.seconds ?? 0
}
