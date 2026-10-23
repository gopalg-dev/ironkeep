import type { TodayData } from '@/db/repo'
import {
  doneTodayOf,
  type Finished,
  WEEK_ORDER,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  type WeekdayView,
  weekdayOf,
  weekdayView,
} from '@/lib/logic/schedule'
import { plannedSetsFor, weeklyStreakOf } from '@/lib/logic/stats'
import type { DayType, PlanDay, TrainingAge } from '@/lib/types'

/*
 * What Today shows, worked out from the data: the day to start (or none, on a rest day or once
 * today's is done), the heading, the line under it, the week streak. Pure, so it is tested without
 * a database or a screen.
 */

export interface TodayView {
  /** The day the plan says is next, or null on a rest day / once today's is done. */
  day: PlanDay | null
  /** The big heading: the day's name, "Done for today", or "Rest day". */
  title: string
  markType: DayType | undefined
  /** The line under the heading: the day's size, or what comes next when there is no day. */
  summary: string
  byWeekday: boolean
  week: WeekdayView | null
  streakWeeks: number
  /** The plan days with a session finished today, beside the date; only while a day is still shown. */
  doneToday: PlanDay[]
}

export function todayView(data: Pick<TodayData, 'plan' | 'settings' | 'nextDayId' | 'recent'>, now: Date): TodayView {
  const { plan, settings } = data
  const byWeekday = settings.schedule === 'weekday'
  // Rolling: the next day in order. By weekday: the day on today's weekday, unless it is done already.
  const week = byWeekday ? weekdayView(plan.days, now, data.recent) : null
  const day: PlanDay | null = week
    ? week.today && !week.doneToday
      ? week.today
      : null
    : (plan.days.find((d) => d.id === data.nextDayId) ?? plan.days[0] ?? null)
  const title = day ? day.name : week?.doneToday ? 'Done for today' : 'Rest day'
  const nextLine = week?.next
    ? `Next: ${week.next.day.name}, ${week.next.inDays === 1 ? 'tomorrow' : weekdayOf(week.next.day)}`
    : 'Nothing planned'
  const summary = day
    ? sizeOf(day, settings.trainingAge)
    : week?.doneToday && week.today
      ? `${week.today.name} is in the log. ${nextLine}`
      : nextLine
  return {
    day,
    title,
    markType: day?.type ?? week?.today?.type,
    summary,
    byWeekday,
    week,
    doneToday: day ? doneTodayOf(plan.days, now, data.recent) : [],
    streakWeeks: weeklyStreakOf(
      data.recent.map((f) => f.finishedAt),
      now,
    ),
  }
}

/** "6 exercises, 20 sets", with the sets the training age plans. */
export function sizeOf(day: PlanDay, age: TrainingAge): string {
  if (day.exercises.length === 0) return 'No lifts yet'
  const sets = day.exercises.reduce((n, e) => n + plannedSetsFor(e.sets, age), 0)
  return `${day.exercises.length} exercises, ${sets} sets`
}

/** The day Next up moves to when this one is skipped: the one after it in the rolling order. */
export function dayAfter(days: PlanDay[], dayId: string): PlanDay | null {
  if (days.length < 2) return null
  const i = days.findIndex((d) => d.id === dayId)
  return days[(i + 1) % days.length] ?? null
}

/** One cell of the "This week" card: a weekday, what was planned on it, and what happened. */
export interface WeekCell {
  weekday: number
  letter: string
  day: PlanDay | null
  done: boolean
  /** The colour of the cell when a session was done: the planned day's, or the day actually trained. */
  doneType: DayType | null
  today: boolean
  past: boolean
}

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/** Monday to Sunday of the week `now` is in. */
export function weekCells(days: PlanDay[], recent: Finished[], now: Date): WeekCell[] {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return WEEK_ORDER.map((weekday, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const day = days.find((d) => d.weekday === weekday) ?? null
    const session = recent.find((f) => sameDay(new Date(f.finishedAt), date))
    const trained = session ? (days.find((d) => d.id === session.dayId)?.type ?? null) : null
    return {
      weekday,
      letter: WEEKDAY_SHORT[weekday]?.charAt(0) ?? '',
      day,
      done: session !== undefined,
      doneType: session ? (day?.type ?? trained) : null,
      today: sameDay(date, now),
      past: date.getTime() < now.getTime() && !sameDay(date, now),
    }
  })
}

/** "5 of 6 planned days done. Push B on Friday has no session." */
export function weekLine(cells: WeekCell[]): string {
  const planned = cells.filter((c) => c.day !== null)
  const done = planned.filter((c) => c.done).length
  const missed = planned.filter((c) => c.past && !c.done)
  const parts = [`${done} of ${planned.length} planned days done.`]
  for (const c of missed) if (c.day) parts.push(`${c.day.name} on ${WEEKDAY_LONG[c.weekday]} has no session.`)
  return parts.join(' ')
}

/** The planned days of this week that went by without a session, in week order. */
export const missedCells = (cells: WeekCell[]): WeekCell[] => cells.filter((c) => c.day !== null && c.past && !c.done)
