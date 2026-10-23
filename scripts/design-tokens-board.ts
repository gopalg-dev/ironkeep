/**
 * Writes the design canvas's colour board from `src/global.css`, so the canvas shows exactly the
 * tokens the app uses. Run after any token change: `bun scripts/design-tokens-board.ts`, then
 * republish the canvas. Output: docs/design/canvas-source/DesignColors.dc.html
 */

interface Token {
  name: string
  value: string
  hex: string
}

const CSS_PATH = 'src/global.css'
const OUT_PATH = 'docs/design/canvas-source/DesignColors.dc.html'

const css = await Bun.file(CSS_PATH).text()

/** The declarations inside `@variant <name> { ... }`. */
function variantBlock(name: string): string {
  const start = css.indexOf(`@variant ${name} {`)
  if (start === -1) throw new Error(`No @variant ${name} in ${CSS_PATH}`)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

function tokensOf(block: string): Token[] {
  const tokens: Token[] = []
  const line = /--(?:(color)-)?([a-z0-9-]+):\s*([^;]+);\s*\/\*\s*(#[0-9a-f]{6})\s*\*\//g
  for (const match of block.matchAll(line)) {
    const [, colorToken, name, value, hex] = match
    if (name && value && hex && (colorToken || name.startsWith('chart-'))) {
      tokens.push({ name, value: value.trim(), hex })
    }
  }
  return tokens
}

const themes = ['light', 'dark'].map((name) => ({ name, tokens: tokensOf(variantBlock(name)) }))

const GROUPS: Array<{ title: string; match: (name: string) => boolean }> = [
  { title: 'Surfaces and text', match: (n) => /^(background|foreground|card|popover)/.test(n) },
  { title: 'Actions', match: (n) => /^(primary|secondary|accent|destructive|ring)/.test(n) },
  { title: 'Quiet', match: (n) => /^(muted|border|input)/.test(n) },
  { title: 'Day families', match: (n) => n.startsWith('day-') },
  { title: 'Charts', match: (n) => n.startsWith('chart-') },
  { title: 'Done', match: (n) => n.startsWith('success') },
]

const swatch = (t: Token, dark: boolean): string =>
  `<div style="display: flex; align-items: center; gap: 12px; min-height: 48px">
        <span style="width: 40px; height: 40px; border-radius: 10px; background: ${t.value}; flex: none; box-shadow: inset 0 0 0 1px ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'}"></span>
        <span style="display: flex; flex-direction: column; min-width: 0">
          <span style="font-size: 14px; font-weight: 700">${t.name}</span>
          <span style="font-size: 12px; opacity: 0.7; font-variant-numeric: tabular-nums">${t.value} · ${t.hex}</span>
        </span>
      </div>`

const column = (theme: { name: string; tokens: Token[] }): string => {
  const dark = theme.name === 'dark'
  const bg = theme.tokens.find((t) => t.name === 'background')?.value ?? 'white'
  const fg = theme.tokens.find((t) => t.name === 'foreground')?.value ?? 'black'
  const groups = GROUPS.map((g) => {
    const items = theme.tokens.filter((t) => g.match(t.name))
    return `<div style="display: flex; flex-direction: column; gap: 4px">
      <div style="font-size: 13px; font-weight: 600; opacity: 0.6; margin-top: 12px">${g.title}</div>
      ${items.map((t) => swatch(t, dark)).join('\n      ')}
    </div>`
  }).join('\n')
  return `<div style="flex: 1; background: ${bg}; color: ${fg}; border-radius: 24px; padding: 28px">
    <div style="font-size: 22px; font-weight: 800">${dark ? 'Dark' : 'Light'}</div>
    ${groups}
  </div>`
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Design system: colours</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<style>body{margin:0;background:#ffffff}</style>
</helmet>
<div style="width: 1180px; box-sizing: border-box; padding: 40px; font-family: 'Plus Jakarta Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 24px; background: #ffffff; color: #17191c">
  <div style="display: flex; flex-direction: column; gap: 6px">
    <div style="font-size: 34px; font-weight: 800; letter-spacing: -0.02em">Colour tokens</div>
    <div style="font-size: 15px; opacity: 0.7">Generated from src/global.css by scripts/design-tokens-board.ts. OKLCH is the source value; hex is for reference.</div>
  </div>
  <div style="display: flex; gap: 24px; align-items: flex-start">
    ${themes.map(column).join('\n    ')}
  </div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1180,"height":1400}}'>
class Component extends DCLogic {
  renderVals() { return {}; }
}
</script>
</body>
</html>
`

await Bun.write(OUT_PATH, html)
console.log(`Wrote ${OUT_PATH} with ${themes.map((t) => `${t.tokens.length} ${t.name}`).join(', ')} tokens`)
