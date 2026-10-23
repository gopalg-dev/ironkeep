import { View } from 'react-native'

import { cn } from '@/lib/utils'

/** A thin bar, filled to `value` percent. Still: no animation runs on its own (requirements 8b). */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: width }}
      className={cn('h-1 overflow-hidden rounded-sm bg-secondary', className)}
    >
      <View className="h-full rounded-sm bg-foreground" style={{ width: `${width}%` }} />
    </View>
  )
}
