import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { SheetBody } from '@/components/sheet'
import { CAPTION, H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import type { DayType, PlanDay } from '@/lib/types'
import { KindGrid } from './kind-grid'

/** Rename a day or change its kind. The `/edit-day` sheet. */
export function EditDayScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [day, setDay] = useState<PlanDay | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<DayType>('full')
  const [busy, setBusy] = useState(false)
  const placeholder = useResolveClassNames('text-muted-foreground')
  useEffect(() => {
    let live = true
    repo.getPlan().then((p) => {
      const d = p.days.find((x) => x.id === id)
      if (live && d) {
        setDay(d)
        setName(d.name)
        setType(d.type)
      }
    })
    return () => {
      live = false
    }
  }, [id])

  async function save() {
    if (!day || busy || !name.trim()) return
    setBusy(true)
    try {
      await repo.updateDay(day.id, { name: name.trim(), type })
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetBody>
      <Text className={H2}>{day?.name ?? ''}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name"
        placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
        accessibilityLabel="Day name"
        maxLength={40}
        className="h-14 rounded-xl bg-background px-4 text-lg font-medium text-foreground"
      />
      <View className="gap-2">
        <Text className={CAPTION}>Kind</Text>
        <KindGrid value={type} onPick={setType} />
      </View>
      <View className="gap-2">
        <Button className={BTN} disabled={busy || !day || !name.trim()} onPress={save}>
          <Icon as={Check} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Save</Text>
        </Button>
        <Button variant="ghost" className="h-12" onPress={() => router.back()}>
          <Text className="text-lg font-semibold text-foreground">Cancel</Text>
        </Button>
      </View>
    </SheetBody>
  )
}
