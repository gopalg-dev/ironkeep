import { useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'

import { useBigTitle } from '@/components/page-bar'
import { Screen } from '@/components/screen'
import { Segmented } from '@/components/segmented'
import { TITLE } from '@/components/typography'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { BodyPanel } from './body-panel'
import { LiftsPanel } from './lifts-panel'
import { SessionsPanel } from './sessions-panel'

const TABS = ['lifts', 'sessions', 'body'] as const
type Tab = (typeof TABS)[number]
const TAB_OPTIONS: { value: Tab; label: string }[] = [
  { value: 'lifts', label: 'Lifts' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'body', label: 'Body' },
]

/** The footer-less tab (canvas: Stats lifts, sessions, body): one segmented switch, three panels, data reloaded on every visit. */
export function StatsScreen() {
  const measure = useBigTitle()
  const params = useLocalSearchParams<{ tab?: string; log?: string }>()
  const [data, setData] = useState<repo.StatsData | null>(null)
  const [tab, setTab] = useState<Tab>('lifts')
  useEffect(() => {
    if (params.tab === 'body' || params.tab === 'sessions' || params.tab === 'lifts') setTab(params.tab)
  }, [params.tab])
  const load = useCallback(() => {
    let live = true
    repo.getStatsData().then((d) => {
      if (live) setData(d)
    })
    return () => {
      live = false
    }
  }, [])
  useFocusEffect(load)
  const refresh = () => repo.getStatsData().then(setData)

  return (
    <Screen
      bar={{
        title: 'Stats',
      }}
    >
      <View className="min-h-11 flex-row items-center" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Stats
        </Text>
      </View>
      <Segmented
        options={TAB_OPTIONS}
        value={tab}
        onChange={setTab}
        accessibilityLabel="Stats section"
        className="mt-4"
      />
      {data ? (
        <>
          {tab === 'lifts' ? <LiftsPanel data={data} /> : null}
          {tab === 'sessions' ? <SessionsPanel data={data} onChanged={refresh} /> : null}
          {tab === 'body' ? <BodyPanel data={data} onChanged={refresh} openTape={params.log === 'tape'} /> : null}
        </>
      ) : null}
    </Screen>
  )
}
