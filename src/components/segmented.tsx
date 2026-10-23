import { Pressable, View } from 'react-native'

import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  accessibilityLabel: string
  /** Inside a sheet or a card the colours swap: the row is the surface, the picked choice the raised one. */
  inverted?: boolean
  className?: string
}

/** A few choices side by side; the picked one sits on a raised surface. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  inverted = false,
  className,
}: SegmentedProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('flex-row rounded-md p-0.75', inverted ? 'bg-card' : 'bg-secondary', className)}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => onChange(o.value)}
            className={cn(
              'h-11 flex-1 items-center justify-center rounded-sm',
              on && (inverted ? 'bg-secondary' : 'bg-card'),
            )}
          >
            <Text className={cn('text-base font-semibold', on ? 'text-foreground' : 'text-muted-foreground')}>
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
