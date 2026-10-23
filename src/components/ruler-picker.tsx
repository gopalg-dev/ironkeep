import { useCallback, useMemo, useRef, useState } from 'react'
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BIG_NUMBER } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface RulerPickerProps {
  value: number
  min: number
  max: number
  /** The distance between two ticks, in the value's unit (0.5 kg, 1 lb). */
  step: number
  /** Ticks per labelled mark: the tall pins. */
  perLabel: number
  /** Ticks per mid-height pin (a whole kilo on a half-kilo ruler). */
  perMid: number
  unit?: string
  onChange: (value: number) => void
  /** What the number is, for screen readers. */
  label: string
  /** Shown quiet until the user has set it, so an untouched default is not read as a fact. */
  muted?: boolean
  className?: string
}

const round = (n: number, step: number): number => Number((Math.round(n / step) * step).toFixed(2))

/**
 * A ruler to drag (design: Setup 3, variant C, the user's pick): the big number above reads the
 * tick under the centre mark. Native scrolling with snapping, so no animation runs in JavaScript
 * and nothing moves on its own. The list is virtualised: a range of hundreds of ticks costs nothing.
 */
export function RulerPicker({
  value,
  min,
  max,
  step,
  perLabel,
  perMid,
  unit,
  onChange,
  label,
  muted = false,
  className,
}: RulerPickerProps) {
  // A half kilo per 10 dp: fine enough to land on, coarse enough to dial with a thumb. The pitch
  // comes from a class so the ruler follows the spacing scale.
  const tick = useResolveClassNames('w-2.5')
  const pitch = typeof tick.width === 'number' ? tick.width : 10
  const count = Math.round((max - min) / step) + 1
  const index = Math.round((value - min) / step)
  const ticks = useMemo(() => Array.from({ length: count }, (_, i) => i), [count])
  const last = useRef(index)
  const list = useRef<FlatList<number>>(null)
  const [width, setWidth] = useState(0)

  const read = useCallback(
    (x: number): number => {
      const i = Math.max(0, Math.min(count - 1, Math.round(x / pitch)))
      if (i !== last.current) {
        last.current = i
        onChange(round(min + i * step, step))
      }
      return i
    },
    [count, min, onChange, pitch, step],
  )
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => read(e.nativeEvent.contentOffset.x),
    [read],
  )
  // Android lets a fling settle a pixel or two past the snap point; once it has stopped, land on the tick.
  const onSettled = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x
      const i = read(x)
      if (Math.abs(x - i * pitch) > 0.25) list.current?.scrollToOffset({ offset: i * pitch, animated: false })
    },
    [pitch, read],
  )

  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1)
  const side = Math.max(0, width / 2 - pitch / 2)

  return (
    <View className={cn('items-center gap-4 overflow-hidden rounded-xl bg-card pt-7 pb-5', className)}>
      <View className="flex-row items-baseline">
        <Text className={cn(BIG_NUMBER, 'text-7xl', muted && 'text-muted-foreground')}>{shown}</Text>
        {unit ? <Text className="ml-1 text-2xl font-semibold leading-8 text-muted-foreground">{unit}</Text> : null}
      </View>
      <View
        className="h-15 w-full"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min, max, now: value, text: `${shown}${unit ? ` ${unit}` : ''}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const next = e.nativeEvent.actionName === 'increment' ? value + step : value - step
          onChange(round(Math.max(min, Math.min(max, next)), step))
        }}
      >
        {width > 0 ? (
          <FlatList
            ref={list}
            horizontal
            data={ticks}
            keyExtractor={(i) => String(i)}
            renderItem={({ item: i }) => {
              const major = i % perLabel === 0
              const mid = !major && i % perMid === 0
              return (
                <View className="h-15 items-center justify-end" style={{ width: pitch }}>
                  {major ? (
                    <Text className="absolute top-0 w-10 text-center text-xs font-semibold leading-4 text-muted-foreground">
                      {round(min + i * step, step)}
                    </Text>
                  ) : null}
                  <View
                    className={cn(
                      'w-0.5 rounded-full',
                      major
                        ? 'h-9 bg-foreground'
                        : mid
                          ? 'h-6 bg-muted-foreground opacity-70'
                          : 'h-3.5 bg-muted-foreground opacity-35',
                    )}
                  />
                </View>
              )
            }}
            getItemLayout={(_data, i) => ({ length: pitch, offset: pitch * i, index: i })}
            initialScrollIndex={index}
            contentContainerStyle={{ paddingHorizontal: side }}
            showsHorizontalScrollIndicator={false}
            snapToInterval={pitch}
            decelerationRate="fast"
            onScroll={onScroll}
            onScrollEndDrag={onSettled}
            onMomentumScrollEnd={onSettled}
            scrollEventThrottle={32}
            initialNumToRender={60}
            windowSize={5}
          />
        ) : null}
        {/* The centre mark: the tick under it is the value. */}
        <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-11 items-center">
          <View className="h-11 w-1 rounded-full bg-foreground" />
        </View>
      </View>
    </View>
  )
}
