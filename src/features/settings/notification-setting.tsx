import { Bell } from 'lucide-react-native'
import { Alert, Switch } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { Row, RowBody, RowTitle } from '@/components/row'
import { Icon } from '@/components/ui/icon'
import { sessionNotification } from '../../../modules/session-notification'
import { useNotificationSetting } from './use-notification-setting'

const LABEL = 'Workout notifications'

export function NotificationSetting() {
  const { enabled, busy, change } = useNotificationSetting()
  const active = useResolveClassNames('text-primary')
  const inactive = useResolveClassNames('text-muted-foreground')
  const thumb = useResolveClassNames('text-primary-foreground')

  async function toggle(value: boolean) {
    try {
      if ((await change(value)) === 'blocked') {
        Alert.alert('Notifications blocked', 'Android is blocking workout notifications.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open settings', onPress: () => sessionNotification?.openNotificationSettings() },
        ])
      }
    } catch {
      Alert.alert('Could not change notifications', 'The notification setting could not be saved.')
    }
  }

  if (!sessionNotification?.notificationsAllowed) return null
  return (
    <Row>
      <Icon as={Bell} strokeWidth={1.75} className="size-5.5 text-foreground" />
      <RowBody>
        <RowTitle>{LABEL}</RowTitle>
      </RowBody>
      <Switch
        testID="workout-notifications-toggle"
        accessibilityLabel={LABEL}
        value={enabled}
        disabled={busy}
        onValueChange={(value) => void toggle(value)}
        trackColor={{
          false: typeof inactive.color === 'string' ? inactive.color : undefined,
          true: typeof active.color === 'string' ? active.color : undefined,
        }}
        thumbColor={typeof thumb.color === 'string' ? thumb.color : undefined}
      />
    </Row>
  )
}
