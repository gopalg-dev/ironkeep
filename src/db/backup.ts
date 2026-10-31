import { eq } from 'drizzle-orm'

import { backupSchema, parseBackup } from '@/lib/backup'
import type { BodyweightLog, MeasurementLog, PlanDay, Settings, Workout } from '@/lib/types'
import { getDb, withTransaction } from './handle'
import { bodyweights, measurements, plans, prefs, settings, workouts } from './schema'

/*
 * The backup envelope (requirements 7.3): everything the phone holds, from every table, so that a
 * restore on another phone gives the same database. Settings, every plan slot, every session
 * (one in progress included), the weigh-ins, the tape, and the phone's own preferences.
 */

export const BACKUP_APP = 'ironkeep'
export const BACKUP_VERSION = 1

export interface PlanSlot {
  split: string
  days: PlanDay[]
  updatedAt: string
}

export interface Backup {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  settings: Partial<Settings>
  plans: PlanSlot[]
  workouts: Workout[]
  bodyweights: BodyweightLog[]
  measurements: MeasurementLog[]
  prefs: Record<string, string>
}

/** The settings row's id, as the repository keeps it. */
const SETTINGS_ROW = 1

const drop = <T extends object>(o: T): T => JSON.parse(JSON.stringify(o)) as T

/** Everything, as one object. */
export async function exportBackup(now = new Date()): Promise<Backup> {
  const db = await getDb()
  const [s, ps, ws, bs, ms, pr] = await Promise.all([
    db.select().from(settings).limit(1),
    db.select().from(plans),
    db.select().from(workouts),
    db.select().from(bodyweights),
    db.select().from(measurements),
    db.select().from(prefs),
  ])
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: s[0]?.value ?? {},
    plans: ps.map((p) => ({ split: p.split, days: p.days, updatedAt: p.updatedAt })),
    workouts: ws.map((w) =>
      drop({
        id: w.id,
        dayId: w.dayId,
        dayName: w.dayName,
        dayType: w.dayType,
        startedAt: w.startedAt,
        ...(w.finishedAt ? { finishedAt: w.finishedAt } : {}),
        ...(w.pausedAt ? { pausedAt: w.pausedAt } : {}),
        ...(w.pausedMs != null ? { pausedMs: w.pausedMs } : {}),
        status: w.status,
        entries: w.entries,
        ...(w.effort != null ? { effort: w.effort } : {}),
        ...(w.note ? { note: w.note } : {}),
      }),
    ),
    bodyweights: bs.map((b) => ({ id: b.id, date: b.date, day: b.day, weight: b.weight })),
    measurements: ms.map((m) => ({
      id: m.id,
      date: m.date,
      day: m.day,
      ...(m.arm != null ? { arm: m.arm } : {}),
      ...(m.chest != null ? { chest: m.chest } : {}),
      ...(m.waist != null ? { waist: m.waist } : {}),
    })),
    // Native action receipts are local and must never revive old controls after restore.
    prefs: Object.fromEntries(pr.filter((p) => p.key !== 'session-controls').map((p) => [p.key, p.value])),
  }
}

/** Whether a parsed file is a backup of this app. */
export function isBackup(value: unknown): value is Backup {
  return backupSchema.safeParse(value).success
}

/** Replaces everything with the backup, in one transaction: all of it lands, or none of it. */
export async function restoreBackup(input: unknown): Promise<void> {
  const b = parseBackup(JSON.stringify(input))
  const db = await getDb()
  await withTransaction(async () => {
    await db.delete(settings)
    await db.delete(plans)
    await db.delete(workouts)
    await db.delete(bodyweights)
    await db.delete(measurements)
    await db.delete(prefs)
    await db.insert(settings).values({ id: SETTINGS_ROW, value: b.settings })
    for (const p of b.plans) await db.insert(plans).values({ split: p.split, days: p.days, updatedAt: p.updatedAt })
    for (const w of b.workouts) {
      await db.insert(workouts).values({
        id: w.id,
        dayId: w.dayId,
        dayName: w.dayName,
        dayType: w.dayType,
        startedAt: w.startedAt,
        finishedAt: w.finishedAt ?? null,
        pausedAt: w.pausedAt ?? null,
        pausedMs: w.pausedMs ?? null,
        status: w.status,
        effort: w.effort ?? null,
        note: w.note ?? null,
        entries: w.entries,
      })
    }
    for (const l of b.bodyweights) {
      await db
        .insert(bodyweights)
        .values({ id: l.id, date: l.date, day: l.day ?? l.date.slice(0, 10), weight: l.weight })
    }
    for (const m of b.measurements) {
      await db.insert(measurements).values({
        id: m.id,
        date: m.date,
        day: m.day ?? m.date.slice(0, 10),
        arm: m.arm ?? null,
        chest: m.chest ?? null,
        waist: m.waist ?? null,
      })
    }
    for (const [key, value] of Object.entries(b.prefs ?? {})) {
      if (key !== 'session-controls') await db.insert(prefs).values({ key, value })
    }
  })
}

export interface DataCounts {
  sessions: number
  sets: number
  /** Months from the first finished session to now, at least one once there is a session. */
  months: number
  weighIns: number
  tapeDays: number
}

/** What the phone holds, for the Your data page. */
export async function dataCounts(now = new Date()): Promise<DataCounts> {
  const db = await getDb()
  const [ws, bs, ms] = await Promise.all([
    db.select().from(workouts),
    db.select().from(bodyweights),
    db.select().from(measurements),
  ])
  const done = ws.filter((w) => w.status === 'done' && w.finishedAt)
  const sets = done.reduce((n, w) => n + w.entries.reduce((k, e) => k + e.sets.filter((s) => s.done).length, 0), 0)
  const first = done.map((w) => new Date(w.finishedAt as string).getTime()).sort((a, b) => a - b)[0]
  const months = first === undefined ? 0 : Math.max(1, Math.round((now.getTime() - first) / (30.44 * 86_400_000)))
  return { sessions: done.length, sets, months, weighIns: bs.length, tapeDays: ms.length }
}

/** A pref the phone keeps outside the training log: the mail address, the backup folder. */
export async function getPref(key: string): Promise<string | null> {
  const db = await getDb()
  const rows = await db.select().from(prefs).where(eq(prefs.key, key)).limit(1)
  return rows[0]?.value ?? null
}

export async function setPref(key: string, value: string | null): Promise<void> {
  const db = await getDb()
  if (value === null) await db.delete(prefs).where(eq(prefs.key, key))
  else await db.insert(prefs).values({ key, value }).onConflictDoUpdate({ target: prefs.key, set: { value } })
}
