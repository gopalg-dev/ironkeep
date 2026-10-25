import { mkdir, readFile, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { z } from 'zod'

import { colorHex } from './css-tokens'

/** Promote only the selected Blender empty states and embed them in the matching canvas boards. */
const ASSETS = 'assets/illustrations/empty-states'
const CANVAS = 'docs/design/canvas-source'
const subjects = [
  { id: 'lifts', board: 'StatsLiftsEmpty', title: 'Stats: lifts (empty)', small: false },
  { id: 'body', board: 'StatsBodyEmpty', title: 'Stats: body (empty)', small: true },
  { id: 'report', board: 'ReportEmpty', title: 'Report (empty)', small: false },
] as const
const plainEmpty =
  /<div style="display: flex; flex-direction: column; align-items: center; gap: 20px; padding: (?:48px|16px) 24px"><div class="sec" style="text-align: center">([^<]+)<\/div><\/div>/
const illustratedEmpty = /<!-- empty-state-art:start -->[\s\S]*?<!-- empty-state-art:end -->/
const styles = `<style data-empty-state-art>
.empty-state-art{display:flex;flex-direction:column;align-items:center;gap:16px;padding:56px 24px 40px}
.empty-state-art.small{padding:20px 0 8px}
.empty-state-art img{width:152px;height:152px;object-fit:contain}
.empty-state-art.small img{width:128px;height:128px}
.empty-state-art .art-dark,.screen.dark .empty-state-art .art-light{display:none}
.screen.dark .empty-state-art .art-dark{display:block}
</style>`

const canvasSchema = z
  .object({
    boards: z.record(z.string(), z.object({ h: z.number(), y: z.number() }).passthrough()),
    order: z.array(z.string()),
  })
  .passthrough()
const canvas = canvasSchema.parse(JSON.parse(await readFile(`${CANVAS}/canvas.json`, 'utf8')))
const newRow = Math.max(...Object.values(canvas.boards).map((board) => board.h + board.y)) + 120
await mkdir(ASSETS, { recursive: true })

async function artwork(id: string, small: boolean, line: string, marker = 'empty-state-art') {
  const sources = new Map<string, string>()
  for (const scheme of ['light', 'dark']) {
    const name = `${scheme}-${id}.webp`
    await sharp(`docs/design/illustrations/renders/${scheme}-${id}.png`)
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(`${ASSETS}/${name}`)
    sources.set(scheme, `data:image/webp;base64,${(await readFile(`${ASSETS}/${name}`)).toString('base64')}`)
  }
  const size = small ? 128 : 152
  return `<!-- ${marker}:start -->
    <div class="empty-state-art${small ? ' small' : ''}">
      <img class="art-light" src="${sources.get('light')}" alt="" aria-hidden="true" width="${size}" height="${size}">
      <img class="art-dark" src="${sources.get('dark')}" alt="" aria-hidden="true" width="${size}" height="${size}">
      <div class="sec" style="text-align: center">${line}</div>
    </div><!-- ${marker}:end -->`
}

for (const [index, subject] of subjects.entries()) {
  const file = `${CANVAS}/${subject.board}.dc.html`
  let html = await readFile(file, 'utf8')
  const previous = illustratedEmpty.exec(html)
  const plain = plainEmpty.exec(html)
  const line = previous
    ? /<div class="sec" style="text-align: center">([^<]+)<\/div>/.exec(previous[0])?.[1]
    : plain?.[1]
  if (!line) throw new Error(`Cannot find the empty-state line in ${file}`)
  const markup = await artwork(subject.id, subject.small, line)
  html = html.replace(previous ? illustratedEmpty : plainEmpty, markup)
  if (subject.id === 'body') {
    const measurements = /<!-- measurements-empty-art:start -->[\s\S]*?<!-- measurements-empty-art:end -->/
    const plainMeasurements = '<div class="sec mt12">Nothing logged yet.</div>'
    if (!measurements.test(html) && !html.includes(plainMeasurements)) {
      throw new Error('Cannot find the Measurements empty state')
    }
    html = html.replace(
      measurements.test(html) ? measurements : plainMeasurements,
      await artwork('measurements', true, 'Nothing logged yet.', 'measurements-empty-art'),
    )
  }
  if (html.includes('<style data-empty-state-art>')) {
    html = html.replace(/<style data-empty-state-art>[\s\S]*?<\/style>/, styles)
  } else {
    html = html.replace('</head>', `${styles}\n</head>`)
  }
  await writeFile(file, html)
  const darkName = `Dark${subject.board}.dc.html`
  const dark = html
    .replace('<div class="screen ', '<div class="screen dark ')
    .replace('<div class="screen"', '<div class="screen dark"')
    .replace(`<title>${subject.title}</title>`, `<title>Dark: ${subject.title}</title>`)
    .replace(/body\{margin:0;background:[^}]+\}/, `body{margin:0;background:${colorHex('dark', 'background')}}`)
  await writeFile(`${CANVAS}/${darkName}`, dark)
  canvas.boards[darkName] ??= {
    h: canvas.boards[`${subject.board}.dc.html`]?.h ?? 844,
    y: newRow,
    x: index * 470,
    w: 390,
    radius: 40,
    title: `Dark: ${subject.title}`,
  }
  if (!canvas.order.includes(darkName)) canvas.order.push(darkName)
}
await writeFile(`${CANVAS}/canvas.json`, `${JSON.stringify(canvas, null, 1)}\n`)
console.log('Promoted eight Blender WebPs and updated the three empty-state boards in both themes.')
