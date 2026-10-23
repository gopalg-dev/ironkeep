/**
 * Fails when a colour literal appears in TypeScript source. Colours live only in `src/global.css`
 * (see docs/research/theming.md). Run by `bun run check`.
 */
import { Glob } from 'bun'

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|hwb|lab|lch)\(/
const files = new Glob('src/**/*.{ts,tsx}')
const skip = (path: string): boolean => path.includes('uniwind-types.d.ts')

const problems: string[] = []
for await (const path of files.scan('.')) {
  if (skip(path)) continue
  const lines = (await Bun.file(path).text()).split('\n')
  lines.forEach((line, index) => {
    if (COLOR.test(line)) problems.push(`${path}:${index + 1}: ${line.trim()}`)
  })
}

if (problems.length > 0) {
  console.error('Colour literals found. Use a token from src/global.css instead:\n')
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log('check-colors: no colour literals in src')
