# Workout widget prototype verification

2026-10-25. The compact-widget fixes are verified; this is still a prototype, not
completion of all release gates.

## Current sample installation

`app.ironkeep.widgetpreview` / **IronKeep Widget Preview** is installed separately
on the physical Pixel 6a. Its locally generated sample contains three leg-curl
sets at 25 kg x 15, two push-up sets and two timed planks. After the user removed
the earlier Debug and Preview apps, only the sample preview was reinstalled with
permission. The production app and its workout database were not read, copied,
exported, reset or modified. Later APK updates preserved the sample data.

The sample was placed below Niagara's clock. The user then switched to Pixel Launcher and showed the minimum-height slot; the final card adjustment targets that observed blank band. Pixel Launcher on the API 35
emulator was used for repeatable interaction, sizing and orientation tests.
The standalone debug APK bundles JavaScript and disables developer support; it
works without Metro. Temporary build overrides were restored after the build.

## Size and alignment fixes

- Default placement is 4 x 1 cells, with 80 dp default height and a 48 dp minimum
  resize height. The previous 80 dp resize minimum could require a second row in
  landscape. A transparent background alone did not release the launcher slot.
- Pixel Launcher actually allocated one row: `[67,542][1013,815]`, approximately
  360 x 104 dp at density 420. Two rows measured 224 dp high and showed every
  control at normal font size. Expanding to three rows and shrinking back to one
  succeeded. Launcher grid allocation remains launcher-controlled.
- Full controls need 250 x 220 dp at normal font size. A compact title/detail card
  starts at 80 dp and a title-only strip fits 48 dp. Large fonts increase the
  compact/full thresholds. Undersized slots open the app instead of clipping edits.
- Long titles previously squeezed the compact detail line even at 100% text.
  Single-line ellipsis plus a font-aware compact threshold fixes that. Full text
  remains available to accessibility services through the TextView's text.
- Live font changes previously enlarged cached launcher text without changing its
  layout threshold. Text sizes are now resolved with the same configuration as
  the thresholds. An event callback refreshes live widgets on font changes. When
  Android has stopped or suspended the process, cached text can retain its prior
  size until the next widget/app event; it cannot grow into an incompatible layout.
  There is no polling, recurring task or resident service.
- The text arrow sat below the button's visual center. It is now a centered 24 dp
  vector inside a 48 dp ImageButton. Its position does not depend on font metrics.
- At the launcher's minimum one-row slot, the compact surface fills the row and
  vertically centers its content. This passes the 420 dpi native regression and the physical Pixel Launcher check after unlock. Taller
  idle slots still use content-sized cards. This does not change the launcher grid.
- The picker previews the actual compact card. The earlier separate decorative
  200 dp preview was removed. Idle/completed cards paint only their content.

## Passing checks

- `bun run check`: Expo Doctor 20/20, both TypeScript projects, Biome, colour and
  contrast checks. Jest: **309 tests in 36 suites**.
- Native Robolectric: **26 tests**, comprising 15 transaction/rule tests and 11
  widget tests. Native font measurement covers 96 compact/strip combinations:
  four states, four widths (180/250/360/412 dp), three scales (1/1.3/2), two layouts.
  Full controls additionally cover both themes, weighted/bodyweight/timed exercises,
  long names, 999.5 lb, 120 reps, 300 seconds and double-digit set counts.
- Geometry checks verify control bounds, complete labels, 48 dp targets, transparent
  idle roots, cached views after a font change, and exact icon centering in both
  compact layouts at 100%/200% text. The fill/reapply test runs at the phone's 420 dpi:
  Android's negative MATCH_PARENT/WRAP_CONTENT constants must use PX units, not DIP.
  The first fill attempt scaled those constants and failed on the phone despite
  passing at standard density. The corrected build and all 26 tests pass.
- Both ARM64 and x86_64 sample APKs build. The native suite is included in CI's
  Android preflight. No production widget library or runtime dependency was added.
- Both Maestro flows pass on the font-safe build. `session-widget.yaml` covers
  25 -> 27.5 -> 25 kg, 15 -> 16 -> 15 reps, + Set, disabled paused controls,
  Resume and exactly one completed set. `session-widget-finish.yaml` covers
  bodyweight edits, timed 30 -> 35 -> 30 seconds, automatic exercise advancement,
  all eight sets completed, and Open session returning to the app. Notification
  permission was denied. The later icon-only change has native geometry coverage.
- Both sample processes were killed; tapping Done restarted only the native
  controls process and advanced exactly one set. The app process remained absent.
  Prior synthetic-emulator database integrity and unchanged-plan checks also passed.
  No physical-phone database was exported for these checks.
- Active and idle screenshots at 360/412 dp in light/dark were reviewed. Saving the
  synthetic workout through the normal app review changed the widget to idle.
- A live 200% font transition uses the compact layout when the slot is too small;
  expanding restores full controls with every bottom button visible. A font change
  after both processes were killed preserves a safe cached layout.
- Real Pixel Launcher rotation was enabled and verified (hierarchy rotation 1).
  Expanded portrait controls become a compact landscape card. A one-row landscape
  slot selects the 48 dp strip. Returning to portrait and resizing restores the
  appropriate layout. This is API 35 coverage, not every Android/launcher version.
- Physical Niagara placement shows the compact card and nearby favorites without
  the earlier large panel. Its picker shows the complete card and open button.
  Physical control edits, pause/resume and completion passed in the earlier sample.

Test screenshots are Git-ignored under `e2e/screenshots/session-widget/`; additional
sample captures and Maestro output are in the OS temporary directory. Maintained
light/dark design references in `docs/design/screens/` are intentionally tracked.

## Final physical check

The density-corrected build was checked after unlocking the phone. Pixel Launcher
shows the compact card filling the minimum row at the user's narrowed width, with
the vector arrow centered in its button. The launcher's one-row allocation itself
is unchanged; the fix removes an internal blank band, not a launcher grid row.
## Remaining release gates

- Oldest supported Android, TalkBack, simultaneous widget instances and other
  launchers. Large text is covered above, but not every device/font combination.
- Reboot, interrupted migration, restore/delete data, failure recovery, and a final
  release APK/permission/size-delta audit. Updating the debug sample is not release
  upgrade certification. Force-stop is distinct from ordinary process death.
- Long-session resource use and manual lift/cursor selection. The current widget
  consistently targets the first unfinished set; + Set changes only this session.
- Shared-canvas publication. Local boards and references are updated. Automatic
  approval review previously rejected the external artifact edit without explicit
  approval; publication remains pending and was not retried during this pass.

Do not mark the full widget release complete from this evidence.
