import '@/global.css'

import { Stack, ThemeProvider } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Uniwind, useResolveClassNames } from 'uniwind'

import { TextClassContext } from '@/components/ui/text'
import { useDatabase } from '@/db/use-database'
import { autoSnapshot } from '@/features/data/files'
import { MigrationFailedScreen } from '@/features/data/migration-failed-screen'
import { useSessionNotifications } from '@/features/workout/session-notifications'
import { followPhone, restoreLook } from '@/theme/look'
import { useNavTheme } from '@/theme/nav-theme'
import { useThemeScheme } from '@/theme/use-theme-scheme'

export { ErrorBoundary } from 'expo-router'

// Notification deep links need a real screen underneath the finish/review sheet.
export const unstable_settings = { anchor: '(tabs)' }

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  // Try again on the failed screen mounts the gate afresh, which runs the migrations again.
  const [attempt, setAttempt] = useState(0)
  return <Gate key={attempt} onRetry={() => setAttempt((n) => n + 1)} />
}

function Gate({ onRetry }: { onRetry: () => void }) {
  // The form sheet's corner and colour come from the design's classes.
  const sheetLook = useResolveClassNames('rounded-2xl bg-card')
  const sheet = {
    presentation: 'formSheet',
    sheetAllowedDetents: 'fitToContents',
    sheetCornerRadius: typeof sheetLook.borderRadius === 'number' ? sheetLook.borderRadius : undefined,
    contentStyle: {
      backgroundColor: typeof sheetLook.backgroundColor === 'string' ? sheetLook.backgroundColor : undefined,
    },
  } as const
  // A sheet with more than fits: one fixed height instead of a fit to the content, and the body scrolls inside.
  // One snap height only: with two, Android collapsed the sheet on a pull down at the top while the scrolled
  // content kept its taller layout, which cut the handle and the header off the top.
  const tallSheet = { ...sheet, sheetAllowedDetents: [0.9] as number[] }
  const scheme = useThemeScheme()
  const navTheme = useNavTheme()
  const database = useDatabase()
  useSessionNotifications(database.status === 'ready')
  // The phone's insets go to Uniwind, so `pb-safe` and friends measure the gesture bar everywhere, sheets included.
  const insets = useSafeAreaInsets()
  useEffect(() => {
    Uniwind.updateInsets(insets)
  }, [insets])

  useEffect(() => {
    if (database.status !== 'migrating') SplashScreen.hideAsync()
    // A snapshot a week, once the data is open; a failure here never blocks the app.
    if (database.status === 'ready') {
      restoreLook().catch(() => undefined)
      autoSnapshot().catch(() => undefined)
    }
  }, [database.status])
  useEffect(followPhone, [])

  if (database.status === 'migrating') return null

  return (
    <ThemeProvider value={navTheme}>
      <TextClassContext.Provider value="font-normal">
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        {database.status === 'failed' ? (
          <MigrationFailedScreen error={database.error} onRetry={onRetry} />
        ) : (
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="setup" />
            <Stack.Screen name="restore" />
            <Stack.Screen name="zen" />
            <Stack.Screen name="library" />
            <Stack.Screen name="guide" />
            <Stack.Screen name="guide/[id]" />
            <Stack.Screen name="report" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="data" />
            <Stack.Screen name="data/import" />
            <Stack.Screen name="data/snapshots" />
            <Stack.Screen name="plan-import" />
            {/* Sheets: the platform's own bottom sheet, sized to the content, dragged down to close. */}
            <Stack.Screen name="menu" options={sheet} />
            <Stack.Screen name="pick-day" options={sheet} />
            <Stack.Screen name="session-options" options={sheet} />
            <Stack.Screen name="swap" options={sheet} />
            <Stack.Screen name="finish" options={sheet} />
            <Stack.Screen name="summary" options={sheet} />
            <Stack.Screen name="add-day" options={sheet} />
            <Stack.Screen name="day-options" options={sheet} />
            <Stack.Screen name="edit-day" options={sheet} />
            <Stack.Screen name="edit-exercise" options={sheet} />
            <Stack.Screen name="exercise/[id]" options={tallSheet} />
            <Stack.Screen name="pick" options={sheet} />
            <Stack.Screen name="share" options={sheet} />
            <Stack.Screen name="steps" options={sheet} />
            <Stack.Screen name="split" options={tallSheet} />
            <Stack.Screen name="session-editor" options={tallSheet} />
            <Stack.Screen name="past-day" options={tallSheet} />
          </Stack>
        )}
      </TextClassContext.Provider>
    </ThemeProvider>
  )
}
