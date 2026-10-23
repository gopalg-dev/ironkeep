import { View } from 'react-native'

import { CAPTION, HERO_FONT_CAP, MID_NUMBER } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** One number in a row of them (canvas `.stat`): the number big, what it is under it. */
export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View className="flex-1 gap-1">
      <Text maxFontSizeMultiplier={HERO_FONT_CAP} className={cn(MID_NUMBER, 'text-2xl')}>
        {value}
      </Text>
      <Text className={CAPTION}>{label}</Text>
    </View>
  )
}
