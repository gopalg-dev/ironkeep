import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import type * as schema from './schema'

/**
 * The database the repository works on: expo-sqlite on the phone, an in-memory SQLite in tests.
 * Both are Drizzle SQLite databases; the repository only uses what the two have in common.
 */
export type AppDb = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>

let override: AppDb | undefined
let native: { db: AppDb; transaction: (fn: () => Promise<void>) => Promise<void> } | undefined

/** Startup already opens this handle for migrations; repository reads reuse that same instance. */
export function registerNativeDatabase(db: AppDb, transaction: (fn: () => Promise<void>) => Promise<void>): void {
  native = { db, transaction }
}

/** Tests hand in a database so no phone is needed. */
export function setDbForTests(db: AppDb | undefined): void {
  override = db
}

/** The phone's database, opened on first use so importing the repository never touches native code. */
export async function getDb(): Promise<AppDb> {
  if (override) return override
  if (native) return native.db
  const { db } = await import('./client')
  return db
}

type Transaction = (fn: () => Promise<void>) => Promise<void>
const testTransactions = new WeakMap<AppDb, Transaction>()
let pending: Promise<unknown> = Promise.resolve()

/** The test driver supplies real BEGIN/COMMIT/ROLLBACK, just as the phone does. */
export function registerTestTransaction(db: AppDb, transaction: Transaction): void {
  testTransactions.set(db, transaction)
}

/** Serializes multi-row operations and commits all their writes or rolls them back. */
export function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const run = async (): Promise<T> => {
    let outcome: { value: T } | undefined
    const work = async () => {
      outcome = { value: await fn() }
    }
    if (override) {
      const transaction = testTransactions.get(override)
      if (!transaction) throw new Error('The test database needs a transaction adapter')
      await transaction(work)
    } else if (native) await native.transaction(work)
    else {
      const { sqlite } = await import('./client')
      await sqlite.withTransactionAsync(work)
    }
    if (!outcome) throw new Error('The transaction did not finish')
    return outcome.value
  }
  const result = pending.then(run, run)
  pending = result.catch(() => undefined)
  return result
}
