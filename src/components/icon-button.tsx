import type { LucideIcon } from 'lucide-react-native'
import { Pressable, type PressableProps } from 'react-native'

import { Icon } from '@/components/ui/icon'
import { cn } from '@/lib/utils'

type Tone = 'surface' | 'soft' | 'ghost'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface IconButtonProps extends Omit<PressableProps, 'children'> {
  as: LucideIcon
  /** What the button does, for screen readers: icon-only buttons always say it. */
  accessibilityLabel: string
  tone?: Tone
  size?: Size
  iconClassName?: string
}

const TONE: Record<Tone, string> = {
  surface: 'bg-card',
  soft: 'bg-secondary',
  ghost: 'bg-transparent',
}

const SIZE: Record<Size, { button: string; icon: string }> = {
  xs: { button: 'size-8', icon: 'size-4.5' },
  sm: { button: 'size-9', icon: 'size-4.5' },
  md: { button: 'size-11', icon: 'size-5.5' },
  lg: { button: 'size-14', icon: 'size-6.5' },
}

/** The round icon-only button of the design: 44pt (56 large, 36 and 32 inside cards), quiet, with the icon's meaning spoken out. Small ones get a wider touch area. */
export function IconButton({
  as,
  accessibilityLabel,
  tone = 'soft',
  size = 'md',
  className,
  iconClassName,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={size === 'lg' ? 0 : size === 'md' ? 4 : 8}
      className={cn(
        'items-center justify-center rounded-full active:opacity-70',
        TONE[tone],
        SIZE[size].button,
        className,
      )}
      {...props}
    >
      <Icon as={as} strokeWidth={1.75} className={cn('text-foreground', SIZE[size].icon, iconClassName)} />
    </Pressable>
  )
}
