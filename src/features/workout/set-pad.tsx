import { Minus, Plus } from 'lucide-react-native'
import { View } from 'react-native'

import { IconButton } from '@/components/icon-button'
import { BIG_NUMBER, CAPTION } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface SetPadProps {
  label: string
  value: number
  unit?: string
  /** The number is a target, not yet the lifter's own: shown quiet. */
  muted?: boolean
  step: number
  min?: number
  onChange: (value: number) => void
  lessLabel: string
  moreLabel: string
  className?: string
}

const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''))

/** One number of the set being worked (canvas: the weight and reps pads): the number big, less and more under it. */
export function SetPad({
  label,
  value,
  unit,
  muted = false,
  step,
  min = 0,
  onChange,
  lessLabel,
  moreLabel,
  className,
}: SetPadProps) {
  const round = (n: number) => Number(Math.max(min, n).toFixed(2))
  return (
    <View className={cn('flex-1 items-center gap-2 rounded-xl bg-background px-2 py-3', className)}>
      <Text className={CAPTION}>{label}</Text>
      <View className="flex-row items-baseline">
        <Text className={cn(BIG_NUMBER, 'text-5xl', muted && 'text-muted-foreground')}>{fmt(value)}</Text>
        {unit ? <Text className="ml-1 text-lg font-semibold text-muted-foreground">{unit}</Text> : null}
      </View>
      <View className="flex-row gap-3">
        <IconButton
          as={Minus}
          tone="surface"
          accessibilityLabel={lessLabel}
          onPress={() => onChange(round(value - step))}
        />
        <IconButton
          as={Plus}
          tone="surface"
          accessibilityLabel={moreLabel}
          onPress={() => onChange(round(value + step))}
        />
      </View>
    </View>
  )
}
