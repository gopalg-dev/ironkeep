import type { ReactNode } from 'react'
import { ScrollView, View } from 'react-native'

import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** A small round label (canvas `.chip`): a muscle, a piece of equipment, a level. */
export function Chip({
  children,
  on = false,
  className,
  textClassName,
}: {
  children: ReactNode
  on?: boolean
  className?: string
  /** The words' colour when the chip is painted in a colour of its own (a day's plate colour). */
  textClassName?: string
}) {
  return (
    <View className={cn('h-8.5 justify-center rounded-full px-3.5', on ? 'bg-foreground' : 'bg-secondary', className)}>
      <Text className={cn('text-sm font-semibold', on ? 'text-background' : 'text-foreground', textClassName)}>
        {children}
      </Text>
    </View>
  )
}

/** A row of chips that scrolls sideways and bleeds into the gutters (canvas `.chips`). */
export function Chips({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className={cn('-mx-5', className)}
      contentContainerClassName="flex-row gap-2 px-5"
    >
      {children}
    </ScrollView>
  )
}
