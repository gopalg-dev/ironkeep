import { expect, it, jest } from '@jest/globals'

import { getDb, registerNativeDatabase, setDbForTests, withTransaction } from './handle'
import * as repo from './repo'
import { openTestDb } from './test-db'

// A cold notification route must not request another lazy/native module after migrations loaded it.
jest.mock('./client', () => {
  throw new Error('The already-open database was loaded again')
})

it('reuses the startup database for reads and transactions while preserving the test override', async () => {
  const phone = openTestDb()
  const isolated = openTestDb()
  const transaction = jest.fn(async (fn: () => Promise<void>) => fn())
  registerNativeDatabase(phone.db, transaction)
  try {
    await withTransaction(async () => {
      await repo.saveSettings({ units: 'lb' })
    })
    expect((await repo.getSettings()).units).toBe('lb')
    expect(transaction).toHaveBeenCalledTimes(1)
    setDbForTests(isolated.db)
    expect(await getDb()).toBe(isolated.db)
    expect((await repo.getSettings()).units).toBe('kg')
    setDbForTests(undefined)
    expect(await getDb()).toBe(phone.db)
    await expect(
      withTransaction(async () => {
        throw new Error('write failed')
      }),
    ).rejects.toThrow('write failed')
  } finally {
    setDbForTests(undefined)
    phone.close()
    isolated.close()
  }
})
