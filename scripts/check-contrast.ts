/**
 * Fails when a text-on-surface colour pair drops below its WCAG ratio, in any theme. The ratios are
 * read from the hex comments beside each token in `src/global.css`, so the check follows the tokens.
 * Step 9 of docs/research/accessibility.md. Run by `bun run check`.
 *
 * Only pairs where one colour is text on the other are checked; borders, inputs, rings and the scrim
 * are decoration and left out. Normal text needs 4.5:1 (WCAG 1.4.3).
 */

const MIN = 4.5

/** The text-on-surface pairs: [ink token, surface token]. Both must exist in a theme to be checked. */
const PAIRS: [string, string][] = [
  ['foreground', 'background'],
  ['foreground', 'card'],
  ['card-foreground', 'card'],
  ['popover-foreground', 'popover'],
  ['secondary-foreground', 'secondary'],
  ['accent-foreground', 'accent'],
  ['muted-foreground', 'background'],
  ['muted-foreground', 'card'],
  ['muted-foreground', 'secondary'],
  ['primary-foreground', 'primary'],
  ['success-foreground', 'success'],
  ['destructive', 'background'],
  ['destructive', 'card'],
  ['day-push-ink', 'day-push'],
  ['day-pull-ink', 'day-pull'],
  ['day-legs-ink', 'day-legs'],
  ['day-mixed-ink', 'day-mixed'],
]

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const c = [0, 2, 4].map((i) => Number.parseInt(h.slice(i, i + 2), 16) / 255)
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
}

function ratio(a: string, b: string): number {
  const [la, lb] = [luminance(a), luminance(b)]
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

// Parse the tokens per theme: the nearest preceding `@variant NAME {` owns each `--color-…: …; /* #hex */`.
const css = await Bun.file('src/global.css').text()
const themes = new Map<string, Record<string, string>>()
let current: Record<string, string> | null = null
for (const line of css.split('\n')) {
  const v = line.match(/@variant\s+([\w-]+)\s*\{/)
  if (v) {
    current = themes.get(v[1]) ?? {}
    themes.set(v[1], current)
    continue
  }
  const t = line.match(/--color-([\w-]+):[^;]*;\s*\/\*\s*(#[0-9a-fA-F]{6})/)
  if (t && current) current[t[1]] = t[2]
}

const problems: string[] = []
const check = (name: string, label: string, fg: string | undefined, bg: string | undefined) => {
  if (!fg || !bg) return
  const r = ratio(fg, bg)
  if (r < MIN) problems.push(`${name}: ${label} is ${r.toFixed(2)}:1 (needs ${MIN}:1) — ${fg} on ${bg}`)
}
for (const [name, tokens] of themes) {
  for (const [ink, surface] of PAIRS) check(name, `${ink} on ${surface}`, tokens[ink], tokens[surface])
  // The delete buttons carry white text on the solid `destructive-surface`; `destructive` above is the
  // red text colour. The two were split so both clear 4.5:1 (docs/decisions.md).
  check(name, 'white on destructive-surface', '#ffffff', tokens['destructive-surface'])
}

if (problems.length > 0) {
  console.error('Contrast below WCAG AA. Adjust the token in src/global.css:\n')
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`check-contrast: ${[...themes.keys()].length} themes, all text pairs clear ${MIN}:1`)
