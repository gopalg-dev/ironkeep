import {
  BookOpenText,
  ChevronRight,
  FileChartColumn,
  LibraryBig,
  type LucideIcon,
  Settings2,
} from 'lucide-react-native'

import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { Icon } from '@/components/ui/icon'
import { shortDate } from '@/lib/format'
import { LIBRARY } from '@/lib/library-data'

export type MenuEntry = 'report' | 'library' | 'guide' | 'settings'

/** Monday of the week `now` is in: the week the report opens on. */
function weekOf(now: Date): string {
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return `Week of ${shortDate(monday.toISOString())}`
}

const entries = (now: Date): { key: MenuEntry; label: string; sub?: string; icon: LucideIcon }[] => [
  { key: 'report', label: 'Report', sub: weekOf(now), icon: FileChartColumn },
  { key: 'library', label: 'Library', sub: `${LIBRARY.length} exercises`, icon: LibraryBig },
  { key: 'guide', label: 'Guide', icon: BookOpenText },
  { key: 'settings', label: 'Settings', icon: Settings2 },
]

interface MenuSheetProps {
  /** The screens behind the menu come with their features; until then a row only closes the sheet. */
  onPick: (entry: MenuEntry) => void
}

/** The header's menu: the screens that are not tabs, and the look. The body of the `/menu` sheet. */
export function MenuSheet({ onPick }: MenuSheetProps) {
  return (
    <SheetBody>
      <Group>
        {entries(new Date()).map((e) => (
          <Row key={e.key} tone="page" tall accessibilityLabel={e.label} onPress={() => onPick(e.key)}>
            <Icon as={e.icon} strokeWidth={1.75} className="size-5.5 text-foreground" />
            <RowBody>
              <RowTitle>{e.label}</RowTitle>
              {e.sub ? <RowSub>{e.sub}</RowSub> : null}
            </RowBody>
            <Icon as={ChevronRight} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
          </Row>
        ))}
      </Group>
    </SheetBody>
  )
}
