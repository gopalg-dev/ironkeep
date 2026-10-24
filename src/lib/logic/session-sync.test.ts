import { describe, expect, it } from '@jest/globals'
import { setsLeft, swapEntries, syncEntries } from '@/lib/logic/session-sync'
import type { Exercise, LoggedSet, WorkoutEntry } from '@/lib/types'

const ex = (id: string, sets = 3, extra: Partial<Exercise> = {}): Exercise => ({
  id,
  name: id,
  sets,
  repMin: 8,
  repMax: 12,
  muscle: 'back',
  loadType: 'weight',
  ...extra,
})

const entry = (id: string, sets: LoggedSet[], extra: Partial<WorkoutEntry> = {}): WorkoutEntry => ({
  exerciseId: id,
  name: id,
  muscle: 'back',
  loadType: 'weight',
  repMin: 8,
  repMax: 12,
  sets,
  ...extra,
})

const blank = (n: number): LoggedSet[] => Array.from({ length: n }, () => ({ done: false }))
const ticked: LoggedSet = { weight: 60, reps: 10, done: true }

describe('syncEntries', () => {
  it('refreshes range facts and prefill without losing logged or typed sets', () => {
    const sets = [ticked, { weight: 65, reps: 7, done: false }]
    const old = entry('row', sets, { hint: 'Top of the range on every set.', prefill: [{ weight: 50, reps: 12 }] })
    const fresh = entry('row', blank(3), {
      repMin: 15,
      repMax: 20,
      hint: 'Last time 60 kg.',
      prefill: [{ weight: 60, reps: 10 }],
    })
    const [synced] = syncEntries([old], [ex('row', 3, { repMin: 15, repMax: 20 })], [fresh], 'over1').entries
    expect(synced.sets.slice(0, 2)).toEqual(sets)
    expect(synced.repMax).toBe(20)
    expect(synced.hint).toBe('Last time 60 kg.')
    expect(synced.prefill).toEqual(Array.from({ length: 3 }, () => ({ weight: 60, reps: 10 })))
  })

  it('follows the day: its order, new lifts from fresh, untouched lifts that left are gone', () => {
    const session = [entry('row', blank(3)), entry('curl', blank(3))]
    const day = [ex('pull-ups'), ex('row')]
    const fresh = [entry('pull-ups', blank(3), { hint: 'new' })]
    const { entries, kept } = syncEntries(session, day, fresh, 'over1')
    expect(entries.map((e) => e.exerciseId)).toEqual(['pull-ups', 'row'])
    expect(entries[0].hint).toBe('new')
    expect(kept).toEqual([])
  })

  it('keeps a lift that left the plan when a set of it is ticked, at the end, and names it', () => {
    const session = [entry('curl', [ticked, ...blank(2)]), entry('row', blank(3))]
    const { entries, kept } = syncEntries(session, [ex('row')], [], 'over1')
    expect(entries.map((e) => e.exerciseId)).toEqual(['row', 'curl'])
    expect(kept).toEqual(['curl'])
  })

  it('takes the plan version of a lift it already had, and grows its sets', () => {
    const session = [entry('row', [ticked, ...blank(2)], { prefill: [{ weight: 60, reps: 10 }] })]
    const day = [ex('row', 5, { name: 'Barbell Row', repMin: 6, repMax: 10 })]
    const [row] = syncEntries(session, day, [], 'over1').entries
    expect(row.name).toBe('Barbell Row')
    expect([row.repMin, row.repMax]).toEqual([6, 10])
    expect(row.sets).toHaveLength(5)
    expect(row.sets[0]).toEqual(ticked)
    expect(row.prefill).toHaveLength(5)
  })

  it('shrinks unticked sets to the plan, but never below the last ticked one', () => {
    const session = [entry('row', [...blank(2), ticked, ...blank(2)])]
    const [row] = syncEntries(session, [ex('row', 2)], [], 'over1').entries
    expect(row.sets).toHaveLength(3)
    expect(row.sets[2]).toEqual(ticked)
  })
})

describe('swapEntries', () => {
  it('puts the new lift in the old one’s place when nothing of it is ticked', () => {
    const session = [entry('row', blank(3)), entry('leg-press', blank(3)), entry('curl', blank(3))]
    const fresh = entry('hack-squat', blank(3), { hint: 'new' })
    const out = swapEntries(session, 'leg-press', fresh)
    expect(out.map((e) => e.exerciseId)).toEqual(['row', 'hack-squat', 'curl'])
    expect(out[1].hint).toBe('new')
  })

  it('keeps the ticked sets as the old lift and puts the new one right after it', () => {
    const old = entry('leg-press', [ticked, ticked, ...blank(2)], {
      prefill: [{ weight: 100 }, { weight: 100 }, { weight: 100 }, { weight: 100 }],
    })
    const out = swapEntries([entry('row', blank(3)), old], 'leg-press', entry('hack-squat', blank(2)))
    expect(out.map((e) => e.exerciseId)).toEqual(['row', 'leg-press', 'hack-squat'])
    expect(out[1].sets).toEqual([ticked, ticked])
    expect(out[1].prefill).toHaveLength(2)
    expect(out[2].sets).toHaveLength(2)
  })

  it('throws for a lift the session does not have', () => {
    expect(() => swapEntries([entry('row', blank(3))], 'curl', entry('x', blank(1)))).toThrow('Exercise not found')
  })

  it('gives the new lift the sets that were left, at least one', () => {
    expect(setsLeft(entry('leg-press', [ticked, ...blank(3)]))).toBe(3)
    expect(setsLeft(entry('leg-press', [ticked, ticked]))).toBe(1)
  })
})
