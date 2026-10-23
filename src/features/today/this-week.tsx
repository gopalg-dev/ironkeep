import { View } from 'react-native'

import { dayBorderClass, dayColourClass } from '@/components/day-icon'
import { CAPTION, NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { type WeekCell, weekLine } from './today-model'

/**
 * The "This week" card of the weekday schedule: seven bars, Monday to Sunday, filled in the day's
 * colour once trained, outlined in it while still to come, outlined in ink for today.
 */
export function ThisWeek({ cells, className }: { cells: WeekCell[]; className?: string }) {
  return (
    <View className={cn('rounded-xl bg-card p-4', className)}>
      <Text className={CAPTION}>This week</Text>
      <View className="mt-3 flex-row gap-2" accessibilityRole="image" accessibilityLabel={weekLine(cells)}>
        {cells.map((c) => (
          <View key={c.weekday} className="flex-1 items-center gap-1">
            <Text className={CAPTION}>{c.letter}</Text>
            <View className={cn('h-9 w-full rounded-sm', barClass(c))} />
          </View>
        ))}
      </View>
      <Text className={cn(SECONDARY, NUMBER, 'mt-3')}>{weekLine(cells)}</Text>
    </View>
  )
}

function barClass(c: WeekCell): string {
  if (c.done && c.doneType) return dayColourClass(c.doneType)
  if (c.today) return 'border-2 border-foreground bg-secondary'
  if (c.day) return cn('border-2 bg-secondary', dayBorderClass(c.day.type))
  return 'bg-secondary'
}
