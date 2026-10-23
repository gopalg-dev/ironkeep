import { type ComponentRef, type ReactNode, useRef } from 'react'
import { ScrollView, View } from 'react-native'

import { cn } from '@/lib/utils'

/**
 * The inside of a bottom sheet (canvas `.sheet`): the grab bar, 20px gutters, 16px between blocks.
 * The sheet itself is the platform's: a route presented as a form sheet by the root stack
 * (`src/app/_layout.tsx`), which Android draws as its own bottom sheet, sized to this content,
 * dragged down or backed out of to close.
 */
export function SheetBody({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('gap-4 bg-card px-5 pt-2.5 pb-10', className)}>
      <View className="mb-1.5 h-1 w-9 self-center rounded-sm bg-border" />
      {children}
    </View>
  )
}

/**
 * The same, for a sheet with more than fits: the route is given one snap height instead of
 * `fitToContents` (`tallSheet` in the root layout), the body fills the sheet and scrolls inside it,
 * and a pull on the grab bar, which the sheet owns, drags the sheet down. The scroll ends above the
 * phone's gesture bar: text that scrolled under it took the bar's pill and its outline across the
 * letters.
 */
export function SheetScroll({
  children,
  footer,
  className,
}: {
  children: ReactNode
  /** Stays under the scroll, always in reach: the drawer's Previous and Next. */
  footer?: ReactNode
  className?: string
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)
  return (
    <View className="flex-1 bg-card pb-safe">
      {/* The grab bar sits outside the scroll view, and a touch on it first puts the content back at the top:
          Android's bottom sheet refuses every drag while its open sheet's content is scrolled down
          (BottomSheetBehavior.tryCaptureView: expanded, and the scrolling child can scroll up), so a pull on
          the bar over a long, scrolled sheet did nothing. With the content at the top the pull is allowed. */}
      <View
        className="min-h-7 items-center justify-center pt-2.5 pb-1.5"
        onTouchStart={() => scroll.current?.scrollTo({ y: 0, animated: false })}
      >
        <View className="h-1 w-9 rounded-sm bg-border" />
      </View>
      <ScrollView
        ref={scroll}
        className="flex-1"
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn('gap-4 px-5 pb-6', className)}
      >
        {children}
      </ScrollView>
      {footer ? <View className="border-border border-t px-5 pt-3 pb-2">{footer}</View> : null}
    </View>
  )
}
