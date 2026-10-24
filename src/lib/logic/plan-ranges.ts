import type { Exercise, PlanDay } from '../types'

export function assertRepRange({ repMin, repMax }: Pick<Exercise, 'repMin' | 'repMax'>): void {
  if (!Number.isInteger(repMin) || !Number.isInteger(repMax) || repMin < 1 || repMax > 600 || repMax < repMin) {
    throw new Error('The rep range must use whole numbers from 1 to 600, with the top at least the bottom.')
  }
}

export function assertPlanRanges(days: PlanDay[]): void {
  for (const day of days) for (const exercise of day.exercises) assertRepRange(exercise)
}
