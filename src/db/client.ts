import { drizzle } from 'drizzle-orm/expo-sqlite'
import { openDatabaseSync } from 'expo-sqlite'

import * as schema from './schema'

export const DATABASE_NAME = 'ironkeep.db'

/** The raw SQLite handle. Change listeners on, so Drizzle's live queries re-run after a write. */
export const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true })

// Write-ahead logging: a crash mid-write cannot corrupt the file, and reads do not block writes.
sqlite.execSync('PRAGMA journal_mode = WAL')
sqlite.execSync('PRAGMA foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
