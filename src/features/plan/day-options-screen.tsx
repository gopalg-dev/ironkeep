import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowDown, ArrowUp, Pencil, RotateCcw, Trash2 } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Chip, Chips } from '@/components/chip'
import { Dialog } from '@/components/dialog'
import { Group, Row, RowBody, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { BODY, CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { DEFAULT_SPLIT } from '@/lib/content'
import { inDefaultOrder, templateExercises } from '@/lib/logic/default-order'
import { WEEK_ORDER, WEEKDAY_SHORT } from '@/lib/logic/schedule'
import { BUNDLED_SPLITS } from '@/lib/splits'
import type { Plan, PlanDay, Settings } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TodaySyncDialog, touchesToday } from './today-sync-dialog'

const RENAME = 'Rename or change kind'
const UP = 'Move up'
const DOWN = 'Move down'
const RESTORE = 'Restore default order'
const REMOVE = 'Remove day'

/** A day's options (canvas: the day options button on Plan): rename, move, restore the order, its weekday, remove. The `/day-options` sheet. */
export function DayOptionsScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [data, setData] = useState<{ plan: Plan; settings: Settings } | null>(null)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [ask, setAsk] = useState<{ dayName: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const load = useCallback(
    () => Promise.all([repo.getPlan(), repo.getSettings()]).then(([plan, settings]) => setData({ plan, settings })),
    [],
  )
  useEffect(() => {
    void load()
  }, [load])
  if (!data) return <SheetBody>{null}</SheetBody>
  const { plan, settings } = data
  const at = plan.days.findIndex((d) => d.id === id)
  const day: PlanDay | undefined = plan.days[at]
  if (!day) return <SheetBody>{null}</SheetBody>
  const source = settings.split ?? DEFAULT_SPLIT
  const templateDays = source === 'custom' ? null : (BUNDLED_SPLITS.find((s) => s.id === source)?.days ?? null)
  const defaultOrder = inDefaultOrder(day.exercises, templateExercises(templateDays, day)).map((e) => e.id)
  const ordered = defaultOrder.every((eid, i) => day.exercises[i]?.id === eid)
  const byWeekday = settings.schedule === 'weekday'

  const run = async (fn: () => Promise<unknown>, then: 'back' | 'reload' = 'back') => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
      if (then === 'back') router.back()
      else await load()
    } finally {
      setBusy(false)
    }
  }
  const restore = async () => {
    await repo.reorderExercises(day.id, defaultOrder)
    if (await touchesToday(day.id)) setAsk({ dayName: day.name })
    else router.back()
  }

  return (
    <SheetBody>
      <Text accessibilityRole="header" className={H2}>
        {day.name}
      </Text>
      <Group>
        <Row
          tone="page"
          tall
          accessibilityLabel={RENAME}
          onPress={() => router.replace({ pathname: '/edit-day', params: { id: day.id } })}
        >
          <Icon as={Pencil} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{RENAME}</RowTitle>
          </RowBody>
        </Row>
        <Row
          tone="page"
          tall
          accessibilityLabel={UP}
          disabled={at === 0 || busy}
          onPress={() => run(() => repo.moveDay(day.id, 'up'))}
          className={cn(at === 0 && 'opacity-40')}
        >
          <Icon as={ArrowUp} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{UP}</RowTitle>
          </RowBody>
        </Row>
        <Row
          tone="page"
          tall
          accessibilityLabel={DOWN}
          disabled={at === plan.days.length - 1 || busy}
          onPress={() => run(() => repo.moveDay(day.id, 'down'))}
          className={cn(at === plan.days.length - 1 && 'opacity-40')}
        >
          <Icon as={ArrowDown} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{DOWN}</RowTitle>
          </RowBody>
        </Row>
        {!ordered ? (
          <Row tone="page" tall accessibilityLabel={RESTORE} disabled={busy} onPress={() => run(restore, 'reload')}>
            <Icon as={RotateCcw} strokeWidth={1.75} className="size-5.5 text-foreground" />
            <RowBody>
              <RowTitle>{RESTORE}</RowTitle>
            </RowBody>
          </Row>
        ) : null}
        <Row
          tone="page"
          tall
          accessibilityLabel={REMOVE}
          disabled={plan.days.length <= 1 || busy}
          onPress={() => setRemoveOpen(true)}
          className={cn(plan.days.length <= 1 && 'opacity-40')}
        >
          <Icon as={Trash2} strokeWidth={1.75} className="size-5.5 text-destructive" />
          <RowBody>
            <RowTitle className="text-destructive">{REMOVE}</RowTitle>
          </RowBody>
        </Row>
      </Group>
      {byWeekday ? (
        <View className="gap-2">
          <Text className={cn(CAPTION, 'px-1')}>On</Text>
          <Chips>
            {WEEK_ORDER.map((wd) => {
              const on = day.weekday === wd
              return (
                <Button
                  key={wd}
                  variant="ghost"
                  className="h-auto p-0"
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  onPress={() => run(() => repo.setDayWeekday(day.id, wd), 'reload')}
                >
                  <Chip on={on}>{WEEKDAY_SHORT[wd]}</Chip>
                </Button>
              )
            })}
          </Chips>
        </View>
      ) : null}
      <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)}>
        <View className="gap-1">
          <Text accessibilityRole="header" className={H2}>{`Remove ${day.name}?`}</Text>
          <Text className={cn(BODY, 'text-muted-foreground')}>Its exercises go with it. Logged sessions stay.</Text>
        </View>
        <View className="gap-2">
          <Button
            variant="destructive"
            className={BTN}
            disabled={busy}
            onPress={() => run(() => repo.removeDay(day.id))}
          >
            <Icon as={Trash2} className="size-4.5 text-white" />
            <Text className={cn(BTN_TEXT, 'text-white')}>Remove day</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => setRemoveOpen(false)}>
            <Text className="text-lg font-semibold text-foreground">Keep it</Text>
          </Button>
        </View>
      </Dialog>
      <TodaySyncDialog
        ask={ask}
        onClose={() => {
          setAsk(null)
          router.back()
        }}
      />
    </SheetBody>
  )
}
