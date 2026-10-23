import { createContext, type ReactNode, useContext } from 'react'
import { Animated, StyleSheet, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { H3 } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** Where a screen's big title sits in the scroll content (from its onLayout), so the bar can time its name. */
export interface TitleSpan {
  y: number
  height: number
}

/** Set by `Screen`: a screen's big title reports its place through this. */
export const BigTitleContext = createContext<(span: TitleSpan) => void>(() => {})
export const useBigTitle = () => useContext(BigTitleContext)

export interface PageBarContent {
  /** The page's name, shown small once the big title has slid under the bar. */
  title?: string
  /** The round button on the left, when the page has one (Back). */
  left?: ReactNode
  /** The right-hand control: the menu button, a step count. */
  right?: ReactNode
}

interface PageBarProps extends PageBarContent {
  scrollY: Animated.Value
  bigTitle: TitleSpan | null
}

const num = (v: unknown, fallback: number): number => (typeof v === 'number' ? v : fallback)

/**
 * The one page-bar rule (docs/engineering.md): the page's round buttons never scroll away. A slim
 * opaque bar fades in behind them as soon as text would slide under them, and the page's name joins
 * it as the big title slides under the bar, as an iOS large title collapses into its bar. It stays
 * while reading: no hide on scroll down, no pop-in on scroll up. Driven by the scroll offset on the
 * native thread (React Native's Animated with the native driver), so nothing runs per frame in JS.
 */
export function PageBar({ scrollY, bigTitle, title, left, right }: PageBarProps) {
  // Sizes from the design's classes: the bar is the button row with its air above and below.
  const bar = useResolveClassNames('h-18.5')
  const fade = useResolveClassNames('h-16')
  const nameFade = useResolveClassNames('h-10')
  const barHeight = num(bar.height, 74)
  const background = scrollY.interpolate({
    inputRange: [0, num(fade.height, 64)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  // The name comes in while the lower half of the big title goes under the bar, fully in as the last of it goes.
  const from = bigTitle ? bigTitle.y + bigTitle.height / 2 - barHeight : 0
  const to = bigTitle ? bigTitle.y + bigTitle.height - barHeight : num(nameFade.height, 40)
  const name = scrollY.interpolate({
    inputRange: [Math.max(0, from), Math.max(1, to, from + 1)],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 top-0 h-18.5">
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: background }]}>
        <View className="flex-1 bg-background" />
      </Animated.View>
      <View pointerEvents="box-none" className="flex-1 flex-row items-center px-5 pt-4 pb-3.5">
        {left}
        {title ? (
          <Animated.View pointerEvents="none" style={{ opacity: name, flex: 1 }}>
            <Text className={cn(H3, left ? 'ml-3' : '')} numberOfLines={1}>
              {title}
            </Text>
          </Animated.View>
        ) : (
          <View className="flex-1" />
        )}
        {right}
      </View>
    </View>
  )
}
