import { Minus, Plus } from 'lucide-react-native'
import { type AccessibilityActionEvent, View } from 'react-native'

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
  const less = () => onChange(round(value - step))
  const more = () => onChange(round(value + step))
  // One adjustable control for a screen reader: it reads "<label>, <value> <unit>" and takes a swipe
  // up or down to step, so the pad does not need its two buttons focused one by one. The buttons stay
  // for touch. The parent is `accessible`, so its label and value are what TalkBack announces.
  const onAction = (e: AccessibilityActionEvent) => {
    if (e.nativeEvent.actionName === 'increment') more()
    else if (e.nativeEvent.actionName === 'decrement') less()
  }
  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: `${fmt(value)}${unit ? ` ${unit}` : ''}` }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={onAction}
      className={cn('flex-1 items-center gap-2 rounded-xl bg-background px-2 py-3', className)}
    >
      <Text className={CAPTION}>{label}</Text>
      <View className="flex-row items-baseline">
        <Text className={cn(BIG_NUMBER, 'text-5xl', muted && 'text-muted-foreground')}>{fmt(value)}</Text>
        {unit ? <Text className="ml-1 text-lg font-semibold text-muted-foreground">{unit}</Text> : null}
      </View>
      <View className="flex-row gap-3">
        <IconButton as={Minus} tone="surface" accessibilityLabel={lessLabel} onPress={less} />
        <IconButton as={Plus} tone="surface" accessibilityLabel={moreLabel} onPress={more} />
      </View>
    </View>
  )
}
