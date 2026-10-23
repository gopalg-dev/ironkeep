import { useLiveQuery } from 'drizzle-orm/expo-sqlite'

import type { Settings } from '@/lib/types'
import { db } from './client'
import { settings } from './schema'

const DEFAULT_SETTINGS: Settings = { units: 'kg', trainingAge: 'over1', setupDone: false }

/**
 * The settings, live: re-renders after every write (expo-sqlite's change listener). `undefined`
 * until the first read lands, so a screen can wait rather than flash the defaults.
 */
export function useSettings(): Settings | undefined {
  const { data, updatedAt } = useLiveQuery(db.select().from(settings).limit(1))
  if (updatedAt === undefined) return undefined
  return { ...DEFAULT_SETTINGS, ...data[0]?.value }
}
