import { z } from 'zod'
import { EQUIPMENT } from './library'
import { DAY_TYPES } from './types'

/** Shared on-disk contract with Ironkeep Android (workout_plan_v4/src/db/backup.ts). */
export const BACKUP_APP = 'ironkeep'
export const BACKUP_VERSION = 1
export const RESTORE_PHRASE = 'replace my data'
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

const id = z.string().min(1).max(200)
const at = z.iso.datetime({ offset: true })
const number = z.number().nonnegative()
const muscle = z.enum(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'calves', 'abs'])
const load = z.enum(['weight', 'bodyweight', 'time'])
const absent = <T extends z.ZodType>(schema: T) => schema.nullish().transform((v) => v ?? undefined)
const mark = z.object({ dayId: id, at })
const snooze = z.object({ at, times: number.int() })

const settingsSchema = z.object({
  units: z.enum(['kg', 'lb']).default('kg'),
  trainingAge: z.enum(['under1', 'over1']).default('over1'),
  setupDone: z.boolean().default(false),
  plate: absent(number),
  dumbbellStep: absent(number),
  stackStep: absent(number),
  sameStep: absent(z.boolean()),
  bar: absent(number),
  bodyweight: absent(number),
  joinedAt: absent(at),
  split: absent(id),
  schedule: absent(z.enum(['rolling', 'weekday'])),
  goal: absent(z.enum(['gain', 'hold', 'cut'])),
  feedbackAt: absent(at),
  keepAwake: absent(z.boolean()),
  nudges: absent(z.object({ weight: snooze.optional(), measure: snooze.optional() })),
  alertsDismissed: absent(z.record(z.string(), at)),
  rolledPast: absent(mark),
})

const setSchema = z.object({
  weight: absent(number),
  reps: absent(number.int()),
  seconds: absent(number),
  left: absent(number.int()),
  done: z.boolean(),
})
const exerciseSchema = z.object({
  id,
  name: z.string().min(1),
  sets: number.int(),
  repMin: number,
  repMax: number,
  muscle,
  loadType: load,
  note: absent(z.string()),
  alternates: absent(z.array(z.string())),
  ramp: absent(z.object({ base: number.int(), at: z.string() })),
})
const daySchema = z.object({
  id,
  name: z.string().min(1),
  type: z.enum(DAY_TYPES),
  exercises: z.array(exerciseSchema),
  weekday: absent(z.number().int().min(0).max(6)),
})
const entrySchema = z.object({
  exerciseId: id,
  name: z.string().min(1),
  muscle,
  loadType: load,
  repMin: number,
  repMax: number,
  hint: absent(z.string()),
  prefill: absent(z.array(z.object({ weight: absent(number), reps: absent(number), seconds: absent(number) }))),
  rampOffer: absent(z.boolean()),
  equipment: absent(z.enum(EQUIPMENT)),
  plateLoaded: absent(z.literal(true)),
  sets: z.array(setSchema),
})
const workoutSchema = z.object({
  id,
  dayId: id,
  dayName: z.string().min(1),
  dayType: z.enum(DAY_TYPES),
  startedAt: at,
  finishedAt: absent(at),
  pausedAt: absent(at),
  pausedMs: absent(number),
  status: z.enum(['in_progress', 'done']),
  entries: z.array(entrySchema),
  effort: absent(z.number().int().min(1).max(4)),
  note: absent(z.string()),
})

export const backupSchema = z
  .object({
    app: z.literal(BACKUP_APP),
    version: z.literal(BACKUP_VERSION),
    exportedAt: at,
    settings: settingsSchema,
    plans: z.array(z.object({ split: id, days: z.array(daySchema), updatedAt: at })),
    workouts: z.array(workoutSchema),
    bodyweights: z.array(z.object({ id, date: at, day: absent(z.iso.date()), weight: number })),
    measurements: z.array(
      z.object({
        id,
        date: at,
        day: absent(z.iso.date()),
        arm: absent(number),
        chest: absent(number),
        waist: absent(number),
      }),
    ),
    prefs: z.record(z.string(), z.string()).default({}),
  })
  .superRefine((backup, ctx) => {
    const unique = (values: string[], path: (string | number)[]) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({ code: 'custom', message: 'Duplicate identifiers', path })
    }
    unique(
      backup.plans.map((p) => p.split),
      ['plans'],
    )
    unique(
      backup.workouts.map((w) => w.id),
      ['workouts'],
    )
    unique(
      backup.bodyweights.map((b) => b.id),
      ['bodyweights'],
    )
    unique(
      backup.measurements.map((m) => m.id),
      ['measurements'],
    )
    for (const [index, plan] of backup.plans.entries()) {
      unique(
        plan.days.map((d) => d.id),
        ['plans', index, 'days'],
      )
      for (const [dayIndex, day] of plan.days.entries()) {
        unique(
          day.exercises.map((e) => e.id),
          ['plans', index, 'days', dayIndex, 'exercises'],
        )
      }
    }
    if (backup.workouts.filter((w) => w.status === 'in_progress').length > 1) {
      ctx.addIssue({ code: 'custom', message: 'Only one workout can be in progress', path: ['workouts'] })
    }
    if (backup.settings.setupDone && !backup.plans.some((p) => p.split === (backup.settings.split ?? 'ppl6'))) {
      ctx.addIssue({ code: 'custom', message: 'The selected plan is missing', path: ['plans'] })
    }
  })

export type Backup = z.infer<typeof backupSchema>
export const restoreInputSchema = z.object({ backup: backupSchema, confirmation: z.literal(RESTORE_PHRASE) })

export function parseBackup(text: string): Backup {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error('Backup files must be 20 MB or smaller.')
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid JSON.')
  }
  const result = backupSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new Error(
      `This is not a supported Ironkeep v1 backup: ${issue?.path.join('.') || 'file'} — ${issue?.message ?? 'invalid data'}.`,
    )
  }
  return result.data
}

export const backupFileName = (now = new Date()) => `ironkeep-backup-${now.toISOString().slice(0, 10)}.json`
