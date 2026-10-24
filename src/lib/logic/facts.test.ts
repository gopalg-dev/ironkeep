import { describe, expect, it } from '@jest/globals'
import { liftStart, type PastEntry } from '@/lib/logic/facts'
import { stepsOf } from '@/lib/logic/progression'
import type { LoggedSet, WorkoutEntry } from '@/lib/types'

const bench = { repMin: 5, repMax: 8, muscle: 'chest', loadType: 'weight' } as const
const curl = { repMin: 10, repMax: 12, muscle: 'biceps', loadType: 'weight' } as const
const pullups = { repMin: 6, repMax: 12, muscle: 'back', loadType: 'bodyweight' } as const
const plank = { repMin: 30, repMax: 45, muscle: 'abs', loadType: 'time' } as const

function entry(sets: LoggedSet[]): WorkoutEntry {
  return { exerciseId: 'x', name: 'x', muscle: 'chest', loadType: 'weight', repMin: 5, repMax: 8, sets }
}

/** One past session of a weight lift at one weight, with the reps per set. */
function session(
  weight: number,
  reps: number[],
  effort?: number,
  range: Pick<WorkoutEntry, 'repMin' | 'repMax'> = bench,
): PastEntry {
  return { entry: { ...entry(reps.map((r) => ({ weight, reps: r, done: true }))), ...range }, effort }
}

describe('liftStart, weight lifts', () => {
  it('starts blank with no history, and never sets a target', () => {
    const s = liftStart(bench, 4, [], 'kg')
    expect(s.sets).toHaveLength(4)
    expect(s.sets.every((x) => !x.done && x.weight === undefined)).toBe(true)
    expect(s.prefill).toBeUndefined()
    expect(s.hint).toBeUndefined()
  })

  it("starts a barbell lift's first set at the empty bar and says the bar counts; curls start blank", () => {
    const s = liftStart(bench, 3, [], 'kg', { equipment: 'barbell', bar: 20 })
    expect(s.prefill).toEqual([{ weight: 20 }, {}, {}])
    expect(s.hint).toBe('First session: log the whole weight, bar included. The empty bar is 20 kg.')
    expect(liftStart(bench, 3, [], 'lb', { equipment: 'barbell', bar: 45 }).hint).toContain('The empty bar is 45 lb.')
    // An EZ or fixed bar is lighter than the Olympic one; dumbbells have no bar.
    expect(liftStart(curl, 3, [], 'kg', { equipment: 'barbell', bar: 20 }).prefill).toBeUndefined()
    expect(liftStart(bench, 3, [], 'kg', { equipment: 'dumbbell', bar: 20 }).prefill).toBeUndefined()
  })

  it("prefills last time's sets, the last one carried into sets it did not have", () => {
    const s = liftStart(bench, 4, [session(60, [8, 7, 6])], 'kg')
    expect(s.prefill).toEqual([
      { weight: 60, reps: 8 },
      { weight: 60, reps: 7 },
      { weight: 60, reps: 6 },
      { weight: 60, reps: 6 },
    ])
    expect(s.hint).toBe('Last time 60 kg × 8, 7, 6.')
    // A pyramid keeps each rung.
    const pyramid: PastEntry = {
      entry: entry([
        { weight: 40, reps: 12, done: true },
        { weight: 50, reps: 10, done: true },
        { weight: 60, reps: 8, done: true },
      ]),
    }
    const p = liftStart({ ...bench, repMin: 8, repMax: 12 }, 3, [pyramid], 'kg')
    expect(p.prefill?.map((x) => x.weight)).toEqual([40, 50, 60])
    expect(p.hint).toBe('Last time 40 × 12, 50 × 10, 60 kg × 8.')
  })

  it('says when every set reached the top, and how big the next step is when it is over a tenth', () => {
    const s = liftStart(bench, 3, [session(100, [8, 8, 8])], 'kg', { equipment: 'barbell' })
    expect(s.hint).toBe('Last time 100 kg × 8, 8, 8. Top of the range on every set.')
    expect(s.prefill?.[0]).toEqual({ weight: 100, reps: 8 })
    // The 5 kg preacher curl that was told 10 kg: now it says the step doubles the load, and asks nothing.
    const preacher = liftStart(curl, 3, [session(5, [12, 12, 12], undefined, curl)], 'kg', { equipment: 'barbell' })
    expect(preacher.hint).toBe(
      'Last time 5 kg × 12, 12, 12. Top of the range on every set. The next step, 10 kg, is 100% more.',
    )
    expect(preacher.prefill?.map((x) => x.weight)).toEqual([5, 5, 5])
    // With 1.25 kg plates the step is 2.5 kg.
    const small = { equipment: 'barbell', steps: { ...stepsOf({ units: 'kg' }), plates: 1.25 } } as const
    expect(liftStart(curl, 3, [session(5, [12, 12, 12], undefined, curl)], 'kg', small).hint).toContain(
      'The next step, 7.5 kg, is 50% more.',
    )
    // Fewer sets than planned is not every set.
    expect(liftStart(bench, 4, [session(100, [8, 8, 8])], 'kg').hint).toBe('Last time 100 kg × 8, 8, 8.')
  })

  it('counts the sessions in a row at one weight, and whether the reps climbed there', () => {
    const flat = [session(60, [7, 6, 6]), session(60, [7, 6, 6]), session(60, [7, 6, 6])]
    expect(liftStart(bench, 3, flat, 'kg').hint).toBe('Last time 60 kg × 7, 6, 6. Same weight for 3 sessions.')
    const climbing = [session(60, [7, 7, 6]), session(60, [7, 6, 6]), session(60, [6, 6, 6])]
    expect(liftStart(bench, 3, climbing, 'kg').hint).toBe(
      'Last time 60 kg × 7, 7, 6. Same weight for 3 sessions, reps climbing.',
    )
    // Two at one weight is not a run yet; a heavier session before it ends the run.
    expect(liftStart(bench, 3, flat.slice(0, 2), 'kg').hint).toBe('Last time 60 kg × 7, 6, 6.')
    expect(liftStart(bench, 3, [...flat.slice(0, 2), session(65, [5, 5, 5])], 'kg').hint).toBe(
      'Last time 60 kg × 7, 6, 6.',
    )
    // The history reads six sessions back: six or more reads "6+".
    const six = Array.from({ length: 6 }, () => session(60, [7, 6, 6]))
    expect(liftStart(bench, 3, six, 'kg').hint).toBe('Last time 60 kg × 7, 6, 6. Same weight for 6+ sessions.')
  })

  it('says when the last session was rated too much', () => {
    expect(liftStart(bench, 3, [session(60, [5, 4, 3], 4)], 'kg').hint).toBe(
      'Last time 60 kg × 5, 4, 3. Rated too much.',
    )
  })

  it('treats a session with nothing ticked like no history', () => {
    const past: PastEntry = { entry: entry([{ weight: 60, reps: 8, done: false }]) }
    expect(liftStart(bench, 3, [past], 'kg').hint).toBeUndefined()
  })

  it('carries the newest sets across ranges without declaring the new range complete', () => {
    const start = liftStart(bench, 3, [session(40, [12, 12, 12], undefined, { repMin: 10, repMax: 15 })], 'kg')
    expect(start.prefill).toEqual(Array.from({ length: 3 }, () => ({ weight: 40, reps: 12 })))
    expect(start.hint).not.toContain('Top of the range')
    expect(start.hint).not.toContain('next step')
  })
})

describe('liftStart, bodyweight and timed work', () => {
  const bw = (reps: number[]): PastEntry => ({
    entry: { ...entry(reps.map((r) => ({ reps: r, done: true }))), ...pullups },
  })

  it('repeats last time and says when every set reached the top', () => {
    const s = liftStart(pullups, 3, [bw([8, 7, 6])], 'kg')
    expect(s.prefill).toEqual([{ reps: 8 }, { reps: 7 }, { reps: 6 }])
    expect(s.hint).toBe('Last time 8, 7, 6.')
    expect(liftStart(pullups, 3, [bw([12, 12, 12])], 'kg').hint).toBe(
      'Last time 12, 12, 12. Top of the range on every set.',
    )
  })

  it('names the alternate after three sessions under the range', () => {
    const under = [bw([4, 3, 3]), bw([4, 3, 2]), bw([3, 3, 2])]
    expect(liftStart({ ...pullups, alternates: ['Lat Pulldown'] }, 3, under, 'kg').hint).toBe(
      'Last time 4, 3, 3. Under 6 for 3 sessions. Lat Pulldown is its alternate on Plan.',
    )
    expect(liftStart(pullups, 3, under, 'kg').hint).toBe('Last time 4, 3, 3. Under 6 for 3 sessions.')
  })

  it('repeats a hold in seconds', () => {
    const hold: PastEntry = {
      entry: { ...entry([45, 45].map((seconds) => ({ seconds, done: true }))), ...plank },
    }
    const s = liftStart(plank, 2, [hold], 'kg')
    expect(s.prefill).toEqual([{ seconds: 45 }, { seconds: 45 }])
    expect(s.hint).toBe('Last time 45, 45 s. Top of the range on every set.')
  })
})
