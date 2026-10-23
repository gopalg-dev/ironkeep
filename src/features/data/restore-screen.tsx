import { useRouter } from 'expo-router'
import { ArrowLeft, RotateCcw } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { Screen } from '@/components/screen'
import { BODY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { errorMessage } from '@/lib/format'
import { cn } from '@/lib/utils'
import { pickFile } from './files'
import { setImport } from './import-handoff'
import { readImport } from './read-file'

/**
 * Restore from a file, from the first screen of setup: pick a backup, see what it holds, restore it
 * and land on Today. A logs file is read too, on an empty phone. The `/restore` page.
 */
export function RestoreScreen() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  async function pick() {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try {
      const file = await pickFile()
      if (!file) return
      setImport(await readImport(file))
      router.push({ pathname: '/data/import', params: { setup: '1' } })
    } catch (err) {
      setProblem(errorMessage(err, 'Could not read that file.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen
      footer={
        <Button className={BTN} disabled={busy} onPress={pick}>
          <Icon as={RotateCcw} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Pick a file</Text>
        </Button>
      }
    >
      <View className="min-h-11 flex-row items-center">
        <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />
      </View>
      <Text accessibilityRole="header" className={cn(TITLE, 'mt-8')}>
        Restore from a file
      </Text>
      <Text className={cn(BODY, 'mt-4')}>
        A backup file from this app or from the web app, or an Excel or CSV export of the logs.
      </Text>
      {problem ? <Text className={cn(BODY, 'mt-4 text-destructive')}>{problem}</Text> : null}
    </Screen>
  )
}
