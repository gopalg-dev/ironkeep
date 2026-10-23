import { View } from 'react-native'

import { SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/**
 * A blank screen made calm: the one plain fact, centred, with room around it. No prompt, no call to
 * action, keeping the app's no-nudge, no-explanatory-copy rule. The art that will sit above the line
 * is held for the custom-picture work (Blender / SVG), so the empty states match the rest of the app
 * rather than a hand-drawn stopgap; see `docs/research/empty-states.md`.
 */
export function EmptyState({
  line,
  small = false,
  className,
}: {
  line: string
  /** Tighter spacing, for an empty state that sits inside a card. */
  small?: boolean
  className?: string
}) {
  return (
    <View className={cn('items-center', small ? 'pt-5 pb-2' : 'px-6 pt-14 pb-10', className)}>
      <Text className={cn(SECONDARY, 'text-center')}>{line}</Text>
    </View>
  )
}
