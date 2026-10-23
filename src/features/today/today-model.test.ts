import { describe, expect, it } from '@jest/globals'

import type { Exercise, PlanDay, Settings } from '@/lib/types'
import { dayAfter, sizeOf, todayView, weekCells, weekLine } from './today-model'

const lift = (name: string, sets = 3): Exercise => ({
  id: name.toLowerCase().replace(/\s+/g, '-'),
  name,
  sets,
  repMin: 8,
  repMax: 12,
  muscle: 'back',
  loadType: 'weight',
})

const day = (id: string, name: string, type: PlanDay['type'], weekday?: number): PlanDay => ({
  id,
  name,
  type,
  exercises: [lift('Barbell Row', 4), lift('Pull-ups', 4), lift('Face Pull')],
  weekday,
})

const settings = (patch: Partial<Settings> = {}): Settings => ({
  units: 'kg',
  trainingAge: 'over1',
  setupDone: true,
  ...patch,
})

// A Wednesday.
const now = new Date(2026, 9, 21, 9, 0, 0)
const at = (y: number, m: number, d: number) => new Date(y, m, d, 18, 0, 0).toISOString()

const days = [day('pull', 'Pull A', 'pull', 1), day('push', 'Push A', 'push', 3), day('legs', 'Legs', 'legs', 5)]
const plan = { days, updatedAt: at(2026, 9, 1) }

describe('todayView', () => {
  it('rolling: the next day in order, with its size', () => {
    const view = todayView({ plan, settings: settings(), nextDayId: 'push', recent: [] }, now)
    expect(view.day?.id).toBe('push')
    expect(view.title).toBe('Push A')
    expect(view.summary).toBe('3 exercises, 11 sets')
    expect(view.byWeekday).toBe(false)
    expect(view.doneToday).toEqual([])
  })

  it('names the sessions finished today beside the date while another day is shown', () => {
    const recent = [{ dayId: 'push', finishedAt: at(2026, 9, 21) }]
    const view = todayView({ plan, settings: settings(), nextDayId: 'pull', recent }, now)
    expect(view.day?.id).toBe('pull')
    expect(view.doneToday.map((d) => d.id)).toEqual(['push'])
    // Without a day shown, the heading says it; the line stays empty.
    const rest = todayView({ plan, settings: settings({ schedule: 'weekday' }), nextDayId: 'pull', recent }, now)
    expect(rest.day).toBeNull()
    expect(rest.doneToday).toEqual([])
  })

  it('by weekday: the day on today, unless it is done already', () => {
    const base = { plan, settings: settings({ schedule: 'weekday' }), nextDayId: 'pull' }
    const open = todayView({ ...base, recent: [] }, now)
    expect(open.day?.id).toBe('push')
    const done = todayView({ ...base, recent: [{ dayId: 'push', finishedAt: at(2026, 9, 21) }] }, now)
    expect(done.day).toBeNull()
    expect(done.title).toBe('Done for today')
    expect(done.summary).toBe('Push A is in the log. Next: Legs, Friday')
    expect(done.markType).toBe('push')
  })

  it('by weekday: a rest day says what comes next', () => {
    const tuesday = new Date(2026, 9, 20, 9)
    const view = todayView(
      { plan, settings: settings({ schedule: 'weekday' }), nextDayId: 'pull', recent: [] },
      tuesday,
    )
    expect(view.day).toBeNull()
    expect(view.title).toBe('Rest day')
    expect(view.summary).toBe('Next: Push A, tomorrow')
  })

  it('a day with no lifts says so', () => {
    expect(sizeOf({ ...day('x', 'Empty', 'full'), exercises: [] }, 'under1')).toBe('No lifts yet')
  })
})

describe('dayAfter', () => {
  it('is the next in rolling order, wrapping, and null for a one-day plan', () => {
    expect(dayAfter(days, 'push')?.id).toBe('legs')
    expect(dayAfter(days, 'legs')?.id).toBe('pull')
    expect(dayAfter([days[0] as PlanDay], 'pull')).toBeNull()
  })
})

describe('weekCells', () => {
  it('maps Monday to Sunday with what was planned, done, today and past', () => {
    const cells = weekCells(days, [{ dayId: 'pull', finishedAt: at(2026, 9, 19) }], now)
    expect(cells.map((c) => c.letter).join('')).toBe('MTWTFSS')
    expect(cells[0]).toMatchObject({ weekday: 1, done: true, doneType: 'pull', past: true, today: false })
    expect(cells[2]).toMatchObject({ weekday: 3, done: false, today: true, past: false })
    expect(cells[4]?.day?.id).toBe('legs')
    expect(cells[4]?.past).toBe(false)
  })

  it('colours an unplanned day by the day actually trained', () => {
    const cells = weekCells(days, [{ dayId: 'legs', finishedAt: at(2026, 9, 20) }], now)
    expect(cells[1]).toMatchObject({ day: null, done: true, doneType: 'legs' })
  })

  it('the line counts planned days done and names the ones that went by', () => {
    const cells = weekCells(days, [], new Date(2026, 9, 24, 9))
    expect(weekLine(cells)).toBe(
      '0 of 3 planned days done. Pull A on Monday has no session. Push A on Wednesday has no session. Legs on Friday has no session.',
    )
    const some = weekCells(
      days,
      [
        { dayId: 'pull', finishedAt: at(2026, 9, 19) },
        { dayId: 'push', finishedAt: at(2026, 9, 21) },
      ],
      now,
    )
    expect(weekLine(some)).toBe('2 of 3 planned days done.')
  })
})
