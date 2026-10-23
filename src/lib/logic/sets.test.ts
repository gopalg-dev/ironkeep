import { describe, expect, it } from '@jest/globals'

import type { LoggedSet, WorkoutEntry } from '../types'
import { canComplete, completeSet, currentSet, prefillFor, shownValue } from './sets'

const entry = (patch: Partial<WorkoutEntry> = {}): WorkoutEntry => ({
  exerciseId: 'row',
  name: 'Barbell Row',
  muscle: 'back',
  loadType: 'weight',
  repMin: 6,
  repMax: 10,
  sets: [{ done: false }, { done: false }, { done: false }],
  ...patch,
})

describe('prefillFor', () => {
  it('prefers the set target, then the nearest earlier set', () => {
    const e = entry({ prefill: [{ weight: 60, reps: 8 }] })
    const sets: LoggedSet[] = [{ weight: 62.5, done: true }, { done: false }, { done: false }]
    expect(prefillFor(e, sets, 0, 'weight')).toBe(60)
    expect(prefillFor(e, sets, 1, 'weight')).toBe(62.5)
    expect(prefillFor(e, sets, 2, 'reps')).toBeUndefined()
  })
})

describe('completeSet', () => {
  it('fills a weight set from its target and the rep range', () => {
    const e = entry({ prefill: [{ weight: 60 }] })
    const next = completeSet(e, e.sets, 0)
    expect(next[0]).toEqual({ weight: 60, reps: 6, done: true })
  })

  it('refuses a weight set with no weight anywhere', () => {
    const e = entry()
    expect(canComplete(e, e.sets, 0)).toBe(false)
    expect(completeSet(e, e.sets, 0)).toBe(e.sets)
  })

  it('ticks a bodyweight set with the range floor and unticks again', () => {
    const e = entry({ loadType: 'bodyweight', repMin: 8 })
    const done = completeSet(e, e.sets, 1)
    expect(done[1]).toEqual({ reps: 8, done: true })
    expect(completeSet(e, done, 1)[1]).toEqual({ reps: 8, done: false })
  })

  it('a hold takes seconds', () => {
    const e = entry({ loadType: 'time', repMin: 30 })
    expect(completeSet(e, e.sets, 0)[0]).toEqual({ seconds: 30, done: true })
  })
})

describe('currentSet and shownValue', () => {
  it('points at the first open set and shows own numbers over targets', () => {
    const e = entry({
      prefill: [
        { weight: 60, reps: 8 },
        { weight: 60, reps: 8 },
      ],
    })
    const sets: LoggedSet[] = [{ weight: 60, reps: 8, done: true }, { weight: 62.5, done: false }, { done: false }]
    expect(currentSet(sets)).toBe(1)
    expect(currentSet(sets.map((s) => ({ ...s, done: true })))).toBeUndefined()
    expect(shownValue(e, sets, 1, 'weight', 0)).toEqual({ value: 62.5, own: true })
    expect(shownValue(e, sets, 1, 'reps', e.repMin)).toEqual({ value: 8, own: false })
    // no target for set 3: the nearest earlier set with reps is set 1
    expect(shownValue(e, sets, 2, 'reps', e.repMin)).toEqual({ value: 8, own: false })
  })
})
