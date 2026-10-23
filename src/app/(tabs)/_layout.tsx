import { Redirect, useRouter } from 'expo-router'
import { Tabs } from 'expo-router/js-tabs'
import { BicepsFlexed, ChartNoAxesColumn, LayoutGrid, ListTodo, type LucideIcon } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { useSettings } from '@/db/hooks'

/**
 * The three main screens and the menu: the phone's tab bar. The menu sits here, within a thumb's
 * reach, rather than top right; its tab opens the menu sheet and never shows a page of its own.
 */
const TABS: { name: string; title: string; icon: LucideIcon }[] = [
  { name: 'index', title: 'Today', icon: BicepsFlexed },
  { name: 'plan', title: 'Plan', icon: ListTodo },
  { name: 'stats', title: 'Stats', icon: ChartNoAxesColumn },
  // Named `more`, not `menu`: the menu sheet lives at `/menu`, and a tab of that name would take the path.
  { name: 'more', title: 'Menu', icon: LayoutGrid },
]

const asColor = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined)

export default function TabsLayout() {
  const router = useRouter()
  const settings = useSettings()
  // The navigator takes style objects, so the design's classes are resolved into them: no number is typed here.
  const bar = useResolveClassNames('h-21 bg-background pt-2')
  const label = useResolveClassNames('text-xs font-semibold')
  const active = useResolveClassNames('text-foreground')
  const inactive = useResolveClassNames('text-muted-foreground')
  const icon = useResolveClassNames('size-6.5')
  if (!settings) return null
  // Not set up yet: the questions first.
  if (!settings.setupDone) return <Redirect href="/setup" />
  const iconSize = typeof icon.width === 'number' ? icon.width : undefined
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: asColor(active.color),
        tabBarInactiveTintColor: asColor(inactive.color),
        tabBarStyle: { ...bar, borderTopWidth: 0, elevation: 0 },
        tabBarLabelStyle: label,
        tabBarItemStyle: { gap: 4 },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color }) => <tab.icon color={color} size={iconSize} strokeWidth={1.75} />,
            // The menu tab is a button: it opens the menu sheet and never becomes the current tab.
            ...(tab.name === 'more'
              ? {
                  tabBarButton: ({ children, style, accessibilityLabel }) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={accessibilityLabel ?? 'Menu'}
                      style={style}
                      onPress={() => router.push('/menu')}
                    >
                      {children}
                    </Pressable>
                  ),
                }
              : {}),
          }}
        />
      ))}
    </Tabs>
  )
}
