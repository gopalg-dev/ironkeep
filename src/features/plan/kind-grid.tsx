import { Pressable, View } from 'react-native'

import { DAY_LABEL, DayIcon } from '@/components/day-icon'
import { Text } from '@/components/ui/text'
import { DAY_TYPES, type DayType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface KindGridProps {
  value?: DayType
  onPick: (type: DayType) => void
  disabled?: boolean
}

/** The eleven kinds of day, two to a row (canvas `.kind`): the tile and the name; the picked one outlined. */
export function KindGrid({ value, onPick, disabled = false }: KindGridProps) {
  return (
    <View className="-m-1 flex-row flex-wrap" accessibilityRole="radiogroup">
      {DAY_TYPES.map((t) => {
        const on = t === value
        return (
          <View key={t} className="w-1/2 p-1">
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on, disabled }}
              disabled={disabled}
              onPress={() => onPick(t)}
              className={cn(
                'h-12 flex-row items-center gap-2.5 rounded-md bg-background px-3.5',
                on && 'border-2 border-foreground',
              )}
            >
              <DayIcon type={t} />
              <Text className="text-base font-semibold text-foreground">{DAY_LABEL[t]}</Text>
            </Pressable>
          </View>
        )
      })}
    </View>
  )
}
