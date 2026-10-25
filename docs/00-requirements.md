# Ironkeep: requirements

Status: **signed off on 2026-10-21** (draft 1 plus the name and all twelve recommendations in
section 11). This file is the contract for the design and the build. Changes go through
`decisions.md`.

Inputs: `01-web-app-inventory.md` (what the web app does today), `research/stack.md` and
`research/offline-data.md` (what the platform offers in October 2026).

---

## 1. Goal

Ironkeep is the Plates web app on a phone, with no account and no server. The same features as the
web app, a new modern and minimalist look, and one new promise: **the user's data is theirs and can
never be lost by us.**

Why this exists:
- The web app needs internet to save a set. A gym often has none.
- Sign-in with Google scares people off. They wonder what happens to a year of logs if the site goes away.

So the mobile app:
1. Works 100% offline. Every feature, always. No network permission is needed at all.
2. Has no sign-in. Open the app, answer the setup questions, start.
3. Keeps all data on the phone, in one SQLite file, and survives every app update.
4. Lets the user export everything (JSON, CSV, Excel), email it to themselves, save it to a folder, and import it back on a fresh install so the whole history is there again.

## 2. Non-goals (for version 1)

- No sync between devices. No cloud. No accounts. (A file export is the way to move data.)
- No iOS build yet. The code stays iOS-ready (Expo), but version 1 ships as an Android APK on GitHub Releases. Play Store comes later, and needs Google's developer verification (global in 2027).
- No push notifications, no reminders that fire on their own. The app only speaks when it is open.
- No tablet or landscape layout. Portrait phone only. (Expo Router can add it later.)
- No public web pages (how it works, demo, privacy, sitemap). Those stay on the web app.

## 3. The two rules that carry over

From the web app's CLAUDE.md, unchanged:
1. **The app never pushes decisions.** It shows stats, reports, targets and the plan. No streak guilt, no "sessions left", no "skipped this week", no "do it now". Every decision and customisation is the user's.
2. **No explanatory copy.** No page subtitles, no "tap X to" hints. Only data, controls, and warnings that state a consequence. The Guide is the one screen allowed to explain.

Plus one new rule for the mobile app:
3. **No prescriptions.** No rest timer that counts down, no "aim for", no "do this". A stopwatch that shows time since the last set is a fact and allowed. The plan's rep range is shown as data. (Restated by the user on 2026-10-21.)
4. **The user's data is sacred.** Every write is a transaction. Nothing destructive happens without a typed confirmation. Export is always one tap away. Updates never touch the data.

## 4. Platform and stack

Decisions from `research/stack.md` and `research/offline-data.md`. Each has a fallback in case the first choice breaks during the scaffold spike.

| Area                 | Decision                                                                                                                                                  | Fallback                               | Why                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Runtime              | Expo SDK 58 (React Native 0.88, React 19.3), New Architecture, dev builds not Expo Go                                                                     | SDK 57                                 | Current release. Six days old on research day, so the first task is a one-day spike to confirm every library below runs on it |
| Package manager      | bun (`bun.lock`; EAS picks it up)                                                                                                                         | none                                   | Same as the web repo                                                                                                          |
| Navigation           | expo-router (file routes in `src/app/`), native bottom tabs                                                                                               | JS tabs from expo-router               | Expo's recommendation for new apps                                                                                            |
| Components           | react-native-reusables (shadcn names, `cn()`, CSS variables, copy-into-repo CLI)                                                                          | gluestack v5                           | The only kit with the shadcn mental model the web code already uses                                                           |
| Styling              | Tailwind v4 through Uniwind (free MIT tier) with the reusables Uniwind registry                                                                           | NativeWind 4.2.7 (Tailwind v3)         | Keeps the web repo's Tailwind v4 `global.css` shape. NativeWind v5 is still an RC marked "not for production"                 |
| Icons                | lucide-react-native via the reusables `Icon` wrapper                                                                                                      | none                                   | Same icon set as the web app                                                                                                  |
| Fonts                | Barlow and Barlow Condensed embedded with the expo-font config plugin; `fontVariant: ['tabular-nums']` on numbers                                         | none                                   | Same type as the web app                                                                                                      |
| Charts               | react-native-svg, hand-drawn: one line, the last point labelled, a tap picks the nearest point (section 8b: no Skia, no Reanimated, for size and battery) | react-native-gifted-charts             | The charts are simple and the native size of Skia is not worth it                                                             |
| Database             | expo-sqlite + Drizzle ORM, `useLiveQuery` for reads, bundled SQL migrations run at startup, WAL mode                                                      | none                                   | Expo's own pick; runs in dev builds and the New Architecture                                                                  |
| Transient UI state   | Zustand only for what is not in the DB (open sheet, active set editor)                                                                                    | React state                            | SQLite is the single source of truth                                                                                          |
| Spreadsheets         | SheetJS 0.20.3 (from the SheetJS CDN, same as the web repo)                                                                                               | CSV only                               | Same parser and writer as the web app                                                                                         |
| Files and sharing    | expo-file-system (new `File` / `Directory` / `Paths` API), expo-sharing, expo-document-picker, expo-mail-composer                                         | legacy file-system API for SAF helpers | All first-party Expo modules                                                                                                  |
| Lint and types       | Biome 2.6 (React + React Native + Test domains), TypeScript strict, `@/` -> `src/`                                                                        | eslint-config-expo                     | Same `bun run check` habit as the web repo                                                                                    |
| Unit tests           | jest-expo 58 + Testing Library for React Native                                                                                                           | none                                   | The pure logic tests port straight from vitest                                                                                |
| E2E                  | Maestro flows on the Android emulator, with per-screen screenshots                                                                                        | Detox                                  | Expo's recommendation                                                                                                         |
| Build                | EAS `preview` profile with `buildType: apk`; local `expo prebuild` + `gradlew assembleRelease` also documented                                            | none                                   | APK on GitHub Releases                                                                                                        |
| Updates over the air | Off (`updates.enabled: false`)                                                                                                                            | none                                   | No server, nothing to fetch                                                                                                   |

## 5. What comes over from the web app

Every screen below keeps its information, controls, copy rules and behaviour from the web app, as
recorded in `01-web-app-inventory.md`. The look is new: modern and minimalist, decided in the design
gate (`02-design-brief.md`) and signed off before the build. The plumbing changes too: server
functions become local repository functions over SQLite.

### 5.1 Screens kept as they are

| Screen                | Notes for the port                                                                                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Setup (5 steps)       | Same steps. Gains one extra choice on step 0: "Restore from a file" (section 6.4). Every row in this table keeps the screen's content and behaviour; the look follows the design brief                                                              |
| Today: next up        | Same: date, day icon and name, streak, alerts deck, weigh-in and tape reminders, the day's lifts, Start, Pick another day, Skip or done                                                                                                             |
| Today: active workout | Same: timer with pause, session menu (change session, discard), accordion of exercise rows, set logger with plate steps, reps-left, add / remove set, +1 set to plan, swap lift, finish check-in, summary, zen mode. Keep-awake via expo-keep-awake |
| Plan                  | Same: day accordion, day menu, weekday select, drag to reorder (a native sortable list), exercise editor, add day, bring your own plan, reset to the original plan                                                                                  |
| Plan import           | Same parser, same template download, same editable preview. File comes from the document picker instead of an `<input>`                                                                                                                             |
| Stats: Lifts          | Same chart, table, trend chips, recent bests                                                                                                                                                                                                        |
| Stats: Sessions       | Same week block, calendar, session editor, log a past day, body map, exports (section 6.1)                                                                                                                                                          |
| Stats: Body           | Same bodyweight and tape charts and dialogs                                                                                                                                                                                                         |
| Report                | Same week and month report. Share card is captured as a 1080 by 1350 PNG with react-native-view-shot and passed to expo-sharing. The card says "Your week" instead of "<name>'s week"                                                               |
| Library               | Same list, filters, detail with two pictures and cues. Pictures bundled (section 7.4)                                                                                                                                                               |
| Settings              | Same sections minus the account ones, plus a new Data section (section 6)                                                                                                                                                                           |
| Guide                 | Same ten sections, written as plain React Native screens instead of MDX. Lowest priority of the kept screens                                                                                                                                        |
| Looks                 | All ten looks, kept on the device. Element backdrops drawn with Skia or dropped (open point 11.6)                                                                                                                                                   |

Navigation: bottom tabs Today / Plan / Stats like the phone web app. The web app's side menu
(Report, Library, Guide, Settings, Look) becomes a menu button in the header that opens a sheet with
the same items.

### 5.2 Dropped (account, server or web only)

Login, sign-up, magic links, password forms, the account section, delete account, the privacy page,
the feedback form and its after-session prompt, the install dialog and service worker, how-it-works,
the demo pages, robots and sitemap, content seeding from a database, page skeletons and hydration
guards.

### 5.3 Pure logic copied as is

The 21 files in `src/lib/logic/` plus `types.ts`, `splits.ts`, `day-blocks.ts`, `library.ts`,
`content.ts`, `format.ts`, `seed-plan.ts`, `must.ts`, the set-completion helpers from
`exercise-row.tsx`, `regionPaint` from `body-map.tsx`, and the day colour families from
`day-mark.tsx`. Their vitest tests come along as Jest tests. The `feedback.ts` module is dropped.

The server orchestration in `repo.ts` (start, finish, discard, skip, sync, swap, ramp, pause,
past-session logging, body logs one per day, start fresh) is rewritten as a local repository over
Drizzle with the same function names and the same repo tests.

## 6. New: data safety

This is the reason the app exists. It has to be perfect.

### 6.1 Export

Lives in Settings under a new **Data** section, and the Excel and CSV buttons stay on Stats >
Sessions where the web app has them.

Formats:

| Format                | File                               | Content                                                                                                                         | Lossless?                                       |
| --------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| JSON backup           | `ironkeep-backup-YYYY-MM-DD.json`  | Everything: settings, every plan slot, every workout (done and in progress), weigh-ins, tape, the look. Envelope in section 7.3 | Yes. This is the canonical format               |
| Excel, Log layout     | `ironkeep-logs-YYYY-MM-DD.xlsx`    | Sheets Sets, Bodyweight, Measurements, same columns as the web app                                                              | Yes for done sets (time, effort, note included) |
| CSV, Log layout       | `ironkeep-logs-YYYY-MM-DD.csv`     | The Sets sheet                                                                                                                  | Sets only                                       |
| Excel, Tracker layout | `ironkeep-tracker-YYYY-MM-DD.xlsx` | One sheet per plan day, same columns as the web app                                                                             | Loses start time and set order of weights       |
| Plan template         | `ironkeep-template-<split>.xlsx`   | The plan, as today                                                                                                              | Yes                                             |

Every export writes the file to the app cache, then opens the Android share sheet. From there the
user picks Gmail, Drive, Files, Nearby Share, anything. Two extra buttons next to Share:
- **Email to me.** Opens the phone's mail app with the file attached and the To field filled with the address saved in Settings (optional field, stored only on the phone). Uses expo-mail-composer; hidden when no mail app is available. Android reports "sent" even when the user cancels, so the app never claims the mail went out.
- **Save to folder.** Writes the file straight into a folder the user picked once (Storage Access Framework). The permission survives restarts and updates. Files in that folder survive an uninstall.

### 6.2 Import

Settings > Data > **Import**, and the same "Restore from a file" on the first setup step.

Accepted files and what they fill:

| File                     | Fills                     | Rule                                                                                                                                                                                               |
| ------------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JSON backup              | Everything                | Full restore. On a fresh install it replaces everything. On an app with data it asks: Replace all, or Merge (keep both, dedupe by id)                                                              |
| Excel or CSV, Log layout | Workouts, weigh-ins, tape | Rows grouped by Date + Time + Day into one workout each; sets in order; effort and note on the workout. Weigh-ins and tape from their sheets. One log per day: a later row replaces an earlier one |
| Excel, Tracker layout    | Workouts, weigh-ins, tape | One row per lift per session; weights split on " / "; time unknown, so the session is stamped at noon. Sheets named after days become `dayName`, type guessed like the plan importer does          |
| Plan template            | The plan only             | Already exists, unchanged                                                                                                                                                                          |

Every import shows a preview before anything is written: how many sessions, sets, weigh-ins and
tape entries were found, the date range, the rows it could not read (with the row number and the
reason, like the plan importer), and whether each session is new or already there. Then one button:
**Import N sessions**. The write is one transaction: all or nothing.

Dedupe: a workout is the same when its id matches (JSON), or when the finish day, start time, day
name and the set list are identical (spreadsheets). The same workout imported twice does nothing.

Exercise names from a spreadsheet are matched to the library by name (same `findLibraryByName`)
so the lift gets its equipment and plate steps. Unknown names stay as typed and work as plain lifts.

**Moving to another phone** (user, 2026-10-21): on the old phone, Settings > Data > Export the JSON
backup (or Email to me, or Save to folder); on the new phone, the first screen's **Restore from a
file**. Everything carries over: settings and the answers to setup, the plan of every split ever
used, every session finished and the one in progress, weigh-ins and tape, the look and the saved
mail address. The new phone continues exactly where the old one stopped: Today shows the same next
day, targets and history. This is the first Maestro flow of section 3.3 (install, log, export, wipe,
restore, compare).

### 6.3 Automatic snapshots (no permissions, no nagging)

- When the app comes to the foreground and the newest snapshot is older than 7 days, it writes `ironkeep-backup-YYYY-MM-DD.json` into the app's own documents folder (`backups/`). Keeps the last 8, deletes older ones. Takes milliseconds.
- If the user has picked a folder (6.1), the same snapshot is also written there. That copy survives an uninstall.
- Settings shows one quiet line: "Last backup: 3 days ago, in Downloads/Plates". No prompt, no badge, no modal.
- Snapshots are listed under Settings > Data > Restore, so the user can roll back to any of them.

### 6.4 First launch

The first setup step offers two paths: **Start fresh** (the five questions) or **Restore from a
file**. Restore opens the file picker, runs the import preview, and lands the user on Today with
everything in place. Setup is skipped because the backup holds the settings.

### 6.5 Updates never erase data

Rules, written into README and CONTRIBUTING:
- One `applicationId` for life. It can never change.
- One release keystore for life, kept out of git. Releases signed with the debug keystore are forbidden by a check in the release script.
- `versionCode` goes up by one on every release. `versionName` follows semver.
- Schema changes ship as Drizzle migrations, generated and committed. Migrations run at startup inside a transaction before the first screen renders. A failed migration shows a screen with Export (the raw DB file) and Retry, never a wipe.
- Every export carries `schemaVersion` so an older backup can be upgraded on import.
- People who build the APK themselves get their own keystore. The README tells them to export first, because Android will not install their build over the released one.

### 6.6 Destructive actions

Start fresh (type `start fresh`), Delete all data (type `delete everything`, offered only after an
export in the same session or a typed acknowledgement that there is none), and Replace all on
import. Each one is a dialog with the consequence stated and the export button inside it.

## 7. Data

### 7.1 Storage

One SQLite file `ironkeep.db` in the app's private storage, WAL mode. Tables:

| Table          | Holds                                                                  | Key                |
| -------------- | ---------------------------------------------------------------------- | ------------------ |
| `settings`     | one row, the `Settings` object as columns                              | fixed id           |
| `plans`        | one row per split slot: `split`, `days` (JSON), `updatedAt`            | `split`            |
| `workouts`     | one row per session, the entries as JSON                               | `id` (uuid)        |
| `bodyweights`  | `id`, `date`, `day`, `weight`                                          | `id`, unique `day` |
| `measurements` | `id`, `date`, `day`, `arm`, `chest`, `waist`                           | `id`, unique `day` |
| `prefs`        | device things: look, mail address, backup folder URI, last backup time | key                |

Entries and days stay as JSON columns on purpose: the web app's logic takes whole `Workout` and
`Plan` objects, and the row counts are small (a hard lifter logs about 300 sessions a year).
Indexes on `workouts(status, finishedAt)` and `workouts(dayId)`.

Splits and the exercise library stay bundled in the app (no `splits` / `library` tables): no server
means no content editing without a release.

### 7.2 Ids and time

- Every row gets a uuid v4 at creation, on the phone. Ids are stable across export and import.
- Timestamps are ISO strings in UTC, like the web app. The local calendar day (`day`, YYYY-MM-DD) is computed on the phone and stored next to it for body logs, like the web app.

### 7.3 JSON backup format (version 1)

```json
{
  "app": "ironkeep",
  "format": "ironkeep-backup",
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "2026-10-21T10:15:00.000Z",
  "settings": { "...": "Settings" },
  "plans": [{ "split": "ppl6", "days": [], "updatedAt": "..." }],
  "workouts": [{ "...": "Workout" }],
  "bodyweights": [],
  "measurements": [],
  "prefs": { "theme": "system" }
}
```

A backup from the web app's zip (`everything.json`) is also accepted: it is recognised by its
`exportedAt` + `settings` + `workouts` keys and treated as schema version 0. This is the migration
path for existing web users (open point 11.5).

### 7.4 Bundled content

- The 157-exercise library and its 314 pictures ship inside the APK. The pictures are converted once to WebP at 480px (about 4 MB in total instead of about 20 MB of JPEGs) by a script in `scripts/`, and the source and licence (free-exercise-db, Unlicense) stay credited on the Library screen.
- The nine split templates and the day blocks ship as TypeScript, as in the web repo.

## 8. UX rules for the port

- A modern, minimalist phone look (user request, 2026-10-21): generous space, few lines, numbers as the hero, one accent, native feel. The design brief in `02-design-brief.md` is the source of truth for tokens and components; the web app's phone layout is the reference for what goes on each screen, not for how it looks.
- Bottom sheets stay bottom sheets. Dialogs stay centred dialogs. Nothing becomes a full page that was a sheet.
- Every tap target at least 44pt. Press feedback on every row and button.
- Dark mode follows the device unless a look is chosen. The Look setting offers **System** as a choice of its own (user request, 2026-10-21): the app reads Android's system theme and switches between its light and dark look live when the phone switches, with no restart. System is the default on a fresh install.
- No animation on screen load. Motion answers taps only.
- Keyboard: number fields open the numeric pad, the done button on the keyboard moves to the next set.
- Back button on Android closes the open sheet or dialog first, then goes back.

## 8b. Battery and size (user rule, 2026-10-21)

The app must be light on the battery and tiny on disk. Rules:
- No background work at all: no background tasks, no scheduled jobs, no push, no location, no sensors. The snapshot runs only when the app is in the foreground. The keep-awake lock is held only while a session is open and released on leave.
- Zero network: no analytics, no crash reporting that phones home, no font or picture downloads, no update checks (`updates.enabled: false`). The app never asks for the internet permission.
- No animation that runs on its own. Motion answers taps only and stops at once. Respect Reduce Motion.
- Stopwatches tick once a second at most, only while the screen that shows them is visible, and pause in the background.
- Database reads are small and indexed; the Today screen loads in one query per table; charts get at most a few hundred points.
- Release builds ship with Hermes, R8 with resource shrinking, per-ABI APKs (arm64-v8a as the main one), only the font weights in use (five: 400 to 800, about 470 KB), and pictures as WebP sized for the screen. No Skia, no Reanimated worklets, no native modules that are not needed; charts are drawn with react-native-svg (a line, a dot and a label), which replaces victory-native in the stack table.
- Release APK size is reported without a hard limit (user, 2026-10-24: removed the 30 MB release gate). Native libraries remain stored uncompressed. Other targets remain: install size under 35 MB, cold start under 1.5 s on the Pixel 6a, no wake locks outside a session, zero bytes of network in a 24-hour run.

## 9. Quality bar

- `bun run check` = `tsc --noEmit && biome ci .` with zero errors, warnings and infos. Same rule as the web repo. Runs on every PR.
- Unit tests (beside the file they test): every ported logic test, every repo test (against an in-memory SQLite), and tests for the new import / export round trips: export JSON then import it on an empty DB gives the same rows; export Log xlsx then import it gives the same done sets; Tracker xlsx round trip gives the same sets and weights.
- E2E (Maestro): one flow per web e2e test that still applies (setup, log a workout, plan edit, import a plan, stats, body logs, report, library, settings, start fresh) plus the new flows: export each format, email, save to folder, import each format, restore on first launch, snapshot rollback, and an upgrade test (install build N, log data, install build N+1 over it, data still there).
- Screenshots: every screen in light and dark at 360x800 (the most common Android size) and 412x915, kept under `e2e/screenshots/`, reviewed by eye before a release.
- Accessibility: every control has a label; TalkBack can run through setup and a workout.
- Size and battery: the targets in section 8b, checked on every release.

## 10. Process and repository

Three gates, in order. Nothing skips a gate.
1. **Requirements** (this file) revised until the user says it is right.
2. **Design**: a design brief (direction, tokens, type, components) and a design artifact with every screen in light and dark, at phone size. Each screen is screenshotted and checked for misalignment, clipped text, wrong tokens, and off-rule copy, until every screen is clean. Then sign-off.
3. **Build**: feature by feature in the order of `CHECKLIST.md`. Each feature is checked off only with its tests green and its screens re-screenshotted against the design.

Repository layout (from `research/stack.md`, section 2):

```
workout_plan_v4/
  src/
    app/                 routes only (expo-router)
    features/            one folder per domain: setup, today, workout, plan, stats, report, library, settings, data
    components/ui/       react-native-reusables components, as published
    components/          shared app components (day tile, number stepper, icon button, ...)
    theme/               theme registry (name, light or dark), navigation theme, fonts
    lib/                 pure logic and types, copied from the web app; tests beside each file
    db/                  schema, client, migrations runner, repository
    hooks/  stores/      shared hooks, zustand stores
    content/             splits, day blocks, library json, guide text
    global.css           every colour token, one @variant per theme
  assets/                fonts, icon, splash, library pictures
  drizzle/               generated migrations (committed)
  .maestro/              e2e flows
  e2e/screenshots/       screen captures, reviewed before a release
  scripts/               picture conversion, colour check, release checks
  docs/                  requirements, inventory, research, design, engineering, decisions
```

Imports flow shared -> features -> app, never feature to feature. CLAUDE.md and AGENTS.md carry the
same rules as the web repo (shadcn first, props before className, no custom style objects when a
Tailwind class exists, one extraction rule, check before done).

Open-source files: MIT LICENSE, README (what, screens, stack, run, test, build, your data), CONTRIBUTING (the keystore and versionCode rules, the gates), CODE_OF_CONDUCT, SECURITY, CHANGELOG from Conventional Commits, GitHub Actions for check + unit on PR and the e2e nightly.

## 11. Decided (2026-10-21)

Every point below was answered by the user on 2026-10-21 with "go with Ironkeep and all your
recommendations". The reasoning and the rejected names are in `decisions.md`.
1. **Name and id.** The app is **Ironkeep**. `applicationId` is `app.ironkeep`, the GitHub repository is `ironkeep`, the local folder stays `workout_plan_v4`.
2. **SDK.** Start on Expo SDK 58; one-day spike confirms the stack; fall back to 57 only if a library breaks.
3. **Styling.** Uniwind free tier (Tailwind v4) with the react-native-reusables Uniwind registry. NativeWind 4 is the escape hatch.
4. **Tracker import.** Kept. Sessions are stamped at noon and the preview says so.
5. **Web users.** The web zip's `everything.json` is accepted as a restore file (schema version 0). A one-click "Download backup JSON" button is a small later change in the v3 repo.
6. **Looks.** The four plain looks ship first (Slate, Latte, Lime, Dracula). The six element looks come after everything else is done.
7. **Copy.** The four lines that lean on the user are trimmed to the fact only.
8. **Guide.** Ships in 1.0, built last.
9. **Email.** Optional "my email" in Settings, stored on the phone only.
10. **Snapshots.** Every 7 days, keep 8.
11. **Minimum Android.** Expo's default (Android 7, API 24).
12. **Delete all data.** Offered, behind a typed phrase, with the export button inside the dialog.

## 12. Later (not in version 1)

iOS build and TestFlight; tablet layout; home-screen widget for the next session; Wear OS set
logging; a Play Store listing; sync between devices through the user's own cloud folder; a plate
calculator; a rest timer as a setting (the logic `restSecondsFor` already exists).
