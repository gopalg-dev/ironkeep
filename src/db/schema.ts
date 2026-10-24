import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import type { DayType, PlanDay, Settings, WorkoutEntry, WorkoutStatus } from '@/lib/types'

/**
 * The phone's database. One file, `ironkeep.db`, in the app's private storage. Shapes follow the web
 * app's types (`src/lib/types.ts`); nested data (plan days, workout entries, settings) is stored as
 * JSON because the logic reads and writes those objects whole. See docs/00-requirements.md section 7.
 */

/** One row (id 1): the user's settings, read and written whole as in the web app. */
export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  value: text('value', { mode: 'json' }).$type<Settings>().notNull(),
})

/** One plan per split slot, so switching splits keeps each one's edits. */
export const plans = sqliteTable('plans', {
  split: text('split').primaryKey(),
  days: text('days', { mode: 'json' }).$type<PlanDay[]>().notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const workouts = sqliteTable(
  'workouts',
  {
    id: text('id').primaryKey(),
    dayId: text('day_id').notNull(),
    dayName: text('day_name').notNull(),
    dayType: text('day_type').$type<DayType>().notNull(),
    startedAt: text('started_at').notNull(),
    finishedAt: text('finished_at'),
    pausedAt: text('paused_at'),
    pausedMs: integer('paused_ms'),
    status: text('status').$type<WorkoutStatus>().notNull(),
    effort: integer('effort'),
    note: text('note'),
    entries: text('entries', { mode: 'json' }).$type<WorkoutEntry[]>().notNull(),
    historyRevision: integer('history_revision').notNull().default(0),
  },
  (t) => [index('workouts_status_finished').on(t.status, t.finishedAt), index('workouts_day').on(t.dayId)],
)

/** One weigh-in per local day; logging again the same day replaces it. */
export const bodyweights = sqliteTable(
  'bodyweights',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    day: text('day').notNull(),
    weight: real('weight').notNull(),
  },
  (t) => [uniqueIndex('bodyweights_day').on(t.day)],
)

/** One tape entry per local day; logging again the same day merges into it. */
export const measurements = sqliteTable(
  'measurements',
  {
    id: text('id').primaryKey(),
    date: text('date').notNull(),
    day: text('day').notNull(),
    arm: real('arm'),
    chest: real('chest'),
    waist: real('waist'),
  },
  (t) => [uniqueIndex('measurements_day').on(t.day)],
)

/** Things that belong to this phone, not to the training log: the look, the backup folder, the mail address. */
export const prefs = sqliteTable('prefs', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
