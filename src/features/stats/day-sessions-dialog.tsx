import { ChevronRight, X } from 'lucide-react-native'
import { ScrollView, View } from 'react-native'

import { DayIcon } from '@/components/day-icon'
import { Dialog } from '@/components/dialog'
import { IconButton } from '@/components/icon-button'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { H2, SECONDARY } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { longDate } from '@/lib/format'
import { type FinishedWorkout, noon } from '@/lib/logic/stats'
import { sessionChoiceLine } from './day-sessions'

interface Props {
  date: string | null
  sessions: FinishedWorkout[]
  onClose: () => void
  onPick: (id: string) => void
}

/** The web calendar's session chooser, using the app's modal and shared rows. */
export function DaySessionsDialog({ date, sessions, onClose, onPick }: Props) {
  return (
    <Dialog open={date !== null} onClose={onClose} className="max-h-[85%]">
      <View className="flex-row items-start justify-between gap-2">
        <View className="min-w-0 flex-1 gap-1">
          <Text accessibilityRole="header" className={H2}>
            {date ? longDate(noon(date)) : ''}
          </Text>
          <Text className={SECONDARY}>{`${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`}</Text>
        </View>
        <IconButton as={X} accessibilityLabel="Close sessions" onPress={onClose} />
      </View>
      <ScrollView className="max-h-96 shrink" nestedScrollEnabled>
        <Group>
          {sessions.map((workout) => {
            const detail = sessionChoiceLine(workout)
            return (
              <Row
                key={workout.id}
                tone="page"
                tall
                accessibilityLabel={`Open ${workout.dayName}, ${detail}`}
                onPress={() => onPick(workout.id)}
              >
                <DayIcon type={workout.dayType} />
                <RowBody>
                  <RowTitle>{workout.dayName}</RowTitle>
                  <RowSub>{detail}</RowSub>
                </RowBody>
                <Icon as={ChevronRight} className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Row>
            )
          })}
        </Group>
      </ScrollView>
    </Dialog>
  )
}
