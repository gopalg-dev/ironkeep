import { describe, expect, it } from '@jest/globals'
import { BACKUP_APP, BACKUP_VERSION } from '@/db/backup'
import { bodyweightsToRows, measurementsToRows, setsToRows, trackerSheets } from '@/lib/logic/export'
import {
  backupFromJson,
  dedupe,
  type ImportWarning,
  logRowsToWorkouts,
  previewOf,
  rowsToBodyweights,
  rowsToMeasurements,
  type SheetRow,
  trackerToWorkouts,
} from '@/lib/logic/import'
import type { BodyweightLog, MeasurementLog, Workout } from '@/lib/types'

const at = (y: number, m: number, d: number, h: number, min: number) => new Date(y, m, d, h, min).toISOString()

const pullA: Workout = {
  id: 'w1',
  dayId: 'pull-a',
  dayName: 'Pull A',
  dayType: 'pull',
  startedAt: at(2026, 9, 10, 18, 5),
  finishedAt: at(2026, 9, 10, 19, 0),
  status: 'done',
  effort: 3,
  note: 'Grip gave out',
  entries: [
    {
      exerciseId: 'pull-ups',
      name: 'Pull-ups',
      muscle: 'back',
      loadType: 'bodyweight',
      repMin: 7,
      repMax: 8,
      sets: [{ reps: 8, done: true }, { reps: 7, done: true }, { done: false }],
    },
    {
      exerciseId: 'barbell-row',
      name: 'Barbell Row',
      muscle: 'back',
      loadType: 'weight',
      repMin: 8,
      repMax: 8,
      sets: [{ weight: 60, reps: 8, done: true }],
    },
    {
      exerciseId: 'plank',
      name: 'Plank',
      muscle: 'abs',
      loadType: 'time',
      repMin: 0,
      repMax: 0,
      sets: [{ seconds: 45, done: true }],
    },
  ],
}

const legsA: Workout = {
  ...pullA,
  id: 'w2',
  dayId: 'legs-a',
  dayName: 'Legs A',
  dayType: 'legs',
  startedAt: at(2026, 9, 12, 7, 30),
  finishedAt: at(2026, 9, 12, 8, 20),
  effort: undefined,
  note: undefined,
  entries: [
    {
      exerciseId: 'squat',
      name: 'Squat',
      muscle: 'quads',
      loadType: 'weight',
      repMin: 5,
      repMax: 6,
      sets: [
        { weight: 100, reps: 6, done: true },
        { weight: 105, reps: 5, done: true },
      ],
    },
  ],
}

const weighIns: BodyweightLog[] = [
  { id: 'b1', date: at(2026, 9, 10, 7, 0), day: '2026-10-10', weight: 82.4 },
  { id: 'b2', date: at(2026, 9, 12, 7, 0), day: '2026-10-12', weight: 82.1 },
]
const tape: MeasurementLog[] = [{ id: 'm1', date: at(2026, 9, 10, 7, 0), day: '2026-10-10', arm: 38, waist: 84 }]

/** The Log layout as the file carries it: the weight column named for the unit. */
function logRows(workouts: Workout[]): SheetRow[] {
  return setsToRows(workouts).map(({ Weight, ...rest }) => ({ ...rest, 'Weight (kg)': Weight }))
}

/** What survives a trip through the file: the sets, names and session facts, not the ids. */
function shape(w: Workout) {
  return {
    day: (w.finishedAt ?? '').slice(0, 10),
    dayName: w.dayName,
    dayType: w.dayType,
    effort: w.effort,
    note: w.note,
    entries: w.entries.map((e) => ({
      name: e.name,
      loadType: e.loadType,
      sets: e.sets.filter((s) => s.done).map(({ weight, reps, seconds }) => ({ weight, reps, seconds })),
    })),
  }
}

describe('the Log layout read back', () => {
  it('rebuilds the sessions the export wrote, set for set', () => {
    const back = logRowsToWorkouts(logRows([pullA, legsA]))
    expect(back.map(shape)).toEqual([pullA, legsA].map(shape))
    expect(back[0].entries[0].muscle).toBe('back')
    expect(back[0].entries[0].repMin).toBe(7)
    expect(back[0].entries[0].repMax).toBe(8)
    expect(back[0].status).toBe('done')
  })

  it('gives the same session the same id each time, so a second import finds the first', () => {
    const once = logRowsToWorkouts(logRows([pullA]))
    const twice = logRowsToWorkouts(logRows([pullA]))
    expect(once[0].id).toBe(twice[0].id)
    expect(once[0].id).not.toBe(pullA.id)
  })

  it('reads a plain "Weight" column and comma decimals, and skips rows with no date or lift', () => {
    const warnings: ImportWarning[] = []
    const back = logRowsToWorkouts(
      [
        {
          Date: '2026-10-10',
          Time: '18:05',
          Day: 'Pull A',
          Type: 'pull',
          Exercise: 'Row',
          Set: 1,
          Weight: '62,5',
          Reps: '8',
        },
        { Date: '', Exercise: 'Row', Set: 2, Reps: 8 },
        { Date: '2026-10-10', Exercise: '', Set: 3, Reps: 8 },
      ],
      warnings,
    )
    expect(back).toHaveLength(1)
    expect(back[0].entries[0].sets).toEqual([{ done: true, weight: 62.5, reps: 8 }])
    expect(warnings).toEqual([
      { row: 3, message: 'No date, row skipped.' },
      { row: 4, message: 'No exercise name, row skipped.' },
    ])
  })
})

describe('the Tracker layout read back', () => {
  it('rebuilds the sessions from a sheet per day, the sets across', () => {
    const sheets = trackerSheets([pullA, legsA], 'kg').map((s) => ({
      name: s.name,
      rows: s.rows.map((cells) => Object.fromEntries(s.headers.map((h, i) => [h, cells[i]]))),
    }))
    const back = trackerToWorkouts(sheets)
    const expected = [pullA, legsA].map(shape).map((s) => ({ ...s, effort: s.effort, note: s.note }))
    expect(back.map(shape)).toEqual(expected)
    // Two weights across two sets come back one per set.
    expect(back[1].entries[0].sets.map((s) => s.weight)).toEqual([100, 105])
    // A timed hold keeps its seconds.
    expect(back[0].entries[2].sets[0]).toEqual({ done: true, seconds: 45 })
  })
})

describe('weigh-ins and tape read back', () => {
  it('round-trips both sheets', () => {
    const b = rowsToBodyweights(bodyweightsToRows(weighIns))
    expect(b.map((l) => [l.day, l.weight])).toEqual([
      ['2026-10-10', 82.4],
      ['2026-10-12', 82.1],
    ])
    const m = rowsToMeasurements(measurementsToRows(tape))
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ day: '2026-10-10', arm: 38, waist: 84 })
    expect(m[0].chest).toBeUndefined()
  })
})

describe('backups', () => {
  it("turns the web app's everything.json into this app's envelope", () => {
    const web = {
      exportedAt: '2026-10-13T10:00:00.000Z',
      settings: { units: 'lb', split: 'ppl6', trainingAge: 'over1' },
      plan: {
        days: [{ id: 'pull-a', name: 'Pull A', type: 'pull', exercises: [] }],
        updatedAt: '2026-10-01T00:00:00.000Z',
      },
      workouts: [pullA],
      bodyweights: weighIns,
      measurements: tape,
    }
    const b = backupFromJson(web)
    expect(b).not.toBeNull()
    expect(b?.app).toBe(BACKUP_APP)
    expect(b?.version).toBe(BACKUP_VERSION)
    expect(b?.settings).toEqual({ units: 'lb', split: 'ppl6', trainingAge: 'over1', setupDone: true })
    expect(b?.plans).toEqual([{ split: 'ppl6', days: web.plan.days, updatedAt: '2026-10-01T00:00:00.000Z' }])
    expect(b?.workouts).toHaveLength(1)
  })

  it('keeps its own envelope as it is, and rejects anything else', () => {
    const own = {
      app: BACKUP_APP,
      version: 1,
      exportedAt: '2026-10-13T10:00:00.000Z',
      settings: {},
      plans: [],
      workouts: [],
      bodyweights: [],
      measurements: [],
      prefs: {},
    }
    expect(backupFromJson(own)).toEqual({ ...own, settings: { units: 'kg', trainingAge: 'over1', setupDone: false } })
    expect(backupFromJson({ hello: 'world' })).toBeNull()
    expect(backupFromJson(null)).toBeNull()
    expect(backupFromJson([1, 2])).toBeNull()
  })
})

describe('what an import would do', () => {
  it('leaves out sessions, weigh-ins and tape the phone already has, by day', () => {
    const incoming = { workouts: logRowsToWorkouts(logRows([pullA, legsA])), bodyweights: weighIns, measurements: tape }
    const kept = dedupe(incoming, { workouts: [pullA], bodyweights: [weighIns[0]], measurements: [] })
    expect(kept.workouts.map((w) => w.dayName)).toEqual(['Legs A'])
    expect(kept.duplicates).toBe(1)
    expect(kept.bodyweights.map((b) => b.day)).toEqual(['2026-10-12'])
    expect(kept.measurements).toHaveLength(1)
    expect(previewOf(kept, kept.duplicates)).toEqual({
      sessions: 1,
      sets: 2,
      duplicates: 1,
      weighIns: 1,
      tapeDays: 1,
      from: '2026-10-12',
      to: '2026-10-12',
    })
  })
})

it('reads the web measurement headers with either length unit', () => {
  for (const unit of ['cm', 'in']) {
    expect(
      rowsToMeasurements([
        { Date: '2026-10-10', [`Arm (${unit})`]: 35, [`Chest (${unit})`]: 100, [`Waist (${unit})`]: 80 },
      ])[0],
    ).toMatchObject({ arm: 35, chest: 100, waist: 80 })
  }
})

it('keeps distinct same-name sessions on a day and deduplicates repeated incoming rows', () => {
  const second = {
    ...pullA,
    id: 'another',
    startedAt: '2026-10-10T20:00:00.000Z',
    finishedAt: '2026-10-10T21:00:00.000Z',
  }
  const kept = dedupe(
    { workouts: [second, second], bodyweights: [], measurements: [] },
    { workouts: [pullA], bodyweights: [], measurements: [] },
  )
  expect(kept.workouts).toHaveLength(1)
  expect(kept.workouts[0].id).toBe('another')
})
