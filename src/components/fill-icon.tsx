import type { LucideIcon, LucideProps } from 'lucide-react-native'
import { withUniwind } from 'uniwind'

type FillIconProps = LucideProps & { as: LucideIcon }

function FillIconImpl({ as: IconComponent, ...props }: FillIconProps) {
  return <IconComponent {...props} />
}

/**
 * A Lucide icon whose inside is painted: `fillClassName` takes the token in its `accent-` form
 * (`accent-primary`, `accent-day-legs`), as the SVG parts in `svg-tokens.ts` do. The shadcn `Icon`
 * maps only size and colour from `className`, so a `fill-` class on it paints nothing.
 */
export const FillIcon = withUniwind(FillIconImpl, {
  size: { fromClassName: 'className', styleProperty: 'width' },
  color: { fromClassName: 'className', styleProperty: 'color' },
  fill: { fromClassName: 'fillClassName', styleProperty: 'accentColor' },
})
