import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from '@jest/globals'
import { exportBackup, restoreBackup } from './backup'
import { setDbForTests } from './handle'
import * as repo from './repo'
import { openTestDb } from './test-db'

let database: ReturnType<typeof openTestDb>
beforeEach(() => {
  database = openTestDb()
  setDbForTests(database.db)
})
afterEach(() => {
  setDbForTests(undefined)
  database.close()
})

it('rejects unsupported and malformed backups before changing any row', async () => {
  await repo.getPlan()
  const before = await exportBackup()
  for (const input of [
    { ...before, version: 99 },
    { ...before, settings: { units: 'stones' } },
    { app: 'ironkeep', version: 1, plans: [], workouts: [] },
  ]) {
    await expect(restoreBackup(input)).rejects.toThrow('supported Ironkeep')
    expect(await exportBackup(new Date(before.exportedAt))).toEqual(before)
  }
})

it('rolls back the previous active session when starting its replacement fails', async () => {
  const plan = await repo.getPlan()
  const old = await repo.startWorkout(plan.days[0].id)
  await repo.saveEntrySets(old.id, old.entries[0].exerciseId, [{ weight: 60, reps: 8, done: true }])
  const before = await repo.getActiveWorkout()
  database.execute(
    "CREATE TRIGGER fail_new_workout BEFORE INSERT ON workouts BEGIN SELECT RAISE(ABORT, 'injected insert failure'); END",
  )
  await expect(repo.startWorkout(plan.days[1].id)).rejects.toThrow()
  expect(await repo.getActiveWorkout()).toEqual(before)
})

it('rolls back the split selection if its new plan cannot be saved', async () => {
  await repo.getPlan()
  const before = await repo.getSettings()
  database.execute(
    "CREATE TRIGGER fail_new_plan BEFORE INSERT ON plans BEGIN SELECT RAISE(ABORT, 'injected insert failure'); END",
  )
  await expect(repo.applySplit('ul4')).rejects.toThrow()
  expect(await repo.getSettings()).toEqual(before)
})

it('keeps all fields from the real web backup fixture', async () => {
  const input: unknown = JSON.parse(readFileSync(join(__dirname, '__fixtures__/web-backup.json'), 'utf8'))
  await restoreBackup(input)
  const exported = await exportBackup()
  expect(exported.workouts.length).toBeGreaterThan(0)
})
