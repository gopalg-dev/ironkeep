// Measures how much room each candidate font takes: the width of three sample lines at 16 px,
// weight 400 and 600, and the x-height and cap height, all through the canvas 2D API.
import { createRequire } from 'node:module'

const { chromium } = createRequire('C:/Users/Gopal/projects/per/workout_plan_v3/package.json')('playwright')

const FONTS = [
  'Plus Jakarta Sans',
  'Barlow',
  'Barlow Semi Condensed',
  'Inter',
  'Inter Tight',
  'Roboto',
  'Roboto Condensed',
  'Roboto Flex',
  'IBM Plex Sans',
  'IBM Plex Sans Condensed',
  'Source Sans 3',
  'Work Sans',
  'Public Sans',
  'Geist',
  'Figtree',
  'DM Sans',
  'Instrument Sans',
  'Archivo',
  'Archivo Narrow',
  'Saira Semi Condensed',
  'Asap',
  'Asap Condensed',
  'Fira Sans',
  'Fira Sans Condensed',
  'Encode Sans',
  'Encode Sans Semi Condensed',
  'Noto Sans',
  'Open Sans',
  'Lato',
  'Albert Sans',
  'Onest',
  'Rubik',
  'Nunito Sans',
  'Mulish',
  'Schibsted Grotesk',
  'Hanken Grotesk',
  'Manrope',
  'Outfit',
  'Sora',
  'Urbanist',
  'Bricolage Grotesque',
  'Golos Text',
  'Be Vietnam Pro',
  'Wix Madefor Text',
  'Red Hat Text',
  'Heebo',
  'Karla',
  'Libre Franklin',
  'Atkinson Hyperlegible Next',
  'Mona Sans',
  'Hubot Sans',
  'Noto Sans Display',
  'Ubuntu Sans',
  'Google Sans Code',
  'Product Sans',
]
const families = FONTS.map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;800`).join('&')
const css = `https://fonts.googleapis.com/css2?${families}&display=swap`

const SENTENCE = 'Weigh-in due. Every week. Pick session. Skip or done. Barbell Row, Pull A, hard sets this week'
const NUMBERS = '0123456789 62.5 kg × 10 / 2026-10-22 18:05'
const CAPS = 'TODAY PLAN STATS SETTINGS LIBRARY GUIDE'

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent(
  `<!doctype html><link rel="stylesheet" href="${css}"><body>${FONTS.map((f) => `<span style="font-family:'${f}';font-weight:400">a</span><span style="font-family:'${f}';font-weight:600">a</span><span style="font-family:'${f}';font-weight:800">a</span>`).join('')}</body>`,
  { waitUntil: 'networkidle' },
)
await page.evaluate(() => document.fonts.ready)
const rows = await page.evaluate(
  async ({ FONTS, SENTENCE, NUMBERS, CAPS }) => {
    const c = document.createElement('canvas').getContext('2d')
    const out = []
    for (const f of FONTS) {
      const ok = await document.fonts
        .load(`600 16px '${f}'`)
        .then((l) => l.length > 0)
        .catch(() => false)
      const m = (w, s, size = 16) => {
        c.font = `${w} ${size}px '${f}'`
        c.fontKerning = 'normal'
        return c.measureText(s)
      }
      const x = m(400, 'x', 100).actualBoundingBoxAscent
      const cap = m(400, 'H', 100).actualBoundingBoxAscent
      out.push({
        font: f,
        loaded: ok,
        s400: +m(400, SENTENCE).width.toFixed(1),
        s600: +m(600, SENTENCE).width.toFixed(1),
        n600: +m(600, NUMBERS).width.toFixed(1),
        c800: +m(800, CAPS).width.toFixed(1),
        xh: +(x / 100).toFixed(3),
        cap: +(cap / 100).toFixed(3),
      })
    }
    return out
  },
  { FONTS, SENTENCE, NUMBERS, CAPS },
)
await browser.close()
const base = rows[0]
const pct = (a, b) => `${((a / b - 1) * 100).toFixed(0).padStart(4)}%`
console.log('font'.padEnd(28), 'ok', 'sent400', 'sent600', 'nums600', 'caps800', 'x-h', 'cap')
for (const r of rows.sort((a, b) => a.s600 - b.s600)) {
  console.log(
    r.font.padEnd(28),
    r.loaded ? 'y ' : 'N ',
    pct(r.s400, base.s400),
    pct(r.s600, base.s600).padStart(7),
    pct(r.n600, base.n600).padStart(7),
    pct(r.c800, base.c800).padStart(7),
    String(r.xh).padStart(6),
    String(r.cap).padStart(6),
  )
}
