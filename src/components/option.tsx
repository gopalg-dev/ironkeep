import type { ReactNode } from 'react'
import { Pressable, View } from 'react-native'

import { CAPTION, H3 } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** The radio dot of the design: a 22pt ring, filled to a 7pt ring when on. */
export function RadioDot({ on }: { on: boolean }) {
  return <View className={cn('size-5.5 rounded-full border-2 border-border', on && 'border-7 border-foreground')} />
}

interface OptionProps {
  title: string
  detail?: string
  selected: boolean
  onPress: () => void
  /** Between the dot and the words: a day tile, a method icon. */
  leading?: ReactNode
  /** At the right edge: a week shape, a count. */
  trailing?: ReactNode
  /** Under the words, inside the card: an editor that opens with the option. */
  children?: ReactNode
  className?: string
}

/**
 * One choice in a list of radio options: a surface card that gets an ink outline when picked.
 * The whole card is the touch target.
 */
export function Option({ title, detail, selected, onPress, leading, trailing, children, className }: OptionProps) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={detail ? `${title}. ${detail}` : title}
      onPress={onPress}
      className={cn(
        'rounded-xl border-2 border-card bg-card p-3.5 active:opacity-80',
        selected && 'border-foreground',
        className,
      )}
    >
      <View className="flex-row items-center gap-3.5">
        <RadioDot on={selected} />
        {leading}
        <View className="flex-1">
          <Text className={H3}>{title}</Text>
          {detail ? <Text className={CAPTION}>{detail}</Text> : null}
        </View>
        {trailing}
      </View>
      {children}
    </Pressable>
  )
}
