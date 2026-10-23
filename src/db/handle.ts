import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

import type * as schema from './schema'

/**
 * The database the repository works on: expo-sqlite on the phone, an in-memory SQLite in tests.
 * Both are Drizzle SQLite databases; the repository only uses what the two have in common.
 */
export type AppDb = BaseSQLiteDatabase<'sync' | 'async', unknown, typeof schema>

let override: AppDb | undefined

/** Tests hand in a database so no phone is needed. */
export function setDbForTests(db: AppDb | undefined): void {
  override = db
}

/** The phone's database, opened on first use so importing the repository never touches native code. */
export async function getDb(): Promise<AppDb> {
  if (override) return override
  const { db } = await import('./client')
  return db
}

/**
 * Runs `fn` inside one SQLite transaction on the phone, so a restore lands whole or not at all. The
 * tests' proxy driver has no transactions; there `fn` simply runs.
 */
export async function withTransaction(fn: () => Promise<void>): Promise<void> {
  if (override) {
    await fn()
    return
  }
  const { sqlite } = await import('./client')
  await sqlite.withTransactionAsync(fn)
}
