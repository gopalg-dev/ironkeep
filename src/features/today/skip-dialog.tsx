import { Check, SkipForward } from 'lucide-react-native'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { BODY, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { PlanDay } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SkipDialogProps {
  open: boolean
  onClose: () => void
  day: PlanDay
  /** The day Next up moves to, when the plan has more than one. */
  next: PlanDay | null
  onSkip: (dayId: string) => void
  /** A session done without the app: log its sets instead of skipping. */
  onLog: (dayId: string) => void
}

/** Next up moves past the day shown with nothing logged, for a day done without the app or not at all. */
export function SkipDialog({ open, onClose, day, next, onSkip, onLog }: SkipDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <View className="gap-1">
        <Text accessibilityRole="header" className={H2}>
          {day.name}
        </Text>
        <Text className={cn(BODY, 'text-muted-foreground')}>
          {next
            ? `Nothing is logged for it yet. Next up moves to ${next.name} either way.`
            : 'Nothing is logged for it yet.'}
        </Text>
      </View>
      <View className="gap-2">
        <Button
          className={BTN}
          onPress={() => {
            onClose()
            onSkip(day.id)
          }}
        >
          <Icon as={SkipForward} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Skip it</Text>
        </Button>
        <Button
          variant="secondary"
          className={BTN}
          onPress={() => {
            onClose()
            onLog(day.id)
          }}
        >
          <Icon as={Check} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_TEXT, 'text-foreground')}>Already did it, log the sets</Text>
        </Button>
        <Button variant="ghost" className="h-12" onPress={onClose}>
          <Text className="text-lg font-semibold text-foreground">Cancel</Text>
        </Button>
      </View>
    </Dialog>
  )
}
