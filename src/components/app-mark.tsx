import Svg from 'react-native-svg'

import { FOLD_MARK_PATH } from '@/components/app-mark-path'
import { TokenPath, TokenRect } from '@/components/svg-tokens'

/** Fold: an open logbook and lifting weights, sharing one silhouette. */
export function AppMark({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 72 72" aria-hidden>
      <TokenRect x={6} y={6} width={60} height={60} rx={18} fillClassName="accent-foreground" />
      <TokenPath
        d={FOLD_MARK_PATH}
        transform="translate(12.6 12.6) scale(0.1828125)"
        fillClassName="accent-background"
      />
    </Svg>
  )
}
