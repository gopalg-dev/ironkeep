import { useLocalSearchParams, useRouter } from 'expo-router'
import { ArrowLeft, Lightbulb } from 'lucide-react-native'
import { View } from 'react-native'

import { Chip } from '@/components/chip'
import { DAY_LABEL, DayIcon } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Screen } from '@/components/screen'
import { BODY, CAPTION, H3, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import { ExercisePictures } from '@/features/library/exercise-body'
import { findLibraryByName } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { TREND_LABEL, TRENDS } from '@/lib/logic/trend'
import type { DayType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { type Block, chapterById } from './guide-content'
import { RichText } from './rich-text'

/** The four plate colours, one day of each family. */
const DAY_KINDS: DayType[] = ['push', 'pull', 'legs', 'full']

/** What each trend chip means, in a line. */
const TREND_LINE: Record<string, string> = {
  climbing: 'completed-set performance improved from the previous session',
  stuck: 'performance held, or the decline was under 5%',
  slipping: 'completed-set performance fell five percent or more',
  idle: 'no session in two weeks',
  new: 'fewer than two comparable sessions',
}

/** One chapter of the guide (canvas: Guide): its lead, then its blocks. The `/guide/[id]` page. */
export function GuideChapterScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const { id } = useLocalSearchParams<{ id: string }>()
  const chapter = chapterById(id ?? '')
  if (!chapter) return <Screen>{null}</Screen>
  return (
    <Screen
      bar={{
        title: chapter.title,
        left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
      }}
    >
      <View className="min-h-11" />
      <Text accessibilityRole="header" className={cn(TITLE, 'mt-4')} onLayout={(e) => measure(e.nativeEvent.layout)}>
        {chapter.title}
      </Text>
      <View className="mt-4 gap-4">
        {chapter.blocks.map((block, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: a block is its place in the chapter
          <BlockView key={i} block={block} />
        ))}
      </View>
    </Screen>
  )
}

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'lead':
      return <RichText text={block.text} className="text-xl font-medium leading-7 text-foreground" />
    case 'text':
      return <RichText text={block.text} className={BODY} />
    case 'steps':
      return (
        <View className="gap-3 rounded-xl bg-card p-4">
          {block.steps.map((s, i) => (
            <View key={s.title} className="flex-row items-start gap-3">
              <View className="mt-0.5 size-6 items-center justify-center rounded-full bg-secondary">
                <Text className={cn('text-sm font-bold text-foreground', NUMBER)}>{i + 1}</Text>
              </View>
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className={H3}>{s.title}</Text>
                <RichText text={s.text} className={BODY} />
              </View>
            </View>
          ))}
        </View>
      )
    case 'tip':
      return (
        <View className="flex-row items-start gap-3 rounded-xl bg-card p-4">
          <Icon as={Lightbulb} strokeWidth={1.75} className="mt-0.5 size-5.5 text-foreground" />
          <RichText text={block.text} className={cn(BODY, 'flex-1')} />
        </View>
      )
    case 'facts':
      return (
        <View className="gap-px overflow-hidden rounded-xl">
          {block.facts.map((f) => (
            <View key={f.term} className="gap-1 bg-card px-4 py-3">
              <Text className={H3}>{f.term}</Text>
              <RichText text={f.text} className={cn(BODY, 'text-muted-foreground')} />
            </View>
          ))}
        </View>
      )
    case 'more':
      return <RichText text={block.text} className={CAPTION} />
    case 'picture': {
      const exercise = findLibraryByName(LIBRARY, block.name)
      return (
        <View className="gap-3">
          {exercise ? <ExercisePictures exercise={exercise} /> : null}
          <RichText text={block.text} className={SECONDARY} />
        </View>
      )
    }
    case 'days':
      return (
        <View className="gap-px overflow-hidden rounded-xl">
          {DAY_KINDS.map((type) => (
            <View key={type} className="flex-row items-center gap-3 bg-card px-4 py-2">
              <DayIcon type={type} />
              <Text className={H3}>{type === 'full' ? 'Upper, lower, full body, arms, core' : DAY_LABEL[type]}</Text>
            </View>
          ))}
        </View>
      )
    case 'trends':
      return (
        <View className="gap-2">
          {TRENDS.map((t) => (
            <View key={t} className="flex-row items-center gap-3">
              <Chip on>{TREND_LABEL[t]}</Chip>
              <Text className={cn(SECONDARY, 'shrink')}>{TREND_LINE[t]}</Text>
            </View>
          ))}
        </View>
      )
  }
}
