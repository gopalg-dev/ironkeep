import type { ReactNode } from 'react'
import { Pressable, type PressableProps, View } from 'react-native'

import { CAPTION, H3, ROW_VALUE } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** On the page a group is a card and its dividers show the page; in a sheet it is the other way round. */
export type GroupTone = 'card' | 'page'

const ROW_BG: Record<GroupTone, string> = { card: 'bg-card', page: 'bg-background' }

/**
 * A rounded group of rows (canvas `.group` and `.row`). The one-pixel gap between rows shows what
 * lies behind the group, which is the design's divider colour on the page and in a sheet alike.
 */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('gap-px overflow-hidden rounded-xl', className)}>{children}</View>
}

interface RowProps extends Omit<PressableProps, 'children'> {
  children: ReactNode
  tone?: GroupTone
  /** The 64px row of lists with a thumbnail or a day tile. */
  tall?: boolean
  className?: string
}

/** One row: 56px (or 64px tall), 16px sides, 12px between its parts. Tappable when it has an onPress. */
export function Row({ children, tone = 'card', tall = false, className, onPress, ...props }: RowProps) {
  const classes = cn(
    'flex-row items-center gap-3 px-4 py-2',
    tall ? 'min-h-16' : 'min-h-14',
    ROW_BG[tone],
    onPress && 'active:opacity-80',
    className,
  )
  if (!onPress) return <View className={classes}>{children}</View>
  return (
    <Pressable accessibilityRole="button" onPress={onPress} className={classes} {...props}>
      {children}
    </Pressable>
  )
}

/** The part of a row that takes the remaining width: the title and the line under it. */
export function RowBody({ children, className }: { children: ReactNode; className?: string }) {
  return <View className={cn('min-w-0 flex-1', className)}>{children}</View>
}

/** Two lines at most: a long name or a large font size wraps instead of being cut. */
export function RowTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn(H3, className)} numberOfLines={2}>
      {children}
    </Text>
  )
}

export function RowSub({
  children,
  className,
  numberOfLines,
}: {
  children: ReactNode
  className?: string
  /** A long line (a note) is cut after this many; the full text lives where it is edited. */
  numberOfLines?: number
}) {
  return (
    <Text className={cn(CAPTION, className)} numberOfLines={numberOfLines}>
      {children}
    </Text>
  )
}

export function RowValue({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn(ROW_VALUE, className)}>{children}</Text>
}
