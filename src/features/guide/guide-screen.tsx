import { useRouter } from 'expo-router'
import { ArrowLeft, ChevronRight } from 'lucide-react-native'
import { View } from 'react-native'

import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowTitle } from '@/components/row'
import { Screen } from '@/components/screen'
import { CAPTION, TITLE } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'
import { CHAPTERS, PARTS } from './guide-content'

/** The guide's chapters by part (canvas: Guide): a row per chapter. The `/guide` page, from the menu. */
export function GuideScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  return (
    <Screen
      bar={{
        title: 'Guide',
        left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
      }}
    >
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text accessibilityRole="header" className={TITLE}>
          Guide
        </Text>
      </View>
      {PARTS.map((part) => (
        <View key={part}>
          <Text className={cn(CAPTION, 'mt-6 px-1')}>{part}</Text>
          <Group className="mt-2">
            {CHAPTERS.filter((c) => c.part === part).map((c) => (
              <Row
                key={c.id}
                accessibilityLabel={c.title}
                onPress={() => router.push({ pathname: '/guide/[id]', params: { id: c.id } })}
              >
                <Icon as={c.icon} strokeWidth={1.75} className="size-5.5 text-foreground" />
                <RowBody>
                  <RowTitle>{c.title}</RowTitle>
                </RowBody>
                <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
              </Row>
            ))}
          </Group>
        </View>
      ))}
    </Screen>
  )
}
