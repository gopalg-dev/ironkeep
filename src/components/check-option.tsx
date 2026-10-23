import { Pressable } from 'react-native'

import { BODY } from '@/components/typography'
import { Checkbox } from '@/components/ui/checkbox'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** One tick with its words beside it (canvas `.check`), the whole line pressable. */
export function CheckOption({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  className?: string
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      className={cn('min-h-12 flex-row items-center gap-3 px-1', className)}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={onChange}
        className="size-6 rounded-lg border-0 bg-secondary"
        checkedClassName="bg-foreground"
        indicatorClassName="bg-foreground"
        iconClassName="text-background"
      />
      <Text className={BODY}>{label}</Text>
    </Pressable>
  )
}
