import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { H2, NUMBER, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { getLastSummary } from './last-summary'

/** "+2.5 kg" as the design writes it: "Up 2.5 kg", "Down 2.5 kg". */
const moved = (change: string): string =>
  change.startsWith('+') ? `Up ${change.slice(1)}` : change.startsWith('-') ? `Down ${change.slice(1)}` : change

const NEW_BEST = 'New best'

/** What the session did (canvas: Workout, saved): every lift's best set, new bests marked, the week's count. The `/summary` sheet. */
export function SummaryScreen() {
  const router = useRouter()
  const last = getLastSummary()
  return (
    <SheetBody>
      <View className="gap-1">
        <Text accessibilityRole="header" className={H2}>
          Workout saved
        </Text>
        {last ? (
          <Text className={cn(SECONDARY, NUMBER)}>
            {`${last.summary.week.done} of ${last.summary.week.planned} sessions this week, ${last.minutes} min`}
          </Text>
        ) : null}
      </View>
      {last ? (
        <Group>
          {last.summary.lines.map((l) => (
            <Row key={l.exerciseId} tone="page">
              <RowBody>
                <RowTitle>{l.name}</RowTitle>
                {l.pr ? (
                  <RowSub className="text-success">{NEW_BEST}</RowSub>
                ) : l.change ? (
                  <RowSub>{moved(l.change)}</RowSub>
                ) : null}
              </RowBody>
              <RowValue className="text-foreground">{l.best}</RowValue>
            </Row>
          ))}
        </Group>
      ) : null}
      <Button className={BTN} onPress={() => router.back()}>
        <Icon as={Check} className="size-4.5 text-primary-foreground" />
        <Text className={BTN_TEXT}>Done</Text>
      </Button>
    </SheetBody>
  )
}
