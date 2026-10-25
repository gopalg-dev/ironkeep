import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { BACKUP_APP, dataCounts, exportBackup, getPref, isBackup, restoreBackup, setPref } from '@/db/backup'
import { setDbForTests } from '@/db/handle'
import * as repo from '@/db/repo'
import { openTestDb } from '@/db/test-db'
import type { Workout } from '@/lib/types'

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

const at = (y: number, m: number, d: number, h: number) => new Date(y, m, d, h, 0).toISOString()

const session: Workout = {
  id: 'w1',
  dayId: 'pull-a',
  dayName: 'Pull A',
  dayType: 'pull',
  startedAt: at(2026, 9, 10, 18),
  finishedAt: at(2026, 9, 10, 19),
  status: 'done',
  effort: 3,
  note: 'Grip gave out',
  entries: [
    {
      exerciseId: 'pull-ups',
      name: 'Pull-ups',
      muscle: 'back',
      loadType: 'bodyweight',
      repMin: 6,
      repMax: 12,
      sets: [{ reps: 8, done: true }, { reps: 7, done: true }, { done: false }],
    },
  ],
}

/** A phone with a little of everything on it. */
async function fill() {
  await repo.saveSettings({ units: 'lb', trainingAge: 'under1', setupDone: true, split: 'ppl6' })
  await repo.applySplit('ppl6')
  await repo.removeExercise('pull-a', 'hammer-curl')
  await repo.importLogs({
    workouts: [
      session,
      {
        ...session,
        id: 'w2',
        startedAt: at(2026, 9, 12, 7),
        finishedAt: at(2026, 9, 12, 8),
        effort: undefined,
        note: undefined,
      },
    ],
    bodyweights: [{ id: 'b1', date: at(2026, 9, 10, 7), day: '2026-10-10', weight: 180.2 }],
    measurements: [{ id: 'm1', date: at(2026, 9, 10, 7), day: '2026-10-10', arm: 15, waist: 33 }],
  })
  await setPref('email', 'sam@example.com')
}

describe('the backup envelope', () => {
  it('holds everything the phone has', async () => {
    await fill()
    const b = await exportBackup(new Date(2026, 9, 13, 10))
    expect(isBackup(b)).toBe(true)
    expect(b.app).toBe(BACKUP_APP)
    expect(b.settings).toMatchObject({ units: 'lb', trainingAge: 'under1', split: 'ppl6' })
    expect(b.plans.map((p) => p.split)).toEqual(['ppl6'])
    expect(b.plans[0].days.find((d) => d.id === 'pull-a')?.exercises.map((e) => e.id)).not.toContain('hammer-curl')
    expect(b.workouts.map((w) => w.id).sort()).toEqual(['w1', 'w2'])
    expect(b.workouts.find((w) => w.id === 'w1')).toEqual(session)
    // Fields that are empty are left out, not written as null.
    expect(b.workouts.find((w) => w.id === 'w2')).not.toHaveProperty('effort')
    expect(b.bodyweights).toEqual([{ id: 'b1', date: at(2026, 9, 10, 7), day: '2026-10-10', weight: 180.2 }])
    expect(b.measurements).toEqual([{ id: 'm1', date: at(2026, 9, 10, 7), day: '2026-10-10', arm: 15, waist: 33 }])
    expect(b.prefs).toEqual({ email: 'sam@example.com' })
    expect(JSON.parse(JSON.stringify(b))).toEqual(b)
  })

  it('keeps native action receipts local and discards them on restore', async () => {
    await fill()
    await setPref('session-controls', '{"nonce":"old-device"}')
    const backup = await exportBackup()
    expect(backup.prefs).not.toHaveProperty('session-controls')
    backup.prefs['session-controls'] = '{"nonce":"another-device"}'
    await restoreBackup(backup)
    expect(await getPref('session-controls')).toBeNull()
    expect(await getPref('email')).toBe('sam@example.com')
  })

  it('comes back the same after a restore onto a wiped phone', async () => {
    await fill()
    const before = await exportBackup(new Date(2026, 9, 13, 10))
    await repo.startFresh()
    await setPref('email', null)
    expect((await exportBackup()).workouts).toEqual([])
    await restoreBackup(before)
    const after = await exportBackup(new Date(2026, 9, 13, 10))
    expect(after).toEqual(before)
    // The repository reads the restored rows as its own.
    expect((await repo.getSettings()).units).toBe('lb')
    expect((await repo.getPlan()).days.map((d) => d.id)).toContain('pull-a')
    expect(await getPref('email')).toBe('sam@example.com')
  })

  it('replaces what was on the phone, not adds to it', async () => {
    await fill()
    const b = await exportBackup()
    await repo.importLogs({ workouts: [{ ...session, id: 'w9' }], bodyweights: [], measurements: [] })
    await restoreBackup(b)
    expect((await exportBackup()).workouts.map((w) => w.id).sort()).toEqual(['w1', 'w2'])
  })
})

describe('what the phone holds', () => {
  it('counts finished sessions, done sets, months, weigh-ins and tape days', async () => {
    await fill()
    const c = await dataCounts(new Date(2026, 11, 20))
    expect(c).toEqual({ sessions: 2, sets: 4, months: 2, weighIns: 1, tapeDays: 1 })
    expect(await dataCounts()).toMatchObject({ sessions: 2 })
  })

  it('is empty on a new phone', async () => {
    expect(await dataCounts()).toEqual({ sessions: 0, sets: 0, months: 0, weighIns: 0, tapeDays: 0 })
  })
})
