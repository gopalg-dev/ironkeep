# Accessibility: how to configure and test

Research for Ironkeep, an offline Expo / React Native app on Android (new architecture, RN 0.88).
Written 2026-10-23. Sources at the end. This is the reference we build the accessibility work from;
the apply plan is the last section.

## 1. What standard applies

Ironkeep ships on Android only, so TalkBack is the screen reader that matters and Android's own
guidance is the strictest bar we must clear. Three bodies of rules overlap:
- **WCAG 2.2, Level AA.** The text-level rules: contrast 4.5:1 for normal text, 3:1 for large text
  (18.66 px bold or 24 px plain) and for meaningful icons and borders (SC 1.4.3, 1.4.11). Target
  Size (Minimum) SC 2.5.8 asks 24 by 24 CSS px. Name, Role, Value (SC 4.1.2) asks every control to
  expose all three. Focus order (SC 2.4.3) asks reading order to follow the visual order.
- **Android's own target guidance.** Google asks for 48 by 48 dp touch targets with 8 dp between
  them. This is higher than WCAG's 24 px and is the number we hold to, since it is the platform's.
- **Material.** Run whole task flows with TalkBack on, not single screens, and leave the user's
  system font scale and motion settings in charge.

The practical bar for us: every control has a name, a role and a state; every target is 48 dp; every
text pair clears its contrast ratio; the app bends to the system font scale and reduce-motion switch;
and a person can finish a session, read their stats and change the plan with TalkBack alone.

## 2. How to configure it (React Native / Expo)

React Native maps these props onto Android's accessibility node. The exact prop list below is from
the official docs.

### Names, roles, states

- **`accessibilityLabel`** is what TalkBack speaks. On a touchable with Text children it defaults to
  that text, so set it by hand only when the visible text is missing, wrong, or split across pieces.
  Do not repeat the visible text (TalkBack says it twice), do not pass all-caps (it is read letter by
  letter), and never lean on a TextInput placeholder as the label.
- **`accessibilityRole`** tells what a control is. The values we need: `button`, `imagebutton` (an
  icon-only button), `link`, `header` (section titles), `radio` with `radiogroup`, `checkbox`,
  `switch`, `adjustable` (a stepper or slider), `image`, `text`, `tab` with `tablist`, `none` and
  `summary`. The newer `role` prop uses `heading` and takes precedence where both are set.
- **`accessibilityState`** carries the live condition: `disabled`, `selected`, `checked` (true, false
  or `'mixed'`), `busy` and `expanded`. Set `busy` while an async action runs so TalkBack says
  "busy" instead of going silent, and `expanded` on a row that opens a drawer or a section.
- **`accessibilityValue`** (`min`, `max`, `now`, or a `text` that overrides them) belongs on a
  stepper or a slider, paired with `accessibilityRole="adjustable"` and the increment / decrement
  actions, so a value reads as "8, reps" not just a plus and a minus button.
- **`accessibilityHint`** adds the result of acting ("opens the exercise") after the label. Keep it
  short; on Android it cannot be turned off, so do not overuse it.

### Grouping and hiding

- Wrap a row's pieces in a parent with **`accessible={true}`** to have TalkBack read the row as one
  stop with one label, rather than four. Our rows already do this through the shared `Row`.
- Hide decoration with **`importantForAccessibility="no-hide-descendants"`** (Android) or the
  cross-platform **`aria-hidden`** / `role="presentation"`. A day-colour tile beside a named row is
  decoration; the flame beside the streak number is decoration; both should be hidden so the label is
  not cluttered.

### Focus order, headings, announcements

- Order follows the view tree, which should follow the visual order; keep them the same and no extra
  work is needed. `experimental_accessibilityOrder` can force an order but is experimental and
  exhaustive (anything left out becomes unfocusable), so avoid it unless a screen genuinely reads out
  of order.
- Mark each screen's title and each section title with the heading role, so a TalkBack user can jump
  heading to heading instead of swiping through every line.
- For a change that is not a navigation (a toast, "Set 1 done", a snapshot written), announce it:
  `AccessibilityInfo.announceForAccessibility(msg)`, or an `accessibilityLiveRegion="polite"` on the
  element whose text changes (Android).
- When a drawer or dialog opens, move focus into it and keep focus from reaching the page behind.
  `accessibilityViewIsModal` is iOS-only, so on Android this means sending a focus event to the
  sheet's first element on open and hiding the page behind with `importantForAccessibility`.

## The visible glyph can be smaller; pad the target or add **`hitSlop`** to

reach 48. In the tree a control may read 40 dp while `hitSlop` carries the real target to 48, which is
fine. Icon-only buttons are the usual offenders.

### Contrast

Define colours as tokens (we do, in `src/global.css`, OKLCH). The ratios: 4.5:1 for body text, 3:1
for large text and for any icon or border that carries meaning. A border that is pure decoration is
exempt. Our token-contrast check already reads the hex comments and flags pairs under the bar; keep
it, and extend it to run as part of `bun run check`.

### Font scaling (dynamic type)

Leave `allowFontScaling` at its default (true) so the app honours the system font size. Do not turn
it off to protect a layout; fix the layout instead. Cap only where a very large scale would break a
hero number or a tab label, with `maxFontSizeMultiplier` (around 1.6 to 2.0) on those specific texts,
never globally. Test the whole app at the system maximum (2.0) for clipping and overlap.

### Reduce motion

Query `AccessibilityInfo.isReduceMotionEnabled()` and subscribe to `reduceMotionChanged`; when it is
on, skip or shorten animations. Ironkeep has only three `Animated` uses and no Reanimated, so this is
small, but the reorder drag and any sheet transition we add should respect it.

### Screen-reader-aware behaviour

`AccessibilityInfo.isScreenReaderEnabled()` (and the `screenReaderChanged` event) let a few spots
behave better with TalkBack on, for example not auto-advancing a timer-driven carousel, or giving a
swipe gesture a button alternative.

## 3. How to test it

Layer the checks cheap-to-dear; no single layer is enough.
1. **Static / lint.** `eslint-plugin-react-native-a11y` catches missing labels and bad roles in CI.
   Note our linter is Biome, not ESLint, and Biome's a11y rules target web DOM, not React Native, so
   this would mean adding ESLint for this one plugin or writing a small repo check. Decide in the
   plan.
2. **Unit (jest-expo + React Native Testing Library).** Prefer `getByRole` then `getByLabelText` over
   `getByTestId`; a test that asserts a control is reachable by its role and label is an accessibility
   test. Cheap to add to the suites we already run.
3. **End-to-end (Maestro).** Maestro drives through the accessibility layer, so a flow that finds
   elements by their accessibility label is itself proof those labels exist and are unique. Use a
   stable `testID` only where a label is not unique.
4. **On-device automated (Accessibility Scanner).** Google's Play-Store app scans a live screen for
   low contrast, small targets and missing labels. Install it on the Pixel 6a, walk every screen, fix
   what it flags. Pairs with, does not replace, TalkBack.
5. **On-device manual (TalkBack).** The real test. Turn it on (Settings → Accessibility → TalkBack,
   or hold both volume keys 3 s; by adb, set `enabled_accessibility_services` to
   `com.google.android.marvin.talkback/com.google.android.marvin.talkback.TalkBackService`). Then
   finish a whole task with eyes closed: start and log a session, read stats, edit the plan, restore a
   backup. Check every stop has a clear name, role and state, the order matches the screen, and
   nothing is a dead end.
6. **System-setting passes.** Font scale at 2.0 (no clipping), reduce motion on (no animation), both
   dark and light (contrast holds).

The token-contrast script covers part of step 4 before the device is even picked up, so run it in
`bun run check`.

## 4. Where Ironkeep stands, and the plan

Counted in the code today: `accessibilityLabel` in 54 files, `accessibilityRole` in 34,
`accessibilityState` in 18, `hitSlop` in 11, `accessibilityValue` in 3, one hint, four hidden
decorations. No font-scaling caps, no `AccessibilityInfo` use, no reduce-motion gating, no headings
role, no a11y lint rule, no a11y-specific unit tests, no Maestro a11y flow, no Accessibility Scanner
pass. Contrast was fixed on the core pages this week; the tree pass covered Today, Plan and Stats but
not Report, Share, Library, Guide, Settings or the sheets.

Proposed order to apply, each step small and checkable:
1. **Finish the tree pass** on the untested pages (Report, Share, Library, Guide, Settings, Your data,
   Snapshots, Import preview, the Today sheets): names, 48 dp targets, roles and states.
2. **Headings.** Give every screen title and section title the heading role.
3. **Decoration hiding.** Hide the day tiles, the streak flame and like glyphs from the tree so labels
   read clean.
4. **Steppers as adjustable.** The weight and reps steppers get `role="adjustable"`,
   `accessibilityValue` and increment / decrement actions, so the value is spoken.
5. **Font scale.** Cap the hero numbers and tab labels with `maxFontSizeMultiplier`; walk the app at
   2.0 and fix clipping.
6. **Reduce motion.** Gate the reorder drag and any sheet animation on `isReduceMotionEnabled`.
7. **Announcements.** Announce "Set done", a written snapshot, and restore completion.
8. **Sheet focus.** On a drawer or dialog open, move focus in and hide the page behind.
9. **Contrast in the check.** Fold the token-contrast script into `bun run check`.
10. **Test harness.** Add role / label unit assertions to the feature suites; write one Maestro flow
    that drives a full session by accessibility label; run Accessibility Scanner on every screen once;
    do one full TalkBack task pass on the Pixel 6a. Decide the lint question (ESLint for the one
    plugin, or a small repo script).

## Sources

- React Native, Accessibility: https://reactnative.dev/docs/accessibility
- React Native, AccessibilityInfo: https://reactnative.dev/docs/accessibilityinfo
- WCAG 2.2 (W3C Recommendation): SC 1.4.3, 1.4.11, 2.4.3, 2.5.8, 4.1.2
- Android, Touch target size: https://support.google.com/accessibility/android/answer/7101858
- Material, Accessibility: https://m2.material.io/design/usability/accessibility.html
- Maestro, accessibility testing best practices: https://maestro.dev/insights/accessibility-testing-mobile-frameworks-best-practices
- `eslint-plugin-react-native-a11y`, and React Native Testing Library query priority (getByRole, getByLabelText)
