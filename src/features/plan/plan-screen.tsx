import { useFocusEffect, useRouter } from 'expo-router'
import { ChevronDown, ChevronRight, ChevronUp, Ellipsis, Plus, RotateCcw, Trash2, Upload } from 'lucide-react-native'
import { useCallback, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_DANGER, BTN_SM2, BTN_SM2_TEXT, BTN_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { Dialog } from '@/components/dialog'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { SortableRows } from '@/components/sortable-rows'
import { BODY, CAPTION, H2, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { useOpenExercise } from '@/features/library/open-exercise'
import { sizeOf } from '@/features/today/today-model'
import { planSourceInfo } from '@/lib/content'
import { targetOf } from '@/lib/format'
import { WEEKDAY_LONG } from '@/lib/logic/schedule'
import { plannedSetsFor } from '@/lib/logic/stats'
import { BUNDLED_SPLITS } from '@/lib/splits'
import { MAX_DAYS, MAX_EXERCISES_PER_DAY, type Plan, type PlanDay, type Settings } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TodaySyncDialog, touchesToday } from './today-sync-dialog'

const FOOTER = 'gap-0.5 pb-5'
const ADD_DAY = 'Add a day'
const RESET = 'Reset to the original plan'
const OWN_PLAN = 'Bring your own plan'

/**
 * The plan (canvas: Plan): the split and its days, one open at a time with its lifts to drag, edit,
 * add to, and the day's options; then a day to add and the way back to the template.
 */
export function PlanScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const openExercise = useOpenExercise()
  const [data, setData] = useState<{ plan: Plan; settings: Settings; activeDayId: string | null } | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [ask, setAsk] = useState<{ dayName: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    () =>
      Promise.all([repo.getPlan(), repo.getSettings(), repo.activeDayId()]).then(([plan, settings, activeDayId]) =>
        setData({ plan, settings, activeDayId }),
      ),
    [],
  )
  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load]),
  )
  if (!data) return <Screen>{null}</Screen>
  const { plan, settings } = data
  const split = planSourceInfo(BUNDLED_SPLITS, settings.split, plan.days.length)
  const byWeekday = settings.schedule === 'weekday'
  const subtitle = `${split.name}, ${plan.days.length} ${plan.days.length === 1 ? 'day' : 'days'}${byWeekday ? ', by weekday' : ''}`

  async function reorder(day: PlanDay, order: string[]) {
    await repo.reorderExercises(day.id, order)
    await load()
    if (await touchesToday(day.id)) setAsk({ dayName: day.name })
  }
  async function reset() {
    setBusy(true)
    try {
      await repo.resetPlan()
      setResetOpen(false)
      await load()
    } finally {
      setBusy(false)
    }
  }
  const edit = (day: PlanDay, id?: string) =>
    router.push({ pathname: '/edit-exercise', params: id ? { day: day.id, id } : { day: day.id } })

  return (
    <Screen
      footerClassName={FOOTER}
      bar={{
        title: 'Plan',
      }}
    >
      <View className="min-h-11 flex-row items-center" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Plan
        </Text>
      </View>
      <Text className={cn(SECONDARY, NUMBER, 'mt-1')}>{subtitle}</Text>
      {plan.days.map((day, i) => {
        const open = openDay === day.id
        const sub = `${sizeOf(day, settings.trainingAge)}${byWeekday && day.weekday !== undefined ? `, ${WEEKDAY_LONG[day.weekday]}s` : ''}`
        return (
          <Group key={day.id} className={i === 0 ? 'mt-6' : 'mt-2'}>
            <Row
              tall
              onPress={() => setOpenDay(open ? null : day.id)}
              accessibilityLabel={`${day.name}, ${sub}`}
              accessibilityState={{ expanded: open }}
            >
              <DayIcon type={day.type} />
              <RowBody>
                <RowTitle>
                  {day.name}
                  {data.activeDayId === day.id ? ' ? In progress' : ''}
                </RowTitle>
                <RowSub>{sub}</RowSub>
              </RowBody>
              <IconButton
                as={Ellipsis}
                size="sm"
                tone="ghost"
                accessibilityLabel={`${day.name} options`}
                onPress={() => router.push({ pathname: '/day-options', params: { id: day.id } })}
              />
              <Icon as={open ? ChevronUp : ChevronDown} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
            </Row>
            {open ? (
              <>
                <SortableRows items={day.exercises} nameOf={(e) => e.name} onReorder={(order) => reorder(day, order)}>
                  {(e, grip) => {
                    const value = `${plannedSetsFor(e.sets, settings.trainingAge)} × ${targetOf(e)}`
                    return (
                      <Row tall onPress={() => edit(day, e.id)} accessibilityLabel={`${e.name}, ${value}. Edit`}>
                        {grip}
                        <ExerciseThumb name={e.name} onPress={openExercise(e.name)} />
                        <RowBody>
                          <RowTitle>{e.name}</RowTitle>
                          {e.note ? <RowSub numberOfLines={2}>{e.note}</RowSub> : null}
                        </RowBody>
                        <RowValue>{value}</RowValue>
                        <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
                      </Row>
                    )
                  }}
                </SortableRows>
                <Row>
                  <RowBody>
                    <Text
                      className={cn(CAPTION, NUMBER)}
                    >{`${day.exercises.length} of ${MAX_EXERCISES_PER_DAY} exercises`}</Text>
                  </RowBody>
                  <Button
                    variant="secondary"
                    className={BTN_SM2}
                    disabled={day.exercises.length >= MAX_EXERCISES_PER_DAY}
                    onPress={() => edit(day)}
                  >
                    <Icon as={Plus} className="size-4.5 text-foreground" />
                    <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Add exercise</Text>
                  </Button>
                </Row>
              </>
            ) : null}
          </Group>
        )
      })}
      <Group className="mt-6">
        <Row
          accessibilityLabel={ADD_DAY}
          disabled={plan.days.length >= MAX_DAYS}
          onPress={() => router.push('/add-day')}
          className={cn(plan.days.length >= MAX_DAYS && 'opacity-40')}
        >
          <Icon as={Plus} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{ADD_DAY}</RowTitle>
          </RowBody>
          <Text className={cn(CAPTION, NUMBER)}>{`${plan.days.length} of ${MAX_DAYS}`}</Text>
        </Row>
        {!split.custom ? (
          <Row accessibilityLabel={RESET} onPress={() => setResetOpen(true)}>
            <Icon as={RotateCcw} strokeWidth={1.75} className="size-5.5 text-foreground" />
            <RowBody>
              <RowTitle>{RESET}</RowTitle>
            </RowBody>
            <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
          </Row>
        ) : null}
        <Row accessibilityLabel={OWN_PLAN} onPress={() => router.push('/plan-import')}>
          <Icon as={Upload} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{OWN_PLAN}</RowTitle>
          </RowBody>
          <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
      </Group>
      <Dialog open={resetOpen} onClose={() => setResetOpen(false)}>
        <View className="gap-1">
          <Text accessibilityRole="header" className={H2}>
            Reset the plan?
          </Text>
          <Text
            className={cn(BODY, 'text-muted-foreground')}
          >{`Every edit and swap goes back to the ${split.name} template. Logged workouts stay.`}</Text>
        </View>
        <View className="gap-2">
          <Button variant="destructive" className={cn(BTN, BTN_DANGER)} disabled={busy} onPress={reset}>
            <Icon as={Trash2} className="size-4.5 text-white" />
            <Text className={cn(BTN_TEXT, 'text-white')}>Reset</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => setResetOpen(false)}>
            <Text className="text-lg font-semibold text-foreground">Keep my edits</Text>
          </Button>
        </View>
      </Dialog>
      <TodaySyncDialog ask={ask} onClose={() => setAsk(null)} />
    </Screen>
  )
}
