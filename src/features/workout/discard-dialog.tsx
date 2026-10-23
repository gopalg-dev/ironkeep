import { Trash2 } from 'lucide-react-native'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { BODY, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

interface DiscardDialogProps {
  open: boolean
  onClose: () => void
  doneSets: number
  busy: boolean
  onDiscard: () => void
}

/** Asked before a session is thrown away: from its options, or at Finish with nothing ticked. */
export function DiscardDialog({ open, onClose, doneSets, busy, onDiscard }: DiscardDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <View className="gap-1">
        <Text accessibilityRole="header" className={H2}>
          Discard this workout?
        </Text>
        <Text className={cn(BODY, 'text-muted-foreground')}>
          {doneSets > 0
            ? `The ${doneSets} ${doneSets === 1 ? 'set' : 'sets'} logged so far will be lost.`
            : 'Nothing is logged yet, so nothing is lost.'}
        </Text>
      </View>
      <View className="gap-2">
        <Button variant="destructive" className={BTN} disabled={busy} onPress={onDiscard}>
          <Icon as={Trash2} className="size-4.5 text-white" />
          <Text className={cn(BTN_TEXT, 'text-white')}>Discard workout</Text>
        </Button>
        <Button variant="ghost" className="h-12" onPress={onClose}>
          <Text className="text-lg font-semibold text-foreground">Keep going</Text>
        </Button>
      </View>
    </Dialog>
  )
}
