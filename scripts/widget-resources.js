const { mkdirSync, writeFileSync } = require('node:fs')
const path = require('node:path')
const { colorHex } = require('./css-tokens')

const output = process.argv[2]
if (!output) throw new Error('Supply the generated Android resources directory')
for (const scheme of ['light', 'dark']) {
  const folder = path.join(output, scheme === 'dark' ? 'values-night' : 'values')
  mkdirSync(folder, { recursive: true })
  const tokens = ['background', 'foreground', 'card', 'secondary', 'muted-foreground']
  const colors = tokens.map(
    (token) => `  <color name="widget_${token.replaceAll('-', '_')}">${colorHex(scheme, token)}</color>`,
  )
  writeFileSync(path.join(folder, 'widget_colors.xml'), `<resources>\n${colors.join('\n')}\n</resources>\n`)
}
