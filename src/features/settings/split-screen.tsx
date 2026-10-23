import { useRouter } from 'expo-router'
import { Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { SheetScroll } from '@/components/sheet'
import { DEFAULT_OWN_DAYS, OWN_SPLIT, SplitPicker } from '@/components/split-picker'
import { H2 } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { DEFAULT_SPLIT, templateOf } from '@/lib/content'
import { BUNDLED_SPLITS } from '@/lib/splits'
import type { DayType, Settings, SplitId } from '@/lib/types'

/**
 * Change split (canvas: Settings, Split): the same picker as setup. Each split keeps its own plan,
 * so going back brings its edits back; Start with empty days gives the picked split its days with
 * no lifts. The `/split` sheet.
 */
export function SplitScreen() {
  const router = useRouter()
  const [settings, setSettings] = useState<Settings | null>(null)
  const [slots, setSlots] = useState<{ split: string; days: number }[]>([])
  const [split, setSplit] = useState<SplitId>(DEFAULT_SPLIT)
  const [ownDays, setOwnDays] = useState<DayType[]>(DEFAULT_OWN_DAYS)
  const [empty, setEmpty] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    Promise.all([repo.getSettings(), repo.planSlots()]).then(([s, ps]) => {
      if (!live) return
      setSettings(s)
      setSlots(ps)
      setSplit(s.split === OWN_SPLIT ? OWN_SPLIT : templateOf(s.split))
    })
    return () => {
      live = false
    }
  }, [])
  if (!settings) return <SheetScroll>{null}</SheetScroll>
  const current = settings.split ?? DEFAULT_SPLIT
  const own = slots.find((p) => p.split === OWN_SPLIT)

  async function apply() {
    if (busy) return
    setBusy(true)
    try {
      if (split === OWN_SPLIT) {
        // A plan of your own already laid out comes back as it was; a new one is built from the days picked.
        if (own && !empty) await repo.applySplit(OWN_SPLIT)
        else await repo.createCustomPlan(ownDays, { empty })
      } else if (split !== current || empty) {
        await repo.applySplit(split, { empty })
      }
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetScroll
      // The action stays pinned under the scroll, so a tall picker never hides Save at its end.
      footer={
        <View className="gap-2">
          <Button className={BTN} disabled={busy} onPress={apply}>
            <Icon as={Check} className="size-4.5 text-primary-foreground" />
            <Text className={BTN_TEXT}>Use this split</Text>
          </Button>
          <Button variant="ghost" className="h-12" onPress={() => router.back()}>
            <Text className="text-lg font-semibold text-foreground">Cancel</Text>
          </Button>
        </View>
      }
    >
      <Text accessibilityRole="header" className={H2}>
        Split
      </Text>
      <SplitPicker
        splits={BUNDLED_SPLITS}
        value={split}
        onChange={setSplit}
        ownDays={ownDays}
        onOwnDaysChange={setOwnDays}
        ownPlan={own ? { days: own.days } : undefined}
        ownMode={own ? 'keep' : 'build'}
        empty={empty}
        onEmptyChange={setEmpty}
      />
    </SheetScroll>
  )
}
