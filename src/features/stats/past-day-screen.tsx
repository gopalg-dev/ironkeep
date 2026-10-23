import { useLocalSearchParams } from 'expo-router'
import { ListChecks } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Pressable, View } from 'react-native'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { Chip, Chips } from '@/components/chip'
import { CAPTION } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { shortDate, weekdayDate } from '@/lib/format'
import { completeSet } from '@/lib/logic/sets'
import { noon } from '@/lib/logic/stats'
import type { Plan, Settings, Workout, WorkoutEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SessionEditor } from './session-editor'

type Apply = (update: (current: WorkoutEntry[]) => WorkoutEntry[]) => void

/**
 * A day trained without the app (canvas: Stats, log a past day): the plan day it was, then the
 * workout screen's cards over last time's sets to tick, Tick all, and Log, which stores the session
 * dated that day. Opened from an empty past day on the Stats calendar. The `/past-day` sheet.
 */
export function PastDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>()
  const day = date ?? ''
  // Midday on that day, local, so the session lands on the day picked whatever the time zone.
  const at = new Date(noon(day)).toISOString()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [dayId, setDayId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Workout | null>(null)
  const apply = useRef<Apply | null>(null)

  useEffect(() => {
    let live = true
    Promise.all([repo.getPlan(), repo.getSettings()]).then(([p, st]) => {
      if (!live) return
      setPlan(p)
      setSettings(st)
      setDayId(p.days.find((d) => d.exercises.length > 0)?.id ?? null)
    })
    return () => {
      live = false
    }
  }, [])
  useEffect(() => {
    if (!dayId) return
    let live = true
    repo.draftWorkout(dayId, at).then((w) => {
      if (live) setDraft(w)
    })
    return () => {
      live = false
    }
  }, [dayId, at])

  /** Every set of every lift done, each filled from its target: the session went as planned. */
  const tickAll = () =>
    apply.current?.((current) =>
      current.map((e) => ({
        ...e,
        sets: e.sets.reduce((sets, s, i) => (s.done ? sets : completeSet(e, sets, i)), e.sets),
      })),
    )

  const when = shortDate(at)
  return (
    <SessionEditor
      workout={draft}
      settings={settings}
      line={`${weekdayDate(at)}, no session logged`}
      head={
        plan ? (
          <View className="gap-3">
            <Chips>
              {plan.days
                .filter((d) => d.exercises.length > 0)
                .map((d) => {
                  const on = d.id === dayId
                  return (
                    <Pressable
                      key={d.id}
                      hitSlop={6}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: on }}
                      onPress={() => setDayId(d.id)}
                    >
                      <Chip on={on}>{d.name}</Chip>
                    </Pressable>
                  )
                })}
            </Chips>
            <View className="flex-row items-center justify-between gap-3">
              <Text className={cn(CAPTION, 'shrink')}>{`Sets, prefilled from the last ${draft?.dayName ?? ''}`}</Text>
              <Button variant="secondary" className={BTN_SM2} onPress={tickAll}>
                <Icon as={ListChecks} className="size-4.5 text-foreground" />
                <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Tick all</Text>
              </Button>
            </View>
          </View>
        ) : undefined
      }
      action={(n) => `Log ${n} ${n === 1 ? 'set' : 'sets'} for ${when}`}
      needsTick
      onSave={(changes) => (draft ? repo.logPastWorkout(draft.dayId, at, changes).then(() => {}) : Promise.resolve())}
      onEntries={(fn) => {
        apply.current = fn
      }}
    />
  )
}
