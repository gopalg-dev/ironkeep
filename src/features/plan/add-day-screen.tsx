import { useRouter } from 'expo-router'
import { X } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { SheetBody } from '@/components/sheet'
import { H2, SECONDARY } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import type { DayType } from '@/lib/types'
import { KindGrid } from './kind-grid'

/** A new day for the plan (canvas: Plan, add a day): pick its kind, it comes with five lifts. The `/add-day` sheet. */
export function AddDayScreen() {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function add(type: DayType) {
    if (busy) return
    setBusy(true)
    try {
      await repo.addDay(type)
      router.back()
    } finally {
      setBusy(false)
    }
  }
  return (
    <SheetBody>
      <View className="gap-1">
        <Text className={H2}>What kind of day?</Text>
        <Text className={SECONDARY}>It starts with five lifts you can change.</Text>
      </View>
      <KindGrid onPick={add} disabled={busy} />
      <Button variant="ghost" className="h-12" onPress={() => router.back()}>
        <Icon as={X} className="size-4.5 text-foreground" />
        <Text className="text-lg font-semibold text-foreground">Cancel</Text>
      </Button>
    </SheetBody>
  )
}
