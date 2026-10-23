import Svg, { Path, Rect } from 'react-native-svg'
import { withUniwind } from 'uniwind'

// Colours come in through the `accent-` prefix, so the mark follows the theme.
const TokenRect = withUniwind(Rect, { fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' } })
const TokenPath = withUniwind(Path, { fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' } })

/** The Ironkeep mark: a plate-and-bar glyph on an ink tile. A placeholder until the custom logo is chosen. */
export function AppMark({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" accessibilityRole="image" accessibilityLabel="Ironkeep">
      <TokenRect x={6} y={6} width={60} height={60} rx={18} fillClassName="accent-foreground" />
      <TokenPath d="M22 46V26h6v20zM44 46V26h6v20zM28 33h16v6H28z" fillClassName="accent-background" />
    </Svg>
  )
}
