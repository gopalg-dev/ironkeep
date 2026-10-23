import { Circle, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg'
import { withUniwind } from 'uniwind'

/*
 * SVG parts that take their colour from a token through the `accent-` prefix (`accent-primary`,
 * `accent-day-pull`), so no colour is written in a chart or a figure. `fillClassName` and
 * `strokeClassName` take the class; the plain `fill` and `stroke` props still work for "none".
 */
export const TokenPath = withUniwind(Path, {
  stroke: { fromClassName: 'strokeClassName', styleProperty: 'accentColor' },
  fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' },
})
export const TokenLine = withUniwind(Line, {
  stroke: { fromClassName: 'strokeClassName', styleProperty: 'accentColor' },
})
export const TokenCircle = withUniwind(Circle, {
  fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' },
})
export const TokenRect = withUniwind(Rect, { fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' } })
export const TokenText = withUniwind(SvgText, {
  fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' },
})
export const TokenPolygon = withUniwind(Polygon, {
  fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' },
  stroke: { fromClassName: 'strokeClassName', styleProperty: 'accentColor' },
})
