import { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { CalendarDays } from 'lucide-react-native'
import { Platform, Pressable } from 'react-native'

import { NUMBER, SECONDARY } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { relativeDay, weekdayDate } from '@/lib/format'
import { dayKey, noon } from '@/lib/logic/stats'
import { cn } from '@/lib/utils'

interface DayFieldProps {
  /** The day, local, YYYY-MM-DD. */
  value: string
  onChange: (day: string) => void
  /** No later than this day (today): a weigh-in cannot be in the future. */
  max: string
  className?: string
}

/** The moment a log for `day` is stamped with: now for today, midday for an earlier day. */
export function instantOf(day: string): Date {
  return day === dayKey(new Date()) ? new Date() : new Date(noon(day))
}

/** "Today", "Yesterday", "3 days ago", then the weekday and date. */
function dayWords(day: string, max: string): string {
  const words = relativeDay(noon(day), new Date(noon(max)))
  return words === 'today' || words === 'yesterday'
    ? words.charAt(0).toUpperCase() + words.slice(1)
    : weekdayDate(noon(day))
}

/**
 * The day a log is for (the web's date field on the body dialogs): one field, today by default,
 * read as "Today", "Yesterday" or the date, with a calendar mark. A tap opens the phone's own date
 * picker, capped at `max`. One control, as a form's date field: the picker is where a day is chosen,
 * and a day back is one tap in it.
 */
export function DayField({ value, onChange, max, className }: DayFieldProps) {
  const words = dayWords(value, max)
  const pickDay = () => {
    if (Platform.OS !== 'android') return
    DateTimePickerAndroid.open({
      value: new Date(noon(value)),
      maximumDate: new Date(noon(max)),
      mode: 'date',
      onValueChange: (_event, date) => onChange(dayKey(date)),
    })
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Day, ${words}. Pick a day`}
      onPress={pickDay}
      className={cn(
        'min-h-14 flex-row items-center justify-between gap-3 rounded-xl bg-background px-4 active:opacity-70',
        className,
      )}
    >
      <Text className={SECONDARY}>Day</Text>
      <Text className={cn('shrink text-lg font-semibold text-foreground', NUMBER)} numberOfLines={1}>
        {words}
      </Text>
      <Icon as={CalendarDays} strokeWidth={1.75} className="size-5 text-muted-foreground" />
    </Pressable>
  )
}
