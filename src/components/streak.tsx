import { Flame } from 'lucide-react-native'
import { View } from 'react-native'

import { FillIcon } from '@/components/fill-icon'
import { HERO_FONT_CAP, MID_NUMBER, SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/**
 * The week streak, top right of Today (the web's `Streak`): a flame and a big number of weeks
 * stacked over the unit. Muted until the first streak week; then the flame burns in the legs colour.
 */
export function Streak({ weeks }: { weeks: number }) {
  const on = weeks > 0
  const unit = weeks === 1 ? 'week' : 'weeks'
  return (
    <View
      className="shrink-0 flex-row items-center gap-2"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${weeks} ${unit} streak`}
    >
      {on ? (
        <FillIcon as={Flame} className="size-8 text-day-legs" fillClassName="accent-day-legs" />
      ) : (
        <FillIcon as={Flame} className="size-8 text-muted-foreground" />
      )}
      <View className="items-center">
        <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={cn(MID_NUMBER, !on && 'text-muted-foreground')}>
          {weeks}
        </Text>
        <Text className={cn(SECONDARY, 'mt-1 leading-4')}>{unit}</Text>
      </View>
    </View>
  )
}
