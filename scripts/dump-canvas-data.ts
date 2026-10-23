/** Prints the picker data the design canvas mirrors: the split templates. */
import { splitInfos } from '../src/lib/content'
import { defaultWeekdays } from '../src/lib/logic/schedule'
import { BUNDLED_SPLITS } from '../src/lib/splits'

const FAMILY: Record<string, string> = {
  push: 'p',
  chest: 'p',
  shoulders: 'p',
  pull: 'u',
  back: 'u',
  legs: 'l',
  lower: 'l',
  upper: 'm',
  full: 'm',
  arms: 'm',
  core: 'm',
}
const splits = splitInfos(BUNDLED_SPLITS).map((s) => {
  const days = BUNDLED_SPLITS.find((t) => t.id === s.id)?.days ?? []
  const weekdays = defaultWeekdays(days.length)
  const week: Record<number, string> = {}
  days.forEach((d, i) => {
    const wd = weekdays[i]
    if (wd !== undefined && week[wd] === undefined) week[wd] = FAMILY[d.type] ?? 'm'
  })
  return { id: s.id, name: s.name, days: s.days, fit: s.fit, week: [1, 2, 3, 4, 5, 6, 0].map((wd) => week[wd] ?? '') }
})
console.log(JSON.stringify({ splits }, null, 1))
