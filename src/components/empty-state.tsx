import { Image, View } from 'react-native'

import { SECONDARY } from '@/components/typography'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { useThemeScheme } from '@/theme/use-theme-scheme'
import { EMPTY_STATE_IMAGES, type EmptyStateIllustration } from './empty-state-images'

/**
 * A plain fact with optional decorative Blender artwork. Neutral graphite/chalk variants follow
 * the active theme's scheme, including Material You. No extra copy, animation or network loading.
 */
export function EmptyState({
  line,
  illustration,
  small = false,
  className,
}: {
  line: string
  illustration?: EmptyStateIllustration
  /** Tighter spacing, for an empty state that sits inside a card. */
  small?: boolean
  className?: string
}) {
  const scheme = useThemeScheme()
  return (
    <View className={cn('items-center', small ? 'pt-5 pb-2' : 'px-6 pt-14 pb-10', illustration && 'gap-4', className)}>
      {illustration ? (
        <Image
          source={EMPTY_STATE_IMAGES[scheme][illustration]}
          className={small ? 'size-32' : 'size-38'}
          resizeMode="contain"
          fadeDuration={0}
          accessible={false}
          aria-hidden
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Text className={cn(SECONDARY, 'text-center')}>{line}</Text>
    </View>
  )
}
