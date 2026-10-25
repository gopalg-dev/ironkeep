# Ironkeep

A personal gym logbook for Android, built for a phone between sets: see the next session, log a set
in two taps, and read stats drawn only from what you logged. Your data stays on the phone. No account,
no internet, no ads.

Ironkeep is the offline port of a web logbook (Plates). It keeps the same training logic and adds a
local database, backups and restore, so the whole record lives on your device.

## What it does

- **Today** — the next session, each lift with last time's sets, and a two-tap set logger with a rest
  timer. A focus (Zen) mode shows one set at a time.
- **Plan** — your split and its days, lifts reordered by drag, swap or edit a lift, or import a plan
  from a spreadsheet.
- **Stats** — lifts by trend with a weekly chart, a month calendar of sessions, and bodyweight and
  tape logs. Fix or add a past session from the calendar.
- **Report** — a week or month at a glance, with a share card.
- **Library** — every exercise with pictures and cues.
- **Your data** — export and import (JSON, Excel, CSV), email a backup, save to a folder, automatic
  snapshots, and restore. A backup is the whole database, so moving to a new phone is one restore.

It never pushes you. No streak guilt, no "sessions left", no "do it now". It shows the facts and
leaves every decision to you.

## Built with

- [Expo](https://expo.dev) 58 and React Native 0.88 (new architecture), [Expo Router](https://docs.expo.dev/router/introduction/)
- [Uniwind](https://www.uniwind.dev) + Tailwind 4 and [react-native-reusables](https://reactnativereusables.com) for the UI
- [Drizzle ORM](https://orm.drizzle.team) over [expo-sqlite](https://docs.expo.dev/versions/latest/sdk/sqlite/) for local storage
- Biome, TypeScript (strict), Jest, and [Maestro](https://maestro.dev) for end-to-end flows
- Fonts: Barlow and Barlow Condensed (OFL). Exercise pictures and cues from
  [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense).

## Status

Pre-1.0 (`0.1.0`). The app is built and runs on-device; release hardening (keystore, store listing,
CI) and a couple of native extras are still open. `CHECKLIST.md` holds the live status and the test
counts.

## Run it

Needs [Bun](https://bun.sh), the Android SDK, and a device or emulator.

```sh
bun install
bun run start        # Metro, then open on a device with the dev client
```

A release APK is built per ABI:

```sh
bunx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease
bun run release:check   # checks the release APK (no INTERNET permission, size)
```

Before any change is called done, the check must be clean:

```sh
bun run check           # Expo Doctor + TypeScript + Biome + colour/contrast checks
bun run test            # Jest unit suites
```

## Docs

The project is documented in `docs/` (start with `docs/README.md`): the requirements, the design
brief, the research behind each choice, the engineering standards, and the decisions log. The design
of every screen lives on a canvas kept in sync with the code.

## License

[MIT](LICENSE).
