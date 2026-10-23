import { useRouter } from 'expo-router'
import { Play } from 'lucide-react-native'
import { useEffect, useState } from 'react'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { H2, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { relativeDay } from '@/lib/format'
import { lastDoneAt, WEEKDAY_SHORT } from '@/lib/logic/schedule'
import { cn } from '@/lib/utils'
import { todayView } from './today-model'

const capital = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** Every plan day with Start on each: a different day than the one up next. The body of the `/pick-day` sheet. */
// The name: 'Pick session', the user's pick over 'Pick a day' (a calendar) and 'Other days', 2026-10-21.
export function PickDayScreen() {
  const router = useRouter()
  const [data, setData] = useState<repo.TodayData | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    repo.getTodayData().then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [])

  const now = new Date()
  const view = data ? todayView(data, now) : null
  const nextDayId = view?.day?.id ?? view?.week?.next?.day.id ?? null
  const logged = data?.active?.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) ?? 0

  const start = async (dayId: string) => {
    if (busy) return
    setBusy(true)
    try {
      await repo.startWorkout(dayId)
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetBody>
      <Text className={H2}>Pick session</Text>
      {data?.active ? (
        <Text className={SECONDARY}>
          {logged > 0
            ? `Switching drops the ${logged} ${logged === 1 ? 'set' : 'sets'} logged so far.`
            : 'Nothing is logged yet, so nothing is lost.'}
        </Text>
      ) : null}
      {data && view ? (
        <Group>
          {data.plan.days.map((d) => {
            const next = d.id === nextDayId
            const doneAt = lastDoneAt(d.id, data.recent)
            // Its weekday on the weekday schedule; otherwise that it is next, or when it was last done.
            const detail =
              view.byWeekday && d.weekday !== undefined
                ? WEEKDAY_SHORT[d.weekday]
                : next
                  ? 'Next up'
                  : doneAt
                    ? capital(relativeDay(doneAt, now))
                    : `${d.exercises.length} exercises`
            return (
              <Row key={d.id} tone="page" tall>
                <DayIcon type={d.type} />
                <RowBody>
                  <RowTitle>{d.name}</RowTitle>
                  <RowSub>{detail}</RowSub>
                </RowBody>
                <Button
                  variant={next ? 'default' : 'secondary'}
                  className={BTN_SM2}
                  disabled={busy || d.exercises.length === 0}
                  accessibilityLabel={`Start ${d.name}`}
                  onPress={() => start(d.id)}
                >
                  <Icon as={Play} className={cn('size-4.5', next ? 'text-primary-foreground' : 'text-foreground')} />
                  <Text className={cn(BTN_SM2_TEXT, next ? 'text-primary-foreground' : 'text-foreground')}>Start</Text>
                </Button>
              </Row>
            )
          })}
        </Group>
      ) : null}
    </SheetBody>
  )
}
