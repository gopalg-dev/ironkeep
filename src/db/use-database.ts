import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'

import migrations from '../../drizzle/migrations'
import { db } from './client'

export type DatabaseState = { status: 'migrating' } | { status: 'ready' } | { status: 'failed'; error: Error }

/**
 * Runs the bundled Drizzle migrations once at startup. Each migration runs in order, once per
 * phone; a failure leaves the data untouched and is reported, never wiped.
 */
export function useDatabase(): DatabaseState {
  const { success, error } = useMigrations(db, migrations)
  if (error) return { status: 'failed', error }
  return success ? { status: 'ready' } : { status: 'migrating' }
}
