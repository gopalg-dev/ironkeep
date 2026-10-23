import { useRouter } from 'expo-router'
import { Angry, ArrowLeft, CircleCheckBig, Frown, type LucideIcon, Meh, Smile } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { SheetBody } from '@/components/sheet'
import { BODY, H2, NUMBER } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { EFFORT_LABEL, EFFORTS, type Effort } from '@/lib/logic/effort'
import { activeMinutes } from '@/lib/logic/session-time'
import type { Workout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { setLastSummary } from './last-summary'

const FACE: Record<Effort, LucideIcon> = { 1: Smile, 2: Meh, 3: Frown, 4: Angry }

/**
 * How the session felt, asked at Finish (canvas: Workout, finish check-in). With sets left unticked it
 * says they will not count and offers to keep going; with every set ticked it only asks. The body of
 * the `/finish` sheet: it finishes the session and hands the summary to the `/summary` sheet.
 */
export function FinishScreen() {
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [effort, setEffort] = useState<Effort | undefined>(undefined)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const placeholder = useResolveClassNames('text-muted-foreground')
  useEffect(() => {
    let live = true
    repo.getActiveWorkout().then((w) => {
      if (live) setWorkout(w)
    })
    return () => {
      live = false
    }
  }, [])

  const total = workout?.entries.reduce((n, e) => n + e.sets.length, 0) ?? 0
  const unticked = workout?.entries.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0) ?? 0

  async function finish(extra: { effort?: number; note?: string }) {
    if (!workout || busy) return
    setBusy(true)
    try {
      const now = new Date()
      const res = await repo.finishWorkout(workout.id, extra)
      if (res.summary) {
        setLastSummary({ summary: res.summary, minutes: activeMinutes(workout, now) })
        router.replace('/summary')
      } else {
        router.back()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetBody>
      <Text className={H2}>How did it go?</Text>
      <View className="flex-row gap-2" accessibilityRole="radiogroup" accessibilityLabel="Effort">
        {EFFORTS.map((e) => {
          const on = e === effort
          return (
            <Pressable
              key={e}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => setEffort(on ? undefined : e)}
              className={cn(
                'h-19 flex-1 items-center justify-center gap-1.5 rounded-lg',
                on ? 'bg-primary' : 'bg-secondary',
              )}
            >
              <Icon
                as={FACE[e]}
                strokeWidth={1.75}
                className={cn('size-6.5', on ? 'text-primary-foreground' : 'text-foreground')}
              />
              <Text className={cn('text-sm font-bold', on ? 'text-primary-foreground' : 'text-foreground')}>
                {EFFORT_LABEL[e]}
              </Text>
            </Pressable>
          )
        })}
      </View>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Note"
        placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
        accessibilityLabel="Session note"
        maxLength={200}
        multiline
        textAlignVertical="top"
        className="h-18 rounded-xl bg-background px-4 pt-3.5 text-lg font-medium text-foreground"
      />
      {unticked > 0 ? (
        <Text className={BODY}>
          <Text className={cn(BODY, NUMBER, 'font-bold')}>{`${unticked} of ${total}`}</Text>
          {` ${total === 1 ? 'set is' : 'sets are'} not ticked. ${unticked === 1 ? "It won't" : "They won't"} count.`}
        </Text>
      ) : null}
      <View className="gap-2">
        <Button
          className={BTN}
          disabled={busy || !workout}
          onPress={() => finish({ effort, note: note.trim() || undefined })}
        >
          <Icon as={CircleCheckBig} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Save and finish</Text>
        </Button>
        {unticked > 0 ? (
          <Button variant="ghost" className="h-12" onPress={() => router.back()}>
            <Icon as={ArrowLeft} className="size-4.5 text-foreground" />
            <Text className="text-lg font-semibold text-foreground">Keep going</Text>
          </Button>
        ) : (
          <Button variant="ghost" className="h-12" disabled={busy} onPress={() => finish({})}>
            <Text className="text-lg font-semibold text-foreground">Skip</Text>
          </Button>
        )}
      </View>
    </SheetBody>
  )
}
