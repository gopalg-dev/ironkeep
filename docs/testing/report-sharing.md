# Report image sharing

The web reference is `../workout_plan_v3/src/components/app/share-report.tsx` and
`src/lib/share-card-draw.ts` in that project. Both apps share a 1080 by 1350 PNG of
the selected report. Android captures its existing Ink/Paper preview with
`react-native-view-shot` and hands the file to `expo-sharing` with `image/png`.
The surrounding sheet, controls and unselected bodyweight are outside the capture.

The Share button waits for layout, locks while capture/sharing is pending and
becomes available again after cancellation or failure. Failures show an alert.
The native temporary filename is retained so view-shot can manage its cache;
the file is not deleted as soon as the chooser closes, because another app may
still need to read it.

Each personal-best option identifies the exercise, session date and score.
Several records for one lift in a period remain independently selectable.
Bodyweight uses the already formatted value, including its unit exactly once.

## Automated checks

Run `bun run check` and `bun run test --runInBand`. The sharing tests cover weekly
and monthly PNG handoff, unavailable sharing, capture errors and retry after a
share failure. The content tests cover independently selecting repeated records,
bodyweight privacy and the highlight options.

## Android regression

Use a disposable emulator. Restore `.maestro/fixtures/report-sharing.json` using
the app's backup import. This replaces its data with synthetic workouts and
weigh-ins, so do not restore it on a personal device. The fixture's report dates
are October 12, 2026 (week) and September 2026 (month); the verification clock was
October 25, 2026. Keep the fixture dates within the app's one-year report window
when rerunning in the future.

With the app installed, restored and connected to Metro if using a debug build:

```sh
maestro --device emulator-5580 test .maestro/report-share-matrix.yaml
```

The matrix launches the app and runs `.maestro/report-share.yaml` once for each
period. The weekly fixture includes a recent weigh-in, so its checkbox is exercised on and off. The monthly fixture has no weigh-in in the final seven days of September, so its bodyweight control must be absent.

The shared flow takes its `PERIOD`, `REPORT_DATE` and `ARTIFACTS` parameters
from the matrix; it has no local defaults that could override the caller.
It checks Ink and Paper, bodyweight off/on, Nothing and a specific lift,
the native image chooser, cancellation and repeated sharing. It never chooses
a recipient or sends the image.

Run at 360 and 412 dp in light and dark. For this temporary emulator, 720 by 1600
pixels at density 320 gives 360 dp; 824 by 1832 at density 320 gives 412 dp.
The fixture selects the system-following look, so `adb shell cmd uimode night no`
and `yes` select the two schemes. Save `takeScreenshot` artifacts and inspect the
actual PNG files from the app cache: dimensions must be 1080 by 1350 and the card
must match the selected preview.

## Dependency patch

`patches/react-native-view-shot@6.1.1.patch` changes four type imports to type-only
imports. Expo resolves the package's React Native source export, and the original
imports fail this project's `verbatimModuleSyntax` check. Bun applies the tracked
patch through `patchedDependencies`; no TypeScript or lint rule is disabled.
## Verification evidence (2026-10-25)

The native x86_64 Android debug build passed with view-shot included. A frozen
Bun install applied the dependency patch successfully. Expo Doctor passed all
20 checks; TypeScript, Biome, colour/contrast checks and all 297 unit tests passed.

The regression uses a disposable Android API 35 emulator and synthetic data.
Generated screenshots were reviewed and removed during the user-requested pre-commit cleanup; the maintained Maestro flows can recreate them. Native sharing
is verified through the Android image chooser, cancellation and another share;
no recipient is selected and no image is sent.

The local ReportShare canvas source documents the image action. Remote canvas
publication remains pending because no browser was available to open the shared
canvas. This does not change the existing card layout.

| Viewport / scheme | Weekly and monthly sharing                                                     |
| ----------------- | ------------------------------------------------------------------------------ |
| 360 dp / light    | Passed, previews and native chooser reviewed                                   |
| 360 dp / dark     | Passed, previews and native chooser reviewed                                   |
| 412 dp / light    | Weekly passed; monthly blocked after Android IntentResolver stopped responding |
| 412 dp / dark     | Pending                                                                        |

The first 412 dp run displayed the PNG correctly, then the Android system's
IntentResolver raised an ANR while cancelling the monthly share. The device log
recorded CPU and memory pressure. A hardware-rendered restart subsequently failed
to display the app or start Maestro's driver. These failed attempts are not
counted as passing verification. A lower-memory software-rendered retry uses
618 by 1374 pixels at density 240, which still gives a 412 dp viewport.

`exports/360-light-week-ink.png` is an actual native export, checked as a valid
1080 by 1350 PNG (121,890 bytes), separate from the surrounding-screen captures.

The lower-memory software retry booted and installed the debug build, but Pixel
Launcher and then System UI also stopped responding before the report journey
could run. The 412 dp light/monthly and dark checks remain open; they must be
completed on a stable emulator or device before calling the full device matrix
passed. Only this task's disposable emulator and Metro server were stopped.
The 412-light screenshots are partial evidence from the first run, not evidence
of a complete passing journey. No current release or cloud build is claimed.
