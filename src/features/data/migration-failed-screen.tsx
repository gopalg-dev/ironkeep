import Constants from 'expo-constants'
import { AlertCircle, RotateCcw, Share2 } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { Group } from '@/components/row'
import { BODY, CAPTION, NUMBER, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { shareRawDatabase } from './files'

/**
 * The update could not open your data (canvas: MigrationFailed): a migration threw, nothing was
 * changed, and the database file is still there. Try again re-runs the migrations; the file can be
 * shared out as it is.
 */
export function MigrationFailedScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [busy, setBusy] = useState(false)
  const version = Constants.expoConfig?.version ?? ''
  async function share() {
    if (busy) return
    setBusy(true)
    try {
      await shareRawDatabase()
    } finally {
      setBusy(false)
    }
  }
  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center px-5">
        <Icon as={AlertCircle} strokeWidth={1.75} className="size-11 text-destructive" />
        <Text className={cn(TITLE, 'mt-6 text-3xl leading-10')}>The update could not open your data</Text>
        <Text className={cn(BODY, 'mt-3')}>
          Nothing was changed. Your sessions are still in the database file on this phone.
        </Text>
        <Group className="mt-6 p-4">
          <Text className={CAPTION}>What happened</Text>
          <Text className={cn(BODY, NUMBER, 'mt-1 font-mono text-sm leading-5')}>{error.message}</Text>
          {version ? <Text className={cn(CAPTION, NUMBER, 'mt-3')}>{`Ironkeep ${version}`}</Text> : null}
        </Group>
      </View>
      <View className="gap-2 px-5 pb-5">
        <Button className={BTN} onPress={onRetry}>
          <Icon as={RotateCcw} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Try again</Text>
        </Button>
        <Button variant="secondary" className={BTN} disabled={busy} onPress={share}>
          <Icon as={Share2} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_TEXT, 'text-foreground')}>Share the database file</Text>
        </Button>
      </View>
    </SafeAreaView>
  )
}
