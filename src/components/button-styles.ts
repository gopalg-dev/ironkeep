/*
 * The design's three button sizes (canvas `.btn`, `.btn.sm`, `.btn.sm2`), as classes for the
 * reusables Button and its Text. The variant gives the colour: `default` is ink, `secondary` soft,
 * `secondary` + `bg-card` surface, a day colour class for the day button. No shadow: the design
 * draws none, and the reusables default would add one on Android. Heights are minimums, so a
 * large font size grows the button instead of cutting its label (`h-auto` lifts the base
 * component's fixed height).
 */
export const BTN = 'h-auto min-h-14 rounded-lg shadow-none'
export const BTN_TEXT = 'text-lg font-bold'
export const BTN_SM = 'h-auto min-h-11 rounded-md px-4 shadow-none'
export const BTN_SM_TEXT = 'text-base font-bold'
export const BTN_SM2 = 'h-auto min-h-11 rounded-sm px-3.5 shadow-none'
export const BTN_SM2_TEXT = 'text-sm font-bold'
