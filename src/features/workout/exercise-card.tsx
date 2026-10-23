import { ArrowLeftRight, Check, ChevronDown, ChevronUp, Minus, Plus } from 'lucide-react-native'
import { View } from 'react-native'

import { BTN, BTN_SM2, BTN_SM2_TEXT, BTN_TEXT } from '@/components/button-styles'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { Group, type GroupTone, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Segmented } from '@/components/segmented'
import { CAPTION, H3, NUMBER, ROW_VALUE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { useOpenExercise } from '@/features/library/open-exercise'
import { targetOf } from '@/lib/format'
import { incrementFor, type Steps } from '@/lib/logic/progression'
import { canComplete, currentSet, shownValue } from '@/lib/logic/sets'
import { fmtSet } from '@/lib/logic/units'
import type { LoggedSet, Units, WorkoutEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SetDots } from './set-dots'
import { SetPad } from './set-pad'

/** Reps left in the tank on the last set, kept with the session; the report averages them. */
const LEFT_OPTIONS = [
  { value: '0', label: '0' },
  { value: '1', label: '1 to 2' },
  { value: '3', label: '3 or more' },
] as const

interface ExerciseCardProps {
  entry: WorkoutEntry
  /** On the page the card is a surface; in a sheet (the editor) the tones swap, as a group's do. */
  tone?: GroupTone
  open: boolean
  onToggleOpen: () => void
  units: Units
  steps: Steps
  onChangeSet: (index: number, patch: Partial<LoggedSet>) => void
  onToggleDone: (index: number) => void
  onAddSet: () => void
  onRemoveSet: () => void
  /** Takes the set the ramp offered (`entry.rampOffer`): on the session and on the plan. Absent in the editor. */
  onRamp?: () => void
  /** Absent in the editor: a logged session keeps its lifts. */
  onSwap?: () => void
}

/**
 * One lift of the session (canvas: Workout, the set logger): its row, and when open, the set being
 * worked on two pads with "Set N done" under them; once every set is done, the sets as logged and
 * the reps-left question for a weight lift.
 */
export function ExerciseCard({
  entry,
  tone = 'card',
  open,
  onToggleOpen,
  units,
  steps,
  onChangeSet,
  onToggleDone,
  onAddSet,
  onRemoveSet,
  onRamp,
  onSwap,
}: ExerciseCardProps) {
  const openExercise = useOpenExercise()
  const done = entry.sets.filter((s) => s.done).length
  const total = entry.sets.length
  const allDone = total > 0 && done === total
  const count = `${done}/${total}`
  const target = `${total} × ${targetOf(entry)}`
  return (
    <Group>
      <Row
        tall
        tone={tone}
        onPress={onToggleOpen}
        accessibilityLabel={`${entry.name}, ${done} of ${total} sets done`}
        accessibilityState={{ expanded: open }}
      >
        <ExerciseThumb name={entry.name} onPress={openExercise(entry.name)} />
        <RowBody>
          <RowTitle>{entry.name}</RowTitle>
          <RowSub>{target}</RowSub>
        </RowBody>
        <View className="flex-row items-center gap-1">
          <Text className={cn(ROW_VALUE, allDone && 'text-success')}>{count}</Text>
          {allDone ? <Icon as={Check} className="size-4.5 text-success" /> : null}
        </View>
        <Icon as={open ? ChevronUp : ChevronDown} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
      </Row>
      {open ? (
        <View className={cn('gap-3 px-4 pt-2 pb-4', tone === 'page' ? 'bg-background' : 'bg-card')}>
          {entry.hint ? <Text className={cn(CAPTION, NUMBER)}>{entry.hint}</Text> : null}
          {allDone ? (
            <DoneSets entry={entry} tone={tone} units={units} onChangeSet={onChangeSet} onToggleDone={onToggleDone} />
          ) : (
            <Logger
              entry={entry}
              tone={tone}
              units={units}
              steps={steps}
              onChangeSet={onChangeSet}
              onToggleDone={onToggleDone}
            />
          )}
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2">
              {allDone ? null : <SetDots sets={entry.sets} />}
              {entry.rampOffer && onRamp ? (
                <Button
                  variant="secondary"
                  className={BTN_SM2}
                  onPress={onRamp}
                  accessibilityLabel={`Add set ${total + 1} to the plan`}
                >
                  <Icon as={Plus} className="size-4.5 text-foreground" />
                  <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>+1 set to plan</Text>
                </Button>
              ) : null}
              {/* The design offers it once every set is logged, where the sets are all in view. */}
              {allDone && total > 1 ? (
                <Button
                  variant="secondary"
                  className={BTN_SM2}
                  onPress={onRemoveSet}
                  accessibilityLabel={`Remove set ${total}`}
                >
                  <Icon as={Minus} className="size-4.5 text-foreground" />
                  <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Remove last set</Text>
                </Button>
              ) : null}
            </View>
            <View className="flex-row gap-2">
              <IconButton as={Plus} accessibilityLabel="Add a set" onPress={onAddSet} />
              {onSwap ? (
                <IconButton as={ArrowLeftRight} accessibilityLabel={`Swap ${entry.name}`} onPress={onSwap} />
              ) : null}
            </View>
          </View>
        </View>
      ) : null}
    </Group>
  )
}

/** The set being worked: weight and reps (or reps, or seconds), and the button that logs it. */
function Logger({
  entry,
  tone,
  units,
  steps,
  onChangeSet,
  onToggleDone,
}: Pick<ExerciseCardProps, 'entry' | 'tone' | 'units' | 'steps' | 'onChangeSet' | 'onToggleDone'>) {
  const pad = tone === 'page' ? 'bg-card' : undefined
  const i = currentSet(entry.sets) ?? 0
  const weighted = entry.loadType === 'weight'
  const timed = entry.loadType === 'time'
  const weight = shownValue(entry, entry.sets, i, 'weight', 0)
  const reps = shownValue(entry, entry.sets, i, timed ? 'seconds' : 'reps', entry.repMin)
  const can = canComplete(entry, entry.sets, i)
  return (
    <>
      <View className="flex-row gap-3">
        {weighted ? (
          <SetPad
            label="Weight"
            value={weight.value}
            unit={units}
            muted={!weight.own}
            step={incrementFor(units, entry.equipment, steps, entry.plateLoaded)}
            onChange={(v) => onChangeSet(i, { weight: v })}
            lessLabel="Less weight"
            moreLabel="More weight"
            className={pad}
          />
        ) : null}
        <SetPad
          label={timed ? 'Seconds' : 'Reps'}
          value={reps.value}
          muted={!reps.own}
          step={timed ? 5 : 1}
          onChange={(v) => onChangeSet(i, timed ? { seconds: v } : { reps: v })}
          lessLabel={timed ? 'Fewer seconds' : 'Fewer reps'}
          moreLabel={timed ? 'More seconds' : 'More reps'}
          className={pad}
        />
      </View>
      <Button className={BTN} disabled={!can} onPress={() => onToggleDone(i)}>
        <Text className={BTN_TEXT}>{`Set ${i + 1} done`}</Text>
      </Button>
    </>
  )
}

/** Every set as logged, each tap undoes one; then, for a weight lift, the reps-left question. */
function DoneSets({
  entry,
  tone,
  units,
  onChangeSet,
  onToggleDone,
}: Pick<ExerciseCardProps, 'entry' | 'tone' | 'units' | 'onChangeSet' | 'onToggleDone'>) {
  const last = entry.sets.length - 1
  const left = entry.sets[last]?.left
  const weighted = entry.loadType === 'weight'
  return (
    <>
      <Group className={cn('p-1', tone === 'page' ? 'bg-card' : 'bg-background')}>
        {entry.sets.map((s, i) => {
          const logged = fmtSet(entry.loadType, s, units)
          return (
            <Row
              // biome-ignore lint/suspicious/noArrayIndexKey: a set is its position and has no id
              key={i}
              tone={tone === 'page' ? 'card' : 'page'}
              className="min-h-10"
              onPress={() => onToggleDone(i)}
              accessibilityLabel={`Set ${i + 1}, ${logged}, done. Tap to undo`}
            >
              <Text className={cn(CAPTION, NUMBER, 'w-10')}>{`Set ${i + 1}`}</Text>
              <Text className={cn('flex-1 text-base font-semibold text-foreground', NUMBER)}>{logged}</Text>
              <Icon as={Check} className="size-4.5 text-success" />
            </Row>
          )
        })}
      </Group>
      {weighted ? (
        <View className="gap-2">
          <Text className={H3}>Reps left in the tank on the last set?</Text>
          <Segmented
            options={LEFT_OPTIONS}
            value={left === undefined ? '' : String(left)}
            onChange={(v) => onChangeSet(last, { left: Number(v) })}
            accessibilityLabel={`Reps left on set ${last + 1}`}
          />
        </View>
      ) : null}
    </>
  )
}
