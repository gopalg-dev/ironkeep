# Active workout notification

Research and implementation decision, 2026-10-25. Android only; the home-screen widget is separate.

## Platform evidence

- [Android notifications](https://developer.android.com/develop/ui/compose/notifications/create-notification)
  provide channels, immutable PendingIntent actions, and platform-drawn content. A low-importance
  channel is appropriate for a quiet, already-running workout.
- [Custom layouts](https://developer.android.com/develop/ui/views/notifications/custom-notification)
  use RemoteViews with a decorated system header. Available height varies; the expanded controls
  must fit the small notification surface. Standard action rows alone cannot fit four steppers,
  completion, pause and finish controls.
- [Notification.Builder](https://developer.android.com/reference/android/app/Notification.Builder)
  provides a count-up chronometer. Android draws it without waking our JS every second.
- [Notification permission](https://developer.android.com/develop/ui/compose/notifications/notification-permission)
  is required on Android 13+. Ask once when an active workout first needs this feature. Denial must
  leave the in-app workout usable. Channel-level blocking remains the user's choice.
- [Live Updates](https://developer.android.com/develop/ui/views/notifications/live-update) promote
  eligible ongoing activities, but custom RemoteViews are not eligible. We therefore use an ordinary
  ongoing notification, without requesting promoted-notification permissions or promising a status-bar chip.
- [MediaStyle](https://developer.android.com/reference/android/app/Notification.MediaStyle) represents
  media playback. A workout is not a media session; no fake media session or playback service is added.
- [Apple Live Activities](https://developer.apple.com/design/human-interface-guidelines/live-activities)
  provide the design reference: glanceable state, task-relevant controls, quiet updates and a clear end.
  No ActivityKit/iOS implementation is included.
- [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) supports local ongoing
  notifications and actions. The requested expanded weight/reps editor and process-independent
  SQLite actions require a small local Expo Android module. Adding expo-notifications as well would
  duplicate ownership; this implementation uses the existing Expo module infrastructure directly.

## Interaction selected with the user

The user requested weight/set editing, completing each set, automatic advance to the next set or
exercise, and finishing the workout. The expanded card contains:
- Current exercise; current set and total completed sets.
- Weight −/+ in the user's units and equipment increment; omitted for bodyweight/time exercises.
- Reps −/+ (or seconds in five-second increments for a timed exercise).
- Pause/Resume, Set N done, and Finish. Completion follows the app's existing prefill rules.
- After completion, the first unfinished set is shown; after the final set, Finish workout replaces
  the editor. No set or workout is automatically marked complete.

Finish opens the existing check-in/review screen. It never silently discards an empty workout and
does not bypass the warning about unlogged sets. Tapping the notification opens Zen. Native controls
address the first unfinished set in workout order; manual browsing of an exercise in the app does
not silently change the notification's target. Adding/removing planned sets remains in the app.

The system header shows elapsed **workout** time, excluding pauses. This is not a rest target or a
countdown. A separate since-last-set clock is deferred: the current app keeps that timestamp only
in Zen's local component state, so claiming to restore it after process death would be inaccurate.

## Persistence, lifecycle and size

2026-10-26: Settings > Phone contains a **Workout notifications** switch. Permission is requested
only when the user enables it, never automatically on session start. Existing Android grants remain
usable. The switch combines the stored preference with Android's app permission and channel state;
denial leaves it off. A blocked request offers the corresponding Android notification settings page,
and returning to the app refreshes the state. Turning it off cancels the card and prevents native
refreshes from recreating it, including when React is absent. Widgets remain independent.

The `workout-notifications` preference uses the existing `prefs` table, so no migration or backup
format change is needed. Like other preferences it can be restored, but it never grants an Android
permission. Missing keys retain existing behaviour; malformed values fail closed. The native switch
uses token-derived colours and an accessible label. This follows Android's guidance to request
[notification permission from a user action](https://developer.android.com/develop/ui/compose/notifications/notification-permission).

`modules/session-notification` reads the existing `files/SQLite/ironkeep.db`; it never creates a
database or runs migrations. Native SQLite access runs exclusively in the `:session_controls`
process. The app sends explicit refresh broadcasts; a non-exported receiver handles user taps with
one transaction. It remains usable if Android reclaims the JS process. No background service,
scheduled work, network, push token, wake lock or polling is added.

The first Pixel spike exposed the danger of opening Android SQLite alongside Expo's bundled SQLite
inside one process: the displayed test workout did not persist. The disposable debug DB's integrity
check remained `ok`; the release app was untouched. The corrected implementation enforces process
isolation at `SessionNotification.store`, and uses a separate file lock for pending in-app edits.
[SQLite documents the underlying process-wide locking hazard](https://sqlite.org/howtocorrupt.html#multiple_copies_of_sqlite_linked_into_the_same_application).

Each immutable action includes the workout ID, a digest of its displayed state and a persisted receipt nonce. Changed entries,
settings, pause state or a different workout invalidate it. A double-tap cannot complete two sets.
Finished/deleted workouts reject old actions. Failed writes roll back and remove stale controls.

In-app writes share a serialized queue; pending edits hold a cross-process file lock until saved. The
queue flushes on background/unmount and before finish, swap or ramp operations. Native changes emit
an event when JS exists; mounted workout screens also reload when the app resumes. DB changes
refresh the notification after a short debounce, including finish, discard, restore and data wipe.
The widget task shares these controls; its device-local receipt in `prefs` is excluded from backups.

Android may allow dismissal of an ongoing notification, and force-stop/reboot can remove it. It is
restored from the active workout on the next app launch; no boot receiver is installed. The public
lock-screen representation hides training detail under Android's private-visibility policy.

Native text, controls and colours use system notification styles, not app theme colours. This is an
intentional system-surface exception to the app's Tailwind UI; no custom raster artwork is added.

## Verification

Native Robolectric tests exercise real SQLite transitions: editing, advancing, replay/stale guards,
pause time, completed/deleted sessions, missing DBs, weight validation and equipment increments.
The Android preflight runs these before the release APK. JS tests cover serialization, debounce
flush and failure gating. Device results and remaining coverage belong in
`docs/testing/session-notification.md`; implementation alone does not complete the checklist.
