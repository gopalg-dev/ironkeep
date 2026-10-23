import { View } from 'react-native'

import { DAY_LABEL, dayColourClass } from '@/components/day-icon'
import { defaultWeekdays, WEEK_ORDER, WEEKDAY_SHORT } from '@/lib/logic/schedule'
import type { DayType, PlanDay } from '@/lib/types'
import { cn } from '@/lib/utils'

/** Seven cells, Monday to Sunday: which days a split trains, in the plate colour of each day's type. */
export function WeekShape({ days, className }: { days: PlanDay[]; className?: string }) {
  const weekdays = defaultWeekdays(days.length)
  const byWeekday = new Map<number, DayType>()
  days.forEach((d, i) => {
    const weekday = weekdays[i]
    if (weekday !== undefined && !byWeekday.has(weekday)) byWeekday.set(weekday, d.type)
  })
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={describe(byWeekday)}
      className={cn('shrink-0 flex-row gap-1', className)}
    >
      {WEEK_ORDER.map((wd) => {
        const type = byWeekday.get(wd)
        return <View key={wd} className={cn('size-3.5 rounded-xs', type ? dayColourClass(type) : 'bg-secondary')} />
      })}
    </View>
  )
}

function describe(byWeekday: Map<number, DayType>): string {
  const parts = WEEK_ORDER.map((wd) => {
    const type = byWeekday.get(wd)
    return `${WEEKDAY_SHORT[wd]} ${type ? DAY_LABEL[type].toLowerCase() : 'rest'}`
  })
  return `Week: ${parts.join(', ')}`
}
