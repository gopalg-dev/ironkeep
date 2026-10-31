# Active workout notification verification

2026-10-25, in progress. The release app `app.ironkeep` on the physical Pixel is untouched. All
physical-device work targets `app.ironkeep.debug`; emulator work targets the disposable port 5582.

## Automated evidence

- Final ARM64 debug build passes, including the isolated controls process and shared widget integration.
  The client is `app.ironkeep.debug` / IronKeep Debug. The emulator and build daemons were stopped
  after testing; one Metro server was restarted for the later Pixel demonstration.
- Native Robolectric suite: 14 tests pass. Covers edits/advancement, stale and replayed commands,
  finished/deleted sessions, pause accounting, weight validation, equipment steps and receipt state.
- JavaScript: 302 tests in 35 suites pass. Includes the serialized pending-write queue, startup
  database reuse, and backup exclusion of device-local control receipts added by the widget task.
- `bun run check` passes: Expo Doctor 20/20, both TypeScript projects, Biome, colour and contrast checks.
- The Android GitHub preflight now runs the native tests before building the release APK.

## Device findings

The first Pixel spike did not show a permission prompt/card. The initial prototype opened Android's
SQLite in Expo's process; its read did not see the active workout, and that disposable test workout
was absent after restart. A copied debug database returned `PRAGMA integrity_check = ok`. This was
not tested or installed in the release package.

The integration was corrected to put every native database operation in `:session_controls`.
The app requests a refresh with an explicit broadcast; it never opens Android SQLite directly.
A process-name guard enforces that boundary. Pending in-app edits take a separate file lock, and
the final write requests a refresh after releasing it. Pixel testing was interrupted by a phone call
and then loss of the wireless ADB connection. The corrected physical Pixel flow was subsequently verified below.

On the disposable API 35 emulator at 360 dp, the corrected notification appeared. Manual taps and
read-only SQLite queries confirmed reps 6 → 7, completing set 1 → set 2, and pause/resume with
persisted pause accounting. After killing only the main app process, resume and set completion
continued working in `:session_controls`. Completing all four pull-up sets advanced to Barbell Row;
20 → 25 kg was saved, followed by a completed 25 kg × 6 set. Database integrity remained `ok`.

The cold-start Finish link exposed a blank review screen. The repository now reuses the database
already opened for migrations, avoiding a stalled lazy Metro module request. The root navigator
also anchors deep links to Today beneath the review sheet. A cold-start retest opened the review,
saved the 25 kg × 6 set, showed the matching workout summary, and removed the notification. Integrity
remained `ok` and Today then showed the next workout.

Expanded weighted controls were reviewed at 360 and 412 dp in light and dark system themes, plus
font scale 2.0 at 360 dp. Controls remained visible and legible. Android takes a moment to reapply
notification text colours during a system-theme transition; settled captures were checked.

`.maestro/session-notification.yaml` passed on the API 35 emulator at 360 dp in dark mode:
increment reps to 7, complete set 1, advance to set 2, pause, resume, open Finish review, save,
show the saved summary, and verify the notification is gone. An existing disposable Push A workout
was used; first-launch setup and permission grant were skipped in this run. Absolute status-bar
gesture coordinates are deliberate: percentage-based swipes did not open the shade on the resized
emulator. Initial Bluetooth/System UI crashes, the stalled driver, and earlier failed selector runs
are not passing evidence.

The final emulator build also passed fresh Android permission Deny and Allow checks. Deny left the
workout usable, posted no notification, and did not prompt again on resume. After resetting only the
disposable prompt marker for a separate first-request test, Allow posted the active workout card.

Synthetic emulator-only SQLite fixtures exercised notification view reuse: a paused incomplete
state had disabled set controls; changing the final set to done showed an enabled Finish workout.
Adding another unfinished set restored the visible amount row and displayed Set 5 of 5. Completing
that fixture again opened review while paused, saved successfully, removed the notification, and
left `PRAGMA integrity_check = ok`. These are fixture-based view tests, separate from the manual and
Maestro interaction evidence above. The temporary emulator was closed afterward.

## Physical Pixel verification

Pixel follow-up, 2026-10-25 at 14:35 local: wireless debugging reconnected, the final ARM64 debug
client installed successfully, and Pull A was started. Android reported notification permission
granted. A physical screenshot confirmed the expanded Fold notification, elapsed time, Pull-ups,
Set 1 of 4, 7 reps, Pause, Set 1 done and Finish. It was left open for the user to try. This confirms
installation and visibility; it does not claim the whole emulator interaction suite ran on Pixel.

Physical interaction follow-up, 2026-10-25 at 14:43-14:52 local, in `app.ironkeep.debug`:
all workout writes came from actual app/notification taps. Independent copies of the debug database
and WAL were inspected after actions; no SQL fixture writes were made on the phone.
- Reps increased 6 to 7, decreased 7 to 6, then increased to 7 and persisted on completion.
- Pause blocked both editing and completion; Resume preserved 2,821 ms of paused time.
- Completing four Pull-up sets advanced to Barbell Row automatically.
- Weight increased 20 to 25 to 30 kg, decreased to 25 kg, and saved with 7 reps.
- With only the main app process killed, the separate native controls process saved the next
  set as 30 kg x 6. Reopening through the notification showed set 3 with matching prefilled values.
- In-app edits changed set 3 to 35 kg x 7; the notification reflected both values, and its Done
  button saved that set and advanced to set 4.
- Finish opened the existing review, warning that 13 of 20 sets were unticked. Save and finish
  produced the saved summary and removed the notification. A read-only database snapshot confirmed
  status `done`, all four Pull-up sets at 7 reps, and Barbell Row sets 25 x 7, 30 x 6, and 35 x 7.
- Every inspected snapshot returned `PRAGMA integrity_check = ok`. The release package was untouched.

## Settings permission control (2026-10-26)

The Settings switch now owns permission requests; the earlier first-workout prompt evidence above
describes the previous implementation. This change preserves existing grants and persists an off
preference in SQLite. The native renderer also checks the preference, so a native action/refresh
cannot recreate a disabled notification. Widget rendering is independent.

Five new JavaScript tests cover existing grants, denied and blocked permission requests, persistent
off, re-enabling and malformed preferences. Native regression tests cover reopening the preference,
widget actions while notifications are off, cancellation of an existing card, and app/channel blocks.
The updated Settings artboard and PNG are in the maintained design folders. Shared publication is
still pending from the earlier canvas access/approval limitation.

Verification used the separate, self-contained `app.ironkeep.debug` client on the API 35 Pixel 6a
emulator. The production installation and its data were untouched.
- `.maestro/notification-settings.yaml` passed: starting a workout did not request permission;
  the switch requested it, Deny kept it off, Allow enabled it, and off/on persisted across leaving
  and reopening Settings. Re-enabling an existing grant did not request permission again.
- Android's notification records confirmed that switching off removed card 4101. A separate
  cold-restart Maestro check confirmed the off preference survived force-stop/relaunch; enabling
  it again restored card 4101 without a prompt.
- Blocking only the `active-workout` channel in Android removed the card and made the app switch
  read off. Enabling it showed the consequence warning; Open settings went directly to that
  channel. Allowing the channel and returning made the switch read on again.
- The Settings row was inspected at 360 and 412 dp in both light and dark themes, with no clipping
  of the new label or switch. Temporary captures are verification evidence, not maintained art.
- `.maestro/session-notification.yaml` passed with the new Settings permission entry: increase
  reps to 7, complete set 1 and advance to set 2, pause/resume, open review, save the workout, and
  remove its notification. The flow now uses a full-height shade gesture for the 1080 x 2400
  Pixel 6a emulator; the earlier short-gesture failure is not passing evidence.
- `bun run check`, all 314 JavaScript tests (37 suites), and all 58 native tests passed. The
  standalone debug APK built successfully for ARM64 and x86_64.

The new client is also installed on the physical Pixel. Verification of this new switch there
remains pending an unlocked phone; the earlier physical notification-control evidence is separate.

## Remaining release checks

- Timed-exercise controls on the physical Pixel (native automated coverage exists).
- Repeat the new Settings permission/channel flow on the physical Pixel.
- Discard, restore, and delete-data paths; stale buttons cannot mutate a new or restored session.
- Refresh local design boards if device review changes the layout; shared-canvas publication.

The local design sources are `SessionNotification.dc.html` and `DarkSessionNotification.dc.html`
with matching PNG references in `docs/design/screens/`. These are design references, not evidence
that the native layouts have passed device review.
