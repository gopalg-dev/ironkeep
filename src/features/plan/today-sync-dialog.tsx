import { Check, ClipboardList } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Dialog } from '@/components/dialog'
import { BODY, CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { cn } from '@/lib/utils'

interface TodaySyncDialogProps {
  /** The day that changed while its session runs, and the lift the change was about, when it was one. */
  ask: { dayName: string; exerciseName?: string } | null
  onClose: () => void
}

/** Whether a change to a plan day touches the session in progress: then the lifter is asked. */
export async function touchesToday(dayId: string): Promise<boolean> {
  return (await repo.activeDayId()) === dayId
}

/**
 * Asked after the day of a session in progress changed (canvas: Plan, today-sync dialog). A session
 * starts from a copy of its day, so it keeps the day as it was unless the lifter asks: "Plan and
 * today" brings it up to the plan, keeping every logged set.
 */
export function TodaySyncDialog({ ask, onClose }: TodaySyncDialogProps) {
  const [busy, setBusy] = useState(false)
  async function alsoToday() {
    setBusy(true)
    try {
      await repo.syncSession()
      onClose()
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog open={ask !== null} onClose={onClose}>
      <View className="gap-2">
        <Text accessibilityRole="header" className={H2}>{`${ask?.dayName ?? ''} is running right now`}</Text>
        <Text className={cn(BODY, 'text-muted-foreground')}>
          {ask?.exerciseName
            ? `The session on Today still has ${ask.exerciseName}. Change it there too?`
            : 'The session on Today still has the day as it was. Change it there too?'}
        </Text>
      </View>
      <View className="gap-2">
        <Button className={BTN} disabled={busy} onPress={alsoToday}>
          <Icon as={ClipboardList} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Plan and today</Text>
        </Button>
        <Button variant="secondary" className={BTN} onPress={onClose}>
          <Icon as={Check} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_TEXT, 'text-foreground')}>Plan only</Text>
        </Button>
      </View>
      <Text className={CAPTION}>Sets already ticked stay as they are.</Text>
    </Dialog>
  )
}
