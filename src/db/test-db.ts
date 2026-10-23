/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { drizzle } from 'drizzle-orm/sqlite-proxy'

import type { AppDb } from './handle'
import * as schema from './schema'

const MIGRATIONS = join(__dirname, '../../drizzle')

/**
 * An in-memory SQLite for the repository tests, on Node's built-in driver: no native module to build,
 * no phone. The same migration files the app ships are applied, so the tests run on the real schema.
 * Rows are returned as value arrays, which is what Drizzle's proxy driver expects.
 */
export function openTestDb(): { db: AppDb; close: () => void } {
  const sqlite = new DatabaseSync(':memory:')
  for (const name of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    for (const statement of readFileSync(join(MIGRATIONS, name), 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) sqlite.exec(statement)
    }
  }
  const db = drizzle(
    async (sql, params, method) => {
      const statement = sqlite.prepare(sql)
      const args = params as Parameters<typeof statement.all>
      if (method === 'run') {
        statement.run(...args)
        return { rows: [] }
      }
      if (method === 'get') {
        const row = statement.get(...args)
        return { rows: row ? Object.values(row) : [] }
      }
      return { rows: statement.all(...args).map((row) => Object.values(row)) }
    },
    { schema },
  )
  return { db: db as unknown as AppDb, close: () => sqlite.close() }
}
