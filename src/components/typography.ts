/**
 * The type roles of docs/02-design-brief.md on Tailwind's built-in scale (docs/research/type-sizes.md),
 * so every screen sets a title or a caption the same way. One family; the weight classes pick the
 * weight's own font file (see src/global.css). The canvas's ik.css carries the same numbers.
 */
/*
 * Line heights never go under the font's own line box (1.2 em for Barlow and Barlow Condensed; it was 1.26 for Plus Jakarta Sans, so every leading below still clears it): Android clips
 * every line at its box, so a tighter line cuts the descenders of y, p and g (React Native issue 49886).
 */
export const TITLE = 'text-4xl font-condensed-semibold leading-11.5 text-foreground'
export const DISPLAY = 'text-5xl font-condensed-semibold leading-tight text-foreground'
export const H2 = 'text-xl font-bold leading-7 text-foreground'
export const H3 = 'text-lg font-semibold leading-6 text-foreground'
export const BODY = 'text-base font-normal leading-6 text-foreground'
export const SECONDARY = 'text-base font-medium leading-5 text-muted-foreground'
export const CAPTION = 'text-sm font-medium leading-4.5 text-muted-foreground'

/*
 * Numbers, everywhere in the app (user rule, 2026-10-21): always tabular figures, so columns and
 * steppers do not shift; the hero and mid roles below with `tracking-tight`, never `tracking-tighter`;
 * a number inside running text takes `NUMBER` on top of its text role.
 */
export const NUMBER = 'tabular-nums'
export const BIG_NUMBER = 'text-6xl font-condensed-semibold leading-none tabular-nums text-foreground'
export const MID_NUMBER = 'text-4xl font-condensed-semibold leading-none tabular-nums text-foreground'
export const ROW_VALUE = 'text-base font-semibold leading-6 tabular-nums text-muted-foreground'

/*
 * The most a hero number may grow with the system font scale: body text scales freely for
 * accessibility, but a six- or four-xl figure at 2x would overflow its pad or tile, so the big and
 * mid number roles are capped here (step 5 of docs/research/accessibility.md).
 */
export const HERO_FONT_CAP = 1.4
