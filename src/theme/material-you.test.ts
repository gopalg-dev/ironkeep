import { describe, expect, it } from '@jest/globals'
import type { SystemPalettes } from '../../modules/system-colors'
import { MATERIAL_TOKENS, materialTokens } from './material-you'

const TONES = [0, 10, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]

/** A fake phone: every tone of every palette named after itself, so a mapping reads back as its source. */
const phone: SystemPalettes = Object.fromEntries(
  (['accent1', 'accent2', 'accent3', 'neutral1', 'neutral2'] as const).map((p) => [
    p,
    Object.fromEntries(TONES.map((t) => [String(t), `${p}-${t}`])),
  ]),
) as unknown as SystemPalettes

describe('the phone colours on our tokens', () => {
  it('reads the Material roles at their tones, light and dark', () => {
    const light = materialTokens(phone, 'light')
    expect(light['--color-primary']).toBe(phone.accent1['600'])
    expect(light['--color-primary-foreground']).toBe(phone.accent1['0'])
    expect(light['--color-background']).toBe(phone.neutral1['10'])
    expect(light['--color-card']).toBe(phone.neutral1['0'])
    expect(light['--color-muted-foreground']).toBe(phone.neutral2['700'])
    expect(light['--color-border']).toBe(phone.neutral2['100'])
    const dark = materialTokens(phone, 'dark')
    expect(dark['--color-primary']).toBe(phone.accent1['200'])
    expect(dark['--color-background']).toBe(phone.neutral1['900'])
    expect(dark['--color-card']).toBe(phone.neutral1['800'])
    expect(dark['--color-foreground']).toBe(phone.neutral1['100'])
  })

  it('covers the same tokens in both schemes and leaves the meaning colours alone', () => {
    expect(Object.keys(materialTokens(phone, 'light'))).toEqual(MATERIAL_TOKENS)
    expect(Object.keys(materialTokens(phone, 'dark'))).toEqual(MATERIAL_TOKENS)
    for (const t of MATERIAL_TOKENS) expect(t).not.toMatch(/day|success|destructive|scrim/)
  })

  it('skips a tone the phone did not publish', () => {
    const partial = { ...phone, accent1: { '600': 'the-only-tone' } }
    const light = materialTokens(partial, 'light')
    expect(light['--color-primary']).toBe('the-only-tone')
    expect(light['--color-primary-foreground']).toBeUndefined()
  })
})
