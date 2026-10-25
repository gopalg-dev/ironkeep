# Blender empty states

Selected by the user on 2026-10-25: Blender artwork for empty states only.
Stats Lifts uses the barbell; the empty Bodyweight card uses the scale/tape; both
Report empty branches use the logbook. Measurements uses a separate coiled tape. Existing factual text and controls remain.

The eight static WebPs total 68,160 bytes after the Measurements addition. The theme registry selects light/dark
art, including Material You's corresponding scheme. Images are decorative and
excluded from accessibility; there is no animation, network loading or new dependency.

## Verification (2026-10-25)

- `bun run check`: all 20 Expo Doctor checks, both TypeScript projects, Biome,
  colour rules and four-theme contrast checks passed without diagnostics.
- `bun run test --runInBand`: 33 suites, 297 tests passed.
- `.maestro/empty-states.yaml`: passed on a disposable Pixel 6a API 35 emulator
  at 360 and 412 dp, light and dark. The flow visits Lifts, Body, and first weekly
  and monthly Report states, then returns to Today. No workouts or body data are written.
- Reviewed all three subjects at both widths and schemes. Final cold-launch
  screenshots have no clipping or developer overlays. Generated captures were reviewed and then removed during pre-commit cleanup; the maintained flow can recreate them.
- An earlier warm-theme run returned to Today during the flow and showed a
  development navigation warning. Cold-launch repetitions of all four cases passed;
  no navigation code or warning suppression was added for this artwork change.
- Both Report conditions use the same illustrated component. The device flow
  covers the first-report condition; the insufficient-sessions condition was
  checked in source, not seeded on the device.
- Six local canvas boards and canonical screenshots are updated, plus canvas
  captures at 360/412 dp. The shared Claude canvas could not be accessed through
  the available browser tools, so remote publication remains pending.

The flow is for a disposable empty installation. It never clears app data and
skips the initial weigh-in when completing fresh setup.

## Phone debug preview

A separate ARM64 `app.ironkeep.debug` installation named **IronKeep Debug** was
built and installed on the user's Pixel 6a over wireless ADB. This leaves the
installed release app and its data intact. A temporary Gradle init script sets
the debug application ID suffix/name; production configuration is unchanged.
Metro now runs on port 8097 (LAN binding for IPv4 ADB access); device port 8081 is reversed to it, and the debug app's
packager host is `localhost:8081`. Keep Metro running for live previews.

The physical-device Maestro walkthrough passed: fresh setup with the weigh-in
skipped, Stats Lifts, Stats Body, and the first weekly Report. All three dark-mode
screenshots were reviewed, then removed during pre-commit cleanup.
The debug app was left open on Report for the user to inspect.

## Measurements follow-up (2026-10-25)

Added a separate coiled measuring tape, with graduations and a metal end. Its two
WebPs add 15,800 bytes. The editable scenes are `docs/design/illustrations/empty-states.blend`;
render with `render-empty-states.py`, then run `bun scripts/design-empty-states.ts`.

The Pixel screenshot review confirmed both Body cards with the new artwork.
Reviewed the Measurements card at 360/412 dp in light/dark on the isolated emulator;
the generated test captures were subsequently removed during cleanup. The updated Maestro flow passed
at 360 dp light, including scrolling to the second empty-state line, then visiting both
Report periods. The other three configurations were checked through ADB and screenshots.
The flow now uses the app's tabs/menu, and allows 180 seconds for a cold Metro startup.

Earlier attempts encountered two Metro processes sharing port 8083 on different interfaces,
IPv6-only localhost binding, a sleeping test device, slow cold bundle loads, a transient ADB
disconnect, and a development deep-link transition back to Today. The verified run used the
dedicated IPv4-reachable port 8097, an awake disposable emulator, and normal UI navigation.
No production navigation logic or warning suppression was changed.

`bun run check` passes and all 297 tests in 33 suites pass. The Body light/dark canvas boards
and 360/412 captures are refreshed; shared canvas publication remains pending.
