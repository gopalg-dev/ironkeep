import { type Href, useFocusEffect, useRouter } from 'expo-router'
import { ChevronsRight, CircleCheck, LayoutList, Play } from 'lucide-react-native'
import { type ReactNode, useCallback, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_SM, BTN_SM_TEXT, BTN_SM2, BTN_SM2_TEXT, BTN_TEXT } from '@/components/button-styles'
import { instantOf } from '@/components/day-field'
import { DayIcon, dayColourClass, dayInkClass } from '@/components/day-icon'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { FillIcon } from '@/components/fill-icon'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { Streak } from '@/components/streak'
import { CAPTION, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { useOpenExercise } from '@/features/library/open-exercise'
import { WorkoutScreen } from '@/features/workout/workout-screen'
import { targetOf, weekdayDate } from '@/lib/format'
import type { Alert } from '@/lib/logic/alerts'
import { type Nudge, nudgeFor } from '@/lib/logic/nudges'
import { WEEKDAY_LONG } from '@/lib/logic/schedule'
import { plannedSetsFor } from '@/lib/logic/stats'
import type { PlanDay, TrainingAge } from '@/lib/types'
import { cn } from '@/lib/utils'
import { AlertDeck } from './alert-deck'
import { LogWeightDialog } from './log-weight-dialog'
import { NudgeRow } from './nudge-row'
import { SkipDialog } from './skip-dialog'
import { ThisWeek } from './this-week'
import { dayAfter, missedCells, sizeOf, todayView, weekCells } from './today-model'

type Panel = 'skip' | 'weigh'

/** The footer with the tab bar under it (canvas `.footer`): less room below than the setup's. */
const FOOTER = 'gap-0.5 pb-5'

/**
 * Today: the day up next with its lifts and the one button that starts it, the week streak, the
 * alerts, the weigh-in or tape reminder, and the quiet ways out: pick another day, skip or done.
 * On the weekday schedule a rest day shows the week instead.
 */
export function TodayScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const [data, setData] = useState<repo.TodayData | null>(null)
  const [panel, setPanel] = useState<Panel | null>(null)
  // Alerts dismissed this visit; the store hides them on the next load, this keeps them gone until then.
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  // "Not now" hides the reminder at once; the store remembers it, and the next load shows the next one, if any.
  const [waved, setWaved] = useState<Nudge['kind'] | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    let live = true
    repo.getTodayData().then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [])
  useFocusEffect(load)
  const refresh = () => repo.getTodayData().then(setData)
  const close = () => setPanel(null)

  if (!data) return <Screen>{null}</Screen>
  const now = new Date()
  const { settings, plan, active } = data

  if (active) return <WorkoutScreen key={active.id} workout={active} settings={settings} onChanged={refresh} />

  const view = todayView(data, now)
  const day = view.day
  const alerts = data.alerts.filter((a) => !hidden.has(a.key))
  const due = nudgeFor(data.lastBodyweightAt, data.lastMeasurementAt, now, settings.nudges)
  const nudge = due && due.kind !== waved ? due : null
  const cells = view.byWeekday && !day ? weekCells(plan.days, data.recent, now) : []
  const missed = missedCells(cells)
  const next = view.week?.next ?? null
  const nextWeekday = next ? (WEEKDAY_LONG[next.day.weekday ?? 0] ?? '') : ''
  const nextSub = next ? `${nextWeekday}, ${sizeOf(next.day, settings.trainingAge)}` : ''

  const start = async (dayId: string) => {
    if (busy) return
    setBusy(true)
    try {
      await repo.startWorkout(dayId)
      await refresh()
    } finally {
      setBusy(false)
    }
  }
  const skip = async (dayId: string) => {
    await repo.skipDay(dayId)
    await refresh()
  }
  const dismiss = (key: string) => {
    setHidden((prev) => new Set(prev).add(key))
    void repo.dismissAlert(key)
  }
  const later = (n: Nudge) => {
    setWaved(n.kind)
    void repo.dismissNudge(n.kind).then(refresh)
  }
  // A review alert carries the report's own path; the others go to Plan or Stats.
  const onAlert = (a: Alert) =>
    router.push(a.kind === 'review' ? (a.to as Href) : a.kind === 'stall' ? '/plan' : '/stats')
  const onLog = (n: Nudge) => (n.kind === 'weight' ? setPanel('weigh') : router.push('/stats'))

  // The blocks under the summary: the first sits 24 below it, the next ones 16 apart.
  const blocks: ReactNode[] = []
  if (alerts.length > 0) blocks.push(<AlertDeck key="alerts" alerts={alerts} onDismiss={dismiss} onAction={onAlert} />)
  if (nudge) blocks.push(<NudgeRow key="nudge" nudge={nudge} onLog={onLog} onLater={later} />)
  if (day && day.exercises.length > 0) blocks.push(<Lifts key="lifts" day={day} age={settings.trainingAge} />)
  if (!day && view.byWeekday)
    blocks.push(
      <View key="week">
        <ThisWeek cells={cells} />
        {missed.map((c) => {
          if (!c.day) return null
          const sub = `${WEEKDAY_LONG[c.weekday]}, no session`
          return (
            <Group key={c.weekday} className="mt-2">
              <Row tall>
                <DayIcon type={c.day.type} />
                <RowBody>
                  <RowTitle>{c.day.name}</RowTitle>
                  <RowSub>{sub}</RowSub>
                </RowBody>
                <Button variant="secondary" className={BTN_SM2} disabled={busy} onPress={() => start(c.day?.id ?? '')}>
                  <Icon as={Play} className="size-4.5 text-foreground" />
                  <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Start</Text>
                </Button>
              </Row>
            </Group>
          )
        })}
        {next ? (
          <>
            <Text className={cn(CAPTION, 'mt-6 px-1')}>{next.inDays === 1 ? 'Tomorrow' : nextWeekday}</Text>
            <Group className="mt-2">
              <Row tall>
                <DayIcon type={next.day.type} />
                <RowBody>
                  <RowTitle>{next.day.name}</RowTitle>
                  <RowSub>{nextSub}</RowSub>
                </RowBody>
              </Row>
            </Group>
          </>
        ) : null}
      </View>,
    )

  // One piece: on a narrow phone it moves to the next line whole, not split mid-name.
  const doneLine = `${view.doneToday.map((d) => d.name).join(' and ')} done`

  const pickButton = (full: boolean) => (
    <Button variant="secondary" className={cn(full ? BTN : BTN_SM, 'bg-card')} onPress={() => router.push('/pick-day')}>
      <Icon as={LayoutList} className="size-4.5 text-foreground" />
      <Text className={cn(full ? BTN_TEXT : BTN_SM_TEXT, 'text-foreground')}>Pick session</Text>
    </Button>
  )

  return (
    <Screen
      footerClassName={FOOTER}
      bar={{
        title: view.title,
      }}
      footer={
        day ? (
          <>
            {day.exercises.length === 0 ? (
              // A day with no lifts cannot start: it waits on Plan to be filled.
              <Button variant="secondary" className={cn(BTN, 'bg-card')} onPress={() => router.push('/plan')}>
                <Text className={cn(BTN_TEXT, 'text-foreground')}>Add lifts on Plan</Text>
              </Button>
            ) : (
              <Button className={cn(BTN, dayColourClass(day.type))} disabled={busy} onPress={() => start(day.id)}>
                <Text className={cn(BTN_TEXT, dayInkClass(day.type))}>{`Start ${day.name}`}</Text>
              </Button>
            )}
            <View className="flex-row flex-wrap items-center justify-between gap-2 pt-2">
              {pickButton(false)}
              {/* Rolling order only: by weekday, the calendar decides. */}
              {!view.byWeekday && plan.days.length > 1 ? (
                <Button
                  variant="secondary"
                  className={cn(BTN_SM, 'bg-card')}
                  disabled={busy}
                  onPress={() => setPanel('skip')}
                >
                  <Icon as={ChevronsRight} className="size-4.5 text-foreground" />
                  <Text className={cn(BTN_SM_TEXT, 'text-foreground')}>Skip or done</Text>
                </Button>
              ) : null}
            </View>
          </>
        ) : (
          pickButton(true)
        )
      }
    >
      {/* The date with today's finished sessions beside it, the title under, and the streak to the right of both. */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="shrink">
          <View className="min-h-11 flex-row flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Text className={SECONDARY}>{weekdayDate(now)}</Text>
            {view.doneToday.length > 0 ? (
              <View className="flex-row items-center gap-1">
                <Text className={SECONDARY}>·</Text>
                <FillIcon
                  as={CircleCheck}
                  className="size-4.5 text-primary-foreground"
                  fillClassName="accent-primary"
                />
                <Text className={cn(SECONDARY, 'text-foreground')}>{doneLine}</Text>
              </View>
            ) : null}
          </View>
          <View className="mt-2 flex-row items-center gap-3" onLayout={(e) => measure(e.nativeEvent.layout)}>
            {view.markType ? <DayIcon type={view.markType} size="lg" /> : null}
            <Text className={cn(TITLE, 'shrink')}>{view.title}</Text>
          </View>
        </View>
        <Streak weeks={view.streakWeeks} />
      </View>
      <Text className={cn(SECONDARY, NUMBER, 'mt-2')}>{view.summary}</Text>
      {blocks.map((block, i) => (
        <View
          key={typeof block === 'object' && block && 'key' in block ? String(block.key) : i}
          className={i === 0 ? 'mt-6' : 'mt-4'}
        >
          {block}
        </View>
      ))}
      {day ? (
        <SkipDialog
          open={panel === 'skip'}
          onClose={close}
          day={day}
          next={dayAfter(plan.days, day.id)}
          onSkip={skip}
          onLog={() => router.push('/stats')}
        />
      ) : null}
      <LogWeightDialog
        open={panel === 'weigh'}
        onClose={close}
        units={settings.units}
        initial={settings.bodyweight}
        onSave={(w, day) => void repo.logBodyweight(w, day, instantOf(day)).then(refresh)}
      />
    </Screen>
  )
}

/** The day's lifts: picture, name, and the sets and reps the plan asks for. */
function Lifts({ day, age, className }: { day: PlanDay; age: TrainingAge; className?: string }) {
  const open = useOpenExercise()
  return (
    <Group className={className}>
      {day.exercises.map((e) => {
        const sets = plannedSetsFor(e.sets, age)
        const value = `${sets} × ${targetOf(e)}`
        // Spoken as words: "4 sets of 6 to 12", not the signs.
        const spoken = `${e.name}, ${sets} sets of ${targetOf(e).replace('–', ' to ')}`
        return (
          <Row key={e.id} tall accessible accessibilityLabel={spoken}>
            <ExerciseThumb name={e.name} onPress={open(e.name)} />
            <RowBody>
              <RowTitle>{e.name}</RowTitle>
            </RowBody>
            <RowValue>{value}</RowValue>
          </Row>
        )
      })}
    </Group>
  )
}
