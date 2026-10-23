import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, Pressable, TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BIG_NUMBER, HERO_FONT_CAP } from '@/components/typography'
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
  const muted9 = useResolveClassNames('text-muted-foreground')
  const pitch = typeof tick.width === 'number' ? tick.width : 10
  const count = Math.round((max - min) / step) + 1
  const index = Math.round((value - min) / step)
  const ticks = useMemo(() => Array.from({ length: count }, (_, i) => i), [count])
  const last = useRef(index)
  const list = useRef<FlatList<number>>(null)
  // True only while a finger is dragging the ruler and through the fling that follows. A scroll the app
  // itself caused, from the field or a reopen restoring the old position, must not write the value.
  const dragging = useRef(false)
  // After the finger lifts, a fling may or may not follow; this clears `dragging` only once no fling did.
  const idle = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [width, setWidth] = useState(0)
  // Type the number instead of dialling it: a tap on it opens a field, and a committed value scrolls
  // the ruler to match. The scale and the field read and write the one `value`, so they stay in step.
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  // When the value is set from outside the drag (the field, or the parent), move the ruler to it.
  // During a drag `last.current` already tracks the landed tick, so this is a no-op then.
  useEffect(() => {
    // Never move the ruler while a finger is on it: `last.current` advances with each scroll event,
    // ahead of the value React has committed, so a mid-drag render would see them differ and yank the
    // ruler back, then forward (the jitter). Only sync when the value is set with no drag in progress,
    // from the field or a reopen. Jump, not animate: an animated scroll's own events fed back and
    // stalled it partway (type 75, land on 73).
    if (!dragging.current && width > 0 && index !== last.current) {
      last.current = index
      list.current?.scrollToOffset({ offset: index * pitch, animated: false })
    }
  }, [index, width, pitch])

  const read = useCallback(
    (x: number): number => {
      const i = Math.max(0, Math.min(count - 1, Math.round(x / pitch)))
      if (i !== last.current) {
        last.current = i
        if (dragging.current) onChange(round(min + i * step, step))
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
  // The drag / fling lifecycle that keeps `dragging` true for the whole gesture: a finger down starts
  // it; lifting arms a short timer that ends it, unless a fling begins first; the fling's end closes it.
  const stopIdle = () => {
    if (idle.current) clearTimeout(idle.current)
    idle.current = null
  }
  const onBeginDrag = () => {
    stopIdle()
    dragging.current = true
  }
  const onEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Read the value, but do not scroll-correct here: a fling usually follows, and nudging the offset
    // now fights it (the bars dance before settling). `snapToInterval` lands the release on a tick;
    // the fine correction waits for the real end, in `onMomentumEnd`.
    read(e.nativeEvent.contentOffset.x)
    stopIdle()
    idle.current = setTimeout(() => {
      dragging.current = false
    }, 120)
  }
  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    onSettled(e)
    stopIdle()
    dragging.current = false
  }
  useEffect(
    () => () => {
      if (idle.current) clearTimeout(idle.current)
    },
    [],
  )

  const shown = Number.isInteger(value) ? String(value) : value.toFixed(1)
  const side = Math.max(0, width / 2 - pitch / 2)

  const startEdit = () => {
    setDraft(shown)
    setEditing(true)
  }
  const commit = () => {
    const n = Number.parseFloat(draft.replace(',', '.'))
    if (Number.isFinite(n)) onChange(round(Math.max(min, Math.min(max, n)), step))
    setEditing(false)
  }

  return (
    <View className={cn('items-center gap-4 overflow-hidden rounded-xl bg-card pt-7 pb-5', className)}>
      <View className="flex-row items-baseline">
        {editing ? (
          <TextInput
            autoFocus
            selectTextOnFocus
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={commit}
            onBlur={commit}
            keyboardType="decimal-pad"
            maxLength={6}
            accessibilityLabel={label}
            maxFontSizeMultiplier={HERO_FONT_CAP}
            selectionColor={typeof muted9.color === 'string' ? muted9.color : undefined}
            className={cn(BIG_NUMBER, 'min-w-28 p-0 text-center text-7xl')}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${shown}${unit ? ` ${unit}` : ''}, edit`}
            onPress={startEdit}
          >
            <Text
              maxFontSizeMultiplier={HERO_FONT_CAP}
              className={cn(BIG_NUMBER, 'text-7xl', muted && 'text-muted-foreground')}
            >
              {shown}
            </Text>
          </Pressable>
        )}
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
            onScrollBeginDrag={onBeginDrag}
            onScroll={onScroll}
            onScrollEndDrag={onEndDrag}
            onMomentumScrollBegin={stopIdle}
            onMomentumScrollEnd={onMomentumEnd}
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
