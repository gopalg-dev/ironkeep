import type { LoggedSet, WorkoutEntry } from '../types'

/*
 * What a set is logged as when it is ticked: its own numbers, else the set's target from earlier
 * sessions, else the nearest earlier set of this session, else the rep range. Pure, shared by the
 * session's logger and the session editor.
 */

type Prefilled = Pick<WorkoutEntry, 'prefill'>
type Key = 'weight' | 'reps' | 'seconds'

/** The nearest earlier set that has a value, so a blank set can borrow from it. */
function lastFilled(sets: LoggedSet[], index: number, key: Key): number | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const v = sets[i]?.[key]
    if (v !== undefined) return v
  }
  return undefined
}

/**
 * What a blank field stands for: the set's own target from earlier sessions, else the nearest earlier
 * set in this session. Undefined when neither is known.
 */
export function prefillFor(entry: Prefilled, sets: LoggedSet[], index: number, key: Key): number | undefined {
  return entry.prefill?.[index]?.[key] ?? lastFilled(sets, index, key)
}

/** The weight a set would be logged at: its own, else its target. Undefined when none is above zero. */
export function weightFor(entry: Prefilled, sets: LoggedSet[], index: number): number | undefined {
  const w = sets[index]?.weight ?? prefillFor(entry, sets, index, 'weight')
  return w !== undefined && w > 0 ? w : undefined
}

/** Whether a set can be marked done: a weight set needs a weight above zero, the others always can. */
export function canComplete(
  entry: Pick<WorkoutEntry, 'loadType'> & Prefilled,
  sets: LoggedSet[],
  index: number,
): boolean {
  return entry.loadType !== 'weight' || weightFor(entry, sets, index) !== undefined
}

/**
 * Marks a set done, filling blanks from the set's target, the nearest earlier set, or the rep range;
 * marks a done set not done again. A weight set with no weight stays as it is.
 */
export function completeSet(
  entry: Pick<WorkoutEntry, 'loadType' | 'repMin'> & Prefilled,
  sets: LoggedSet[],
  index: number,
): LoggedSet[] {
  const at = sets[index]
  if (!at) return sets
  if (!at.done && !canComplete(entry, sets, index)) return sets
  return sets.map((s, i) => {
    if (i !== index) return s
    const done = !s.done
    if (!done) return { ...s, done }
    if (entry.loadType === 'time') {
      return { ...s, seconds: s.seconds ?? prefillFor(entry, sets, index, 'seconds') ?? entry.repMin, done }
    }
    const reps = s.reps ?? prefillFor(entry, sets, index, 'reps') ?? entry.repMin
    if (entry.loadType === 'weight') return { ...s, weight: weightFor(entry, sets, index), reps, done }
    return { ...s, reps, done }
  })
}

/** The set being worked: the first one not done, or none once every set is. */
export function currentSet(sets: LoggedSet[]): number | undefined {
  const i = sets.findIndex((s) => !s.done)
  return i === -1 ? undefined : i
}

/** What the pad shows for a set: its own number, else its target, else the floor given. */
export function shownValue(
  entry: Prefilled,
  sets: LoggedSet[],
  index: number,
  key: Key,
  floor: number,
): { value: number; own: boolean } {
  const own = sets[index]?.[key]
  if (own !== undefined) return { value: own, own: true }
  return { value: prefillFor(entry, sets, index, key) ?? floor, own: false }
}
