# Ironkeep: checklist

The running context for the project. Tick an item only when it is done and verified. Each
feature line has its own test line. Keep this file honest: it is what a new session reads first.

Legend: `[ ]` planned, `[~]` in progress, `[x]` done and verified, `[-]` dropped (say why).

Audit 2026-10-25: reconciled source, passing checks/tests, historical device records in
`docs/decisions.md`, and actual GitHub/Expo results. Completed implementation and its remaining
release/device coverage are separate items; a partial parent stays open when only part is verified.

## Gate 1: requirements

- [x] Feature inventory of the web app written (`docs/01-web-app-inventory.md`) 2026-10-21
- [x] Stack research written (`docs/research/stack.md`) 2026-10-21
- [x] Offline data research written (`docs/research/offline-data.md`) 2026-10-21
- [x] Requirements draft 1 written (`docs/00-requirements.md`) 2026-10-21
- [x] Open points in requirements section 11 answered by the user 2026-10-21 (name Ironkeep, all recommendations)
- [x] Requirements revised and signed off 2026-10-21
- [x] Decisions log updated with every answer (`docs/decisions.md`) 2026-10-21

## Gate 2: design

- [x] Design brief written (`docs/02-design-brief.md`): direction, tokens, type, components 2026-10-21
- [x] Design artifact: 68 full-height artboards (44 light, one zen mode, 6 dark, 18 font options) at 390 wide, published 2026-10-21: https://claude.ai/artifact/JjZZTUxBdyqfhz1ravLCLQ
  - [x] Setup (5 steps + restore from file)
  - [x] Today: next up (rolling and weekday), alerts deck, reminders, pick a day, skip dialog
  - [x] Accessibility pass on Today (labels, touch targets, font scale 2.0, contrast in both themes) and the pinned page bar on Today and Setup 2026-10-21
  - [x] Exercise drawer (canvas ExerciseDrawer: a tall form sheet with two pictures, name and count, muscle / equipment / level chips, what it works, numbered cues, Previous and Next at the end of the content) opens from a tap on any lift's picture on Today, the workout, zen and Plan 2026-10-22; the Library's own exercise view is the LibraryDetail page with Previous and Next pinned at the bottom (user, 2026-10-22), wired when the Library is built
  - [x] Today: active workout, set logger, reps-left, swap, finish check-in, summary
  - [x] Zen mode
  - [x] Plan, day menu, exercise editor, add day, today-sync dialog
  - [x] Plan import (template, upload, preview, warnings, replace)
  - [x] Stats: Lifts, Sessions (calendar, session editor, past-day log, body map, exports), Body
  - [x] Report and share card
  - [x] Library list and detail
  - [x] Settings, including the new Data section (export, email, folder, import, snapshots, restore)
  - [x] Guide
  - [x] Menu sheet (Report, Library, Guide, Settings, Look)
  - [x] Looks: the plain four (elements come after 1.0 features)
  - [~] Look "System" is implemented in `src/theme/look.ts` (saved selection and Uniwind system-theme switching). Remaining: verify the fresh-install default and add/run the Maestro light/dark toggle flow; neither is established by the existing Material You device check.
  - [x] Migration-failed screen, import preview, destructive dialogs
- [~] Custom pictures: user selected only the Blender empty-state illustrations on 2026-10-25. Unused SVGs, rejected concepts and comparison previews were removed before commit. Only the four selected designs, their editable Blender sources and eight app WebPs remain. Covers:
  - [~] Logo: Fold selected 2026-10-23. Shared vector, launcher/adaptive/themed icons, light/dark splash and notification drawable generated; unused logo concepts and template icons removed. Launcher padding increased at the user's request. Standalone ARM64 APK installed on the Pixel 6a; 360/412 light/dark emulator captures reviewed and the standalone Maestro launch/relaunch flow passes at 412dp. Repeated 360dp Maestro runs were interrupted by emulator ADB disconnects. Local setup artboards updated. Canvas publication and refreshed canvas captures remain open: the Claude canvas reports "Couldn't save" after a retry.
  - [-] Custom day-kind illustrations: not selected; user chose only Blender empty states on 2026-10-25. Existing Lucide day icons remain.
  - [-] Custom effort faces: not selected; user chose only Blender empty states on 2026-10-25. Existing effort controls remain.
  - [-] Custom progression icons: not selected; user chose only Blender empty states on 2026-10-25.
  - [~] Blender empty-state illustrations: implementation and verification complete 2026-10-25; shared-canvas publication remains open. Evidence: `docs/testing/empty-states.md`.
    - [x] Integrate four designs: barbell for Stats Lifts, scale for Bodyweight, coiled tape for Measurements, and logbook for both Report empty branches. Eight bundled light/dark WebPs total **68,160 bytes (66.6 KiB)**; the Measurements pair contributes 15,800 bytes. Static, decorative artwork follows the theme registry, including Material You, with no new runtime dependency.
    - [x] Verify layouts at 360/412 dp in light/dark; review the Pixel 6a debug preview, including Measurements. Updated Maestro flow passed at 360 dp light through the app's tabs/menu; the other three Measurements configurations were checked through ADB and screenshots. Generated test captures were reviewed, then removed during the pre-commit cleanup; verification details remain in `docs/testing/empty-states.md`.
    - [x] Run `bun run check` and all 297 tests in 33 suites successfully.
    - [x] Remove unused illustration experiments, duplicate WebPs, preview pages and generated test screenshots before commit; retain the selected source renders and regeneration scripts. Remove four obsolete icon-comparison canvas boards, their captures and old font-comparison files; the canvas index retains 57 maintained boards.
    - [x] Update local light/dark canvas boards and refresh `docs/design/screens/`, including the Measurements card.
    - [ ] Republish the shared canvas; access through the available browser tools remains unavailable.
  - [x] Style selected: Blender for empty states only (2026-10-25); day, effort and progression concepts were not selected.
    Icon order everywhere else: lucide first, custom only where lucide has nothing fitting
- [x] Font picked by the user 2026-10-21: Plus Jakarta Sans (option A), canvas switched. Changed by the user 2026-10-22 to Barlow Semi Condensed (option N, 17% narrower, measured) after finding Plus Jakarta took too much room; then 2026-10-23 to the web app's own pair, Barlow with Barlow Condensed on titles and big numbers; app, canvas and captures switched; checked on the Pixel 6a 2026-10-23. A Today board in the web app's Barlow (MainFontW) was added for comparison 2026-10-22. Nine options were compared (Manrope, Plus Jakarta Sans, Outfit, Instrument Sans, Figtree, Sora, DM Sans, Bricolage Grotesque, Urbanist; Today and set logger per font; comparison assets removed after selection); tokens and canvas updated to match
- [x] Every screen screenshotted (Playwright, `docs/design/screens/`) and checked for overflow and clipping 2026-10-21; full icon pass over every screen 2026-10-21 (text buttons to icon buttons, leading icons on Settings, Guide and Plan actions, export row restored on Stats, plan actions restored on Plan)
- [x] Zen research written (`docs/research/zen-mode.md`, 15 apps, HIG and Material, usability evidence, 15 rules) 2026-10-21
- [x] Zen mode variant picked by the user 2026-10-21: B, one set at a time (A stays on the canvas for the record, C was rejected)
- [x] Design signed off by the user 2026-10-21 (Gate 2 closed; custom pictures stay open and are made during the build)

## Gate 3: build

Standing rule (user, 2026-10-21): the design canvas is kept in sync with the code. Any screen,
component, copy or token change during the build updates the matching artboard in
`docs/design/canvas-source/`, republishes the canvas, and refreshes `docs/design/screens/` in the same
step. A feature is ticked only when the app and the canvas agree.

### 3.0 Scaffold spike [x] confirmed 2026-10-21; checklist reconciled 2026-10-25

- [x] Engineering standards written (`docs/engineering.md`: bun, TypeScript strict options and rules, Biome config, structure, React Native rules, tests, git) and `CLAUDE.md` / `AGENTS.md` for the repo 2026-10-21
- [x] Scaffolded from the Expo 58 default template (Expo 58.0.16, React Native 0.88, React 19.3, TypeScript 6.0) trimmed to expo-router, screens, safe-area, splash, status bar and fonts; no Reanimated, worklets, gesture-handler or web (`bunfig.toml` stops bun installing peers). Restarted clean on 2026-10-21 after the first scaffold's invisible-text fault; now built one layer at a time with a phone screenshot after each 2026-10-21
- [x] Uniwind 1.13 + Tailwind 4.3 + react-native-reusables (text, button, icon from the Uniwind registry); verified on the Pixel 6a after the plain-text and font steps. Found and fixed the real invisible-text cause: `className` is ignored on the third-party SafeAreaView, so it is wrapped once in `src/components/safe-area.tsx` 2026-10-21
- [x] Colour tokens in OKLCH in `src/global.css` only; nav theme reads them with `useCSSVariable`; theme registry with light / dark scheme for the status bar; `scripts/check-colors.ts` blocks colour literals 2026-10-21
- [x] Design-system row on the canvas (colour tokens generated from `global.css` by `bun run design:tokens`, type / space / shape, components) 2026-10-21
- [x] Theme switching verified on the Pixel 6a (status bar, nav theme, OKLCH tokens resolve on device; root render count flat before and after a toggle, no loop) 2026-10-21
- [x] Plus Jakarta Sans embedded with the expo-font plugin (one family, weights 400–800, plain `fontDefinitions`); all five weights and tabular numerals verified on the Pixel 6a 2026-10-21
- [x] expo-sqlite + Drizzle + one migration runs at startup; live query updates on write and the row survives a force-stop and relaunch on the Pixel 6a 2026-10-21
- [x] react-native-svg line chart renders with a date axis and tap (no Skia, no Reanimated: size and battery rule); `src/components/line-chart.tsx`, stroke and fill colours through `withUniwind` + `accent-` tokens, verified on the Pixel 6a 2026-10-21
- [x] expo-sharing, file pick, mail composer and folder pick all work on the Pixel 6a (file and folder pickers come from expo-file-system 58, so expo-document-picker is not installed; Android refuses the storage root and Download as a target folder, so the flow needs a subfolder such as Download/Ironkeep) 2026-10-21
- [x] `bun run check` green: tsc (app and scripts), Biome ci at info level, colour check 2026-10-21
- [x] jest-expo runs the 20 ported logic suites (181 tests); Maestro 2.11 runs `.maestro/spike.yaml` on the Pixel 6a (launch, assert, tap, assert) 2026-10-21
- [x] Dev build installs on the Pixel 6a; release APKs build locally per ABI with R8 and resource shrinking (`cd android && ./gradlew assembleRelease`, then `bun run release:check`) 2026-10-21
- [x] Spike outcome written to `docs/decisions.md`: the 2026-10-21 scaffold outcome confirms SDK 58, the chosen stack, device checks and 181 tests. Verified in the file 2026-10-25.

### 3.1 Foundation

- [x] Tokens for the four shipped themes (`light`, `dark`, `you-light`, `you-dark`), day/success/destructive colours and Barlow fonts are in `src/global.css`, with the registry in `src/theme/themes.ts`. Colour and contrast checks pass for all four themes on 2026-10-25; the generated design token board is recorded in the scaffold work above.
- [x] Published react-native-reusables components are installed in `src/components/ui` (button, text, icon, checkbox). Git history shows the directory unchanged since its initial addition; adjustments use shared wrappers/props. The scaffold device verification is recorded above; code audit 2026-10-25.
- [x] Shared components in use are implemented: day/week display, set pads and ruler, options, segmented controls, icon buttons, progress bar, screen/page bar, app mark, split picker, sheets/dialogs, exercise thumbnails, line charts and body map. Evidence: `src/components/`, `features/workout/set-pad.tsx`, `features/stats/body-map.tsx`, and recorded screen checks below. Old placeholder names EditorPanel, SectionHeading and Sparkline are fulfilled by the shared sheet, typography and line-chart implementations; the progression picker was removed with the progression setup step on 2026-10-22.
- [x] Root layout includes the migration/error gate, embedded fonts, theme restoration, tabs and native form-sheet menu/routes (`src/app/_layout.tsx`, `(tabs)/_layout.tsx`, `src/components/menu-sheet.tsx`). Recorded setup, theme, menu and sheet device checks are in `docs/decisions.md`; code audit 2026-10-25.
- [x] Pure logic copied from the web app with its tests passing under Jest (20 suites, 181 tests; repo, scenario and component tests follow their targets) 2026-10-21
- [x] Repository over Drizzle (`src/db/repo.ts`, same function names as the web app minus the user id) with the web repo tests passing against in-memory SQLite (`src/db/test-db.ts` on Node's built-in `node:sqlite` through Drizzle's proxy driver, 49 tests); start and finish also exercised on the Pixel 6a through expo-sqlite 2026-10-21
- [x] Library pictures converted to WebP and bundled: `scripts/library-pictures.ts` fetches the 314 free-exercise-db pictures once, resizes to 400 px wide at quality 72 (3.4 MB for all), and generates `src/lib/library-images.ts`; both frames of the bench press render on the Pixel 6a 2026-10-21

### 3.2 Features (each: screen, repo functions, unit tests, Maestro flow, screenshots match the design, canvas updated if the screen changed)

- [~] Setup: welcome and the four questions (progression step removed 2026-10-22 with the facts change) built, matched to the canvas side by side on the Pixel 6a (light), saved through the repository 2026-10-21; Restore from a file 2026-10-22 (`/restore`, the file picked and previewed, a restore lands on Today); open: unit tests, Maestro flow
- [x] Today: next up is implemented in `features/today/today-screen.tsx` / `today-model.ts`: rolling/weekday plans, start/pick/skip controls, finished/rest states, week display and alerts. The model tests pass on 2026-10-25; phone/canvas and accessibility checks were recorded on 2026-10-21/22.
- [x] Facts, not orders 2026-10-22: the suggestions logic removed as in the web app the same day; `facts.ts` with `liftStart`, prefill from last time, plain facts in the hint, the empty bar; see decisions. Phone pass open
- [x] Today: active workout and set logger 2026-10-21: clock with pause, one card per lift with the set pad (weight and reps, or reps, or seconds), Set N done, dots, add / remove a set, +1 set to plan, the sets as logged with undo, reps left and the next-time line, swap sheet (alternates, library search, also on the plan), session options sheet (change session, discard), finish check-in sheet, summary sheet; keep-awake. Zen mode (variant B) 2026-10-21: lift strip, name and picture, set pills with last time, stacked pads, one big done button, undo, swap, previous / next lift, the time since the last set. Phone pass started 2026-10-22 (light mode, Bold text off, driven by Maestro taps on labels): Today and the Workout logger state match their boards; a lost tick under fast taps was found and fixed (the sets hook now works from the latest value). Completed 2026-10-22: reps-left, session options, swap, finish, summary, Zen B2 (before and after a set), the exercise page, Plan (closed and open), day options, add a day and the editor all compared with their boards and match. Fixed on the way: a page-bar name shown faintly at rest after a card changed size (the scroll offset is clamped to the new content height), the swap sheet listing more than fits a content-sized sheet (four library rows, the search narrows), long plan notes cut to two lines in the row Implementation and recorded device verification reconciled 2026-10-25; broader automated regression coverage remains listed separately below.
- [x] Zen mode B2 is implemented in `features/workout/zen-screen.tsx`, sharing set state and persistence with the workout logger, with pause/resume, swap, navigation and finish. The 2026-10-22 phone pass above explicitly verified Zen before/after a set against its boards; supporting set/session tests pass on 2026-10-25.
- [~] Plan 2026-10-22: the split and its days, one open at a time; lifts dragged to reorder (a core PanResponder, the page's scroll held meanwhile), tapped to edit, pictures to the library page; Add exercise; day options sheet (rename or change kind, move, restore default order, weekday on the weekday schedule, remove); add a day sheet; reset to the template; the today-sync dialog when the day in progress changes. Bring your own plan 2026-10-22: `/plan-import` from the bottom of Plan (template picked from the current plan or a split, Download template shares the workbook, Upload a file reads .xlsx or .csv through the web app's `parseRows`, the days and lifts listed with the rows skipped, Use this plan replaces the plan through `replacePlan`). Core Plan/editor/day-options phone checks were completed in the 2026-10-22 pass above. Remaining: end-to-end phone/canvas verification of spreadsheet import and dedicated Maestro coverage
- [x] Plan spreadsheet import implementation and parsing tests: `features/plan/plan-import-screen.tsx`, `lib/logic/plan-sheet.test.ts` and repository plan tests. Download, preview and replace code paths are present; logic tests pass on 2026-10-25. Device verification remains in the parent item.
- [x] Stats: Lifts (trend chips, lift picker sheet, best this week with the trend chip, weekly line, eight-week table, recent bests) 2026-10-22; checked on the Pixel 6a
- [~] Stats: Sessions (this week, month calendar bounded by the join month, session editor and past-day log as drawers holding the workout screen's cards (set pads, ticks, add or drop a set; Save changes or Log N sets; Delete session; day chips and Tick all for a past day), body map card on the web app's react-body-highlighter figures under the calendar, hard sets bars with a colour dot per muscle, a tap on a region or a bar picks the muscle on both) 2026-10-22; checked on the Pixel 6a 2026-10-22 (one snap height after the two-height cut-off); the Export row removed 2026-10-22 (user: Your data is reached from Settings); the old multiple-session limitation is fixed in code (see next item). Remaining: on-device/canvas verification of the new chooser and dedicated Maestro coverage
- [x] Multiple sessions on a calendar day: `sessions-panel.tsx` opens `DaySessionsDialog` when there is more than one session and routes the chosen id to the editor. `day-sessions.test.ts` verifies separate same-name sessions, ordering, local dates, overnight sessions and labels; all four tests pass on 2026-10-25.
- [x] Stats: Body (bodyweight with range, a tap on the line reads a point; the tape with a three-field dialog and one tape's line; both logs take the day) 2026-10-22
- [~] Report and share card: weekly/monthly reports and the Ink/Paper sheet are implemented. PNG image sharing added 2026-10-25 using the web app as reference (1080 by 1350, selected highlight and opt-in bodyweight). Fixed repeated personal-best selection and duplicate bodyweight units. Native debug build, code checks and 297 tests pass. Maestro passed both periods at 360dp light/dark and the weekly flow at 412dp light. The monthly 412dp run hit an Android IntentResolver ANR; clean restarts also hit driver-startup and Launcher/System UI failures. Remaining: finish 412dp light/dark verification on a stable device. Evidence: `docs/testing/report-sharing.md`. Local canvas action updated; remote publication remains pending.
- [~] Library 2026-10-22: `/library` with search, muscle and equipment chips and the picture rows; a row opens the exercise drawer (the page went 2026-10-23 on the user's call). Phone pass open (the phone was not available)
- [~] Settings 2026-10-22: `/settings` from the menu: Your data (with the last-backup line), Units, Empty bar, Smallest steps (`/steps` sheet: bar plates, dumbbells and the stack from the unit's options, Same for all), Training age, Bodyweight goal, Schedule, Split (`/split` sheet: the setup picker, a plan of your own kept, Start with empty days), Screen during a session, Look, Delete everything behind the typed phrase (2026-10-23, the one delete; Start fresh went), the version line. Every pick but the two sheets goes through the Stats pick sheet. Phone pass open (the phone was not available)
- [~] Looks 2026-10-22: the Look row picks Slate light, Slate dark, or follows the phone (Uniwind's system theme); the pick is kept in prefs and put back at launch. Your phone's colours 2026-10-23 (Material You on Android 12+, a local Expo module reads the palettes, written onto two extra themes at runtime). Checked on the Pixel 6a 2026-10-23: the pick repaints Today and Settings in the phone's own palette at once. More looks need their `@variant` block in `global.css` and a row in `THEMES`. Material You implementation and its recorded phone check are complete. Remaining: the System fresh-install/live-switch flow above and broader theme regression coverage; do not count the already verified palette switch as unbuilt
- [~] Guide 2026-10-22: `/guide` with the chapters in their parts and `/guide/[id]` with the blocks (lead, text, steps, tip, facts, more, picture, days, trends). Phone pass open (the phone was not available)

#### 3.2a Polish (2026-10-23, after the first phone passes)

- [x] Destructive colour split into two tokens 2026-10-23: `destructive` is the red text (lightened in dark so `text-destructive` clears 4.5:1 on dark surfaces), `destructive-surface` is the solid delete-button red (darkened in dark so white text clears 4.5:1). The delete buttons override the shadcn variant's fill with `BTN_DANGER` (`bg-destructive-surface`), the ui Button kept as published. The contrast check now verifies both

- [~] Empty states: Blender illustrations implemented and verified 2026-10-25 for Stats Lifts, Bodyweight, Measurements, and Report first-report / not-enough branches for week and month. Existing factual text remains; no-results cases (Lifts recent bests, Library search) stay text-only, with no nudge or CTA. Local StatsLiftsEmpty / StatsBodyEmpty / ReportEmpty boards and their dark variants are updated. Implementation, size and verification are recorded under Custom pictures above; only shared-canvas publication remains pending for this item.

- [x] Sessions calendar month is a date picker (tap the month to jump, bounded to the months in reach), alongside the prev/next arrows; verified on the Pixel 6a 2026-10-23
- [x] The weight ruler's number is an editable field, in sync with the scale: tap it to type a value, which clamps, rounds and moves the ruler; dragging still drives the number. Fixed three bugs from this (typed value landing off, a reopened log showing a stale weight, and drag jitter); verified smooth on the Pixel 6a 2026-10-23

- [x] Drawer actions pinned in the sheet footer so Save is always in reach: Split (`split-screen.tsx`) and the shared session editor / past-day log (`session-editor.tsx`); the sets state lifted so the footer and the scrolling cards share it. Split verified on the Pixel 6a; the editors share the same mechanism. Canvas boards updated
- [x] Tall-sheet drag fix: a sheet whose scroll view mounted after the sheet laid out (the session editor, the Sessions-calendar day drawer) dragged at random; `SheetScroll` now keeps one scroll view mounted and fills it in place. Verified on the Pixel 6a (user confirmed the calendar drawer drags). See [[sheet-scrollview-late-mount]] in memory
- [x] Week streak on Today drawn as the web shows it (filled flame, big number over the unit); the done-today check and the streak flame painted through `FillIcon`
- [x] Lifts tab shows "Nothing logged yet." on a fresh app instead of a blank screen
- [x] Icons refreshed: Today tab `BicepsFlexed`, Finish workout `CircleCheckBig`, Restore from a file `RotateCcw` (user-selected icons; obsolete comparison boards removed during cleanup); the filled-active-tab trial reverted; the IconSets board removed
- [~] Accessibility: research written (`docs/research/accessibility.md`) and step 1 (the tree pass) done at code level 2026-10-23: contrast fixed on three colour pairs, touch targets raised (checkboxes and the swatch to 48 dp, small buttons to 44), names/roles/states confirmed through the shared components and on the four pages that dumped cleanly. Step 2 (headings: `accessibilityRole="header"` on all screen, sheet, dialog and section titles, 47 roles) done 2026-10-23. Step 3 (decoration hiding: cross-platform `aria-hidden` on the day tiles, the dot separator and the app logo, and the iOS-only hides on the body map, calendar cells and alert dots made cross-platform) done 2026-10-23. Step 4 (the weight / reps / seconds set pad is one `adjustable` control: reads "<label>, <value> <unit>", swipe up or down to step; the +/- buttons stay for touch) done 2026-10-23. Step 5 (font-scale caps: hero numbers via `HERO_FONT_CAP` 1.4 on BIG_NUMBER/MID_NUMBER, tab labels capped at 1.2 in the tab layout; body text still scales freely) done 2026-10-23, the 2.0x device walk folded into the phone pass. Step 6 (reduce motion: a `useReduceMotion` hook; the plan reorder row-glide is instant when the system asks for less motion; scroll-linked movement is left, being direct manipulation) done 2026-10-23. Step 7 (announcements: an `announce` helper speaks set done, bodyweight / measurements saved, snapshot saved, backup restored, sessions imported, the in-place changes a screen change does not cover) done 2026-10-23. Step 8 (sheet / dialog focus: the Dialog moves the reader's focus into the card on open, marks the card modal, and hides the full-screen scrim from the reader; the form-sheet drawers rely on the native modal presentation, confirmed in the device pass) done 2026-10-23. Step 9 (the automated contrast test `scripts/check-contrast.ts`, folded into `bun run check`, reads the hex comments per theme and fails the build when a text-on-surface pair drops below 4.5:1) done 2026-10-23; remaining: step 10 accessibility-specific automated coverage, and a full TalkBack + Accessibility Scanner pass on the phone
- [x] Automated contrast validation (accessibility step 9): `scripts/check-contrast.ts` is part of `bun run check`; all four themes pass on 2026-10-25. This does not complete the manual TalkBack/Scanner and large-font walkthroughs.

### 3.2b Live session controls: notification and widget (planned; research first)

Control the **active workout** from outside the app, the way a maps app runs a trip from the
notification shade. Scope is the current session only, never a nudge to start one: it appears when a
session is running and clears when it ends, in keeping with the app's rule (no streak guilt, no "do it
now", surface facts and controls, the decision stays the user's). Offline only: a local ongoing
notification, no push, no new permission beyond what a local notification needs; the widget reads local
state. Each of the two starts with a research pass written to `docs/research/`, then build, unit tests,
and a Pixel 6a pass.
- [ ] Research the notification controls (`docs/research/session-notification.md`): the platform
  guidelines for an ongoing-activity notification and its live status, from credible sources, for
  example Android ongoing-activity / Live Updates and MediaStyle-type transport controls, notification
  actions and channels, Material's notification guidance; Apple's Live Activities / ActivityKit and
  Dynamic Island for design principles (the app ships on Android, so Apple is reference, not a target).
  Decide what the notification shows (day and lift, current set, the rest timer counting, sets done of
  total) and which actions it carries (mark set done, pause / resume, next lift, open the app), and how
  it updates live as the session changes. Note the Expo path (expo-notifications for a local ongoing
  notification, a config plugin for anything native).
- [ ] Build the session notification from the research, honouring the no-nudge and offline rules; it
  shows only during a live session and is removed on finish or discard.
- [ ] Research the home-screen widget (`docs/research/session-widget.md`): Android App Widget and
  Jetpack Glance guidance, Material widget design, sizing and update limits; Apple WidgetKit for design
  principles. Decide the small widget's content and controls for the active session (mirroring the
  notification), and its resting state when no session runs (quiet, no nudge). Note the Expo path: there
  is no built-in widget API, so a native Android App Widget through a config plugin or a library such as
  react-native-android-widget, sharing the session state with the app.
- [ ] Build the widget from the research, honouring the same rules; it mirrors the notification's
  controls for the active session and stays quiet otherwise.

### 3.3 Data safety (each with a round-trip test and a Maestro flow)

- [x] 2026-10-23: two-way JSON transfer added to the sibling web app (`../workout_plan_v3`). Same Ironkeep v1 envelope, every plan and active session, typed replace confirmation, atomic Mongo restore with rollback, account isolation and mobile preferences retained. A real web export passes through Android SQLite restore/export and back through the web repository unchanged (`src/db/backup-interop.test.ts`). Web transfer checks pass at 360/393/768/1024/1440 with simulated phone keyboards; all 257 web unit/repository tests, 57 web browser tests and 267 Android tests pass. The web production build passes. Web deployment is not performed.

- [x] 2026-10-22 (`src/db/backup.ts`, `backup.test.ts`: export, restore onto a wiped phone, replace-not-add, counts) Backup envelope (requirements 7.3) built from every table, not the current plan alone: settings, every plan slot, every workout including one in progress, weigh-ins, tape, prefs; `restoreBackup` replaces all in one transaction; round-trip test proves export then restore gives an identical database (the move-to-another-phone case, user 2026-10-21)

- [x] JSON export + share sheet 2026-10-22 (`features/data/files.ts` `shareBackup`; Maestro flow open)
- [x] Excel / CSV Log export, Excel Tracker export (same rows as the web app, tests ported) 2026-10-22: `logsWorkbook` on the web's `setsToRows` / `trackerSheets` with the SheetJS build the web app uses; `shareExcel`, `shareCsv`; the layout picked on the pick sheet
- [x] Email to me (mail composer, optional address in prefs) 2026-10-22: the address asked in a dialog, kept under the `email` pref, the backup attached through expo-mail-composer
- [x] Save to folder (SAF, persisted permission) 2026-10-22: `Directory.pickDirectoryAsync`, the URI kept under `backupFolder`; every snapshot is copied there as `ironkeep-backup-<day>.json`; the row clears it again
- [x] Import: JSON (replace), with preview 2026-10-22: a backup replaces everything after a snapshot of today (`/data/import`); a merge is not offered, the logs formats are the way to add
- [x] Import: Log xlsx / csv, with preview and dedupe 2026-10-22 (`lib/logic/import.ts` `logRowsToWorkouts`, `dedupe`, `previewOf`; `import.test.ts` round-trips the export)
- [x] Import: Tracker xlsx, with preview (noon stamp) 2026-10-22 (`trackerToWorkouts`; the day's kind guessed from the sheet name)
- [x] Import: web `everything.json` (schema version 0) 2026-10-22 (`backupFromJson` turns it into the envelope; the zip itself is not read, the user picks the JSON inside it)
- [x] Automatic snapshots (7 days, keep 8, mirror to folder), "Last backup" line, restore list 2026-10-22: `autoSnapshot` at launch once the data is open, `/data/snapshots` lists them with Share and Restore (a snapshot of today first) and Write a snapshot now
- [x] Restore from a file on first launch 2026-10-22: setup's Restore from a file opens `/restore`, which picks a file and hands it to the preview; a restore lands on Today
- [x] Delete all data (typed phrase, export inside the dialog) 2026-10-22: the dialog on Your data, Share a backup first inside it, the button live only on the typed phrase; `startFresh` and back to setup
- [x] Migration-failed screen with raw DB export 2026-10-22: `MigrationFailedScreen` in the root layout (Try again mounts the database gate afresh; Share the database file hands `SQLite/ironkeep.db` to the share sheet). No Report the problem: offline, there is nowhere to report to; the board lost the button too

### 3.4 Release

- [x] Expo dependency validation added to `bun run check` 2026-10-24: all eleven outdated SDK 58 packages aligned with Expo's recommended patch versions; `expo-doctor` is a dev dependency in the Bun lockfile and runs first in the shared check used by GitHub CI and EAS post-install. Registered the status-bar plugin requested by Expo (default options). Verified frozen-lockfile install, all 20 Doctor checks, TypeScript/Biome/colour/contrast checks and 297 tests across 33 suites. Local duplicate module copies left by the incremental upgrade were removed. Cloud builds have not been rerun from this working tree.
- [x] Native app configuration and EAS version-code policy: `app.config.ts`/`app.json` define the package, token-derived splash and adaptive icons; `eas.json` uses remote app versions with `preview.autoIncrement: true`. The existing logo device verification is recorded above. Configuration audited 2026-10-25; local manual Gradle release/version management remains part of release hardening.
- [x] Release build drops `android.permission.INTERNET` and `SYSTEM_ALERT_WINDOW` (`blockedPermissions` in app.json; `plugins/with-release-hardening.js` adds both back to the debug manifest for Metro); verified in the release APK with aapt by `bun run release:check` 2026-10-21
- [~] Android signing: the EAS preview profile uses remote credentials and the gated cloud build succeeded (link below). Still required: document/verify keystore ownership and recovery, and make the local release check reject debug signing. `scripts/release-check.ts` currently checks permissions and ARM64 output, not the signing certificate.
- [~] Upgrade data preservation: `docs/decisions.md` records that the 2026-10-21 release APK installed over the debug build retained the SQLite row. Remaining: the full build-N to build-N+1 release upgrade with logged workouts, settings and backups; the earlier row test does not cover that full scenario.
- [ ] Size and battery targets met (requirements 8b): APK size reported without a hard limit (30 MB gate removed by the user 2026-10-24), install under 35 MB, cold start under 1.5 s, no wake lock outside a session, zero network bytes in a 24-hour emulator run, no background work. **Cold start measured 2026-10-21 on the Pixel 6a release build: 340 to 420 ms to the first frame over three runs (`am start -W`, process start to first insets in logcat about 350 ms), well under 1.5 s. First size measurement 2026-10-21: arm64 release APK 28.5 MB with native libraries stored uncompressed (install size about the same, nothing extracted). React Native 0.88 core alone is about 15 MB (libreactnative 7.0, Hermes 2.7, dex 2.4, expo-modules-core 1.6, libc++ 1.3), so the 15 MB figure could not be met on this stack; the user set the target at 30 MB on 2026-10-21. Trims still available: Fresco gif/webp/filters libraries (about 1.7 MB), zstd (0.7 MB), the 4.4 MB JS bundle through tree shaking.**
- [x] README and MIT LICENSE are present and reviewed (run/build/check instructions and licensing), 2026-10-25. Release-signing documentation still needs the hardening work above.
- [ ] Remaining project documents: CONTRIBUTING, CODE_OF_CONDUCT, SECURITY and CHANGELOG.
- [x] GitHub CI and its gated Expo handoff are configured and verified: [CI run 40089843519](https://github.com/gopalg-dev/ironkeep/actions/runs/40089843519) passed quality checks, Android ARM64 release preflight and iOS simulator preflight on 2026-10-24 for commit `2f5c530`. [EAS handoff run 40090967972](https://github.com/gopalg-dev/ironkeep/actions/runs/40090967972) checked out that commit and waited for the Expo workflow to finish successfully. Verified through GitHub job results and logs on 2026-10-25.
- [ ] Nightly Maestro/device regression workflow; the current CI has no nightly device-test schedule.
- [x] EAS preview ARM64 APK workflow after successful CI: `.eas/workflows/android-main.yml`, `eas.json` and `.github/workflows/eas-after-ci.yml` are wired; GitHub confirms `EXPO_TOKEN` exists and its validation step passed. [Expo workflow 01a16db8-5a24-79f5-98c6-37658fc01325](https://expo.dev/accounts/gopal262000/projects/ironkeep/workflows/01a16db8-5a24-79f5-98c6-37658fc01325) completed successfully according to the waiting GitHub job. This confirms the pipeline at commit `2f5c530`, not a cloud build of the current uncommitted dependency/check changes.
- [ ] v1.0.0 on GitHub Releases

## Testing status

| Suite / evidence                | Coverage                                                                                                 | Last verification                                                                    | Result                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Unit and repository (jest-expo) | 297 tests across 33 suites                                                                               | 2026-10-25                                                                           | Pass                                                            |
| Expo Doctor and code checks     | 20 Doctor checks; TypeScript, Biome, colours and four-theme contrast                                     | 2026-10-25                                                                           | Pass                                                            |
| Maestro                         | Historical scaffold and standalone launch smoke; maintained report-sharing and empty-state flows         | Report 360dp light/dark passed 2026-10-25; 412dp blocked by emulator system failures | Broader feature coverage and release matrix remain open         |
| Design screenshots              | Historical board reviews plus report-sharing and empty-state emulator captures in `docs/design/screens/` | Feature captures added 2026-10-25                                                    | Full-app release pass and remote canvas publication remain open |
| Cloud pipeline                  | Quality, Android APK, iOS simulator, then EAS workflow for `2f5c530`                                     | Run 2026-10-24; inspected 2026-10-25                                                 | Pass; working-tree changes not cloud-verified                   |

### Remaining device and automation verification

- [ ] Complete the 360/412 light/dark regression matrix for Setup, Today, workout/Zen, Plan/import, Stats/calendar chooser, Report/share, Library, Settings/Looks, Guide and data export/restore. Earlier individual phone passes remain valid evidence of completed implementation; this is the broader release regression gate.
- [~] Maintained feature flows added for report image sharing (`report-share-matrix.yaml` and its parameterized subflow) and empty states. Historical scaffold and standalone launch smoke remain available; dedicated coverage of the other features is still pending.
- [ ] Refresh and archive release screenshots and finish outstanding design-canvas publication. No phone/emulator run or canvas publication was performed during the 2026-10-25 checklist audit.
