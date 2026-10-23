/**
 * Reads the colour tokens of `src/global.css` for build-time consumers (app.config.ts, the design
 * tokens board), so a colour is never written a second time outside the CSS.
 *
 * Plain CommonJS on purpose: Expo loads app.config.ts through its own transpiler, which cannot
 * resolve TypeScript helpers, and the config plugins in `plugins/` are JavaScript for the same reason.
 */
const { readFileSync } = require('node:fs')

const CSS_PATH = 'src/global.css'

/**
 * @typedef {'light' | 'dark'} Scheme
 * @typedef {{ name: string, value: string, hex: string }} ColorToken
 */

/**
 * The declarations inside `@variant <scheme> { ... }`.
 * @param {string} css
 * @param {Scheme} scheme
 */
function variantBlock(css, scheme) {
  const start = css.indexOf(`@variant ${scheme} {`)
  if (start === -1) throw new Error(`No @variant ${scheme} in ${CSS_PATH}`)
  return css.slice(start, css.indexOf('}', start))
}

/** @param {number} v */
const clamp01 = (v) => Math.min(1, Math.max(0, v))
/** @param {number} v */
const toHex = (v) =>
  Math.round(clamp01(v) * 255)
    .toString(16)
    .padStart(2, '0')
/** @param {number} c */
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

/**
 * OKLCH to sRGB hex, after Björn Ottosson's reference conversion. Hue in degrees.
 * @param {number} l
 * @param {number} c
 * @param {number} h
 */
function oklchToHex(l, c, h) {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  const r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
  const g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
  const bl = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_
  return `#${toHex(gamma(r))}${toHex(gamma(g))}${toHex(gamma(bl))}`
}

/**
 * Parses `oklch(L C H)`; anything else is returned as is (already a hex or named colour).
 * @param {string} value
 */
function cssColorToHex(value) {
  const match = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/.exec(value.trim())
  if (!match) return value.trim()
  return oklchToHex(Number(match[1]), Number(match[2]), Number(match[3]))
}

/**
 * Every `--color-*` token of one scheme, in file order.
 * @param {Scheme} scheme
 * @param {string} [cssPath]
 * @returns {ColorToken[]}
 */
function readColorTokens(scheme, cssPath = CSS_PATH) {
  const block = variantBlock(readFileSync(cssPath, 'utf8'), scheme)
  /** @type {ColorToken[]} */
  const tokens = []
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) {
    const name = match[1]
    const raw = match[2]
    if (!name || !raw) continue
    const value = raw.replace(/\/\*.*?\*\//g, '').trim()
    tokens.push({ name, value, hex: cssColorToHex(value) })
  }
  return tokens
}

/**
 * One token's hex, or a thrown error naming the missing token.
 * @param {Scheme} scheme
 * @param {string} name
 * @param {string} [cssPath]
 */
function colorHex(scheme, name, cssPath = CSS_PATH) {
  const token = readColorTokens(scheme, cssPath).find((t) => t.name === name)
  if (!token) throw new Error(`No --color-${name} in the ${scheme} variant of ${cssPath}`)
  return token.hex
}

module.exports = { colorHex, cssColorToHex, oklchToHex, readColorTokens }
