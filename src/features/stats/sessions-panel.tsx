import { useRouter } from 'expo-router'
import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { dayColourClass, dayInkClass, familyColourClass } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { Stat } from '@/components/stat-tile'
import { BIG_NUMBER, CAPTION, H2, NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import type { StatsData } from '@/db/repo'
import { monthYear } from '@/lib/format'
import { effortThisWeek } from '@/lib/logic/effort'
import {
  type CalendarDay,
  dayKey,
  finished,
  monthCalendar,
  plannedVolumeByMuscle,
  sessionsInWeek,
  volumeByMuscleInWeek,
  weeklyStreak,
  weekTotals,
} from '@/lib/logic/stats'
import { plannedPerWeek } from '@/lib/logic/summary'
import type { Muscle } from '@/lib/types'
import { cn } from '@/lib/utils'
import { BodyMap } from './body-map'
import {
  hardSetRows,
  hardSetsTotal,
  MUSCLE_FAMILY,
  monthBounds,
  monthIndex,
  thisWeekLine,
  thousands,
} from './stats-model'

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/**
 * Sessions (canvas: Stats sessions): the week's count against the plan with its streak, effort and
 * totals; a month of sessions as a calendar (a day opens its session, or logs one); the week's hard
 * sets by muscle with the body map behind them.
 */
export function SessionsPanel({ data }: { data: StatsData }) {
  const router = useRouter()
  const now = new Date()
  const { plan, workouts, settings } = data
  const [offset, setOffset] = useState(0)
  const [picked, setPicked] = useState<Muscle | null>(null)
  const pick = (m: Muscle) => setPicked((cur) => (cur === m ? null : m))
  const month = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const { lowest, highest } = monthBounds(now, settings.joinedAt)
  const at = monthIndex(month)
  const weeks = monthCalendar(workouts, now, month, settings.joinedAt)
  const done = sessionsInWeek(workouts, now)
  const planned = plannedPerWeek(plan, settings)
  const totals = weekTotals(workouts, now)
  const line = thisWeekLine(weeklyStreak(workouts, now), effortThisWeek(workouts, now))
  const rows = hardSetRows(volumeByMuscleInWeek(workouts, now), plannedVolumeByMuscle(plan, settings.trainingAge))
  const todayKey = dayKey(now)

  /** A day with a session opens the latest one to edit; a past day without one logs one. */
  const openDay = (day: CalendarDay) => {
    if (day.future || day.before) return
    const sessions = finished(workouts).filter((w) => dayKey(w.finishedAt) === day.date)
    const last = sessions[sessions.length - 1]
    if (last) router.push({ pathname: '/session-editor', params: { id: last.id } })
    else router.push({ pathname: '/past-day', params: { date: day.date } })
  }

  return (
    <View>
      <View className="mt-4 rounded-xl bg-card px-4 pt-5 pb-4">
        <Text className={SECONDARY}>This week</Text>
        <View className="flex-row items-baseline">
          <Text className={BIG_NUMBER}>{done}</Text>
          <Text className={cn('ml-1 text-xl font-semibold text-muted-foreground', NUMBER)}>
            {`of ${planned} ${planned === 1 ? 'session' : 'sessions'}`}
          </Text>
        </View>
        {line ? <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>{line}</Text> : null}
        <View className="mt-4 flex-row gap-2">
          <Stat value={String(totals.sets)} label="hard sets" />
          <Stat value={thousands(totals.lifted)} label={`${settings.units} lifted`} />
          <Stat value={String(totals.minutes)} label="minutes" />
        </View>
      </View>

      <View className="mt-6 flex-row items-center justify-between gap-3">
        <Text className={H2}>{monthYear(month)}</Text>
        <View className="flex-row gap-2">
          <IconButton
            as={ChevronLeft}
            size="sm"
            tone="surface"
            accessibilityLabel="Previous month"
            disabled={at <= lowest}
            className={cn(at <= lowest && 'opacity-40')}
            onPress={() => setOffset((o) => o - 1)}
          />
          <IconButton
            as={ChevronRight}
            size="sm"
            tone="surface"
            accessibilityLabel="Next month"
            disabled={at >= highest}
            className={cn(at >= highest && 'opacity-40')}
            onPress={() => setOffset((o) => o + 1)}
          />
        </View>
      </View>
      <View className="mt-3 gap-1.5">
        <View className="flex-row gap-1.5">
          {WEEKDAYS.map((w, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: two Tuesdays and two Saturdays share a letter
            <Text key={i} className="h-5 flex-1 text-center text-xs font-semibold text-muted-foreground">
              {w}
            </Text>
          ))}
        </View>
        {weeks.map((week) => (
          <View key={week.start} className="flex-row gap-1.5">
            {week.days.map((day, i) =>
              day ? (
                <Cell key={day.date} day={day} today={day.date === todayKey} onPress={() => openDay(day)} />
              ) : (
                // biome-ignore lint/suspicious/noArrayIndexKey: an empty slot before the 1st or after the last day
                <View key={`blank-${i}`} className="h-10 flex-1" />
              ),
            )}
          </View>
        ))}
      </View>

      <View className="mt-8 flex-row items-center justify-between gap-3">
        <Text className={H2}>Hard sets this week</Text>
        <Text className={cn(SECONDARY, NUMBER)}>{hardSetsTotal(rows)}</Text>
      </View>
      <BodyMap rows={rows} picked={picked} onPick={pick} className="mt-3" />
      {rows.length > 0 ? (
        <View className="mt-2 gap-1.5 rounded-xl bg-card px-2 py-2">
          {rows.map((r) => {
            const on = picked === r.muscle
            return (
              <Pressable
                key={r.muscle}
                accessibilityRole="button"
                accessibilityLabel={`${r.label}, ${r.done} of ${r.planned} sets`}
                accessibilityState={{ selected: on }}
                onPress={() => pick(r.muscle)}
                className={cn('flex-row items-center gap-3 rounded-sm px-2 py-0.5', on && 'bg-secondary')}
              >
                {/* The muscle's colour on the figures, so a bar and a region read as one. */}
                <View className="w-30 flex-row items-center gap-2">
                  <View
                    className={cn('size-2.5 rounded-full', familyColourClass(MUSCLE_FAMILY[r.muscle]))}
                    accessibilityElementsHidden
                  />
                  <Text className={cn(SECONDARY, 'shrink', on && 'text-foreground')} numberOfLines={1}>
                    {r.label}
                  </Text>
                </View>
                <View
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: r.planned || r.done, now: r.done }}
                  // The track swaps to the card's colour on a lit row, which is the track's own colour.
                  className={cn('h-2.5 flex-1 overflow-hidden rounded-full', on ? 'bg-card' : 'bg-secondary')}
                >
                  <View
                    className={cn('h-full rounded-full', familyColourClass(MUSCLE_FAMILY[r.muscle]))}
                    style={{ width: `${Math.min(100, r.planned > 0 ? (r.done / r.planned) * 100 : 100)}%` }}
                  />
                </View>
                <Text className={cn(CAPTION, NUMBER, 'w-11 text-right')}>{`${r.done} / ${r.planned}`}</Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}

/**
 * One day of the month (canvas `.cal .c`): quiet when nothing happened, on the surface with one
 * session, painted in the day's colour (two colours for two sessions), outlined for today, dimmed
 * before the user joined; days ahead are out of reach.
 */
function Cell({ day, today, onPress }: { day: CalendarDay; today: boolean; onPress: () => void }) {
  const first = day.types[0]
  const second = day.types[1]
  const off = day.future || day.before
  const label = `${day.dayOfMonth}${day.types.length > 0 ? `, ${day.types.length === 1 ? 'session' : `${day.types.length} sessions`}` : ''}`
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: off }}
      disabled={off}
      onPress={onPress}
      className={cn(
        'h-11 flex-1 items-center justify-center overflow-hidden rounded-sm',
        first ? dayColourClass(first) : day.types.length > 0 && 'bg-card',
        today && 'border-2 border-foreground',
        !off && 'active:opacity-80',
      )}
    >
      {second ? <View className={cn('absolute inset-x-0 bottom-0 h-1/2', dayColourClass(second))} /> : null}
      <Text
        className={cn(
          'text-base font-semibold',
          NUMBER,
          first ? dayInkClass(first) : day.before ? 'text-border' : 'text-muted-foreground',
        )}
      >
        {day.dayOfMonth}
      </Text>
    </Pressable>
  )
}
