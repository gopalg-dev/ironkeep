import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { ScrollView } from 'react-native'

import { DayIcon } from '@/components/day-icon'
import { Group, Row, RowBody, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { H2 } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { getPick } from './pick-sheet'

/** A list to pick one thing from (a lift on Stats): the `/pick` sheet. A tap picks and closes. */
export function PickScreen() {
  const router = useRouter()
  const pick = getPick()
  if (!pick) return <SheetBody>{null}</SheetBody>
  return (
    <SheetBody>
      <Text accessibilityRole="header" className={H2}>
        {pick.title}
      </Text>
      <ScrollView className="max-h-96" nestedScrollEnabled>
        <Group>
          {pick.options.map((o) => {
            const on = o.id === pick.current
            return (
              <Row
                key={o.id}
                tone="page"
                tall={o.type !== undefined}
                accessibilityLabel={o.label}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  pick.onPick(o.id)
                  router.back()
                }}
              >
                {o.type ? <DayIcon type={o.type} /> : null}
                <RowBody>
                  <RowTitle>{o.label}</RowTitle>
                </RowBody>
                {on ? <Icon as={Check} strokeWidth={2} className="size-5.5 text-foreground" /> : null}
              </Row>
            )
          })}
        </Group>
      </ScrollView>
    </SheetBody>
  )
}
