import { createContext, type ReactNode, useRef, useState } from 'react'
import { Animated, type NativeScrollEvent, type NativeSyntheticEvent, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BigTitleContext, PageBar, type PageBarContent, type TitleSpan } from '@/components/page-bar'
import { SafeAreaView } from '@/components/safe-area'
import { cn } from '@/lib/utils'

/** Set by `Screen`: a child holding something (a row being dragged) stops the page from scrolling under it. */
export const ScrollLockContext = createContext<(locked: boolean) => void>(() => {})

interface ScreenProps {
  children: ReactNode
  /** Sits under the scrolling content, above the safe area: the one primary action and its companions. */
  footer?: ReactNode
  /** Centres the content vertically, for the few screens with little on them. */
  centered?: boolean
  contentClassName?: string
  /** The footer's spacing when something sits under it, like the tab bar. */
  footerClassName?: string
  /** The pinned page bar: its buttons never scroll away, and the page's name joins it once the big title has gone. */
  bar?: PageBarContent
}

/**
 * The frame every screen shares (docs/02-design-brief.md, layout): one column, 20px gutters, the
 * content scrolls, the footer stays, and the page bar stays over the top of the content. No app bar
 * drawn by the navigator; a screen draws its own large title at the top and reports its place
 * through `useBigTitle` so the bar can take its name over.
 */
export function Screen({ children, footer, centered = false, contentClassName, footerClassName, bar }: ScreenProps) {
  const scrollY = useRef(new Animated.Value(0)).current
  // A plain copy of the offset: when the content changes size (a card opens or closes) the scroll
  // view clamps its offset without a scroll event, so the bar would read a stale one; this re-reports it.
  const offset = useRef(0)
  const viewport = useRef(0)
  const [bigTitle, setBigTitle] = useState<TitleSpan | null>(null)
  const [locked, setLocked] = useState(false)
  // The scroll view is Animated, which takes styles, so the design's classes are resolved into one.
  const content = useResolveClassNames(cn('px-5 pt-4 pb-8', centered && 'flex-grow justify-center', contentClassName))
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'left', 'right']}>
      {/* The bar is placed within the safe area, so it sits under the status bar, not over it. */}
      <View className="flex-1">
        <BigTitleContext.Provider value={setBigTitle}>
          <ScrollLockContext.Provider value={setLocked}>
            <Animated.ScrollView
              style={{ flex: 1 }}
              scrollEnabled={!locked}
              onLayout={(e) => {
                viewport.current = e.nativeEvent.layout.height
              }}
              onContentSizeChange={(_w, h) => {
                const max = Math.max(0, h - viewport.current)
                if (offset.current > max) {
                  offset.current = max
                  scrollY.setValue(max)
                }
              }}
              contentContainerStyle={content}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={16}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
                useNativeDriver: true,
                listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  offset.current = e.nativeEvent.contentOffset.y
                },
              })}
            >
              {children}
            </Animated.ScrollView>
          </ScrollLockContext.Provider>
        </BigTitleContext.Provider>
        {bar ? <PageBar scrollY={scrollY} bigTitle={bigTitle} {...bar} /> : null}
      </View>
      {footer ? <View className={cn('gap-1 px-5 pt-2 pb-10', footerClassName)}>{footer}</View> : null}
    </SafeAreaView>
  )
}
