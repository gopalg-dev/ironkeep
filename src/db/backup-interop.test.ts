import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals'
import { exportBackup, restoreBackup } from '@/db/backup'
import { setDbForTests } from '@/db/handle'
import { openTestDb } from '@/db/test-db'
import { backupFromJson } from '@/lib/logic/import'

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

describe('web / Android backup compatibility', () => {
  it('restores a real web export and returns every training field and preference unchanged', async () => {
    // Captured from workout_plan_v3's transactional export test; contains no real user data.
    const input: unknown = JSON.parse(readFileSync(join(__dirname, '__fixtures__/web-backup.json'), 'utf8'))
    const backup = backupFromJson(input)
    if (!backup) throw new Error('Android did not recognise the web backup')
    await restoreBackup(backup)
    const exported = await exportBackup(new Date(backup.exportedAt))
    expect(JSON.parse(JSON.stringify(exported))).toEqual(input)
    // Optional integration output for exercising the return trip through the web repository.
    const output = process.env.IRONKEEP_INTEROP_OUTPUT
    if (output) writeFileSync(output, JSON.stringify(exported, null, 2))
  })
})
