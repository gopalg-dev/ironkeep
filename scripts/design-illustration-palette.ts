import { writeFile } from 'node:fs/promises'

import { colorHex } from './css-tokens'

const tokens = ['background', 'foreground', 'muted-foreground'] as const
const palette = (scheme: 'light' | 'dark') =>
  Object.fromEntries(tokens.map((token) => [token, colorHex(scheme, token)]))

await writeFile(
  'docs/design/illustrations/palette.json',
  `${JSON.stringify({ light: palette('light'), dark: palette('dark') }, null, 2)}\n`,
)
console.log('Updated the empty-state illustration palette from src/global.css.')
