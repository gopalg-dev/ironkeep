import { Text } from '@/components/ui/text'
import { cn } from '@/lib/utils'

/** Splits a line on its **bold** runs: even parts plain, odd parts bold. */
export function splitBold(text: string): { bold: boolean; text: string }[] {
  return text
    .split('**')
    .map((part, i) => ({ bold: i % 2 === 1, text: part }))
    .filter((p) => p.text.length > 0)
}

/** A line of the guide with its **bold** runs set in the heavier weight. */
export function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <Text className={className}>
      {splitBold(text).map((p, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: a run is its position in the line
        <Text key={i} className={cn(className, p.bold && 'font-bold text-foreground')}>
          {p.text}
        </Text>
      ))}
    </Text>
  )
}
