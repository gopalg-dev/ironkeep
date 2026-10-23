import { useKeepAwake } from 'expo-keep-awake'
import { useRouter } from 'expo-router'
import { CircleCheckBig, Ellipsis, Focus, Pause, Play } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN_SM, BTN_SM_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Screen } from '@/components/screen'
import { NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { stepsOf } from '@/lib/logic/progression'
import { activeMs, elapsedLabel, type Pause as PauseState } from '@/lib/logic/session-time'
import type { Settings, Workout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { DiscardDialog } from './discard-dialog'
import { ExerciseCard } from './exercise-card'
import { useSessionPersist } from './use-session-persist'
import { useSessionSets } from './use-session-sets'

/** The footer with the tab bar under it, as a row: the count on the left, Finish on the right. */
const FOOTER = 'flex-row items-center justify-between gap-4 pb-5'

/** The time, refreshed every so often: the clock reads it. */
function useNow(everyMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

/** The phone stays awake between sets. Rendered only when Settings allow it. */
function KeepAwake() {
  useKeepAwake()
  return null
}

interface WorkoutScreenProps {
  workout: Workout
  settings: Settings
  /** The stored session changed (a swap, a ramp, the end): the caller reloads. */
  onChanged: () => void
}

/**
 * The session in progress (canvas: Workout, the set logger): the clock with its pause, the day, one
 * card per lift with the set being worked, and the footer that counts the sets and finishes. Every
 * change is saved: a tick at once, a stepped number soon after.
 */
export function WorkoutScreen({ workout, settings, onChanged }: WorkoutScreenProps) {
  const router = useRouter()
  const measure = useBigTitle()
  const now = useNow(15_000)
  const [pause, setPause] = useState<PauseState>({ pausedAt: workout.pausedAt, pausedMs: workout.pausedMs })
  const [discardOpen, setDiscardOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const { persist, flush, latest } = useSessionPersist(workout.id)
  const sets = useSessionSets(workout.entries, persist)
  latest.current = sets.entries
  const steps = stepsOf(settings)
  const paused = Boolean(pause.pausedAt)

  /** Takes the set the ramp offered: the store adds it to the plan and the session; the card shows it at once. */
  async function rampUp(exerciseId: string) {
    await flush()
    const updated = await repo.acceptRamp(workout.id, exerciseId)
    sets.setEntries((es) => es.map((e) => (e.exerciseId === exerciseId ? updated : e)))
    onChanged()
  }

  async function togglePause() {
    setPause(await repo.pauseWorkout(workout.id, !paused))
  }

  async function discard() {
    setBusy(true)
    try {
      await repo.discardWorkout(workout.id)
      setDiscardOpen(false)
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  /** Finish with nothing ticked would only throw the session away, so it asks that instead. */
  async function onFinish() {
    if (sets.doneSets === 0) {
      setDiscardOpen(true)
      return
    }
    await flush()
    router.push('/finish')
  }

  const elapsed = elapsedLabel(activeMs({ ...workout, ...pause }, now))

  return (
    <Screen
      footerClassName={FOOTER}
      bar={{
        title: workout.dayName,
        left: (
          <View className="flex-row items-center gap-2">
            <IconButton
              as={paused ? Play : Pause}
              tone="surface"
              accessibilityLabel={paused ? 'Resume the session' : 'Pause the session'}
              onPress={togglePause}
            />
            <Text className={cn(SECONDARY, NUMBER)}>{elapsed}</Text>
          </View>
        ),
        right: (
          <View className="flex-row gap-2">
            <IconButton
              as={Focus}
              tone="surface"
              accessibilityLabel="Zen mode"
              onPress={() => void flush().then(() => router.push('/zen'))}
            />
            <IconButton
              as={Ellipsis}
              tone="surface"
              accessibilityLabel="Session options"
              onPress={() => router.push('/session-options')}
            />
          </View>
        ),
      }}
      footer={
        <>
          <Text className={cn(SECONDARY, NUMBER)}>{`${sets.doneSets} of ${sets.totalSets} sets done`}</Text>
          <Button className={BTN_SM} disabled={busy} onPress={onFinish}>
            <Icon as={CircleCheckBig} className="size-4.5 text-primary-foreground" />
            <Text className={BTN_SM_TEXT}>Finish workout</Text>
          </Button>
        </>
      }
    >
      {settings.keepAwake !== false ? <KeepAwake /> : null}
      <View className="min-h-11" />
      <View className="mt-2 flex-row items-center gap-3" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <DayIcon type={workout.dayType} size="lg" />
        <Text className={cn(TITLE, 'shrink')}>{workout.dayName}</Text>
      </View>
      {sets.entries.map((entry, i) => (
        <View key={entry.exerciseId} className={i === 0 ? 'mt-6' : 'mt-2'}>
          <ExerciseCard
            entry={entry}
            open={sets.openId === entry.exerciseId}
            onToggleOpen={() => sets.setOpenId(sets.openId === entry.exerciseId ? null : entry.exerciseId)}
            units={settings.units}
            steps={steps}
            onChangeSet={(index, patch) => sets.changeSet(entry.exerciseId, index, patch)}
            onToggleDone={(index) => sets.toggleDone(entry.exerciseId, index)}
            onAddSet={() => sets.addSet(entry.exerciseId)}
            onRemoveSet={() => sets.removeSet(entry.exerciseId)}
            onRamp={() => void rampUp(entry.exerciseId)}
            onSwap={() => {
              void flush().then(() => router.push({ pathname: '/swap', params: { id: entry.exerciseId } }))
            }}
          />
        </View>
      ))}
      <DiscardDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        doneSets={sets.doneSets}
        busy={busy}
        onDiscard={discard}
      />
    </Screen>
  )
}
