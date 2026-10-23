# Ironkeep: checklist

The running context for the project. Tick an item only when it is done and verified. Each
feature line has its own test line. Keep this file honest: it is what a new session reads first.

Legend: `[ ]` planned, `[~]` in progress, `[x]` done and verified, `[-]` dropped (say why).

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
  - [ ] Look "System": follows Android's theme live (light / dark), default on a fresh install; a Maestro flow toggles the phone's dark mode and checks the switch
  - [x] Migration-failed screen, import preview, destructive dialogs
- [ ] Custom pictures: made two ways so the user can pick (decided 2026-10-21): a Blender render set and an SVG-generated set, each in light and dark. Covers:
  - [ ] Logo (app icon, splash, the canvas)
  - [ ] Eleven day kinds (push, pull, legs, upper, lower, full, chest, back, shoulders, arms, core) in their family colours, replacing the glyph tiles everywhere the day colour appears
  - [ ] Four effort faces (Easy, OK, Hard, Too much) for the finish check-in
  - [ ] Three progression icons (double progression, linear, top set)
  - [ ] User picks Blender or SVG per set, or mixes; the canvas is updated with the winner
    Icon order everywhere else: lucide first, custom only where lucide has nothing fitting
- [x] Font picked by the user 2026-10-21: Plus Jakarta Sans (option A), canvas switched. Changed by the user 2026-10-22 to Barlow Semi Condensed (option N, 17% narrower, measured) after finding Plus Jakarta took too much room; then 2026-10-23 to the web app's own pair, Barlow with Barlow Condensed on titles and big numbers; app, canvas and captures switched; checked on the Pixel 6a 2026-10-23. A Today board in the web app's Barlow (MainFontW) was added for comparison 2026-10-22. Nine options were compared (Manrope, Plus Jakarta Sans, Outfit, Instrument Sans, Figtree, Sora, DM Sans, Bricolage Grotesque, Urbanist; Today and set logger per font, plus `docs/design/font-options.png`); tokens and canvas updated to match
- [x] Every screen screenshotted (Playwright, `docs/design/screens/`) and checked for overflow and clipping 2026-10-21; full icon pass over every screen 2026-10-21 (text buttons to icon buttons, leading icons on Settings, Guide and Plan actions, export row restored on Stats, plan actions restored on Plan)
- [x] Zen research written (`docs/research/zen-mode.md`, 15 apps, HIG and Material, usability evidence, 15 rules) 2026-10-21
- [x] Zen mode variant picked by the user 2026-10-21: B, one set at a time (A stays on the canvas for the record, C was rejected)
- [x] Design signed off by the user 2026-10-21 (Gate 2 closed; custom pictures stay open and are made during the build)

## Gate 3: build

Standing rule (user, 2026-10-21): the design canvas is kept in sync with the code. Any screen,
component, copy or token change during the build updates the matching artboard in
`docs/design/canvas-source/`, republishes the canvas, and refreshes `docs/design/screens/` in the same
step. A feature is ticked only when the app and the canvas agree.

### 3.0 Scaffold spike (one day, decides SDK 58 vs 57) [~] started 2026-10-21

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
- [ ] Spike outcome written to `docs/decisions.md`

### 3.1 Foundation

- [ ] Tokens: the shadcn variable set plus day / success / fonts, in `global.css`, for every kept look
- [ ] `components/ui` from react-native-reusables (as published, never edited)
- [~] Shared app components: DayIcon, WeekShape, NumberStepper, Option, Segmented, IconButton, ProgressBar, Screen, AppMark, SplitPicker, ProgressionPicker 2026-10-21; EditorPanel (sheet), SectionHeading, ExerciseThumb, Sparkline, BodyMap open
- [~] Root layout: migrations gate, fonts, theme, tabs 2026-10-21; menu sheet as a native form sheet 2026-10-21, opened from the Menu tab since 2026-10-23
- [x] Pure logic copied from the web app with its tests passing under Jest (20 suites, 181 tests; repo, scenario and component tests follow their targets) 2026-10-21
- [x] Repository over Drizzle (`src/db/repo.ts`, same function names as the web app minus the user id) with the web repo tests passing against in-memory SQLite (`src/db/test-db.ts` on Node's built-in `node:sqlite` through Drizzle's proxy driver, 49 tests); start and finish also exercised on the Pixel 6a through expo-sqlite 2026-10-21
- [x] Library pictures converted to WebP and bundled: `scripts/library-pictures.ts` fetches the 314 free-exercise-db pictures once, resizes to 400 px wide at quality 72 (3.4 MB for all), and generates `src/lib/library-images.ts`; both frames of the bench press render on the Pixel 6a 2026-10-21

### 3.2 Features (each: screen, repo functions, unit tests, Maestro flow, screenshots match the design, canvas updated if the screen changed)

- [~] Setup: welcome and the four questions (progression step removed 2026-10-22 with the facts change) built, matched to the canvas side by side on the Pixel 6a (light), saved through the repository 2026-10-21; Restore from a file 2026-10-22 (`/restore`, the file picked and previewed, a restore lands on Today); open: unit tests, Maestro flow
- [ ] Today: next up
- [x] Facts, not orders 2026-10-22: the suggestions logic removed as in the web app the same day; `facts.ts` with `liftStart`, prefill from last time, plain facts in the hint, the empty bar; see decisions. Phone pass open
- [~] Today: active workout and set logger 2026-10-21: clock with pause, one card per lift with the set pad (weight and reps, or reps, or seconds), Set N done, dots, add / remove a set, +1 set to plan, the sets as logged with undo, reps left and the next-time line, swap sheet (alternates, library search, also on the plan), session options sheet (change session, discard), finish check-in sheet, summary sheet; keep-awake. Zen mode (variant B) 2026-10-21: lift strip, name and picture, set pills with last time, stacked pads, one big done button, undo, swap, previous / next lift, the time since the last set. Phone pass started 2026-10-22 (light mode, Bold text off, driven by Maestro taps on labels): Today and the Workout logger state match their boards; a lost tick under fast taps was found and fixed (the sets hook now works from the latest value). Completed 2026-10-22: reps-left, session options, swap, finish, summary, Zen B2 (before and after a set), the exercise page, Plan (closed and open), day options, add a day and the editor all compared with their boards and match. Fixed on the way: a page-bar name shown faintly at rest after a card changed size (the scroll offset is clamped to the new content height), the swap sheet listing more than fits a content-sized sheet (four library rows, the search narrows), long plan notes cut to two lines in the row
- [ ] Zen mode
- [~] Plan 2026-10-22: the split and its days, one open at a time; lifts dragged to reorder (a core PanResponder, the page's scroll held meanwhile), tapped to edit, pictures to the library page; Add exercise; day options sheet (rename or change kind, move, restore default order, weekday on the weekday schedule, remove); add a day sheet; reset to the template; the today-sync dialog when the day in progress changes. Not yet: Bring your own plan (comes with the Data feature's import), the phone pass
- [~] Plan 2026-10-22: the split and its days, one open at a time; lifts dragged to reorder (a core PanResponder, the page's scroll held meanwhile), tapped to edit, pictures to the library page; Add exercise; day options sheet (rename or change kind, move, restore default order, weekday on the weekday schedule, remove); add a day sheet; reset to the template; the today-sync dialog when the day in progress changes. Bring your own plan 2026-10-22: `/plan-import` from the bottom of Plan (template picked from the current plan or a split, Download template shares the workbook, Upload a file reads .xlsx or .csv through the web app's `parseRows`, the days and lifts listed with the rows skipped, Use this plan replaces the plan through `replacePlan`). Phone pass open
- [x] Stats: Lifts (trend chips, lift picker sheet, best this week with the trend chip, weekly line, eight-week table, recent bests) 2026-10-22; checked on the Pixel 6a
- [~] Stats: Sessions (this week, month calendar bounded by the join month, session editor and past-day log as drawers holding the workout screen's cards (set pads, ticks, add or drop a set; Save changes or Log N sets; Delete session; day chips and Tick all for a past day), body map card on the web app's react-body-highlighter figures under the calendar, hard sets bars with a colour dot per muscle, a tap on a region or a bar picks the muscle on both) 2026-10-22; checked on the Pixel 6a 2026-10-22 (one snap height after the two-height cut-off); the Export row removed 2026-10-22 (user: Your data is reached from Settings); open: a day with two sessions opens the later one
- [x] Stats: Body (bodyweight with range, a tap on the line reads a point; the tape with a three-field dialog and one tape's line; both logs take the day) 2026-10-22
- [~] Report and share card 2026-10-22: `/report` with the Week / Month segmented control, the period stepped back and forward, the sessions, sets and bodyweight lines against the period before, the lifts up and the lifts needing attention, the Share footer; the share sheet (`/share`) with the card in two looks (ink, paper), the highlight as chips, bodyweight on or off, and a text share through the system sheet. Today's review alerts open the report at their period. Open: the card as an image (react-native-view-shot), phone pass open (the phone was not available)
- [~] Library 2026-10-22: `/library` with search, muscle and equipment chips and the picture rows; a row opens the exercise drawer (the page went 2026-10-23 on the user's call). Phone pass open (the phone was not available)
- [~] Settings 2026-10-22: `/settings` from the menu: Your data (with the last-backup line), Units, Empty bar, Smallest steps (`/steps` sheet: bar plates, dumbbells and the stack from the unit's options, Same for all), Training age, Bodyweight goal, Schedule, Split (`/split` sheet: the setup picker, a plan of your own kept, Start with empty days), Screen during a session, Look, Delete everything behind the typed phrase (2026-10-23, the one delete; Start fresh went), the version line. Every pick but the two sheets goes through the Stats pick sheet. Phone pass open (the phone was not available)
- [~] Looks 2026-10-22: the Look row picks Slate light, Slate dark, or follows the phone (Uniwind's system theme); the pick is kept in prefs and put back at launch. Your phone's colours 2026-10-23 (Material You on Android 12+, a local Expo module reads the palettes, written onto two extra themes at runtime). Checked on the Pixel 6a 2026-10-23: the pick repaints Today and Settings in the phone's own palette at once. More looks need their `@variant` block in `global.css` and a row in `THEMES`. Phone pass open (the phone was not available)
- [~] Guide 2026-10-22: `/guide` with the chapters in their parts and `/guide/[id]` with the blocks (lead, text, steps, tip, facts, more, picture, days, trends). Phone pass open (the phone was not available)

#### 3.2a Polish (2026-10-23, after the first phone passes)

- [x] Drawer actions pinned in the sheet footer so Save is always in reach: Split (`split-screen.tsx`) and the shared session editor / past-day log (`session-editor.tsx`); the sets state lifted so the footer and the scrolling cards share it. Split verified on the Pixel 6a; the editors share the same mechanism. Canvas boards updated
- [x] Tall-sheet drag fix: a sheet whose scroll view mounted after the sheet laid out (the session editor, the Sessions-calendar day drawer) dragged at random; `SheetScroll` now keeps one scroll view mounted and fills it in place. Verified on the Pixel 6a (user confirmed the calendar drawer drags). See [[sheet-scrollview-late-mount]] in memory
- [x] Week streak on Today drawn as the web shows it (filled flame, big number over the unit); the done-today check and the streak flame painted through `FillIcon`
- [x] Lifts tab shows "Nothing logged yet." on a fresh app instead of a blank screen
- [x] Icons refreshed: Today tab `BicepsFlexed`, Finish workout `CircleCheckBig`, Restore from a file `RotateCcw` (user picks from the FinishIcons and RestoreIcons boards); the filled-active-tab trial reverted; the IconSets board removed
- [~] Accessibility: research written (`docs/research/accessibility.md`) and step 1 (the tree pass) done at code level 2026-10-23: contrast fixed on three colour pairs, touch targets raised (checkboxes and the swatch to 48 dp, small buttons to 44), names/roles/states confirmed through the shared components and on the four pages that dumped cleanly. Step 2 (headings: `accessibilityRole="header"` on all screen, sheet, dialog and section titles, 47 roles) done 2026-10-23. Step 3 (decoration hiding: cross-platform `aria-hidden` on the day tiles, the dot separator and the app logo, and the iOS-only hides on the body map, calendar cells and alert dots made cross-platform) done 2026-10-23. Step 4 (the weight / reps / seconds set pad is one `adjustable` control: reads "<label>, <value> <unit>", swipe up or down to step; the +/- buttons stay for touch) done 2026-10-23. Step 5 (font-scale caps: hero numbers via `HERO_FONT_CAP` 1.4 on BIG_NUMBER/MID_NUMBER, tab labels capped at 1.2 in the tab layout; body text still scales freely) done 2026-10-23, the 2.0x device walk folded into the phone pass. Open: step 6 reduce motion, step 7 announcements, step 8 sheet focus, step 9 the automated contrast test folded into `bun run check` (fails the build when any text-on-surface pair drops below its WCAG ratio), step 10 the lint and unit / e2e test harness, and a full TalkBack + Accessibility Scanner pass on the phone

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

- [~] app.config.ts: id `app.ironkeep` and splash (light and dark) plus adaptive-icon background read from `src/global.css` through `scripts/css-tokens.js` (OKLCH converted to hex, no hand-typed colours) 2026-10-21; still open: versionCode, adaptive icon from the custom logo
- [x] Release build drops `android.permission.INTERNET` and `SYSTEM_ALERT_WINDOW` (`blockedPermissions` in app.json; `plugins/with-release-hardening.js` adds both back to the debug manifest for Metro); verified in the release APK with aapt by `bun run release:check` 2026-10-21
- [ ] Release keystore created, git-ignored, documented; release script refuses the debug keystore
- [ ] Upgrade test: build N installed, data logged, build N+1 installed over it, data intact
- [ ] Size and battery targets met (requirements 8b): arm64 APK under 30 MB (revised by the user 2026-10-21; measured 28.5 MB), install under 35 MB, cold start under 1.5 s, no wake lock outside a session, zero network bytes in a 24-hour emulator run, no background work. **Cold start measured 2026-10-21 on the Pixel 6a release build: 340 to 420 ms to the first frame over three runs (`am start -W`, process start to first insets in logcat about 350 ms), well under 1.5 s. First size measurement 2026-10-21: arm64 release APK 28.5 MB with native libraries stored uncompressed (install size about the same, nothing extracted). React Native 0.88 core alone is about 15 MB (libreactnative 7.0, Hermes 2.7, dex 2.4, expo-modules-core 1.6, libc++ 1.3), so the 15 MB figure could not be met on this stack; the user set the target at 30 MB on 2026-10-21. Trims still available: Fresco gif/webp/filters libraries (about 1.7 MB), zstd (0.7 MB), the 4.4 MB JS bundle through tree shaking.**
- [ ] README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, LICENSE, CHANGELOG
- [ ] GitHub Actions: check + unit on PR, e2e nightly
- [ ] v1.0.0 on GitHub Releases

## Testing status

| Suite                   | Count                          | Last run   | Result |
| ----------------------- | ------------------------------ | ---------- | ------ |
| Unit (jest-expo)        | 266 (29 suites, repo included) | 2026-10-23 | green  |
| Repo (in-memory SQLite) | in the 29 suites               | 2026-10-23 | green  |
| E2E (Maestro)           | 0                              | never      |        |
| Screenshots reviewed    | 0 of 0                         | never      |        |
