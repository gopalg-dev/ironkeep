import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { eq } from 'drizzle-orm'
import { getDb, setDbForTests } from '@/db/handle'
import * as repo from '@/db/repo'
import { workouts } from '@/db/schema'
import { openTestDb } from '@/db/test-db'
import { must } from '@/lib/must'

// The web app's repository tests, case for case, on an in-memory SQLite (see test-db.ts). The web app keeps
// one database per user; the phone has one user, so the user argument is gone and the per-user cases with it.

let closeDb: () => void = () => {}

beforeEach(() => {
  const { db, close } = openTestDb()
  setDbForTests(db)
  closeDb = close
})

afterEach(() => {
  setDbForTests(undefined)
  closeDb()
})

async function finishSession(dayId: string, fill: (w: Awaited<ReturnType<typeof repo.startWorkout>>) => Promise<void>) {
  const w = await repo.startWorkout(dayId)
  await fill(w)
  return repo.finishWorkout(w.id)
}

describe('settings', () => {
  it('returns defaults before setup', async () => {
    const s = await repo.getSettings()
    expect(s).toEqual({ units: 'kg', trainingAge: 'over1', setupDone: false })
  })

  it('merges partial updates', async () => {
    await repo.saveSettings({ units: 'lb' })
    await repo.saveSettings({ bodyweight: 160, setupDone: true })
    const s = await repo.getSettings()
    expect(s.units).toBe('lb')
    expect(s.bodyweight).toBe(160)
    expect(s.setupDone).toBe(true)
  })

  it('rejects invalid rep ranges when editing a plan', async () => {
    const before = await repo.getPlan()
    await expect(repo.updateExercise('legs-a', 'leg-curl', { repMin: 20 })).rejects.toThrow('rep range')
    expect((await repo.getPlan()).days).toEqual(before.days)
  })

  it('stamps the join date once, when setup first completes', async () => {
    expect((await repo.saveSettings({ units: 'kg' })).joinedAt).toBeUndefined()
    const first = await repo.saveSettings({ setupDone: true })
    expect(first.joinedAt).toBeDefined()
    const again = await repo.saveSettings({ setupDone: true, units: 'lb' })
    expect(again.joinedAt).toBe(first.joinedAt)
  })
})

describe('plan', () => {
  it('seeds the plan once and keeps edits', async () => {
    const plan = await repo.getPlan()
    expect(plan.days.map((d) => d.id)).toEqual(['pull-a', 'push-a', 'legs-a', 'pull-b', 'push-b', 'legs-b'])
    await repo.updateExercise('push-a', 'barbell-bench-press', { sets: 5, note: 'Pause on the chest.' })
    const again = await repo.getPlan()
    const bench = again.days[1].exercises[0]
    expect(bench.sets).toBe(5)
    expect(bench.note).toBe('Pause on the chest.')
  })

  it('swaps an exercise for an alternate and keeps the old one as an alternate', async () => {
    await repo.getPlan()
    const plan = await repo.swapExercise('push-a', 'decline-db-press', 'Weighted Dips')
    const ex = plan.days[1].exercises[2]
    expect(ex.name).toBe('Weighted Dips')
    expect(ex.id).toBe('weighted-dips')
    expect(ex.alternates).toEqual(['Decline DB Press', 'Close-Grip Bench Press', 'Weighted Push-ups'])
  })

  it('a swapped-in alternate brings its own load type and muscle', async () => {
    const plan = await repo.getPlan()
    const day = must(
      plan.days.find((d) => d.exercises.some((e) => e.name === 'Pull-ups')),
      'a day with Pull-ups',
    )
    const pullUps = must(
      day.exercises.find((e) => e.name === 'Pull-ups'),
      'Pull-ups',
    )
    expect(pullUps.loadType).toBe('bodyweight')
    const swapped = await repo.swapExercise(day.id, pullUps.id, 'Lat Pulldown')
    const pulldown = must(
      must(
        swapped.days.find((d) => d.id === day.id),
        'the day',
      ).exercises.find((e) => e.name === 'Lat Pulldown'),
      'Lat Pulldown',
    )
    expect(pulldown.loadType).toBe('weight')
    expect(pulldown.muscle).toBe('back')
    const back = await repo.swapExercise(day.id, pulldown.id, 'Pull-ups')
    expect(
      must(
        must(
          back.days.find((d) => d.id === day.id),
          'the day',
        ).exercises.find((e) => e.name === 'Pull-ups'),
        'Pull-ups',
      ).loadType,
    ).toBe('bodyweight')
    // A name the library does not know is guessed from the words in it.
    const guessed = await repo.swapExercise(day.id, 'pull-ups', 'Deficit Push-ups')
    expect(
      must(
        guessed.days.find((d) => d.id === day.id),
        'the day',
      ).exercises[0].loadType,
    ).toBe('bodyweight')
  })

  it('rejects unknown exercises', async () => {
    await expect(repo.updateExercise('push-a', 'nope', { sets: 3 })).rejects.toThrow()
  })

  it('resets to the seed', async () => {
    await repo.updateExercise('push-a', 'barbell-bench-press', { sets: 9 })
    const plan = await repo.resetPlan()
    expect(plan.days[1].exercises[0].sets).toBe(4)
  })

  it('adds an exercise to a day up to the cap and removes one down to the last', async () => {
    await repo.getPlan()
    await repo.removeExercise('pull-a', 'hammer-curl')
    const added = await repo.addExercise('pull-a', {
      name: 'Barbell Shrug',
      sets: 3,
      repMin: 10,
      repMax: 15,
      muscle: 'back',
      loadType: 'weight',
    })
    const pull = added.days[0]
    expect(pull.exercises.map((e) => e.id)).toContain('barbell-shrug')
    expect(pull.exercises.at(-1)?.name).toBe('Barbell Shrug')
    expect(pull.exercises).toHaveLength(6)
    let full = added
    for (const n of [1, 2, 3, 4]) {
      full = await repo.addExercise('pull-a', {
        name: `Extra Lift ${n}`,
        sets: 3,
        repMin: 8,
        repMax: 12,
        muscle: 'back',
        loadType: 'weight',
      })
    }
    expect(full.days[0].exercises).toHaveLength(10)
    await expect(
      repo.addExercise('pull-a', {
        name: 'One Too Many',
        sets: 3,
        repMin: 8,
        repMax: 12,
        muscle: 'back',
        loadType: 'weight',
      }),
    ).rejects.toThrow(/up to 10/)
    await expect(repo.removeExercise('pull-a', 'nope')).rejects.toThrow()
    for (const { id } of full.days[0].exercises) {
      if (id !== 'barbell-shrug') await repo.removeExercise('pull-a', id)
    }
    // The last one can go too: the day then waits to be filled, and cannot be started.
    const bare = await repo.removeExercise('pull-a', 'barbell-shrug')
    expect(bare.days[0].exercises).toEqual([])
    await expect(repo.startWorkout('pull-a')).rejects.toThrow(/no lifts yet/)
  })

  it('starts a split with empty days on request, in place of the plan it had, and the template stays whole', async () => {
    await repo.applySplit('ul4')
    await repo.updateExercise('upper-a', 'barbell-bench-press', { sets: 5 })
    const empty = await repo.applySplit('ul4', { empty: true })
    expect(empty.days.map((d) => d.id)).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b'])
    expect(empty.days.every((d) => d.exercises.length === 0)).toBe(true)
    expect((await repo.getPlan()).days[0].exercises).toEqual([])
    // Reset brings the template's lifts back; the template itself was never touched.
    expect((await repo.resetPlan()).days[0].exercises[0].sets).toBe(4)
    // A plan of your own can start empty too.
    const own = await repo.createCustomPlan(['push', 'pull'], { empty: true })
    expect(own.days.map((d) => [d.name, d.exercises.length])).toEqual([
      ['Push', 0],
      ['Pull', 0],
    ])
  })

  it('reorders a day and refuses an order that drops or repeats an exercise', async () => {
    const plan = await repo.getPlan()
    const ids = plan.days[0].exercises.map((e) => e.id)
    const reversed = [...ids].reverse()
    const next = await repo.reorderExercises(plan.days[0].id, reversed)
    expect(next.days[0].exercises.map((e) => e.id)).toEqual(reversed)
    expect((await repo.getPlan()).days[0].exercises.map((e) => e.id)).toEqual(reversed)
    await expect(repo.reorderExercises(plan.days[0].id, ids.slice(1))).rejects.toThrow(/every exercise/)
    await expect(repo.reorderExercises(plan.days[0].id, [ids[0], ...ids.slice(0, -1)])).rejects.toThrow(
      /every exercise/,
    )
    await expect(repo.reorderExercises('nope', ids)).rejects.toThrow(/Day not found/)
  })

  it('switches to another split and resets to that one from then on', async () => {
    const plan = await repo.applySplit('ul4')
    expect(plan.days.map((d) => d.id)).toEqual(['upper-a', 'lower-a', 'upper-b', 'lower-b'])
    expect((await repo.getSettings()).split).toBe('ul4')
    await repo.updateExercise('upper-a', 'barbell-bench-press', { sets: 9 })
    const reset = await repo.resetPlan()
    expect(reset.days).toHaveLength(4)
    expect(reset.days[0].exercises[0].sets).toBe(4)
    // A split set in settings before any plan exists seeds from it.
    await repo.startFresh()
    await repo.saveSettings({ split: 'full3' })
    expect((await repo.getPlan()).days.map((d) => d.type)).toEqual(['full', 'full', 'full'])
  })

  it("keeps each split's plan: coming back finds the edits, every other split is untouched", async () => {
    await repo.saveSettings({ split: 'arnold6' })
    await repo.updateExercise('chest-back-a', 'barbell-bench-press', { sets: 9 })
    await repo.applySplit('ul4')
    expect((await repo.getPlan()).days[0].exercises[0].sets).toBe(4)
    await repo.updateExercise('upper-a', 'barbell-bench-press', { sets: 7 })
    const back = await repo.applySplit('arnold6')
    expect(back.days[0].exercises[0].sets).toBe(9)
    expect((await repo.applySplit('ul4')).days[0].exercises[0].sets).toBe(7)
    // Reset only touches the split the user is on.
    await repo.resetPlan()
    expect((await repo.getPlan()).days[0].exercises[0].sets).toBe(4)
    expect((await repo.applySplit('arnold6')).days[0].exercises[0].sets).toBe(9)
    // Picking the same split again changes nothing.
    expect((await repo.applySplit('arnold6')).days[0].exercises[0].sets).toBe(9)
  })

  it('adds, renames, moves and removes days, and keeps the last one', async () => {
    await repo.applySplit('ppl3')
    let plan = await repo.addDay('arms')
    expect(plan.days.map((d) => d.name)).toEqual(['Pull A', 'Push A', 'Legs A', 'Arms'])
    expect(plan.days[3].exercises.map((e) => e.name)).toContain('Barbell Curl')
    plan = await repo.updateDay('arms', { name: 'Arm day', type: 'upper' })
    expect(plan.days[3]).toMatchObject({ name: 'Arm day', type: 'upper' })
    plan = await repo.moveDay('arms', 'up')
    expect(plan.days.map((d) => d.id)).toEqual(['pull-a', 'push-a', 'arms', 'legs-a'])
    plan = await repo.moveDay('pull-a', 'up')
    expect(plan.days[0].id).toBe('pull-a')
    plan = await repo.removeDay('arms')
    expect(plan.days).toHaveLength(3)
    await repo.removeDay('push-a')
    await repo.removeDay('legs-a')
    await expect(repo.removeDay('pull-a')).rejects.toThrow(/at least one/)
    await expect(repo.updateDay('nope', { name: 'x' })).rejects.toThrow()
    // On a weekday schedule a new day gets a weekday of its own.
    await repo.setSchedule('weekday')
    plan = await repo.addDay('legs')
    expect(plan.days.every((d) => d.weekday !== undefined)).toBe(true)
  })

  it('builds a plan of your own in the custom slot', async () => {
    await expect(repo.applySplit('custom')).rejects.toThrow(/No plan of your own/)
    const plan = await repo.createCustomPlan(['upper', 'lower', 'upper', 'lower'])
    expect(plan.days.map((d) => d.name)).toEqual(['Upper A', 'Lower A', 'Upper B', 'Lower B'])
    expect((await repo.getSettings()).split).toBe('custom')
    expect(await repo.planSlots()).toEqual([{ split: 'custom', days: 4 }])
    // Away to a template and back by name, with the plan as it was.
    await repo.applySplit('ul4')
    expect((await repo.applySplit('custom')).days.map((d) => d.name)).toEqual([
      'Upper A',
      'Lower A',
      'Upper B',
      'Lower B',
    ])
    expect((await repo.planSlots()).map((s) => s.split).sort()).toEqual(['custom', 'ul4'])
    // A template keeps its own plan beside it.
    expect((await repo.applySplit('ppl6')).days).toHaveLength(6)
    await repo.saveSettings({ split: 'custom' })
    expect((await repo.getPlan()).days).toHaveLength(4)
  })

  it('gives an uploaded plan its own slot and has no template to reset it to', async () => {
    const days = (await repo.getPlan()).days.slice(0, 2)
    await repo.replacePlan(days)
    expect((await repo.getSettings()).split).toBe('custom')
    expect((await repo.getPlan()).days).toHaveLength(2)
    await expect(repo.resetPlan()).rejects.toThrow(/no template/)
    // Away and back: the uploaded days are still there, and the default split kept its plan.
    expect((await repo.applySplit('ppl6')).days).toHaveLength(6)
    await repo.saveSettings({ split: 'custom' })
    expect((await repo.getPlan()).days).toHaveLength(2)
  })
})

describe('workouts', () => {
  it('starts a workout with planned sets and no history', async () => {
    const w = await repo.startWorkout('pull-a')
    expect(w.status).toBe('in_progress')
    expect(w.entries).toHaveLength(6)
    expect(w.entries[0].sets).toHaveLength(4)
    expect(w.entries[0].hint).toBeUndefined()
    expect(await repo.getActiveWorkout()).not.toBeNull()
  })

  it('caps sets at three for beginners', async () => {
    await repo.saveSettings({ trainingAge: 'under1' })
    const w = await repo.startWorkout('pull-a')
    expect(w.entries[0].sets).toHaveLength(3)
    expect(w.entries[2].sets).toHaveLength(3)
  })

  it('marks a plate-loaded machine, so it steps like a barbell', async () => {
    await repo.applySplit('ul4')
    const w = await repo.startWorkout('lower-a')
    const byName = (name: string) =>
      must(
        w.entries.find((e) => e.name === name),
        name,
      )
    expect(byName('Leg Press')).toMatchObject({ equipment: 'machine', plateLoaded: true })
    expect(byName('Leg Curl').plateLoaded).toBeUndefined()
    expect(byName('Barbell Squat').plateLoaded).toBeUndefined()
  })

  it('replaces an unfinished workout when a new one starts', async () => {
    const first = await repo.startWorkout('pull-a')
    const second = await repo.startWorkout('push-a')
    const active = await repo.getActiveWorkout()
    expect(active?.id).toBe(second.id)
    expect(active?.id).not.toBe(first.id)
  })

  it('deletes a workout finished with nothing checked', async () => {
    const w = await repo.startWorkout('pull-a')
    const res = await repo.finishWorkout(w.id)
    expect(res.finished).toBe(false)
    expect(await repo.getActiveWorkout()).toBeNull()
    expect(await repo.listWorkouts()).toHaveLength(0)
  })

  it('saves sets, finishes, and advances to the next day', async () => {
    await finishSession('pull-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-row', [
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
      ])
    })
    const today = await repo.getTodayData()
    expect(today.active).toBeNull()
    expect(today.nextDayId).toBe('push-a')
    expect(today.lastFinished?.dayName).toBe('Pull A')
    const done = await repo.listWorkouts()
    expect(done).toHaveLength(1)
    expect(done[0].status).toBe('done')
  })

  it('prefills the next session from the last one and states the facts, never a target', async () => {
    await finishSession('pull-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-row', [
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
        { weight: 60, reps: 10, done: true },
      ])
      await repo.saveEntrySets(w.id, 'pull-ups', [
        { reps: 8, done: true },
        { reps: 7, done: true },
        { reps: 6, done: true },
        { reps: 6, done: true },
      ])
    })
    const next = await repo.startWorkout('pull-a')
    const row = must(
      next.entries.find((e) => e.exerciseId === 'barbell-row'),
      'the Barbell Row entry',
    )
    // Last time sits beside blank sets: nothing is logged until a set is marked done.
    expect(row.sets).toEqual([{ done: false }, { done: false }, { done: false }, { done: false }])
    expect(row.prefill?.map((s) => [s.weight, s.reps])).toEqual([
      [60, 10],
      [60, 10],
      [60, 10],
      [60, 10],
    ])
    // Every set at the top of 6-10; the next step, 5 kg, is under a tenth of 60, so its size goes unsaid.
    expect(row.hint).toBe('Last time 60 kg × 10, 10, 10, 10. Top of the range on every set.')
    const pullups = must(
      next.entries.find((e) => e.exerciseId === 'pull-ups'),
      'the Pull-ups entry',
    )
    expect(pullups.prefill?.map((s) => s.reps)).toEqual([8, 7, 6, 6])
    expect(pullups.hint).toBe('Last time 8, 7, 6, 6.')
  })

  it('a lift on two days follows one line: the newest session leads, whichever day it was on', async () => {
    // Legs twice a week with the leg press on both days, as the user trains (2026-10-21): Wednesday's 20 kg × 15s
    // topped the range, Saturday went up, and the next Wednesday must carry on from Saturday, not last Wednesday.
    const plan = await repo.getPlan()
    const press = must(
      plan.days[2].exercises.find((e) => e.id === 'leg-press'),
      'Leg Press',
    )
    const legs = (id: string, name: string) => ({ ...plan.days[2], id, name, exercises: [{ ...press }] })
    await repo.replacePlan([legs('legs-wed', 'Legs Wednesday'), legs('legs-sat', 'Legs Saturday')])
    await finishSession('legs-wed', async (w) => {
      await repo.saveEntrySets(
        w.id,
        'leg-press',
        [20, 20, 20].map((weight) => ({ weight, reps: 15, done: true })),
      )
    })
    // Saturday starts from Wednesday: every set at the top of 10-15, and a plate each side is a quarter more.
    const sat = await repo.startWorkout('legs-sat')
    expect(sat.entries[0].prefill?.map((s) => s.weight)).toEqual([20, 20, 20])
    expect(sat.entries[0].hint).toBe(
      'Last time 20 kg × 15, 15, 15. Top of the range on every set. The next step, 25 kg, is 25% more.',
    )
    await repo.saveEntrySets(
      sat.id,
      'leg-press',
      [12, 10, 10].map((reps) => ({ weight: 25, reps, done: true })),
    )
    await repo.finishWorkout(sat.id)
    const wed = await repo.startWorkout('legs-wed')
    expect(wed.entries[0].hint).toBe('Last time 25 kg × 12, 10, 10.')
    expect(wed.entries[0].prefill).toEqual([
      { weight: 25, reps: 12 },
      { weight: 25, reps: 10 },
      { weight: 25, reps: 10 },
    ])
  })

  it('uses the newest session for an exercise across plan days and rep ranges', async () => {
    // Pull A and Push A both hold a barbell exercise under the same id only in a custom plan; make one.
    const plan = await repo.getPlan()
    const row = must(
      plan.days[0].exercises.find((e) => e.id === 'barbell-row'),
      'Barbell Row',
    )
    const days = [
      { ...plan.days[0], id: 'heavy', name: 'Heavy', exercises: [{ ...row, repMin: 4, repMax: 6 }] },
      { ...plan.days[0], id: 'light', name: 'Light', exercises: [{ ...row, repMin: 10, repMax: 15 }] },
    ]
    await repo.replacePlan(days)
    await finishSession('heavy', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-row', [{ weight: 80, reps: 5, done: true }])
    })
    // Light has no history yet: it borrows Heavy's last session.
    const light = await repo.startWorkout('light')
    expect(light.entries[0].prefill?.[0].weight).toBe(80)
    await repo.saveEntrySets(light.id, 'barbell-row', [{ weight: 50, reps: 15, done: true }])
    await repo.finishWorkout(light.id)
    // A newer session on Light is also the last session for Heavy.
    expect((await repo.startWorkout('heavy')).entries[0].prefill?.[0].weight).toBe(50)
    expect((await repo.startWorkout('light')).entries[0].prefill?.[0].weight).toBe(50)
    // Changing today's range does not make a more recent completed session disappear.
    await repo.updateExercise('light', 'barbell-row', { repMin: 4, repMax: 6 })
    expect((await repo.startWorkout('light')).entries[0].prefill?.[0].weight).toBe(50)
  })

  it('does not reuse history when an exercise changes to another load type', async () => {
    await finishSession('pull-a', async (workout) => {
      await repo.saveEntrySets(workout.id, 'pull-ups', [{ reps: 8, done: true }])
    })
    await repo.updateExercise('pull-a', 'pull-ups', { loadType: 'time', repMin: 30, repMax: 45 })
    const next = await repo.startWorkout('pull-a')
    expect(next.entries.find((entry) => entry.exerciseId === 'pull-ups')?.prefill).toBeUndefined()
  })

  it('refreshes stale active-session history without changing entered sets', async () => {
    await repo.logPastWorkout('legs-a', '2026-01-10T12:00:00.000Z', [
      { exerciseId: 'leg-curl', sets: [{ weight: 25, reps: 14, done: true }] },
    ])
    const active = await repo.startWorkout('legs-a')
    const entry = must(
      active.entries.find((candidate) => candidate.exerciseId === 'leg-curl'),
      'active curl',
    )
    const entered = [
      { weight: 30, reps: 12, done: true },
      { weight: 31, reps: 11, done: false },
    ]
    const db = await getDb()
    await db
      .update(workouts)
      .set({
        entries: [{ ...entry, sets: entered, hint: 'Stale hint', prefill: [{ weight: 10, reps: 5 }] }],
        historyRevision: 0,
      })
      .where(eq(workouts.id, active.id))

    const refreshed = must(await repo.getActiveWorkout(), 'refreshed workout').entries[0]
    expect(refreshed.sets).toEqual(entered)
    expect(refreshed.prefill?.[0]).toEqual({ weight: 25, reps: 14 })
    expect(refreshed.hint).toContain('25 kg')
    expect(refreshed.hint).not.toContain('Stale')
  })

  it('renaming an exercise starts a separate history identity', async () => {
    await finishSession('legs-a', async (workout) => {
      await repo.saveEntrySets(workout.id, 'leg-curl', [{ weight: 50, reps: 12, done: true }])
    })
    await repo.updateExercise('legs-a', 'leg-curl', {
      name: 'Leg Extension',
      muscle: 'quads',
      repMin: 12,
      repMax: 15,
    })
    const next = await repo.startWorkout('legs-a')
    const extension = must(
      next.entries.find((entry) => entry.exerciseId === 'leg-extension'),
      'extension',
    )
    expect(extension.prefill).toBeUndefined()
    expect(extension.hint).toBeUndefined()
  })

  it('discards an in-progress workout', async () => {
    const w = await repo.startWorkout('legs-a')
    await repo.discardWorkout(w.id)
    expect(await repo.getActiveWorkout()).toBeNull()
  })

  it('swaps a lift for today only, in its place, with the new lift’s own range', async () => {
    const w = await repo.startWorkout('legs-a')
    const swapped = await repo.swapSessionExercise(w.id, 'leg-press', 'Hack Squat', false)
    expect(swapped.entries.map((e) => e.exerciseId)).toEqual([
      'barbell-squat',
      'romanian-deadlift',
      'hack-squat',
      'leg-curl',
      'seated-calf-raise',
      'hanging-leg-raise',
    ])
    expect(swapped.entries[2]).toMatchObject({ name: 'Hack Squat', repMin: 8, repMax: 12, plateLoaded: true })
    expect(swapped.entries[2].sets).toHaveLength(3)
    // Today only: the plan still has the leg press.
    const plan = await repo.getPlan()
    expect(plan.days[2].exercises.map((e) => e.id)).toContain('leg-press')
    expect((await repo.getActiveWorkout())?.entries[2].name).toBe('Hack Squat')
  })

  it('keeps the ticked sets of a swapped lift, and can put the swap on the plan too', async () => {
    const w = await repo.startWorkout('legs-a')
    await repo.saveEntrySets(w.id, 'leg-press', [
      { weight: 100, reps: 12, done: true },
      { done: false },
      { done: false },
    ])
    const swapped = await repo.swapSessionExercise(w.id, 'leg-press', 'Hack Squat', true)
    const names = swapped.entries.map((e) => e.name)
    expect(names.slice(2, 4)).toEqual(['Leg Press', 'Hack Squat'])
    expect(swapped.entries[2].sets).toEqual([{ weight: 100, reps: 12, done: true }])
    expect(swapped.entries[3].sets).toHaveLength(2)
    const plan = await repo.getPlan()
    const legs = plan.days[2].exercises
    expect(legs.map((e) => e.id)).not.toContain('leg-press')
    expect(legs.find((e) => e.id === 'hack-squat')).toMatchObject({ sets: 3, repMin: 8, repMax: 12 })
    expect(legs.find((e) => e.id === 'hack-squat')?.alternates).toContain('Leg Press')
  })

  it('never leaves two lifts with one id after a swap, and refuses a swap to the same lift', async () => {
    const w = await repo.startWorkout('legs-a')
    await repo.saveEntrySets(w.id, 'leg-press', [{ weight: 100, reps: 12, done: true }, { done: false }])
    await expect(repo.swapSessionExercise(w.id, 'leg-press', 'Leg Press', false)).rejects.toThrow(
      'Leg Press is the lift already',
    )
    // Hack Squat for the rest, then the hack squat is taken too: back to a leg press, beside the one kept.
    await repo.swapSessionExercise(w.id, 'leg-press', 'Hack Squat', false)
    const again = await repo.swapSessionExercise(w.id, 'hack-squat', 'Leg Press', false)
    const ids = again.entries.map((e) => e.exerciseId)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.filter((id) => id.startsWith('leg-press'))).toEqual(['leg-press', 'leg-press-2'])
    // Each is its own line: sets saved on the new one never land on the kept one.
    await repo.saveEntrySets(w.id, 'leg-press-2', [{ weight: 90, reps: 10, done: true }])
    const active = must(await repo.getActiveWorkout(), 'the session')
    expect(active.entries.find((e) => e.exerciseId === 'leg-press')?.sets).toEqual([
      { weight: 100, reps: 12, done: true },
    ])
    expect(active.entries.find((e) => e.exerciseId === 'leg-press-2')?.sets).toEqual([
      { weight: 90, reps: 10, done: true },
    ])
  })

  it('offers the ramp once a week for a lift on two days, never to a lift swapped in for today only', async () => {
    await repo.saveSettings({ trainingAge: 'over1' })
    const legPress = [12, 12, 12].map((reps) => ({ weight: 100, reps, done: true }))
    for (let i = 0; i < 2; i++) {
      const w = await repo.startWorkout('legs-a')
      await repo.saveEntrySets(w.id, 'leg-press', legPress)
      await repo.finishWorkout(w.id, { effort: 2 })
    }
    // Trained twice in two weeks, completed, rated fine: the leg press earns a set on Legs A.
    const legsA = await repo.startWorkout('legs-a')
    expect(legsA.entries.find((e) => e.exerciseId === 'leg-press')?.rampOffer).toBe(true)
    const took = await repo.acceptRamp(legsA.id, 'leg-press')
    expect(took.sets).toHaveLength(4)
    await repo.discardWorkout(legsA.id)
    // The same lift on Legs B too: one set a week for the lift, so Legs B gets no second offer.
    await repo.addExercise('legs-b', {
      name: 'Leg Press',
      sets: 3,
      repMin: 10,
      repMax: 15,
      muscle: 'quads',
      loadType: 'weight',
    })
    const legsB = await repo.startWorkout('legs-b')
    expect(legsB.entries.find((e) => e.exerciseId === 'leg-press')?.rampOffer).toBeUndefined()
    await repo.discardWorkout(legsB.id)
    // Swapped into Push A for today only: the lift's history earns a set, but there is no plan line to raise.
    const push = await repo.startWorkout('push-a')
    await repo.resetRamp()
    const swapped = await repo.swapSessionExercise(push.id, 'barbell-bench-press', 'Leg Press', false)
    expect(swapped.entries.find((e) => e.exerciseId === 'leg-press')?.rampOffer).toBeUndefined()
    await expect(repo.acceptRamp(push.id, 'leg-press')).rejects.toThrow('No set to add')
    await repo.discardWorkout(push.id)
  })

  it('gives a ramped lift its set for today when the plan day lost the lift mid-session', async () => {
    await repo.saveSettings({ trainingAge: 'over1' })
    const legPress = [12, 12, 12].map((reps) => ({ weight: 100, reps, done: true }))
    for (let i = 0; i < 2; i++) {
      const w = await repo.startWorkout('legs-a')
      await repo.saveEntrySets(w.id, 'leg-press', legPress)
      await repo.finishWorkout(w.id, { effort: 2 })
    }
    const w = await repo.startWorkout('legs-a')
    await repo.saveEntrySets(w.id, 'leg-press', [
      { weight: 100, reps: 12, done: true },
      { done: false },
      { done: false },
    ])
    await repo.removeExercise('legs-a', 'leg-press')
    const { kept } = await repo.syncSession()
    expect(kept).toEqual(['Leg Press'])
    const took = await repo.acceptRamp(w.id, 'leg-press')
    expect(took.sets).toHaveLength(4)
    expect((await repo.getPlan()).days[2].exercises.some((e) => e.id === 'leg-press')).toBe(false)
  })

  it('a session can lose every lift to "Plan and today" once its day is emptied, and cannot be started again', async () => {
    const w = await repo.startWorkout('legs-a')
    for (const e of w.entries) await repo.removeExercise('legs-a', e.exerciseId)
    const { workout, kept } = await repo.syncSession()
    expect(workout.entries).toEqual([])
    expect(kept).toEqual([])
    // Nothing ticked: finishing throws the empty session away; a new one cannot start on the empty day.
    expect((await repo.finishWorkout(w.id)).finished).toBe(false)
    await expect(repo.startWorkout('legs-a')).rejects.toThrow(/no lifts yet/)
  })

  it('pauses and resumes a session, and its minutes leave the pause out', async () => {
    const w = await repo.startWorkout('pull-a')
    const paused = await repo.pauseWorkout(w.id, true)
    expect(paused.pausedAt).toBeDefined()
    expect((await repo.getActiveWorkout())?.pausedAt).toBe(paused.pausedAt)
    const resumed = await repo.pauseWorkout(w.id, false)
    expect(resumed.pausedAt).toBeUndefined()
    expect(resumed.pausedMs).toBeGreaterThanOrEqual(0)
    expect((await repo.getActiveWorkout())?.pausedAt).toBeUndefined()
    // Finished while paused: the pause closes with the session.
    await repo.pauseWorkout(w.id, true)
    await repo.saveEntrySets(w.id, 'pull-ups', [{ reps: 8, done: true }])
    await repo.finishWorkout(w.id)
    const [done] = await repo.listWorkouts()
    expect(done.pausedAt).toBeUndefined()
    expect(done.pausedMs).toBeGreaterThanOrEqual(0)
  })

  it('records a dismissed alert, keeps it out of Today, and prunes old dismissals', async () => {
    // Pre-seed an old dismissal (over 90 days) alongside dismissing one now.
    await repo.saveSettings({
      alertsDismissed: { 'week:ancient': new Date(Date.now() - 100 * 86_400_000).toISOString() },
    })
    await repo.dismissAlert('stall:barbell-row')
    const settings = await repo.getSettings()
    expect(settings.alertsDismissed?.['stall:barbell-row']).toBeDefined()
    expect(settings.alertsDismissed?.['week:ancient']).toBeUndefined()
    // A dismissed key never appears on Today; the dismissal survives in settings.
    const today = await repo.getTodayData()
    expect(today.alerts.some((a) => a.key === 'stall:barbell-row')).toBe(false)
  })

  it('stores the finish check-in', async () => {
    const w = await repo.startWorkout('pull-a')
    await repo.saveEntrySets(w.id, 'pull-ups', [{ reps: 8, done: true }])
    await repo.finishWorkout(w.id, { effort: 3, note: 'Grip gave out' })
    const [done] = await repo.listWorkouts()
    expect(done.effort).toBe(3)
    expect(done.note).toBe('Grip gave out')
  })

  it('edits sets of a finished session and ignores unknown exercises', async () => {
    const w = await repo.startWorkout('pull-a')
    await repo.saveEntrySets(w.id, 'pull-ups', [{ reps: 8, done: true }])
    await repo.finishWorkout(w.id)
    const updated = await repo.updateWorkoutSets(w.id, [
      { exerciseId: 'pull-ups', sets: [{ reps: 9, done: true }] },
      { exerciseId: 'not-in-plan', sets: [{ reps: 99, done: true }] },
    ])
    expect(updated.entries.find((e) => e.exerciseId === 'pull-ups')?.sets).toEqual([{ reps: 9, done: true }])
    expect(updated.entries.some((e) => e.exerciseId === 'not-in-plan')).toBe(false)
    const [stored] = await repo.listWorkouts()
    expect(stored.entries.find((e) => e.exerciseId === 'pull-ups')?.sets[0].reps).toBe(9)
  })

  it('deletes a finished session', async () => {
    const w = await repo.startWorkout('pull-a')
    await repo.saveEntrySets(w.id, 'pull-ups', [{ reps: 8, done: true }])
    await repo.finishWorkout(w.id)
    await repo.deleteWorkout(w.id)
    expect(await repo.listWorkouts()).toHaveLength(0)
    expect((await repo.getTodayData()).lastFinished).toBeNull()
  })

  it('measures a new best against every session ever, not just the year the pages load', async () => {
    // A squat of 120 × 5 logged 400 days ago: out of the year Stats loads, still the best to beat.
    const longAgo = new Date(Date.now() - 400 * 86_400_000).toISOString()
    await repo.logPastWorkout('legs-a', longAgo, [
      { exerciseId: 'barbell-squat', sets: [{ weight: 120, reps: 5, done: true }] },
    ])
    const stats = await repo.getStatsData()
    expect(stats.workouts).toHaveLength(0)
    expect(stats.bestBefore['barbell-squat']).toBeCloseTo(120 * (1 + 5 / 30))
    const lower = await finishSession('legs-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-squat', [{ weight: 100, reps: 8, done: true }])
    })
    expect(lower.summary?.lines.find((l) => l.exerciseId === 'barbell-squat')?.pr).toBe(false)
    // Better than this year's sessions, still short of the old best: not a new best.
    const climbing = await finishSession('legs-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-squat', [{ weight: 110, reps: 8, done: true }])
    })
    expect(climbing.summary?.lines.find((l) => l.exerciseId === 'barbell-squat')?.pr).toBe(false)
    const higher = await finishSession('legs-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-squat', [{ weight: 125, reps: 5, done: true }])
    })
    expect(higher.summary?.lines.find((l) => l.exerciseId === 'barbell-squat')?.pr).toBe(true)
  })

  it('skips a day on the rolling order, until a later session is finished', async () => {
    await repo.skipDay('pull-a')
    expect((await repo.getTodayData()).nextDayId).toBe('push-a')
    await expect(repo.skipDay('not-a-day')).rejects.toThrow('Day not found')
    await finishSession('legs-a', async (w) => {
      await repo.saveEntrySets(w.id, 'barbell-squat', [{ weight: 100, reps: 5, done: true }])
    })
    expect((await repo.getTodayData()).nextDayId).toBe('pull-b')
  })

  it('drafts a session for an earlier day with targets, and logs it dated that day', async () => {
    await finishSession('pull-a', async (w) => {
      await repo.saveEntrySets(w.id, 'pull-ups', [
        { reps: 8, done: true },
        { reps: 8, done: true },
        { reps: 8, done: true },
      ])
    })
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    twoDaysAgo.setHours(12, 0, 0, 0)
    const at = twoDaysAgo.toISOString()
    const draft = await repo.draftWorkout('pull-a', at)
    expect(draft.status).toBe('done')
    expect(draft.startedAt).toBe(at)
    expect(draft.finishedAt).toBe(at)
    expect(draft.entries.every((e) => e.sets.every((s) => !s.done))).toBe(true)
    expect(draft.entries.find((e) => e.exerciseId === 'pull-ups')?.prefill).toBeUndefined()
    expect(draft.entries.some((e) => e.rampOffer)).toBe(false)
    // Nothing is stored until the sets come back.
    expect(await repo.listWorkouts()).toHaveLength(1)
    await expect(repo.logPastWorkout('pull-a', at, [])).rejects.toThrow('Nothing is ticked')
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString()
    await expect(repo.draftWorkout('pull-a', tomorrow)).rejects.toThrow('has not happened')

    const logged = await repo.logPastWorkout('pull-a', at, [
      { exerciseId: 'pull-ups', sets: [{ reps: 9, done: true }] },
    ])
    expect(logged.finishedAt).toBe(at)
    const stored = await repo.listWorkouts()
    expect(stored).toHaveLength(2)
    // Newest first: the live session, then the one logged for two days ago.
    expect(stored[1].id).toBe(logged.id)
    expect(stored[1].entries.find((e) => e.exerciseId === 'pull-ups')?.sets).toEqual([{ reps: 9, done: true }])
    // The live session is still the last one finished, so the order has not moved back.
    expect((await repo.getTodayData()).nextDayId).toBe('push-a')
  })

  it('tells today when the last weigh-in and tape were', async () => {
    const before = await repo.getTodayData()
    expect(before.lastBodyweightAt).toBeNull()
    expect(before.lastMeasurementAt).toBeNull()
    await repo.logBodyweight(72)
    await repo.logMeasurement({ waist: 80 })
    const after = await repo.getTodayData()
    expect(after.lastBodyweightAt).not.toBeNull()
    expect(after.lastMeasurementAt).not.toBeNull()
  })
})

describe('body logs', () => {
  it('stores bodyweight by day and keeps settings in sync', async () => {
    await repo.logBodyweight(72.4, '2026-10-09')
    const second = await repo.logBodyweight(72.8, '2026-10-10')
    expect(second.replaced).toBe(false)
    const logs = await repo.listBodyweights()
    expect(logs.map((l) => l.weight)).toEqual([72.4, 72.8])
    expect((await repo.getSettings()).bodyweight).toBe(72.8)
  })

  it('keeps a backfilled weigh-in on its own day and leaves the current weight alone', async () => {
    await repo.logBodyweight(72, '2026-10-10', new Date(2026, 9, 10, 8))
    const missed = new Date(2026, 9, 3, 12)
    const log = await repo.logBodyweight(70, '2026-10-03', missed)
    expect(log.date).toBe(missed.toISOString())
    expect(log.replaced).toBe(false)
    expect((await repo.listBodyweights()).map((l) => l.weight)).toEqual([70, 72])
    expect((await repo.getSettings()).bodyweight).toBe(72)
  })

  it('replaces a weigh-in logged twice on the same day', async () => {
    await repo.logBodyweight(72.4, '2026-10-10')
    const again = await repo.logBodyweight(73, '2026-10-10')
    expect(again.replaced).toBe(true)
    const logs = await repo.listBodyweights()
    expect(logs).toHaveLength(1)
    expect(logs[0].weight).toBe(73)
  })

  it('edits and deletes a weigh-in', async () => {
    const log = await repo.logBodyweight(72.4, '2026-10-10')
    await repo.updateBodyweight(log.id, 71.9)
    expect((await repo.listBodyweights())[0].weight).toBe(71.9)
    expect((await repo.getSettings()).bodyweight).toBe(71.9)
    await repo.deleteBodyweight(log.id)
    expect(await repo.listBodyweights()).toEqual([])
    await expect(repo.updateBodyweight(log.id, 70)).rejects.toThrow()
  })

  it('stores measurements and merges a second entry on the same day', async () => {
    await repo.logMeasurement({ arm: 36, chest: 98 }, '2026-10-10')
    const again = await repo.logMeasurement({ waist: 80 }, '2026-10-10')
    expect(again.replaced).toBe(true)
    const logs = await repo.listMeasurements()
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ arm: 36, chest: 98, waist: 80 })
  })

  it('edits and deletes a tape entry', async () => {
    const log = await repo.logMeasurement({ arm: 36, chest: 98, waist: 80 }, '2026-10-10')
    await repo.updateMeasurement(log.id, { waist: 79 })
    expect((await repo.listMeasurements())[0]).toMatchObject({ arm: 36, waist: 79 })
    await repo.deleteMeasurement(log.id)
    expect(await repo.listMeasurements()).toEqual([])
  })

  it('bundles everything the stats screen needs', async () => {
    const data = await repo.getStatsData()
    expect(data.plan.days).toHaveLength(6)
    expect(data.workouts).toEqual([])
    expect(data.bodyweights).toEqual([])
  })
})

describe('start fresh', () => {
  it('start fresh wipes everything and setup runs again', async () => {
    await repo.saveSettings({ setupDone: true, units: 'lb' })
    const w = await repo.startWorkout('pull-a')
    await repo.saveEntrySets(w.id, 'pull-ups', [{ reps: 8, done: true }])
    await repo.finishWorkout(w.id)
    await repo.logBodyweight(72, '2026-10-10')
    await repo.logMeasurement({ waist: 80 }, '2026-10-10')

    await repo.startFresh()
    expect(await repo.getSettings()).toEqual({ units: 'kg', trainingAge: 'over1', setupDone: false })
    expect(await repo.listWorkouts()).toEqual([])
    expect(await repo.listBodyweights()).toEqual([])
    expect(await repo.listMeasurements()).toEqual([])
    expect((await repo.getPlan()).days).toHaveLength(6)
  })
})
