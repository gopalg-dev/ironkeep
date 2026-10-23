import { Pressable, View } from 'react-native'

import { currentSet } from '@/lib/logic/sets'
import type { LoggedSet } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SetDotsProps {
  sets: LoggedSet[]
  /** The set on the pad, when it is not simply the first open one. */
  current?: number
  /** Given, a dot is a button that brings its set to the pad. */
  onPick?: (index: number) => void
  className?: string
}

/** One dot per set (canvas `.sdots`): done in green, the one being worked in ink, the rest quiet. */
export function SetDots({ sets, current, onPick, className }: SetDotsProps) {
  const cur = current ?? currentSet(sets)
  const done = sets.filter((s) => s.done).length
  return (
    <View
      className={cn('flex-row items-center', onPick ? 'gap-0' : 'gap-2.5', className)}
      accessibilityRole={onPick ? undefined : 'image'}
      accessibilityLabel={onPick ? undefined : `${done} of ${sets.length} sets done`}
    >
      {sets.map((s, i) => {
        const dot = (
          <View
            className={cn(
              'size-3.5 rounded-full',
              s.done ? 'bg-success' : i === cur ? 'bg-foreground' : 'bg-secondary',
            )}
          />
        )
        if (!onPick) {
          // biome-ignore lint/suspicious/noArrayIndexKey: a set is its position and has no id
          return <View key={i}>{dot}</View>
        }
        return (
          <Pressable
            // biome-ignore lint/suspicious/noArrayIndexKey: a set is its position and has no id
            key={i}
            accessibilityRole="button"
            accessibilityLabel={`Set ${i + 1}${s.done ? ', done' : i === cur ? ', now' : ''}`}
            hitSlop={8}
            onPress={() => onPick(i)}
            className="size-7 items-center justify-center"
          >
            {dot}
          </Pressable>
        )
      })}
    </View>
  )
}
