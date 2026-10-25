import { useFocusEffect, useRouter } from 'expo-router'
import { ArrowLeftRight, ChevronLeft, ChevronRight, Minus, Pause, Play, Plus, Undo2, X } from 'lucide-react-native'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_SM, BTN_SM_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { Screen } from '@/components/screen'
import { Segmented } from '@/components/segmented'
import { BIG_NUMBER, CAPTION, H3, HERO_FONT_CAP, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { useOpenExercise } from '@/features/library/open-exercise'
import { targetOf } from '@/lib/format'
import { incrementFor, stepsOf } from '@/lib/logic/progression'
import { activeMs, elapsedLabel, type Pause as PauseState } from '@/lib/logic/session-time'
import { canComplete, currentSet, shownValue } from '@/lib/logic/sets'
import { fmtSeconds } from '@/lib/logic/units'
import type { Settings, Workout } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useNativeSessionChanges } from './session-notifications'
import { SetDots } from './set-dots'
import { useSessionPersist } from './use-session-persist'
import { useSessionSets } from './use-session-sets'

const LEFT_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1 to 2' },
  { value: '3', label: '3 or more' },
] as const

/** The clock, once a second: zen shows the time since the last set. */
function useNow(everyMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), everyMs)
    return () => clearInterval(t)
  }, [everyMs])
  return now
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''))

/**
 * Zen mode (canvas: Zen mode B): one lift, one set at a time. The lift strip, the lift's name and
 * picture, "Set 2 of 4" with a dot per set, the set's weight and reps stacked and centred with the
 * steppers under each number, last time as one caption, one big "Set N done", then Undo, Swap and
 * the next lift. The `/zen` screen, over the session.
 */
export function ZenScreen() {
  const router = useRouter()
  const [loaded, setLoaded] = useState<{ workout: Workout; settings: Settings } | null>(null)
  const reload = useCallback(() => {
    let live = true
    void Promise.all([repo.getActiveWorkout(), repo.getSettings()]).then(([workout, settings]) => {
      if (!live) return
      if (workout) setLoaded({ workout, settings })
      else router.replace('/')
    })
    return () => {
      live = false
    }
  }, [router])
  useNativeSessionChanges(reload)
  useFocusEffect(
    useCallback(() => {
      let live = true
      Promise.all([repo.getActiveWorkout(), repo.getSettings()]).then(([w, s]) => {
        if (!live) return
        if (w) setLoaded({ workout: w, settings: s })
        else router.back()
      })
      return () => {
        live = false
      }
    }, [router]),
  )
  if (!loaded) return <Screen>{null}</Screen>
  return <ZenBody key={loaded.workout.id} workout={loaded.workout} settings={loaded.settings} />
}

function ZenBody({ workout, settings }: { workout: Workout; settings: Settings }) {
  const router = useRouter()
  const openExercise = useOpenExercise()
  const now = useNow(1000)
  const { persist, flush } = useSessionPersist(workout.id)
  const sets = useSessionSets(workout.entries, persist)
  const [pause, setPause] = useState<PauseState>({ pausedAt: workout.pausedAt, pausedMs: workout.pausedMs })
  useEffect(() => {
    setPause({ pausedAt: workout.pausedAt, pausedMs: workout.pausedMs })
  }, [workout.pausedAt, workout.pausedMs])
  // The lift on screen: the first with a set left, until Previous or Next says otherwise.
  const [at, setAt] = useState(() =>
    Math.max(
      0,
      sets.entries.findIndex((e) => e.sets.some((s) => !s.done)),
    ),
  )
  // The set on the pad: the first not done, unless a dot was tapped to bring another back.
  const [pick, setPick] = useState<{ id: string; index: number } | null>(null)
  // When the last set was ticked here, for "1:24 since set 2".
  const [lastTick, setLastTick] = useState<{ at: number; set: number } | null>(null)
  const steps = stepsOf(settings)
  const units = settings.units
  const paused = Boolean(pause.pausedAt)

  const entry = sets.entries[Math.min(at, sets.entries.length - 1)]
  if (!entry) return <Screen>{null}</Screen>
  const open = currentSet(entry.sets)
  const picked = pick?.id === entry.exerciseId && pick.index < entry.sets.length ? pick.index : undefined
  const index = picked ?? open ?? entry.sets.length - 1
  const set = entry.sets[index]
  const allDone = open === undefined
  const weighted = entry.loadType === 'weight'
  const timed = entry.loadType === 'time'
  const weight = shownValue(entry, entry.sets, index, 'weight', 0)
  const reps = shownValue(entry, entry.sets, index, timed ? 'seconds' : 'reps', entry.repMin)
  const last = at === sets.entries.length - 1
  const lastDone = entry.sets
    .map((s, i) => (s.done ? i : -1))
    .filter((i) => i >= 0)
    .pop()

  const tick = () => {
    if (!set) return
    setPick(null)
    sets.toggleDone(entry.exerciseId, index)
    if (!set.done) setLastTick({ at: Date.now(), set: index + 1 })
  }
  const undo = () => {
    if (lastDone === undefined) return
    sets.toggleDone(entry.exerciseId, lastDone)
    setPick({ id: entry.exerciseId, index: lastDone })
  }
  const go = (to: number) => {
    setPick(null)
    setAt(Math.max(0, Math.min(sets.entries.length - 1, to)))
  }
  const finish = async () => {
    await flush()
    router.push('/finish')
  }

  const since = lastTick
    ? `, ${fmtSeconds(Math.floor((now.getTime() - lastTick.at) / 1000))} since set ${lastTick.set}`
    : ''
  const clock = `${elapsedLabel(activeMs({ ...workout, ...pause }, now))}${since}`
  const liftLine = `${workout.dayName}, lift ${at + 1} of ${sets.entries.length}`
  const setLine = `Set ${index + 1} of ${entry.sets.length}`
  const repsLabel = timed ? 'Seconds' : `Reps, ${targetOf(entry)}`
  // Once every set of a weight lift is done, the last thing to say is how many reps were left.
  const askLeft = allDone && weighted && picked === undefined

  return (
    <Screen
      bar={{
        title: entry.name,
        left: (
          <View className="flex-row items-center gap-2">
            <IconButton
              as={paused ? Play : Pause}
              tone="surface"
              accessibilityLabel={paused ? 'Resume the session' : 'Pause the session'}
              onPress={async () => setPause(await repo.pauseWorkout(workout.id, !paused))}
            />
            <Text className={cn(SECONDARY, NUMBER, 'shrink')} numberOfLines={1}>
              {clock}
            </Text>
          </View>
        ),
        right: <IconButton as={X} tone="surface" accessibilityLabel="Exit zen" onPress={() => router.back()} />,
      }}
      footer={
        <>
          {allDone && picked === undefined ? (
            <Button className="h-auto min-h-18 rounded-2xl shadow-none" onPress={last ? finish : () => go(at + 1)}>
              <Text className="text-xl font-bold">{last ? 'Finish workout' : 'Next lift'}</Text>
            </Button>
          ) : (
            <Button
              className="h-auto min-h-18 rounded-2xl shadow-none"
              disabled={!set?.done && !canComplete(entry, entry.sets, index)}
              onPress={tick}
            >
              <Text className="text-xl font-bold">{set?.done ? `Undo set ${index + 1}` : `Set ${index + 1} done`}</Text>
            </Button>
          )}
          <View className="flex-row items-center justify-between pt-1">
            {lastDone !== undefined && !set?.done ? (
              <Button
                variant="secondary"
                className={cn(BTN_SM, 'bg-card')}
                onPress={undo}
                accessibilityLabel={`Undo set ${lastDone + 1}`}
              >
                <Icon as={Undo2} className="size-4.5 text-foreground" />
                <Text className={cn(BTN_SM_TEXT, 'text-foreground')}>{`Undo set ${lastDone + 1}`}</Text>
              </Button>
            ) : (
              <IconButton
                as={ChevronLeft}
                tone="surface"
                accessibilityLabel="Previous lift"
                disabled={at === 0}
                className={cn(at === 0 && 'opacity-40')}
                onPress={() => go(at - 1)}
              />
            )}
            <Button
              variant="secondary"
              className={cn(BTN_SM, 'bg-card')}
              accessibilityLabel={`Swap ${entry.name}`}
              onPress={() =>
                void flush().then(() => router.push({ pathname: '/swap', params: { id: entry.exerciseId } }))
              }
            >
              <Icon as={ArrowLeftRight} className="size-4.5 text-foreground" />
              <Text className={cn(BTN_SM_TEXT, 'text-foreground')}>Swap</Text>
            </Button>
            <IconButton
              as={ChevronRight}
              tone="surface"
              accessibilityLabel="Next lift"
              disabled={last}
              className={cn(last && 'opacity-40')}
              onPress={() => go(at + 1)}
            />
          </View>
        </>
      }
    >
      <View className="min-h-11" />
      {/* The lifts of the session: done, this one, to come. */}
      <View className="mt-4 flex-row gap-1.5" accessibilityRole="progressbar" accessibilityLabel={liftLine}>
        {sets.entries.map((e, i) => (
          <View
            key={e.exerciseId}
            className={cn(
              'h-1 flex-1 rounded-sm',
              i === at ? 'bg-foreground' : e.sets.every((s) => s.done) ? 'bg-success' : 'bg-border',
            )}
          />
        ))}
      </View>
      <View className="mt-5 flex-row items-center justify-between gap-4">
        <View className="shrink gap-1">
          <View className="flex-row items-center gap-2">
            <DayIcon type={workout.dayType} size="sm" />
            <Text className={cn(SECONDARY, NUMBER)}>{liftLine}</Text>
          </View>
          <Text className="text-3xl font-condensed-semibold leading-11.5 text-foreground">{entry.name}</Text>
        </View>
        <ExerciseThumb name={entry.name} className="size-14 rounded-lg" onPress={openExercise(entry.name)} />
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <Text className={cn(SECONDARY, NUMBER)}>{setLine}</Text>
        <SetDots sets={entry.sets} current={index} onPick={(i) => setPick({ id: entry.exerciseId, index: i })} />
      </View>
      {askLeft ? (
        <View className="mt-4 gap-2 rounded-xl bg-card p-4">
          <Text className={H3}>Reps left in the tank on the last set?</Text>
          <Segmented
            options={LEFT_OPTIONS}
            value={set?.left === undefined ? '' : String(set.left)}
            onChange={(v) => sets.changeSet(entry.exerciseId, entry.sets.length - 1, { left: Number(v) })}
            accessibilityLabel={`Reps left on set ${entry.sets.length}`}
          />
        </View>
      ) : (
        <>
          {weighted ? (
            <Pad
              label="Weight"
              value={weight.value}
              unit={units}
              muted={!weight.own}
              step={incrementFor(units, entry.equipment, steps, entry.plateLoaded)}
              onChange={(v) => sets.changeSet(entry.exerciseId, index, { weight: v })}
              lessLabel="Less weight"
              moreLabel="More weight"
              className="mt-4"
            />
          ) : null}
          <Pad
            label={repsLabel}
            value={reps.value}
            muted={!reps.own}
            step={timed ? 5 : 1}
            onChange={(v) => sets.changeSet(entry.exerciseId, index, timed ? { seconds: v } : { reps: v })}
            lessLabel={timed ? 'Fewer seconds' : 'Fewer reps'}
            moreLabel={timed ? 'More seconds' : 'More reps'}
            className={weighted ? 'mt-2' : 'mt-4'}
          />
        </>
      )}
      {entry.hint ? <Text className={cn(CAPTION, NUMBER, 'mt-3 text-center')}>{entry.hint}</Text> : null}
    </Screen>
  )
}

/** One stacked pad of zen: the label, the big number, less and more under it, all centred. */
function Pad({
  label,
  value,
  unit,
  muted,
  step,
  onChange,
  lessLabel,
  moreLabel,
  className,
}: {
  label: string
  value: number
  unit?: string
  muted: boolean
  step: number
  onChange: (value: number) => void
  lessLabel: string
  moreLabel: string
  className?: string
}) {
  const round = (n: number) => Number(Math.max(0, n).toFixed(2))
  return (
    <View className={cn('items-center gap-2 rounded-xl bg-card px-4 pt-4 pb-3.5', className)}>
      <Text className={CAPTION}>{label}</Text>
      <View className="flex-row items-baseline">
        <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={cn(BIG_NUMBER, muted && 'text-muted-foreground')}>
          {fmt(value)}
        </Text>
        {unit ? <Text className="ml-1 text-xl font-semibold text-muted-foreground">{unit}</Text> : null}
      </View>
      {/* Two buttons across the whole pad, a centimetre high (NN/g's comfortable target): a thumb mid-set should not have to aim. */}
      <View className="w-full flex-row gap-2">
        <Button
          variant="secondary"
          className={cn(BTN, 'min-h-16 flex-1')}
          accessibilityLabel={lessLabel}
          onPress={() => onChange(round(value - step))}
        >
          <Icon as={Minus} strokeWidth={2} className="size-6 text-foreground" />
        </Button>
        <Button
          variant="secondary"
          className={cn(BTN, 'min-h-16 flex-1')}
          accessibilityLabel={moreLabel}
          onPress={() => onChange(round(value + step))}
        >
          <Icon as={Plus} strokeWidth={2} className="size-6 text-foreground" />
        </Button>
      </View>
    </View>
  )
}
