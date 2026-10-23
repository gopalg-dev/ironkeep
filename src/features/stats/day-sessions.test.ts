import { describe, expect, it } from '@jest/globals'

import type { FinishedWorkout } from '@/lib/logic/stats'
import { sessionChoiceLine, sessionsOnDay } from './day-sessions'

const session = (id: string, hour: number): FinishedWorkout => ({
  id,
  dayId: 'pull',
  dayName: 'Pull A',
  dayType: 'pull',
  startedAt: new Date(2026, 9, 23, hour, 0).toISOString(),
  finishedAt: new Date(2026, 9, 23, hour, 45).toISOString(),
  status: 'done',
  entries: [],
})

describe('sessions on a calendar day', () => {
  it('keeps repeated plan days as separate choices, newest first, without changing the input', () => {
    const morning = session('morning', 6)
    const evening = session('evening', 18)
    const noon = session('noon', 12)
    const workouts = [morning, evening, noon]
    expect(sessionsOnDay(workouts, '2026-10-23').map((w) => w.id)).toEqual(['evening', 'noon', 'morning'])
    expect(workouts.map((w) => w.id)).toEqual(['morning', 'evening', 'noon'])
  })

  it('matches the local finish date, including workouts that cross midnight', () => {
    const overnight = {
      ...session('overnight', 23),
      finishedAt: new Date(2026, 9, 24, 0, 15).toISOString(),
    }
    expect(sessionsOnDay([overnight], '2026-10-23')).toEqual([])
    expect(sessionsOnDay([overnight], '2026-10-24')).toEqual([overnight])
  })

  it('excludes active or unstamped workouts and returns the single finished session unchanged', () => {
    const done = session('done', 6)
    const workouts = [
      { ...session('active', 7), status: 'in_progress' as const },
      { ...session('unstamped', 8), finishedAt: undefined },
      done,
    ]
    expect(sessionsOnDay(workouts, '2026-10-23')).toEqual([done])
    expect(sessionsOnDay(workouts, '2026-10-22')).toEqual([])
  })

  it('distinguishes same-name sessions by time and excludes paused time and unticked sets', () => {
    const workout: FinishedWorkout = {
      ...session('morning', 6),
      pausedMs: 15 * 60 * 1000,
      entries: [
        {
          exerciseId: 'row',
          name: 'Row',
          muscle: 'back',
          loadType: 'weight',
          repMin: 6,
          repMax: 10,
          sets: [{ done: true, weight: 40, reps: 8 }, { done: false }],
        },
      ],
    }
    expect(sessionChoiceLine(workout)).toBe('6:00 AM · 1 set · 30 min')
    expect(sessionChoiceLine(session('evening', 18))).toBe('6:00 PM · 0 sets · 45 min')
  })
})
