import type { Equipment } from '../library'
import type { Exercise, Settings, Units } from '../types'

/**
 * The kinds of weight a gym steps by: bar plates (barbells and plate-loaded machines), the dumbbell
 * rack, and the pin-loaded stack of cables and most machines.
 */
export const STEP_KINDS = ['plates', 'dumbbell', 'stack'] as const
export type StepKind = (typeof STEP_KINDS)[number]
/** The smallest step of each kind, in the user's units. */
export type Steps = Record<StepKind, number>

/** The smallest steps a gym might have, per kind and unit. */
export const STEP_OPTIONS: Record<StepKind, Record<Units, number[]>> = {
  plates: { kg: [1.25, 2.5, 5], lb: [2.5, 5, 10] },
  dumbbell: { kg: [2, 2.5, 5], lb: [2.5, 5, 10] },
  stack: { kg: [2.5, 5, 10], lb: [5, 10, 15] },
}
/** The common case, and what an unset setting reads as. */
const DEFAULT_STEP: Record<StepKind, Record<Units, number>> = {
  plates: { kg: 2.5, lb: 2.5 },
  dumbbell: { kg: 2.5, lb: 5 },
  stack: { kg: 2.5, lb: 5 },
}

/** The empty bars a gym might have: technique, women's and men's Olympic bars. */
export const BAR_OPTIONS: Record<Units, number[]> = { kg: [10, 15, 20], lb: [15, 35, 45] }
/** The men's Olympic bar, and what an unset setting reads as. */
const DEFAULT_BAR: Record<Units, number> = { kg: 20, lb: 45 }

type StepSettings = Pick<Settings, 'units' | 'plate' | 'dumbbellStep' | 'stackStep' | 'sameStep'>

/**
 * The empty bar's weight: the setting when it is one of the options in this unit, else the Olympic bar. Every
 * weight logged on a barbell includes it, so a barbell lift's first session starts here.
 */
export function barOf(settings: Pick<Settings, 'units' | 'bar'>): number {
  return settings.bar !== undefined && BAR_OPTIONS[settings.units].includes(settings.bar)
    ? settings.bar
    : DEFAULT_BAR[settings.units]
}

/**
 * The steps in force: each setting when it is one of its kind's options in this unit, else the common
 * one. "Same for all" puts the plate on every kind.
 */
export function stepsOf(settings: StepSettings): Steps {
  const read = (kind: StepKind, value: number | undefined) =>
    value !== undefined && STEP_OPTIONS[kind][settings.units].includes(value)
      ? value
      : DEFAULT_STEP[kind][settings.units]
  const plates = read('plates', settings.plate)
  if (settings.sameStep) return { plates, dumbbell: plates, stack: plates }
  return { plates, dumbbell: read('dumbbell', settings.dumbbellStep), stack: read('stack', settings.stackStep) }
}

/**
 * Which kind of weight a lift steps by. Kettlebells come in fixed sizes like dumbbells. A lift the library does not
 * know steps like a stack.
 */
export function stepKind(equipment?: Equipment, plateLoaded?: boolean): StepKind {
  if (equipment === 'barbell' || plateLoaded) return 'plates'
  if (equipment === 'dumbbell' || equipment === 'kettlebell') return 'dumbbell'
  return 'stack'
}

/** The step a lift goes up by. Bar plates go on in pairs, one each side, so twice the smallest. */
export function incrementFor(
  units: Units,
  equipment?: Equipment,
  steps: Steps = stepsOf({ units }),
  plateLoaded?: boolean,
): number {
  const kind = stepKind(equipment, plateLoaded)
  return kind === 'plates' ? 2 * steps.plates : steps[kind]
}

/** Curls and triceps work go on an EZ or fixed bar, lighter than the Olympic one: they start from the lifter's pick. */
const LIGHT_BAR_MUSCLES = new Set(['biceps', 'triceps'])

/** Whether a lift is loaded on the gym's empty bar (see `barOf`): a barbell, other than arm work. */
export function startsAtBar(equipment: Equipment | undefined, muscle: string | undefined): boolean {
  return equipment === 'barbell' && !LIGHT_BAR_MUSCLES.has(muscle ?? '')
}

/** Rest between sets, in seconds. Big lifts get 2-3 min, small ones 60-90 s. */
export function restSecondsFor(exercise: Pick<Exercise, 'repMax' | 'loadType' | 'muscle'>): number {
  if (exercise.loadType === 'time') return 60
  if (exercise.repMax <= 10) return 150
  return 90
}
