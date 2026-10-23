import { ArrowLeftRight, ChevronRight, FileChartColumn, type LucideIcon, Scale, X } from 'lucide-react-native'
import { type ComponentRef, useRef, useState } from 'react'
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, View } from 'react-native'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { CAPTION, H3, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { Alert } from '@/lib/logic/alerts'
import { cn } from '@/lib/utils'

/** What the action button on each kind of alert says, and its glyph. */
const ACTION: Record<Alert['kind'], { label: string; icon: LucideIcon }> = {
  stall: { label: 'Swap on Plan', icon: ArrowLeftRight },
  weight: { label: 'See weight', icon: Scale },
  review: { label: 'See report', icon: FileChartColumn },
}

interface AlertDeckProps {
  alerts: Alert[]
  onDismiss: (key: string) => void
  onAction: (alert: Alert) => void
  className?: string
}

/**
 * The Today alerts as a deck: one card at a time, the others behind dots and named under the deck.
 * Swipe or tap the arrow to move on; each card carries its own action, and a × dismisses it. One
 * card tall, so a handful of alerts never pushes the session off the screen. Paging is the native
 * scroll view's, so nothing animates in JavaScript.
 */
export function AlertDeck({ alerts, onDismiss, onAction, className }: AlertDeckProps) {
  const [width, setWidth] = useState(0)
  const [index, setIndex] = useState(0)
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null)
  const count = alerts.length
  const at = Math.min(index, Math.max(0, count - 1))
  if (count === 0) return null

  const go = (to: number) => {
    const i = Math.max(0, Math.min(count - 1, to))
    setIndex(i)
    scroller.current?.scrollTo({ x: i * width, animated: true })
  }
  const onSettled = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
  }
  const others = alerts.filter((_, i) => i !== at).map((a) => a.title)

  return (
    <View className={className}>
      <View className="overflow-hidden rounded-xl" onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <ScrollView
            ref={scroller}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onSettled}
            scrollEnabled={count > 1}
          >
            {alerts.map((a) => {
              const action = ACTION[a.kind]
              return (
                <View key={a.key} style={{ width }} className="gap-3 bg-card px-4 pt-4 pb-3">
                  <View className="flex-row items-start justify-between">
                    <View className="min-w-0 flex-1 gap-1">
                      <Text className={H3}>{a.title}</Text>
                      <Text className={cn(SECONDARY, NUMBER)}>{a.detail}</Text>
                    </View>
                    <IconButton
                      as={X}
                      size="sm"
                      tone="ghost"
                      accessibilityLabel="Dismiss"
                      className="-mt-1.5 -mr-2"
                      onPress={() => {
                        if (at > 0) go(at - 1)
                        onDismiss(a.key)
                      }}
                    />
                  </View>
                  <View className="flex-row items-center justify-between">
                    <Button variant="secondary" className={BTN_SM2} onPress={() => onAction(a)}>
                      <Icon as={action.icon} className="size-4.5 text-foreground" />
                      <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>{action.label}</Text>
                    </Button>
                    {count > 1 ? (
                      <View className="flex-row items-center gap-2">
                        <Text className={cn(CAPTION, NUMBER)}>{`${at + 1} of ${count}`}</Text>
                        <View className="flex-row gap-1" aria-hidden>
                          {alerts.map((d, i) => (
                            <View
                              key={d.key}
                              className={cn('size-2 rounded-full', i === at ? 'bg-foreground' : 'bg-secondary')}
                            />
                          ))}
                        </View>
                        <IconButton
                          as={ChevronRight}
                          size="xs"
                          accessibilityLabel="Next alert"
                          onPress={() => go(at + 1)}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>
              )
            })}
          </ScrollView>
        ) : null}
      </View>
      {others.length > 0 ? <Text className={cn(CAPTION, 'mt-2 px-1')}>{`Next: ${others.join('. ')}.`}</Text> : null}
    </View>
  )
}
