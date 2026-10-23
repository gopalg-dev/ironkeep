import { useRouter } from 'expo-router'
import { Check, X } from 'lucide-react-native'
import { type ReactNode, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayIcon } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { SheetScroll } from '@/components/sheet'
import { CAPTION, H2, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { ExerciseCard } from '@/features/workout/exercise-card'
import { useSessionSets } from '@/features/workout/use-session-sets'
import { stepsOf } from '@/lib/logic/progression'
import type { LoggedSet, Settings, Workout, WorkoutEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

export interface SetChange {
  exerciseId: string
  sets: LoggedSet[]
}

/** A stable empty list so the sets hook does not re-seed on every render while the session loads. */
const NO_ENTRIES: WorkoutEntry[] = []

interface SessionEditorProps {
  /**
   * The stored session, or a draft of one for a past day; null while it loads from the database. The
   * scroll view stays mounted either way: Android's bottom sheet finds its scrolling child once, at
   * layout, so a scroll view that first mounts after the read was never found and the sheet dragged
   * at random. One sheet, filled in place, is found.
   */
  workout: Workout | null
  settings: Settings | null
  /** Under the name: when the session was, or the day it is for. */
  line: string
  /** Between the name and the cards: the plan-day chips of a past day, Tick all. */
  head?: ReactNode
  /** The action's words: "Save changes", "Log 3 sets for Oct 16". */
  action: (doneSets: number) => string
  /** Given, the action waits for the first tick (a session with nothing ticked would hold nothing). */
  needsTick?: boolean
  onSave: (changes: SetChange[]) => Promise<void>
  /** Under the action: Delete session, for a stored one. */
  foot?: ReactNode
  /** The entries as the editor has them, for Tick all outside. */
  onEntries?: (apply: (update: (current: WorkoutEntry[]) => WorkoutEntry[]) => void) => void
}

/**
 * A session as the workout screen shows it (canvas: Workout), to fix after the fact, in a drawer
 * over Stats: the same card per lift with the set pads, the ticks, a set to add or drop, but no
 * clock, no finish, no swap. The count and the one action sit in the sheet's pinned footer, always
 * in reach, so there is no scrolling to the end to save. Used by the session editor and past-day log.
 */
export function SessionEditor({
  workout,
  settings,
  line,
  head,
  action,
  needsTick = false,
  onSave,
  foot,
  onEntries,
}: SessionEditorProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  // The sets live here, above the scroll and the footer, so both read the one state; the hook
  // re-seeds when the workout loads or the picked day changes.
  const sets = useSessionSets(workout?.entries ?? NO_ENTRIES, () => {})
  onEntries?.(sets.setEntries)
  const ready = workout !== null && settings !== null

  async function save() {
    if (busy) return
    setBusy(true)
    try {
      await onSave(sets.entries.map((e) => ({ exerciseId: e.exerciseId, sets: e.sets })))
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetScroll
      footer={
        ready ? (
          <View className="gap-1">
            <Text
              className={cn(SECONDARY, NUMBER, 'px-1 pb-2')}
            >{`${sets.doneSets} of ${sets.totalSets} sets done`}</Text>
            <Button className={BTN} disabled={busy || (needsTick && sets.doneSets === 0)} onPress={save}>
              <Icon as={Check} className="size-4.5 text-primary-foreground" />
              <Text className={BTN_TEXT}>{action(sets.doneSets)}</Text>
            </Button>
            {foot}
          </View>
        ) : undefined
      }
    >
      {ready ? <SessionCards workout={workout} settings={settings} line={line} head={head} sets={sets} /> : null}
    </SheetScroll>
  )
}

function SessionCards({
  workout,
  settings,
  line,
  head,
  sets,
}: {
  workout: Workout
  settings: Settings
  line: string
  head?: ReactNode
  sets: ReturnType<typeof useSessionSets>
}) {
  const router = useRouter()
  const steps = stepsOf(settings)
  return (
    <>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 flex-row items-center gap-3">
          <DayIcon type={workout.dayType} />
          <View className="min-w-0 flex-1">
            <Text className={H2}>{workout.dayName}</Text>
            <Text className={cn(CAPTION, NUMBER)}>{line}</Text>
          </View>
        </View>
        <IconButton as={X} accessibilityLabel="Close" onPress={() => router.back()} />
      </View>
      {head}
      <View className="gap-2">
        {sets.entries.map((entry) => (
          <ExerciseCard
            key={entry.exerciseId}
            entry={entry}
            tone="page"
            open={sets.openId === entry.exerciseId}
            onToggleOpen={() => sets.setOpenId(sets.openId === entry.exerciseId ? null : entry.exerciseId)}
            units={settings.units}
            steps={steps}
            onChangeSet={(index, patch) => sets.changeSet(entry.exerciseId, index, patch)}
            onToggleDone={(index) => sets.toggleDone(entry.exerciseId, index)}
            onAddSet={() => sets.addSet(entry.exerciseId)}
            onRemoveSet={() => sets.removeSet(entry.exerciseId)}
          />
        ))}
      </View>
    </>
  )
}
