import { type Href, useRouter } from 'expo-router'

import { type MenuEntry, MenuSheet } from '@/components/menu-sheet'

/** Where each row of the menu goes. */
const ROUTES: Record<MenuEntry, Href> = {
  report: '/report',
  library: '/library',
  guide: '/guide',
  settings: '/settings',
}

/** The header menu, presented as a form sheet by the root stack: a row closes the sheet and opens its page. */
export default function MenuRoute() {
  const router = useRouter()
  return <MenuSheet onPick={(entry) => router.replace(ROUTES[entry])} />
}
