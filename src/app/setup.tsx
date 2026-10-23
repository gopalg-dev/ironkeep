import { useLocalSearchParams } from 'expo-router'

import { useSettings } from '@/db/hooks'
import { SetupScreen } from '@/features/setup/setup-screen'

/** The first-run questions. `/setup?step=split` opens straight on the split question (linked from Plan). */
export default function SetupRoute() {
  const { step } = useLocalSearchParams<{ step?: string }>()
  const settings = useSettings()
  if (!settings) return null
  return <SetupScreen initial={settings} startAt={step === 'split' ? 'split' : 'welcome'} />
}
