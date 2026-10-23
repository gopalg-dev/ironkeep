import { Plus, Ruler, Scale, X } from 'lucide-react-native'

import { BTN_SM2, BTN_SM2_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import type { Nudge } from '@/lib/logic/nudges'
import { cn } from '@/lib/utils'

interface NudgeRowProps {
  nudge: Nudge
  onLog: (nudge: Nudge) => void
  onLater: (nudge: Nudge) => void
  className?: string
}

/** The weigh-in or tape reminder: what is due and since when, Log, and Not now. */
export function NudgeRow({ nudge, onLog, onLater, className }: NudgeRowProps) {
  return (
    <Group className={className}>
      <Row>
        <Icon as={nudge.kind === 'weight' ? Scale : Ruler} strokeWidth={1.75} className="size-5.5 text-foreground" />
        <RowBody>
          <RowTitle>{nudge.title}</RowTitle>
          <RowSub>{nudge.detail}</RowSub>
        </RowBody>
        <Button variant="secondary" className={BTN_SM2} onPress={() => onLog(nudge)}>
          <Icon as={Plus} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_SM2_TEXT, 'text-foreground')}>Log</Text>
        </Button>
        <IconButton as={X} size="sm" tone="ghost" accessibilityLabel="Not now" onPress={() => onLater(nudge)} />
      </Row>
    </Group>
  )
}
