import { describe, expect, it } from '@jest/globals'

import type { WeeklyPoint } from '@/lib/logic/stats'
import {
  bodyweightLine,
  changeOf,
  hardSetRows,
  hardSetsTotal,
  latestTapes,
  mapState,
  monthBounds,
  monthIndex,
  sessionLine,
  tapeLine,
  thisWeekLine,
  weekCell,
  weekLabel,
  weighInsIn,
} from './stats-model'

const point = (p: Partial<WeeklyPoint>): WeeklyPoint => ({
  week: '2026-10-19',
  weekNo: 0,
  date: '2026-10-21T18:00:00.000Z',
  weight: 60,
  reps: 10,
  seconds: 0,
  score: 0,
  sessions: 1,
  ...p,
})
const now = new Date(2026, 9, 21, 9)

describe('changeOf', () => {
  it('weight first, reps when the weight held, same otherwise', () => {
    expect(changeOf('weight', point({ weight: 60 }), point({ weight: 62.5 }), 'kg')).toEqual({
      text: '+2.5 kg',
      up: true,
    })
    expect(changeOf('weight', point({ reps: 9 }), point({ reps: 10 }), 'kg')).toEqual({ text: '+1 rep', up: true })
    expect(changeOf('weight', point({}), point({}), 'kg')).toEqual({ text: 'same', up: false })
    expect(changeOf('bodyweight', point({ reps: 12 }), point({ reps: 10 }), 'kg')).toEqual({
      text: '-2 reps',
      up: false,
    })
    expect(changeOf('time', point({ seconds: 30 }), point({ seconds: 45 }), 'kg')).toEqual({ text: '+15 s', up: true })
  })
})

describe('week words', () => {
  it('names weeks back from now and the table cells', () => {
    expect(weekLabel('2026-10-19', now)).toBe('This week')
    expect(weekLabel('2026-10-12', now)).toBe('Last week')
    expect(weekLabel('2026-09-28', now)).toBe('3 weeks ago')
    expect(weekCell('2026-10-19', 0)).toBe('Week of Oct 19')
    expect(weekCell('2026-10-12', 1)).toBe('Oct 12')
  })
})

describe('body words', () => {
  it('says the average and the move, never advice', () => {
    expect(bodyweightLine({ weekAvg: 73.2, changePct: -0.3 })).toBe('7-day average 73.2, down 0.3% on last week')
    expect(bodyweightLine({ weekAvg: 73.2, changePct: 0.04 })).toBe('7-day average 73.2, level with last week')
    expect(bodyweightLine({ weekAvg: 80 })).toBe('7-day average 80')
    expect(bodyweightLine({})).toBeNull()
  })

  it('says when the tape was last used and when it is next', () => {
    const last = { id: 'm1', date: new Date(2026, 9, 16, 8).toISOString(), arm: 36 }
    expect(tapeLine(last, now)).toBe('Measured Oct 16. Next tape day Nov 13.')
    expect(tapeLine(last, new Date(2026, 10, 20))).toBe('Measured Oct 16. Tape day is due.')
    expect(tapeLine(undefined, now)).toBeNull()
  })
})

describe('hardSetRows', () => {
  it('orders by the plan and drops idle muscles', () => {
    const zero = { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, quads: 0, hamstrings: 0, calves: 0, abs: 0 }
    const rows = hardSetRows({ ...zero, back: 11, chest: 9, calves: 2 }, { ...zero, back: 12, chest: 12, quads: 10 })
    expect(rows.map((r) => `${r.label} ${r.done}/${r.planned}`)).toEqual([
      'Back 11/12',
      'Chest 9/12',
      'Quads 0/10',
      'Calves 2/0',
    ])
  })
})

describe('session words', () => {
  it('names a session by when, how long and how it felt', () => {
    const w = {
      id: 'w1',
      dayId: 'd1',
      dayName: 'Pull A',
      dayType: 'pull' as const,
      startedAt: new Date(2026, 9, 19, 17, 24).toISOString(),
      finishedAt: new Date(2026, 9, 19, 18, 5).toISOString(),
      status: 'done' as const,
      entries: [],
      effort: 2,
    }
    expect(sessionLine(w)).toBe('Monday, Oct 19, 6:05 PM, 41 min, effort ok')
    expect(sessionLine({ ...w, effort: undefined, finishedAt: w.startedAt })).toBe('Monday, Oct 19, 5:24 PM')
  })

  it('says the streak and the effort, whichever are known', () => {
    expect(thisWeekLine(2, 2.2)).toBe('2 weeks in a row, effort ok')
    expect(thisWeekLine(1, undefined)).toBe('1 week in a row')
    expect(thisWeekLine(0, 3)).toBe('effort hard')
    expect(thisWeekLine(0, undefined)).toBe('')
  })
})

describe('body map', () => {
  it('paints a muscle by its sets against the plan', () => {
    expect(mapState(12, 12)).toBe('trained')
    expect(mapState(13, 12)).toBe('trained')
    expect(mapState(5, 12)).toBe('partly')
    expect(mapState(0, 12)).toBe('planned')
    expect(mapState(0, 0)).toBe('off')
    expect(mapState(2, 0)).toBe('trained')
  })

  it('totals the week', () => {
    const zero = { chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0, quads: 0, hamstrings: 0, calves: 0, abs: 0 }
    expect(hardSetsTotal(hardSetRows({ ...zero, back: 11, chest: 9 }, { ...zero, back: 12, chest: 12 }))).toBe(
      '20 of 24',
    )
  })
})

describe('calendar reach', () => {
  it('runs from the month the user joined to this month', () => {
    const joined = new Date(2026, 6, 15).toISOString()
    expect(monthBounds(now, joined)).toEqual({ lowest: monthIndex(new Date(2026, 6, 1)), highest: monthIndex(now) })
    expect(monthBounds(now, undefined).highest - monthBounds(now, undefined).lowest).toBe(36)
    // Joined later than now (a clock set back): never a reach that ends before it starts.
    expect(monthBounds(now, new Date(2027, 0, 1).toISOString()).lowest).toBe(monthIndex(now))
  })
})

describe('body series', () => {
  const log = (daysAgo: number, weight: number) => ({
    id: `b${daysAgo}`,
    date: new Date(now.getTime() - daysAgo * 86_400_000).toISOString(),
    weight,
  })

  it('keeps the weigh-ins of the range, oldest first', () => {
    const logs = [log(1, 73.4), log(40, 74), log(100, 75.1)]
    expect(weighInsIn(logs, '4', now).map((p) => p.value)).toEqual([73.4])
    expect(weighInsIn(logs, '12', now).map((p) => p.value)).toEqual([74, 73.4])
    expect(weighInsIn(logs, 'all', now).map((p) => p.value)).toEqual([75.1, 74, 73.4])
  })

  it('takes each tape from whichever entry last had it', () => {
    const tapes = [
      { id: 'm1', date: new Date(2026, 8, 1).toISOString(), arm: 35, chest: 97, waist: 81 },
      { id: 'm2', date: new Date(2026, 9, 16).toISOString(), arm: 36 },
    ]
    expect(latestTapes(tapes)).toEqual({ arm: 36, chest: 97, waist: 81 })
  })
})
