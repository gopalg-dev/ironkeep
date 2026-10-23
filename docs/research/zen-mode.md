# Zen mode research: one-lift-at-a-time workout views

Researched 2026-10-21 from app help centres, store listings and release notes, developer blogs, GitHub
issues, Apple HIG, Material 3, Android developer docs, WCAG and published HCI studies. Every claim
carries a URL; **UNVERIFIED** marks what no primary source confirmed (store screenshots could not be
read, help.hevyapp.com and help.fitbod.me block fetches, Reddit returned nothing, so visual details
such as row colours rest on text only). Supports design-brief variant B (`02-design-brief.md`): one set
at a time, a pill per set, two big numbers, a 72px done button in the thumb zone, a rest screen with
Undo and Start next set, timer as a setting that is off by default.

> **Decision note (2026-10-21, after this research was written).** The user restated the product rule:
> Ironkeep never prescribes rest, targets or actions. So rules 10, 11 and 12 below (rest timer as an
> opt-in setting, the rest screen, timer alerts) are recorded for the record but **not adopted**. Zen B
> shows the time since the last set as a plain stopwatch in the header and moves straight to the next set.
> "Aim for" wording is out; the plan's rep range is shown as data ("6–10 reps"). Everything else in the
> list stands.

## Summary

Only two of the fifteen apps surveyed ship a true one-set-at-a-time logger: Liftosaur (September 2026
redesign: the next set expands into big reps and weight fields with a large checkmark, "readable from
distance") and HeavySet (pre-filled "Smart Values", auto-advancing exercises, big buttons). Legend
ships a "Focus Mode" that narrows the screen to one exercise or superset station with swipe navigation
and progress pills per station; Alpha Progression is per-exercise by construction with a thumbnail tab
strip; everything else (Hevy, Strong, Boostcamp, Fitbod, RepCount, Setgraph, KeyLifts) is a scrolling
table where a row checkbox or swipe completes a set and a PREVIOUS column or grey placeholder shows last
time. Rest timers auto-start on set completion almost everywhere, but three respected loggers make that
opt-in (RepCount, StrongLifts, Fitbod per exercise) with no reported complaints; the complaints that do
exist are about timers covering the numbers, dying in the background, blaring at full volume, and lacking
a visible Skip. The HCI evidence says: targets of 9 to 12 mm at the bottom edge, avoid the bottom-right
corner for the thumb, numbers of about 0.3 degrees x-height at 60 cm (roughly 40 pt) with 4.5:1
contrast, state shown by icon plus shape plus weight and never colour alone, dots only up to about four
items before a label is needed, idempotent logging with undo rather than confirmation dialogs, and
nothing modal between sets. Streak and deficit framing has measured costs (Etkin 2016; Silverman and
Barasch 2023), which matches the app's own rule of showing information only.

## Recommendations for Ironkeep

Each rule is testable (a device test, a unit test or a Maestro assertion) and names its support.
1. **Done button: at least 72 pt tall, full content width, horizontally centred, above the home
   indicator, never in the bottom-right corner.** Parhi et al. 2006 found error rates stop improving
   above 9.6 mm for discrete targets (https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf);
   Hoober's cheat sheet asks for 12 mm (34 pt) at the bottom edge because edges are hit worst
   (https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/); Kane et
   al. 2008 measured 0.01 to 0.02 errors per trial with 11.4 mm buttons versus 0.07 to 0.09 with 3.8 mm
   (https://userpages.umbc.edu/~skane/pubs/mobilehci08.pdf); Trudeau et al. 2012 found the right thumb
   worst at the bottom-right corner (https://stacks.cdc.gov/view/cdc/194429/cdc_194429_DS1.pdf). 72 pt
   is about 11 mm, so test: a tap anywhere in a 72 pt band logs the set with the phone flat on a bench.
2. **Steppers: each plus and minus is at least 48 x 48 dp with at least 8 dp between them, repeats on
   long press, and steps weight by the smallest loadable increment.** Material 3 target size and spacing
   (https://m3.material.io/foundations/designing/structure); Liftosaur's keypad steps "by smallest
   loadable increment" (https://www.liftosaur.com/features/workout-screen); Strong added a "Button
   Repeat toggle" for its Watch (https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577).
3. **Logging is idempotent: the done button disables until the write commits, fires one success haptic,
   and a second tap on a logged set un-logs it rather than deleting it.** jim #491 (double tap wrote two
   sets, https://github.com/traxon99/jim/issues/491) and #318 (the check turned into a trash button in
   the same spot, deleting on the second tap, https://github.com/traxon99/jim/issues/318); Gymaholic's
   tap-again-to-undo (https://liliiamandrino.medium.com/gymaholic-app-review-ed0f4683d7b2); HIG asks
   haptics to map one pattern to one cause and to complement visual feedback
   (https://developer.apple.com/design/human-interface-guidelines/playing-haptics); Android
   `HapticFeedbackConstants.CONFIRM` (https://developer.android.com/reference/android/view/HapticFeedbackConstants).
4. **Undo, not confirmation: the rest screen carries an Undo that reverts the last log and stops the
   timer; any done pill can be tapped to edit; no dialog ever precedes logging.** NN/g: confirmations
   become automatic, "do go to great lengths to provide undo"
   (https://www.nngroup.com/articles/confirmation-dialog/); gym-tracker-android fixed stray thumb logs
   with a five-second undo bar (https://github.com/thomasz-nyt/gym-tracker-android/pull/76); Strong's
   fix "Timer doesn't stop when set was marked incomplete" shows the timer must follow the undo
   (https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577).
5. **The two big numbers render at 40 pt or larger, tabular figures, at least 4.5:1 contrast, and scale
   with the system font size to 200% without clipping.** Legge and Bigelow's fluent range starts at
   0.2 degrees x-height (https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264); at 60 cm 0.3 degrees is
   about 3.1 mm x-height, about 38 to 40 pt for SF or Roboto (derived); WCAG 1.4.3
   (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html); HIG Typography asks layouts to
   adapt to every Dynamic Type size (https://developer.apple.com/design/human-interface-guidelines/typography);
   Android 14 non-linear scaling, size text in sp (https://developer.android.com/about/versions/14/features);
   M3: tabular figures where values change (https://m3.material.io/styles/typography/applying-type).
6. **Set state is never colour alone: done = filled pill with a check glyph, current = outlined pill
   with a 2 pt stroke and bold label, upcoming = thin outline and muted text; each state contrasts 3:1
   with its neighbour.** WCAG 1.4.1 (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) and
   1.4.11 (https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html); NN/g measured icon plus
   colour fastest and most accurate of four treatments
   (https://www.nngroup.com/articles/visual-indicators-differentiators/); HIG Color: never rely solely on
   colour (https://developer.apple.com/design/human-interface-guidelines/color). Test with the grayscale
   filter on.
7. **Above four sets, add a text label ("Set 3 of 5") beside the pills; pills stay at least 10 pt
   diameter with spacing at least their width.** Trick and Pylyshyn put the at-a-glance count limit at
   three to four (https://doi.org/10.1037/0033-295X.101.1.80); Baymard: three to seven dots readable,
   dots at least 8 to 10 px, and a labelled stepper beats plain dots for multi-step flows
   (https://baymard.com/blog/page-control-ui); HIG page controls: a solid dot for the current page
   (https://developer.apple.com/design/human-interface-guidelines/page-controls); Liftosaur #545 asked
   for "x of y completed" (https://github.com/astashov/liftosaur/issues/545).
8. **Pills carry numbers: a done pill shows what was logged, an upcoming pill shows last session's
   weight x reps in muted text, and the current set's last-time numbers sit as a caption with the date
   under the big numbers.** Hevy's PREVIOUS column (https://www.hevyapp.com/features/track-exercises/);
   RepCount's pale placeholders versus dark entered values
   (https://www.repcountapp.com/support/article/22-weight-and-reps-are-not-carried-over-to-the-next-workout-what-am-i-doing-wrong);
   Liftosaur's Last / Best lines with dates under the expanded set
   (https://www.liftosaur.com/features/workout-screen); Boostcamp's tap-the-previous-column autofill
   (https://www.boostcamp.app/blogs/tips-and-tricks-to-using-boostcamp-app).
9. **Tapping the last-time caption copies those numbers into today's fields; no "target", "suggested"
   or "go for" wording anywhere.** Hevy: "tap on a previous value to instantly add it"
   (https://www.hevyapp.com/features/track-exercises/); the app's own rule (CLAUDE.md: surface
   information, never push a decision); Etkin 2016 on measurement reducing enjoyment
   (https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Etkin-Jordan-11-12-15-Hidden-Cost.pdf).
10. **Rest timer is a setting, off by default; when on it starts on done, never after the last set of a
    lift, stops on Undo, counts past zero, and shows +15 s, -15 s and Skip as visible buttons.**
    RepCount shipped auto-start as opt-in in July 2026
    (https://www.repcountapp.com/support/article/90-how-do-i-start-the-rest-timer-automatically);
    StrongLifts is opt-in with no rest after the last set
    (https://support.stronglifts.com/article/25-rest-timer); jim PR #240 removed the timer on the last
    set (https://github.com/traxon99/jim/pull/240); Hevy's -15/+15 and Skip
    (https://www.hevyapp.com/features/workout-rest-timer/); Liftosaur's pill with -15 s / +15 s and
    count-up past target (https://www.liftosaur.com/features/rest-timer); Alpha Progression counts past
    zero by default (https://alphaprogression.com/en/blog/alpha-progression-guide); Strong hides Skip
    behind a full-screen tap, which is the hidden-control pattern
    (https://help.strongapp.io/article/231-rest-timer).
11. **The rest screen keeps the next set's numbers, the pills and the lift name visible, and one tap
    returns to the set; nothing on it is a modal.** Liftosaur #593 "Rest timer covers weights"
    (https://github.com/astashov/liftosaur/issues/593); kilo #1446: a running timer is "transient
    high-priority state" that should stay visible without scrolling
    (https://github.com/bpronin90/kilo/issues/1446); Gymverse review: cannot see the next exercise
    during rest (https://justuseapp.com/en/app/1048454034/workout-gym-workout-planner/reviews); Weiser
    and Brown's calm technology: the periphery, recentred only when the user chooses
    (https://calmtech.com/papers/coming-age-calm-technology).
12. **Timer alerts respect the silent switch, offer vibration-only, and surface on the lock screen (Live
    Activity on iOS, ongoing notification on Android); the screen stays awake while Zen is open and
    releases on leave.** Liftosaur #346: loud chime with no off switch
    (https://github.com/astashov/liftosaur/issues/346); wger #1245: locked phone, alert missed
    (https://github.com/wger-project/flutter/issues/1245); Hevy Live Activity with +/-15 s and Skip
    (https://www.hevyapp.com/features/live-activity/); openGym: finding your place after every lock was
    "the single most annoying thing" (https://newreleases.io/project/github/DuarteSantos8/openGym/release/v1.2.3);
    Apple: set `isIdleTimerDisabled` only while needed
    (https://developer.apple.com/documentation/uikit/uiapplication/isidletimerdisabled); Android: clear
    `FLAG_KEEP_SCREEN_ON` when done (https://developer.android.com/develop/background-work/background-tasks/awake/screen-on);
    Expo `useKeepAwake` (https://docs.expo.dev/versions/latest/sdk/keep-awake/).
13. **Place is state: the current lift and set index persist and restore on foreground, unlock and
    relaunch; the timer keeps counting from its wall-clock start.** Liftosaur #252: unlock lands on
    History and the user scrolls to find the exercise (https://github.com/astashov/liftosaur/issues/252);
    roogo-fitness #76: scroll position resets (https://github.com/Roogry/roogo-fitness/issues/76); Strong
    fixes for "Timer may reset after returning to app from background"
    (https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577).
14. **Lifts are navigated by swipe plus a visible, tappable lift strip and prev / next affordances; no
    action is swipe-only.** Liftosaur: swipe between exercises and tap a thumbnail to jump
    (https://www.liftosaur.com/features/workout-screen); Legend Focus Mode: swipe per station plus
    progress pills (https://legend-tracker.com/feature/focus-mode-for-workouts/); Alpha Progression's
    thumbnail tab strip (https://alphaprogression.com/en/blog/alpha-progression-guide); Norman and
    Nielsen on invisible gestures (https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/);
    NN/g: hidden navigation cut discoverability by more than 20%
    (https://www.nngroup.com/articles/hamburger-menus/).
15. **Nothing interrupts between sets: no RPE sheet, no PR confetti, no readiness questions, no
    "sessions left"; a PR is at most an inline caption; animations fade under Reduce Motion and never
    loop on the rest screen.** NN/g on modal cost (https://www.nngroup.com/articles/modal-nonmodal-dialog/);
    PushPress confetti shipped without an off switch (https://updates.pushpress.com/en/members-app-v3180);
    Hevy makes its PR notification a setting (https://www.hevyapp.com/features/workout-settings/);
    Silverman and Barasch 2023 on broken-streak demotivation
    (https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb); HIG Accessibility: fades
    under Reduce Motion (https://developer.apple.com/design/human-interface-guidelines/accessibility);
    M3 transitions (https://m3.material.io/styles/motion/transitions/applying-transitions); RN
    `AccessibilityInfo.isReduceMotionEnabled` (https://reactnative.dev/docs/accessibilityinfo); HIG
    Color: avoid full-screen background colour on views that stay up for long periods such as a workout
    app (https://developer.apple.com/design/human-interface-guidelines/color), so Zen keeps a neutral
    surface and uses the day colour only on the current pill.

## App comparison

Cells quote or paraphrase the sources listed under "Per-app notes"; a dash means the app has no such
thing; UNVERIFIED means no source described it.

| App                                  | On screen during a set                                                                                                           | Current-set marker                                        | Other sets                                                      | Last session                                                   | Primary button                                                 | Undo / edit                                                   | Rest timer                                                                                                                    | Gestures                                                        |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Legend (Focus Mode, 2026)            | One exercise or superset station: videos, notes, previous sets, history, progression suggestion with "expected gains"            | UNVERIFIED                                                | Progress pills per station (not per set)                        | Previous sets inside the station; pre-populated from last best | "Mark a set as done"; location UNVERIFIED                      | Editing stays in the focused flow; gesture UNVERIFIED         | Opt-in auto-start; docked timer with start, pause, reset; Live Activity; +/- UNVERIFIED                                       | Swipe between stations; return to full list                     |
| Hevy                                 | Table per exercise: SET, PREVIOUS, KG, REPS, optional RPE; note above the timer line                                             | "Clearer active/checked states" (3.1.11); look UNVERIFIED | Rows with a checkmark each; check sound                         | PREVIOUS column, tap to copy; blank when none                  | Row checkmark; also from the Live Activity                     | Swipe left to delete; set-number menu; uncheck UNVERIFIED     | Auto on check, per exercise 5 s to 5 min or Off; -15 / +15; Skip on Live Activity                                             | Swipe-left delete; Smart Superset Scrolling                     |
| Strong                               | List of set rows; set tag in the Set column; timer top-left when running                                                         | UNVERIFIED (Watch: one set at a time)                     | Rows with a checkbox                                            | Pre-filled fields; a greyed Previous column (third-party)      | Row checkbox; Finish top-right                                 | Swipe to delete; mark incomplete exists                       | Default 2:00, auto on check; tap timer for full screen with duration edit and Skip; Live Activity (6.5.0)                     | Swipe to delete; drag to reorder                                |
| Alpha Progression                    | One exercise: picker for weight, reps, RIR; blue recommendation bubble; previous sets and notes visible; per-set e1RM            | Blue bubble on the upcoming set                           | Completed sets listed with a metric; styling UNVERIFIED         | Previous sets under the current block                          | Picker confirm ("two taps"); form UNVERIFIED                   | Edit numbers and targets; gesture UNVERIFIED                  | Auto on completion; alarm; counts past zero; adjust current rest; Live Activity countdown bar                                 | Thumbnail tab strip per exercise; swipe UNVERIFIED              |
| JuggernautAI                         | Weight, reps, RPE or RIR per set; emoji on warm-ups; app rewrites upcoming sets                                                  | UNVERIFIED                                                | UNVERIFIED                                                      | History and Full Block View (3.0)                              | UNVERIFIED                                                     | UNVERIFIED                                                    | Auto; separate times for main lifts and accessories; Live Activity; voice, beep or silent                                     | UNVERIFIED                                                      |
| Boostcamp                            | Exercise, target sets and reps, RPE field per row, last weight                                                                   | "Your current set stays highlighted" (v265)               | Finished exercises collapse                                     | Previous column, tap to autofill                               | Tap the row                                                    | Swipe left to delete; about 3 s undo for exercises            | Auto per exercise (5 s steps), default or Off; Live Activity; Android notification; +/- UNVERIFIED                            | Swipe left delete; long-press reorder                           |
| Fitbod                               | Exercise Details screen: video, recommended sets, reps, weight, historical logs, timer under the name, RiR when prompted         | Phone UNVERIFIED; Wear OS blue set marker                 | Phone UNVERIFIED; Watch filled markers                          | Historical logs section                                        | "Log Set" button; "log all sets"                               | Tap field to edit; swipe left to delete                       | Per-exercise toggle, off until enabled; tone or vibration; tap to change current rest; push when backgrounded                 | Swipe left delete; swipe right plate calculator (2021)          |
| KeyLifts                             | Prescribed sets with calculated weights and plates; PR set target reps                                                           | UNVERIFIED                                                | Check off each set                                              | Assistance weights prefilled                                   | Row check-off                                                  | Swipe left to delete                                          | Free; default timers; auto UNVERIFIED                                                                                         | Swipe left                                                      |
| Liftosaur (v121+, Sep 2026)          | Expanded next set: big reps and weight, plates per side, Last / Best / Same day with dates, Target column cycles to Previous Set | The expanded row; next unfinished expands on completion   | Rows, tap to expand; Watch and Live Activity show a dot per set | Last / Best lines under the set; Previous Set column           | Large checkmark inside the row                                 | Pencil icon: Edit Target or Delete Set; swipe removed in 2026 | Auto on check; bottom-right pill, red at target, counts up; tap for -15 s, +15 s, cancel; chime plus vibration; Live Activity | Swipe between exercises; tap thumbnail to jump; long-press drag |
| Gymverse (FITNESS22)                 | Guided player with video and "Did It" buttons; smart weight suggestions                                                          | UNVERIFIED                                                | UNVERIFIED                                                      | Past performance tracker; placement UNVERIFIED                 | "Did It"                                                       | Conflicting reviews; UNVERIFIED                               | Per exercise, 15 s steps, lock-screen widget; skip UNVERIFIED                                                                 | Tap-based; reviewers want fewer taps                            |
| Setgraph                             | Set-entry sheet: large reps and weight, note field, last week vs this week                                                       | None (log-after model); checkmark mode in Multisets       | List, order configurable                                        | Inside the entry sheet; swipe right to repeat                  | Record action in the sheet; add-set button bottom-right (2022) | Tap a logged row; UNVERIFIED                                  | Auto after record when a rest is set; bottom countdown "Next Set"; Live Activity; skip UNVERIFIED                             | Swipe right to log or repeat                                    |
| HeavySet                             | One exercise at a time with pre-filled Smart Values; history view in the logger                                                  | One prepared set; list UNVERIFIED                         | UNVERIFIED                                                      | Smart Values and history view                                  | Log button, "big enough not to miss"                           | "Easy to edit"; mechanism UNVERIFIED                          | Auto when the routine sets a rest; tap display to cancel; swipe up for presets and +/- with a user-set amount                 | Swipe up on timer; horizontal bottom panel                      |
| RepCount                             | One page per workout; rows of weight and reps with pale placeholders                                                             | Next row with placeholders                                | Entered rows dark, placeholders pale                            | Pale placeholders ("Latest" or "By Routine")                   | Swipe right or tap the checkmark above the keyboard (iOS)      | Edit any value; delete UNVERIFIED                             | Opt-in auto-start (10.5.0, Jul 2026); in-page countdown; notification; Live Activity                                          | Swipe right to complete; keyboard next                          |
| Apple Workout (watchOS 26)           | Metrics view; Up Next view for custom intervals                                                                                  | UNVERIFIED                                                | Up Next shows remaining and next interval                       | -                                                              | Swipe right for Pause / End                                    | No set logging                                                | Recovery intervals only                                                                                                       | Crown switches views; double-tap display = segment              |
| Google Health / Fitbit / Pixel Watch | Stats cycle on tap; strength workouts in the phone app check off exercises with reps and weight                                  | UNVERIFIED                                                | Check off exercises in a list                                   | -                                                              | Swipe up (Fitbit) or right (Pixel) for Pause / End             | Edit sets before or during; swipe left to remove              | Rest is a segment type; no timer behaviour documented                                                                         | Swipe up or right; double pinch                                 |

### Per-app notes

- **Legend.** Focus Mode "narrows workout capture to the current exercise or superset station";
  "Progress pills show which stations are done and which remain"; "Swipe through one exercise or
  superset station at a time" (https://legend-tracker.com/feature/focus-mode-for-workouts/). Timer:
  "Choose to start the timer automatically after you log a set"; docked timer
  (https://legend-tracker.com/feature/break-timer-set-timer-and-stopwatch/). Watch app since Dec 2025
  (https://legend-tracker.com/feature/log-workouts-on-apple-watch/). Store history
  (https://apps.apple.com/us/app/gym-log-workout-tracker-legend/id6452722261).
- **Hevy.** Columns and PREVIOUS behaviour (https://www.hevyapp.com/features/track-exercises/,
  https://www.hevyapp.com/features/how-to-write-sets-and-reps/); checkmark logs and starts the timer
  (https://www.hevyapp.com/hevy-tutorial/); -15 / +15 (https://www.hevyapp.com/features/workout-rest-timer/);
  Live Activity with Skip and set completion (https://www.hevyapp.com/features/live-activity/); Keep
  Awake, Smart Superset Scrolling, PR notification setting (https://www.hevyapp.com/features/workout-settings/);
  3.1.11 "clearer active/checked states", 3.0.13 "more haptic feedback"
  (https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350).
- **Strong.** Checkbox and swipe to delete (https://help.strongapp.io/article/229-my-first-workout);
  timer 2:00, full screen with Skip (https://help.strongapp.io/article/231-rest-timer); Watch single-set
  screen with Digital Crown (https://help.strongapp.io/article/224-log-a-workout-on-apple-watch); Live
  Activity 6.5.0, background timer fixes, Button Repeat
  (https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577).
- **Alpha Progression.** Guide (https://alphaprogression.com/en/blog/alpha-progression-guide); store
  notes on Live Activity (https://apps.apple.com/us/app/gym-workout-alpha-progression/id1462277793);
  review describing the blue target beside the previous result
  (https://respectmyregion.com/alpha-progression-review-2026/).
- **JuggernautAI.** 3.0 notes (https://apps.apple.com/app/id1515756471,
  https://www.juggernautai.app/blog/juggernautai-v3-0-is-here); RPE after each set rewrites the rest
  (https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you). The
  "one set at a time" reputation is UNVERIFIED.
- **Boostcamp.** Workout tracker page (https://www.boostcamp.app/workout-tracker); v265 highlight and
  collapse (https://apps.apple.com/us/app/boostcamp-workout-tracker/id1529354455); previous column and
  swipe delete (https://www.boostcamp.app/blogs/tips-and-tricks-to-using-boostcamp-app); timer
  (https://www.boostcamp.app/features/rest-timer).
- **Fitbod.** Exercise Details layout
  (https://help.fitbod.me/hc/en-us/articles/30721437384215-How-to-Navigate-the-Exercise-Details-Screen);
  timer (https://help.fitbod.me/hc/en-us/articles/360006340194); editing
  (https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod); Wear OS blue set
  marker (https://help.fitbod.me/hc/en-us/articles/4406074415383-WearOS-on-Android); Watch haptics
  (https://help.fitbod.me/hc/en-us/articles/360006499194-Apple-Watch); "log all sets" complaint
  (https://play.google.com/store/apps/details?id=com.fitbod.fitbod).
- **KeyLifts.** Product page (https://keylifts.com/product); PR sets
  (https://keylifts.helpscoutdocs.com/article/28-how-do-pr-sets-work); delete
  (https://keylifts.helpscoutdocs.com/article/11-how-can-i-delete-a-set); prefill
  (https://keylifts.helpscoutdocs.com/article/37-weights-will-be-automatically-filled-in-for-assistance-exercises);
  store (https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461). The "large one-handed
  controls" reputation is UNVERIFIED.
- **Liftosaur.** Workout screen (https://www.liftosaur.com/features/workout-screen); rest timer
  (https://www.liftosaur.com/features/rest-timer); lock screen
  (https://www.liftosaur.com/features/lock-screen-and-notifications); Watch
  (https://www.liftosaur.com/features/apple-watch); settings with Always On Display
  (https://www.liftosaur.com/features/first-run-and-settings); changelog
  (https://raw.githubusercontent.com/astashov/liftosaur/master/CHANGELOG.md); v121 note "readable from
  distance" (https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849).
- **Gymverse.** Site (https://gymverse.app/); "Did It" buttons
  (https://screensdesign.com/showcase/gymverse-gym-workout-planner); reviews
  (https://justuseapp.com/en/app/1048454034/workout-gym-workout-planner/reviews,
  https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034).
- **Setgraph.** Site mockup (https://setgraph.app/); swipe actions
  (https://setgraph.app/articles/fast-workout-tracking-with-swipe-actions-in-setgraph); timer
  (https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer); Notepad Mode keep-awake
  (https://setgraph.app/articles/setgraph-9-41-notepad-mode-for-faster-logging); larger keyboard
  (10.0.2) and version notes (https://apps.apple.com/au/app/setgraph-workout-log/id1209781676).
- **HeavySet.** Logger (https://heavyset.app/help/logging-workouts/workout-logger); timer
  (https://heavyset.app/help/logging-workouts/rest-timer); store with Lifewire quote and reviews on
  touchy buttons (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310).
- **RepCount.** Placeholders and completion
  (https://www.repcountapp.com/support/article/22-weight-and-reps-are-not-carried-over-to-the-next-workout-what-am-i-doing-wrong);
  opt-in auto-start (https://www.repcountapp.com/support/article/90-how-do-i-start-the-rest-timer-automatically);
  Live Activity (https://www.repcountapp.com/support/article/77-troubleshooting-the-ios-live-activity-lock-screen-widget);
  release notes (https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044).
- **Apple.** watchOS 26 layout (https://support.apple.com/en-us/123002); Up Next for custom workouts
  (https://support.apple.com/guide/watch/create-a-custom-workout-apd66fcd5c5c/watchos); pause and end
  (https://support.apple.com/guide/watch/start-a-workout-apdd16e8761a/26.0/watchos/26.0); iOS 26 Fitness
  (https://support.apple.com/guide/iphone/start-a-workout-in-fitness-iph8475d8510/26/ios/26). No
  set or rep logging on any fetched page.
- **Google.** Device controls (https://support.google.com/googlehealth/answer/14237206); strength
  workouts in the app (https://support.google.com/googlehealth/answer/16959617); custom workouts with
  Rest segments (https://support.google.com/googlehealth/answer/15402636); on-wrist strength "coming
  soon" (https://blog.google/products-and-platforms/devices/pixel/pixel-watch-5/).

## Apple HIG and Material 3 points

- **Touch targets.** HIG: 44 x 44 pt default, 28 pt minimum, about 12 pt padding around bezelled
  controls (https://developer.apple.com/design/human-interface-guidelines/accessibility,
  https://developer.apple.com/design/human-interface-guidelines/buttons). M3: 48 x 48 dp (about 9 mm,
  recommended physical range 7 to 10 mm), 8 dp apart, larger targets "may be appropriate for a wider
  range of users" (https://m3.material.io/foundations/designing/structure). Android: 48 dp, "larger is
  better" (https://developer.android.com/guide/topics/ui/accessibility/apps). HIG Workouts: controls must
  be easy to find and tap, text legible while moving, large sizes and high contrast
  (https://developer.apple.com/design/human-interface-guidelines/workouts).
- **Thumb zone.** HIG gives no iOS thumb rule; it floats the tab bar at the bottom and puts one
  prominent toolbar action trailing (https://developer.apple.com/design/human-interface-guidelines/tab-bars,
  https://developer.apple.com/design/human-interface-guidelines/toolbars). M3: important actions at the
  top or bottom; the FAB belongs lower-right because it is easiest to reach, never for destructive
  actions, one per screen (https://m3.material.io/components/floating-action-button/guidelines); docked
  toolbars only at the bottom (https://m3.material.io/components/toolbars/guidelines). Research (section
  below) says the bottom-right corner is the worst spot for a right thumb, so Zen centres its button.
- **Glanceable.** HIG watchOS: quick, single-screen interactions, act in a gesture or two
  (https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos). HIG Workouts:
  show only the data people care about, a distinct appearance so the active session is recognisable at
  a glance. HIG Live Activities: large text, medium weight or heavier, a single control to avoid
  mis-taps, animations at most 2 s (https://developer.apple.com/design/human-interface-guidelines/live-activities).
  M3: display styles for short important numerals, tabular figures where values change
  (https://m3.material.io/styles/typography/applying-type).
- **Dynamic Type.** HIG: iOS body 17 pt, minimum 11 pt, support at least 200% enlargement, keep the
  hierarchy and primary elements near the top, stack inline items at large sizes
  (https://developer.apple.com/design/human-interface-guidelines/typography). Android 14: non-linear
  scaling to 200%, text in sp, never padding, test at 200%
  (https://developer.android.com/about/versions/14/features).
- **Haptics.** HIG: system patterns for their documented meaning, one haptic per cause, complement
  visuals, avoid overuse, make haptics optional; iOS notification feedback for outcomes
  (https://developer.apple.com/design/human-interface-guidelines/playing-haptics). Android: "less is
  more", strength scales with importance, `performHapticFeedback` with CONFIRM or REJECT needs no
  permission and respects the user's setting
  (https://developer.android.com/develop/ui/views/haptics/haptics-principles,
  https://developer.android.com/develop/ui/views/haptics/haptic-feedback).
- **Keep awake.** iOS `isIdleTimerDisabled`: set only when needed, reset after
  (https://developer.apple.com/documentation/uikit/uiapplication/isidletimerdisabled). Android
  `FLAG_KEEP_SCREEN_ON` in an activity, cleared when done
  (https://developer.android.com/develop/background-work/background-tasks/awake/screen-on). Expo
  `useKeepAwake()` while mounted (https://docs.expo.dev/versions/latest/sdk/keep-awake/).
- **Reduced motion.** HIG: never make motion the only channel, cut repetitive animation and replace
  transitions with fades (https://developer.apple.com/design/human-interface-guidelines/motion,
  https://developer.apple.com/design/human-interface-guidelines/accessibility). M3: subtle fades, no
  parallax or morphing (https://m3.material.io/styles/motion/transitions/applying-transitions). RN:
  `isReduceMotionEnabled` plus `reduceMotionChanged` (https://reactnative.dev/docs/accessibilityinfo).
- **Colour.** HIG: no colour-only meaning, increased-contrast variants, avoid full-screen background
  colour on long-lived views such as a workout app
  (https://developer.apple.com/design/human-interface-guidelines/color). M3: 4.5:1 small text, 3:1 large
  text and graphics, clustered non-text 3:1 (https://m3.material.io/foundations/designing/color-contrast).
  WCAG 1.4.1, 1.4.3, 1.4.11 as cited above.

## Evidence

### Tap accuracy with sweat, motion and one hand

- Target size: Parhi et al. 2006 recommend 9.2 mm discrete, 9.6 mm serial; errors plateau at 9.6 mm
  (https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf). NN/g:
  1 cm x 1 cm minimum, "bigger" for use while walking (https://www.nngroup.com/articles/touch-target-size/).
  Hoober: 7 mm at centre, 10 to 12 mm at the top and bottom edges, 95% of taps contained
  (https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php,
  https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/). Microsoft:
  7.5 mm, larger for frequent and high-consequence targets, away from edges
  (https://learn.microsoft.com/en-us/windows/apps/design/input/guidelines-for-targeting). WCAG 2.5.8
  24 px minimum, 2.5.5 44 px enhanced, citing one-handed use and tremor
  (https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html). The "MIT Touch Lab 16 to
  20 mm fingertip" figure is UNVERIFIED (the cited paper is a fingertip mechanics model).
- Motion: Kane et al. 2008, 11.4 mm buttons with 6.1 mm text: 0.01 errors per trial standing, 0.02
  walking; 3.8 mm buttons: 0.07 and 0.09 (https://userpages.umbc.edu/~skane/pubs/mobilehci08.pdf).
  Bergstrom-Lehtovirta et al. 2011: performance plateaus at 40 to 80% of walking speed
  (https://dl.acm.org/doi/10.1145/2037373.2037396). Schildbach and Rukzio 2010: larger targets
  compensate for walking, larger text did not help reading because of extra scrolling
  (https://eprints.lancs.ac.uk/id/eprint/42490/). Ng et al.: up to 112% more error when walking while
  encumbered (https://eprints.gla.ac.uk/117068/1/117068.pdf).
- Sweat and gloves: RainCheck (Tung et al. 2018) measured a 21% gesture error rate with water on an
  unmodified Nexus 5 because water "cannot be distinguished from finger touches"
  (https://mynkgoel.github.io/pdfs/raincheck.pdf). Patents describe the mechanism for sweat and gloves
  (https://patents.google.com/patent/US9310934, https://patents.google.com/patent/US9921743). No
  peer-reviewed study of error rate by target size with wet or gloved hands was found: UNVERIFIED.
  Practitioner signal: Setgraph "larger buttons to reduce mistaps" (10.0.2); HeavySet reviewer "a lot
  of unintended taps" with little feedback (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310).
- One hand: Hoober 2013 observed 49% one-handed, 36% cradled, 15% two-handed, and later found 75% touch
  with one thumb, grips shift constantly, most taps land in the centre half of the screen
  (https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php,
  https://www.uxmatters.com/mt/archives/2017/05/design-for-fingers-touch-and-people-part-2.php).
  Bergstrom-Lehtovirta and Oulasvirta 2014 model the thumb's functional area from hand size and grip
  (https://doi.org/10.1145/2556288.2557354). Le et al. 2018: grip moves toward the top edge on bigger
  phones (https://www.medien.ifi.lmu.de/pubdb/publications/pub/le2018fingersrange/le2018fingersrange.pdf).
  Trudeau et al. 2012: bottom-right corner worst for the right thumb
  (https://stacks.cdc.gov/view/cdc/194429/cdc_194429_DS1.pdf). On a bench the phone is flat and
  reach is moot; edge accuracy and the corner penalty remain.

### Reading at arm's length

- Legge and Bigelow 2011: fluent reading from 0.2 to 2 degrees x-height
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264). Phones are normally held at 32 to 36 cm
  (https://pubmed.ncbi.nlm.nih.gov/21499163/); a bench or rack is further. Derived x-heights for 0.2,
  0.3 and 0.5 degrees: 2.1, 3.1 and 5.2 mm at 60 cm; 2.4, 3.7 and 6.1 mm at 70 cm. iOS 17 pt body
  (about 1.4 mm x-height) is below the fluent range at 60 cm; 26 pt reaches 0.2 degrees and about 40 pt
  reaches 0.3 degrees at 60 cm.
- ISO 15008 in-vehicle displays: 20 arcmin character height recommended, 12 minimum (partly
  UNVERIFIED, excerpt only) (https://standards.iteh.ai/catalog/standards/iso/d07adfe7-f551-4557-bb09-7236d8491cf6/iso-15008-2017).
  NHTSA: 85th-percentile glance of 2 s or less per look
  (https://www.nhtsa.gov/document/visual-manual-nhtsa-driver-distraction-guidelines-vehicle-electronic-devices-0).
- Contrast and type: Reimer et al. 2014 cut glance time 10.6% with a humanist typeface
  (https://dspace.mit.edu/handle/1721.1/96509); Dobres et al. 2016 found dark-on-light more legible
  than light-on-dark under the tested lighting (https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401).
  WCAG 4.5:1 and 3:1 for 18 pt or 14 pt bold (https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
  Wear OS: essential text at least 12 sp, "read at a glance"
  (https://developer.android.com/docs/quality-guidelines/wear-app-quality). Field complaint: Trainerize
  users asked for bigger reps numbers because the in-workout page "is 99% of the experience"
  (https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/50876828-more-bigger-bolder-fonts-please).

### Done, current, upcoming without colour alone

- WCAG 1.4.1: colour never the only cue; two lightness levels count as a cue only at 3:1
  (https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html). 1.4.11: state indicators at 3:1, a
  checkmark must itself contrast (https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html).
- About 1 in 12 men have a colour vision deficiency
  (https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness).
- NN/g, 96 users: icon plus colour best on every metric, text-only 57% slower
  (https://www.nngroup.com/articles/visual-indicators-differentiators/). Grayscale test and strokes or
  patterns (https://www.nngroup.com/articles/visual-treatments-accessibility/). Filled icons read
  better than thin-line ones (https://www.smashingmagazine.com/2017/10/nailing-accessibility-design/).
- The archived Material stepper marked completed steps with a check in the circle and the active step
  with a filled circle (https://www.mdui.org/en/design/1/components/steppers.html). Checkmark versus
  strike-through for "done" has no controlled study: UNVERIFIED; practitioner threads complain about
  strike-through legibility (https://club.useclear.com/t/strikethrough-legibility/1436).
- Liftosaur's Watch and Live Activity use a dot per set "coloured by status" plus a "Set 2/7" header,
  so colour is backed by a count (https://www.liftosaur.com/features/apple-watch).

### Progress indicators for 3 to 6 items

- Subitizing limit about 3 to 4 (https://doi.org/10.1037/0033-295X.101.1.80); working memory about 4
  chunks (https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory-a-reconsideration-of-mental-storage-capacity/44023F1147D4A1D44BDC0AD226838496).
- NN/g: dots are weak signifiers, too small to tap individually, show count and position
  (https://www.nngroup.com/articles/designing-effective-carousels/,
  https://www.nngroup.com/articles/mobile-carousels/); wizards should grey out upcoming steps and mark
  completed ones (https://www.nngroup.com/articles/wizards/).
- Baymard: 3 to 7 dots readable, 8 or more "near-impossible to parse quickly", dots at least 8 to 10
  px with spacing at least the diameter, labelled steppers beat dots for multi-step flows
  (https://baymard.com/blog/page-control-ui); indicator must map 1:1 to real steps
  (https://baymard.com/blog/checkout-flow-ux-optimization).
- HIG page controls: solid current dot, hard to count past about 10, tappable on iOS
  (https://developer.apple.com/design/human-interface-guidelines/page-controls). M3 has no stepper
  component (https://v4.material-ui.com/components/steppers/).
- Reading for Zen: pills that carry numbers are a labelled stepper, not a dot row, so they survive 5 to
  6 sets; the "Set n of N" text covers the count.

## Rest timers

### Defaults in shipping apps

| App               | Auto-start on done              | Default                       | Scope of setting                                      | Source                                                                                     |
| ----------------- | ------------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Hevy              | Yes                             | On                            | Per exercise, 5 s to 5 min or Off; global default     | https://www.hevyapp.com/features/workout-rest-timer/                                       |
| Strong            | Yes                             | On, 2:00                      | Per exercise, warm-up and working separately          | https://help.strongapp.io/article/231-rest-timer                                           |
| Fitbod            | Yes once enabled                | Off per exercise              | Per exercise toggle                                   | https://help.fitbod.me/hc/en-us/articles/360006340194                                      |
| Boostcamp         | Yes                             | On                            | Default plus per-exercise override, 5 s steps, or Off | https://www.boostcamp.app/features/rest-timer                                              |
| JuggernautAI      | Yes                             | On (disable UNVERIFIED)       | Main lifts versus accessories                         | https://apps.apple.com/app/id1515756471                                                    |
| Alpha Progression | Yes                             | On                            | Per exercise type with override                       | https://alphaprogression.com/en/blog/alpha-progression-guide                               |
| Liftosaur         | Yes                             | On (warm-up 90 s, work 180 s) | Global plus per set in program text                   | https://www.liftosaur.com/features/rest-timer                                              |
| Setgraph          | Yes when a rest is set          | On                            | Default Interset Rest plus per exercise               | https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer                    |
| HeavySet          | Only if the routine sets a rest | Routine-driven                | Per exercise; Auto-start toggle for ad-hoc            | https://heavyset.app/help/logging-workouts/rest-timer                                      |
| RepCount          | Opt-in (10.5.0, Jul 2026)       | Off                           | Global, per device                                    | https://www.repcountapp.com/support/article/90-how-do-i-start-the-rest-timer-automatically |
| Legend            | Opt-in                          | UNVERIFIED                    | Setting                                               | https://legend-tracker.com/feature/break-timer-set-timer-and-stopwatch/                    |
| KeyLifts          | UNVERIFIED                      | Default timers exist          | UNVERIFIED                                            | https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461                        |
| Gymverse          | Runs after a set (reviews)      | UNVERIFIED                    | Per exercise, 15 s steps                              | https://justuseapp.com/en/app/1048454034/workout-gym-workout-planner/reviews               |
| StrongLifts       | Opt-in                          | Off                           | Settings, per exercise; none after the last set       | https://support.stronglifts.com/article/25-rest-timer                                      |

On-with-auto-start is the convention; opt-in (RepCount, StrongLifts, Fitbod, Legend) draws no
complaints. What every app offers is a one-tap Off at exercise level.

### What users complain about and praise

- Praise is for the auto-start itself: Trainerize users asked to "emulate the Strong app"
  (https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/45891910-change-the-regular-workout-functionality-to-have-a);
  wger users want a countdown with a chime so they can "focus on other things while resting"
  (https://github.com/wger-project/flutter/issues/305); Setgraph reviewer: "the automatic timer when
  recording a set is super nice" (https://setgraph.app/reviews).
- Covering the numbers: Liftosaur #593 (https://github.com/astashov/liftosaur/issues/593); RepCount
  countdown hidden behind the keyboard (10.6.2); kilo #1446 (https://github.com/bpronin90/kilo/issues/1446).
- Dying in the background or on lock: Liftosaur #66 (https://github.com/astashov/liftosaur/issues/66);
  wger #784 and #1245 (https://github.com/wger-project/flutter/issues/784,
  https://github.com/wger-project/flutter/issues/1245); Strong 6.2.7 to 6.2.9 fixes; Hevy rolled back a
  persistent Android notification (https://www.apkmirror.com/apk/hevy-gym-workout-tracker/hevy-gym-log-workout-tracker/hevy-gym-log-workout-tracker-1-29-14-release/).
- Sound: Liftosaur #346 loud with no off switch (https://github.com/astashov/liftosaur/issues/346);
  StrongLifts documents that silent mode mutes the alert by design
  (https://support.stronglifts.com/article/25-rest-timer).
- Lock-screen demand: Liftosaur #587 (https://github.com/astashov/liftosaur/issues/587); Strong,
  Hevy, Boostcamp, Alpha Progression, Setgraph, RepCount and Legend all ship a Live Activity.
- Cannot skip or fires on the last set: jim PR #240 (https://github.com/traxon99/jim/pull/240);
  pulseworkout #12 (https://github.com/saroj990/pulseworkout/issues/12); refactor-athletics #58
  (https://github.com/chino4242/refactor-athletics/issues/58).
- Timer that counts past zero without demanding action: Alpha Progression's "checkpoint rather than a
  command to lift immediately" (https://alphaprogression.com/en/glossary/rest-timer); Setgraph: ending
  "doesn't require you to start the next set if you aren't ready"
  (https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer).

### Skip and extend controls

Hevy -15 / +15 and Skip (in app and Live Activity); Liftosaur -15 s / +15 s / cancel on a tapped pill;
HeavySet two presets and +/- with a user-set amount, tap to cancel; Strong full-screen duration edit
and Skip, Crown on the Watch; StrengthLog +/-30 s (https://help.strengthlog.com/help-article/how-to-use-the-timer);
MacroFactor +/-10 s (https://help.macrofactorapp.com/en/articles/320-changing-rest-time-during-a-workout);
Fitbod tap to change the current rest; Alpha Progression adjust the current rest. Skip or +/- for
Boostcamp, JuggernautAI, Setgraph, RepCount, Legend, KeyLifts, Gymverse: UNVERIFIED.

### Autonomy and defaults

Weiser and Brown: calm technology moves between periphery and centre and lets the user recentre
(https://calmtech.com/papers/coming-age-calm-technology). Case: the minimum attention and the minimum
technology that solves the problem (https://www.caseorganic.com/post/principles-of-calm-technology).
NN/g: a notification that ignores what the user is doing "will disrupt their current task"
(https://www.nngroup.com/articles/indicators-validations-notifications/); turning notifications off
must be quick (https://www.nngroup.com/articles/push-notification/). Dark-pattern research names
"default opt-in" among the strongest deviations from a neutral profile
(https://ceeconference.vse.cz/proceedings-2026/c36/, https://arxiv.org/pdf/2001.02479). Center for
Humane Technology: avoid "requiring constant monitoring", serve intent over preference
(https://humanetech.substack.com/p/redesigning-chatgpt-slack-and-xtwitter). Reading: an auto-start
timer is respectful when the user chose it and its length, Off is one tap away, the alert can be
silent, and the countdown stays peripheral.

### Rest lengths from exercise science

ACSM 2009: 3 to 5 min for strength, 1 to 2 min for hypertrophy, under 90 s for endurance
(https://pubmed.ncbi.nlm.nih.gov/19204579/). Schoenfeld et al. 2016: 3 min beat 1 min for both
strength and muscle thickness in trained men (https://pubmed.ncbi.nlm.nih.gov/26605807/); Grgic et al.
2017 review agrees for hypertrophy. Hevy's guide: 3 to 5 min strength, 1.5 to 3 min hypertrophy
(https://www.hevyapp.com/rest-between-sets/); Strong defaults to 2:00, Liftosaur to 180 s, StrongLifts
to 3 min. If Ironkeep offers presets, 90 s, 2 min and 3 min cover the evidence; 60 s is a user choice,
not a default.

## Anti-patterns to avoid

- **Hidden controls.** Norman and Nielsen: gestures are invisible and undo "seems mostly to have been
  forgotten" (https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/); NN/g: hidden
  navigation drops discoverability more than 20% (https://www.nngroup.com/articles/hamburger-menus/);
  iOS swipe-revealed widgets "have no explicit signifiers" (https://hal.archives-ouvertes.fr/hal-02293836).
  In the wild: Strong's Skip only after a full-screen tap; Hevy's superset and timer settings behind a
  grey Settings button at the bottom of a session (https://www.hevyapp.com/features/what-are-supersets/);
  FitLens #103, a scroll that swipes away and discards the workout
  (https://github.com/Flameingskull/FitLens/issues/103). Zen: visible Skip and +/-, visible prev/next,
  tappable strip, destructive actions only behind a deliberate gesture plus undo.
- **Accidental taps.** jim #318 and #491 (above); gym-tracker-android PR #76; Boostcamp reviewer who
  "accidentally swiped and removed a workout" with the developer noting swipe sensitivity
  (https://apps.apple.com/us/app/1529354455?see-all=reviews&platform=ipad); Fitbod reviewer asking for
  a warning on "log all sets" (https://play.google.com/store/apps/details?id=com.fitbod.fitbod);
  HeavySet reviewer hitting Log "again, and again, thinking it didn't register"
  (https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310); accidental "Workout Done" with
  no undo on Wahoo (https://wahoox.forum.wahoofitness.com/t/how-to-undo-workout-done-box/9608). Zen:
  idempotent log, haptic so the tap is felt, undo toast, confirmation only for Finish.
- **Losing your place.** Liftosaur #252 and #571 (https://github.com/astashov/liftosaur/issues/571:
  "hard to know where you are, what's done, and what's next"); roogo-fitness #76; openGym changelog;
  gym-tracker-android PR #76: "A phone on the floor beside the bench locks itself halfway through a
  two-minute rest"; Bevel feedback asking for keep-awake like Strava and SmartGym
  (https://feedback.bevel.health/feature-requests/p/keep-screen-alive-during-workout); Fitbod Watch
  closing whole supersets at once (https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543?see-all=reviews).
  Zen: state-based place, keep-awake, "Set n of N" and the next lift's name always visible.
- **Modal overload.** NN/g: modals cost time "rebuilding their place in the original task"
  (https://www.nngroup.com/articles/modal-nonmodal-dialog/); Nielsen 2025: "a tax on the user's
  attention" (https://www.uxtigers.com/post/ux-roundup-20250609). JuggernautAI had to halve its
  per-session readiness questionnaire (https://apps.apple.com/app/id1515756471); Apple Watch users ask
  to turn off the effort-rating prompt (https://discussions.apple.com/thread/255789290); PushPress
  confetti without an off switch; TrainerRoad users asked for a confetti toggle
  (https://www.trainerroad.com/forum/t/progress-confetti-future-possible-request/64062); 11.9% of 809
  surveyed apps show celebration screens, concentrated in fitness
  (https://experiments.lazyweb.com/research/what-percent-of-apps-have-a-celebration-screen.md). Zen:
  no sheet between sets; RPE, PR and check-ins inline or at session end.
- **Nagging and streaks.** Etkin 2016: measurement raised activity but lowered enjoyment and continued
  engagement (https://www.fuqua.duke.edu/duke-fuqua-insights/etkin-counting-steps); Silverman and
  Barasch 2023: broken streaks shown in a log cut engagement regardless of real behaviour
  (https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions);
  Apple Watch ring guilt in Fortune (https://www.fortune.com/well/2025/01/24/apple-watch-bullied-burn-calories-close-rings-obsession-fitness-trackers-notifications)
  and Apple's pause-rings response (https://support.apple.com/en-bw/guide/watch/apd29b30023c/watchos);
  Duolingo notifications called "guilt tripping"
  (https://lr.psf.lt/r/duolingo/comments/1hgj15n/duolingo_is_deteriorating_fast/m2om0l7/?context=3).
  Zen: counts and history as information ("Set 2 of 4, next: incline press"), never deficits.
- **Dark mode, brightness, timeout, text size.** Freeletics rep indicator invisible in dark mode
  (https://forum.freeletics.com/t/exercise-indicator-turns-white-in-dark-mode/1381); Fitbit text over
  images unreadable outdoors (https://community.fitbit.com/t5/Ionic/Activity-display-picture/td-p/2368728);
  Trainerize tiny in-workout fonts; StrengthLog's XL timer and RepCount's large-text layout fix show the
  demand. Zen: system theme, AA contrast in both themes, Dynamic Type up to accessibility sizes for the
  three numbers that matter, keep-awake while open.

## Verification gaps

- Visual styling of active, done and upcoming rows in Hevy, Strong, Alpha Progression, Boostcamp,
  Fitbod (phone), KeyLifts, HeavySet, Gymverse, JuggernautAI: no text source describes it.
- Whether JuggernautAI, KeyLifts or HeavySet have a one-set-at-a-time or big-button screen as reputed.
- Skip and +/- controls for Boostcamp, JuggernautAI, Setgraph, RepCount, Legend, KeyLifts, Gymverse;
  Strong's increment size.
- Keep-awake for Strong, Boostcamp, JuggernautAI, KeyLifts, HeavySet, RepCount, Gymverse; haptics for
  every app except Hevy (release note), Liftosaur (documented) and Fitbod Watch.
- Any set or rep logging in watchOS 26/27 or iOS 26 Fitness; Fitbit automatic rep counting.
- Research: MIT Touch Lab fingertip figure; error rate by target size with wet or gloved hands;
  checkmark versus strike-through; ISO 15008 exact table; Dobres 2017 size results.

## Sources

Apps and stores: https://legend-tracker.com/feature/focus-mode-for-workouts/ ·
https://legend-tracker.com/feature/break-timer-set-timer-and-stopwatch/ ·
https://legend-tracker.com/feature/log-workouts-on-apple-watch/ ·
https://legend-tracker.com/feature/progressive-overload-as-you-train/ ·
https://apps.apple.com/us/app/gym-log-workout-tracker-legend/id6452722261 ·
https://www.hevyapp.com/features/track-exercises/ · https://www.hevyapp.com/features/how-to-write-sets-and-reps/ ·
https://www.hevyapp.com/features/track-workouts/ · https://www.hevyapp.com/hevy-tutorial/ ·
https://www.hevyapp.com/features/workout-rest-timer/ · https://www.hevyapp.com/features/live-activity/ ·
https://www.hevyapp.com/features/workout-settings/ · https://www.hevyapp.com/features/what-are-supersets/ ·
https://www.hevyapp.com/features/workout-log/ · https://www.hevyapp.com/rest-between-sets/ ·
https://www.hevyapp.com/compare/strong/ · https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350 ·
https://www.apkmirror.com/apk/hevy-gym-workout-tracker/hevy-gym-log-workout-tracker/hevy-gym-log-workout-tracker-1-29-14-release/ ·
https://help.strongapp.io/article/229-my-first-workout · https://help.strongapp.io/article/231-rest-timer ·
https://help.strongapp.io/article/166-set-tags · https://help.strongapp.io/article/224-log-a-workout-on-apple-watch ·
https://help.strongapp.io/article/222-strong-for-apple-watch · https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577 ·
https://github.com/traxon99/jim/issues/323 · https://alphaprogression.com/en/blog/alpha-progression-guide ·
https://alphaprogression.com/en/glossary/rest-timer · https://alphaprogression.com/en/blog/alpha-progression-vs-fitbod ·
https://apps.apple.com/us/app/gym-workout-alpha-progression/id1462277793 · https://respectmyregion.com/alpha-progression-review-2026/ ·
https://apps.apple.com/app/id1515756471 · https://www.juggernautai.app/blog/juggernautai-v3-0-is-here ·
https://help.jtsstrength.com/en/articles/3-how-juggernautai-is-individualized-to-you ·
https://help.jtsstrength.com/en/articles/2-all-about-rpe-and-rir · https://garagegymreviews.com/juggernautai-review ·
https://www.boostcamp.app/workout-tracker · https://www.boostcamp.app/features/rest-timer ·
https://www.boostcamp.app/blogs/tips-and-tricks-to-using-boostcamp-app · https://www.boostcamp.app/compare/workout-tracking ·
https://apps.apple.com/us/app/boostcamp-workout-tracker/id1529354455 · https://apps.apple.com/us/app/1529354455?see-all=reviews&platform=ipad ·
https://help.fitbod.me/hc/en-us/articles/30721437384215-How-to-Navigate-the-Exercise-Details-Screen ·
https://help.fitbod.me/hc/en-us/articles/360006340194 · https://help.fitbod.me/hc/en-us/articles/360006335593-Editing-Workouts-in-Fitbod ·
https://help.fitbod.me/hc/en-us/articles/360033133174 · https://help.fitbod.me/hc/en-us/articles/360006499194-Apple-Watch ·
https://help.fitbod.me/hc/en-us/articles/4406074415383-WearOS-on-Android · https://fitbod.me/blog/a-better-workout-tab/ ·
https://play.google.com/store/apps/details?id=com.fitbod.fitbod · https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543?see-all=reviews ·
https://www.routetoretire.com/hwil-fitbod-app/ · https://www.hotelgyms.com/blog/how-to-use-the-fitbod-app ·
https://keylifts.com/product · https://keylifts.helpscoutdocs.com/article/28-how-do-pr-sets-work ·
https://keylifts.helpscoutdocs.com/article/11-how-can-i-delete-a-set ·
https://keylifts.helpscoutdocs.com/article/37-weights-will-be-automatically-filled-in-for-assistance-exercises ·
https://apps.apple.com/us/app/keylifts-531-workout-log/id1437949461 ·
https://www.liftosaur.com/features/workout-screen · https://www.liftosaur.com/features/rest-timer ·
https://www.liftosaur.com/features/lock-screen-and-notifications · https://www.liftosaur.com/features/apple-watch ·
https://www.liftosaur.com/features/set-types · https://www.liftosaur.com/features/supersets ·
https://www.liftosaur.com/features/workout-history · https://www.liftosaur.com/features/first-run-and-settings ·
https://www.liftosaur.com/docs/liftoscript/ · https://github.com/astashov/liftosaur ·
https://raw.githubusercontent.com/astashov/liftosaur/master/CHANGELOG.md ·
https://apps.apple.com/us/app/liftosaur-scriptable-workouts/id1661880849 ·
https://github.com/astashov/liftosaur/issues/66 · https://github.com/astashov/liftosaur/issues/252 ·
https://github.com/astashov/liftosaur/issues/346 · https://github.com/astashov/liftosaur/issues/545 ·
https://github.com/astashov/liftosaur/issues/571 · https://github.com/astashov/liftosaur/issues/574 ·
https://github.com/astashov/liftosaur/issues/587 · https://github.com/astashov/liftosaur/issues/593 ·
https://github.com/astashov/liftosaur/issues/642 · https://github.com/astashov/liftosaur/issues/668 ·
https://gymverse.app/ · https://screensdesign.com/showcase/gymverse-gym-workout-planner ·
https://justuseapp.com/en/app/1048454034/workout-gym-workout-planner/reviews ·
https://apps.apple.com/us/app/gymverse-gym-workout-planner/id1048454034 · https://zapier.com/blog/best-fitness-tracking-apps/ ·
https://setgraph.app/ · https://setgraph.app/features/workout-log ·
https://setgraph.app/articles/fast-workout-tracking-with-swipe-actions-in-setgraph ·
https://setgraph.app/articles/tracking-sets-and-reps-for-strength-training-a-smarter-approach ·
https://setgraph.app/articles/get-the-most-out-of-setgraph-s-rest-timer ·
https://setgraph.app/articles/setgraph-9-41-notepad-mode-for-faster-logging ·
https://setgraph.app/articles/how-to-track-supersets-dropsets-and-advanced-workout-structures ·
https://setgraph.app/reviews · https://apps.apple.com/us/app/setgraph-workout-tracker/id1209781676 ·
https://apps.apple.com/au/app/setgraph-workout-log/id1209781676 ·
https://heavyset.app/ · https://heavyset.app/help/logging-workouts/workout-logger ·
https://heavyset.app/help/logging-workouts/rest-timer · https://apps.apple.com/us/app/heavyset-gym-workout-log/id1171500310 ·
https://mail.applevis.com/apps/ios/sports-activities/heavyset-gym-workout-log ·
https://www.repcountapp.com/ · https://www.repcountapp.com/support/article/15-how-to-log-a-workout ·
https://www.repcountapp.com/support/article/22-weight-and-reps-are-not-carried-over-to-the-next-workout-what-am-i-doing-wrong ·
https://www.repcountapp.com/support/article/39-what-is-routine-targets ·
https://www.repcountapp.com/support/article/90-how-do-i-start-the-rest-timer-automatically ·
https://www.repcountapp.com/support/article/77-troubleshooting-the-ios-live-activity-lock-screen-widget ·
https://www.repcountapp.com/support/article/51-how-can-i-stop-the-timer-to-buzz-every-second ·
https://www.repcountapp.com/articles/best-workout-tracker-iphone · https://www.repcountapp.com/articles/best-free-workout-tracker-iphone ·
https://apps.apple.com/us/app/repcount-gym-workout-tracker/id594982044 ·
https://support.stronglifts.com/article/25-rest-timer · https://support.stronglifts.com/article/126-live-activities ·
https://help.strengthlog.com/help-article/how-to-use-the-timer ·
https://help.macrofactorapp.com/en/articles/320-changing-rest-time-during-a-workout ·
https://help.everfit.io/en/articles/4701773-how-to-turn-the-rest-timer-on-off

Platforms: https://support.apple.com/en-us/123002 ·
https://www.apple.com/newsroom/2025/06/watchos-26-delivers-more-personalized-ways-to-stay-active-and-connected/ ·
https://support.apple.com/guide/watch/start-a-workout-apdd16e8761a/watchos ·
https://support.apple.com/guide/watch/start-a-workout-apdd16e8761a/26.0/watchos/26.0 ·
https://support.apple.com/guide/watch/apd95450de2a/26.0/watchos/26.0 ·
https://support.apple.com/guide/watch/create-a-custom-workout-apd66fcd5c5c/watchos ·
https://support.apple.com/guide/watch/customize-workout-views-apd6b0679060/watchos ·
https://support.apple.com/guide/watch/apde0be691be/watchos ·
https://support.apple.com/guide/iphone/start-a-workout-in-fitness-iph8475d8510/26/ios/26 ·
https://support.apple.com/guide/fitness-plus/start-pause-and-end-a-workout-or-meditation-apd6c5dda8cf/ios ·
https://support.apple.com/guide/fitness-plus/customize-experience-a-workout-meditation-apd12f665e17/ios ·
https://support.apple.com/en-bw/guide/watch/apd29b30023c/watchos · https://discussions.apple.com/thread/255789290 ·
https://support.google.com/googlehealth/answer/14237206 · https://support.google.com/googlehealth/answer/15400594 ·
https://support.google.com/googlehealth/answer/16577503 · https://support.google.com/googlehealth/answer/16959617 ·
https://support.google.com/googlehealth/answer/15402636 · https://support.google.com/googlehealth/answer/14236510 ·
https://support.google.com/googlepixelwatch/answer/16788035 · https://support.google.com/fit/answer/6233623 ·
https://support.google.com/fit/answer/6056874 · https://support.google.com/fit/answer/6075066 ·
https://blog.google/products-and-platforms/devices/pixel/pixel-watch-5/ ·
https://support.google.com/accessibility/android/answer/11183305

Guidelines: https://developer.apple.com/design/human-interface-guidelines/accessibility ·
https://developer.apple.com/design/human-interface-guidelines/buttons ·
https://developer.apple.com/design/human-interface-guidelines/layout ·
https://developer.apple.com/design/human-interface-guidelines/tab-bars ·
https://developer.apple.com/design/human-interface-guidelines/toolbars ·
https://developer.apple.com/design/human-interface-guidelines/typography ·
https://developer.apple.com/design/human-interface-guidelines/playing-haptics ·
https://developer.apple.com/design/human-interface-guidelines/motion ·
https://developer.apple.com/design/human-interface-guidelines/color ·
https://developer.apple.com/design/human-interface-guidelines/designing-for-watchos ·
https://developer.apple.com/design/human-interface-guidelines/live-activities ·
https://developer.apple.com/design/human-interface-guidelines/workouts ·
https://developer.apple.com/design/human-interface-guidelines/page-controls ·
https://developer.apple.com/design/tips/ ·
https://developer.apple.com/documentation/uikit/uiapplication/isidletimerdisabled ·
https://m3.material.io/foundations/designing/structure · https://m3.material.io/components/floating-action-button/guidelines ·
https://m3.material.io/components/toolbars/guidelines · https://m3.material.io/styles/typography/applying-type ·
https://m3.material.io/styles/motion/transitions/applying-transitions · https://m3.material.io/foundations/designing/color-contrast ·
https://m3.material.io/components/carousel/guidelines · https://m2.material.io/develop/web/supporting/touch-target ·
https://www.mdui.org/en/design/1/components/steppers.html · https://v4.material-ui.com/components/steppers/ ·
https://developer.android.com/guide/topics/ui/accessibility/apps ·
https://developer.android.com/guide/topics/ui/accessibility/principles ·
https://developer.android.com/about/versions/14/features ·
https://developer.android.com/develop/background-work/background-tasks/awake/screen-on ·
https://developer.android.com/develop/ui/views/haptics/haptic-feedback ·
https://developer.android.com/develop/ui/views/haptics/haptics-principles ·
https://developer.android.com/reference/android/view/HapticFeedbackConstants ·
https://developer.android.com/docs/quality-guidelines/wear-app-quality ·
https://docs.expo.dev/versions/latest/sdk/keep-awake/ · https://reactnative.dev/docs/accessibilityinfo ·
https://learn.microsoft.com/en-us/windows/apps/design/input/guidelines-for-targeting ·
https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html ·
https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html ·
https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html ·
https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html ·
https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html

Research and practitioner: https://www.microsoft.com/en-us/research/wp-content/uploads/2006/01/parhi-mobileHCI06.pdf ·
https://www.nngroup.com/articles/touch-target-size/ ·
https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php ·
https://www.uxmatters.com/mt/archives/2017/03/design-for-fingers-touch-and-people-part-1.php ·
https://www.uxmatters.com/mt/archives/2017/05/design-for-fingers-touch-and-people-part-2.php ·
https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/ ·
https://dl.acm.org/doi/10.1145/2037373.2037396 · https://userpages.umbc.edu/~skane/pubs/mobilehci08.pdf ·
https://eprints.lancs.ac.uk/id/eprint/42490/ · https://eprints.gla.ac.uk/117068/1/117068.pdf ·
https://mynkgoel.github.io/pdfs/WalkType.pdf · https://mynkgoel.github.io/pdfs/raincheck.pdf ·
https://patents.google.com/patent/US9310934 · https://patents.google.com/patent/US9921743 ·
https://stacks.cdc.gov/view/cdc/194429/cdc_194429_DS1.pdf · https://doi.org/10.1145/2556288.2557354 ·
https://www.medien.ifi.lmu.de/pubdb/publications/pub/le2018fingersrange/le2018fingersrange.pdf ·
https://pmc.ncbi.nlm.nih.gov/articles/PMC3428264 · https://pubmed.ncbi.nlm.nih.gov/21499163/ ·
https://standards.iteh.ai/catalog/standards/iso/d07adfe7-f551-4557-bb09-7236d8491cf6/iso-15008-2017 ·
https://www.nhtsa.gov/document/visual-manual-nhtsa-driver-distraction-guidelines-vehicle-electronic-devices-0 ·
https://dspace.mit.edu/handle/1721.1/96509 · https://pmc.ncbi.nlm.nih.gov/articles/PMC5213401 ·
https://www.nei.nih.gov/eye-health-information/eye-conditions-and-diseases/color-blindness ·
https://www.nngroup.com/articles/visual-indicators-differentiators/ ·
https://www.nngroup.com/articles/visual-treatments-accessibility/ ·
https://www.smashingmagazine.com/2017/10/nailing-accessibility-design/ ·
https://club.useclear.com/t/strikethrough-legibility/1436 · https://doi.org/10.1037/0033-295X.101.1.80 ·
https://www.cambridge.org/core/journals/behavioral-and-brain-sciences/article/magical-number-4-in-shortterm-memory-a-reconsideration-of-mental-storage-capacity/44023F1147D4A1D44BDC0AD226838496 ·
https://www.nngroup.com/articles/wizards/ · https://www.nngroup.com/articles/designing-effective-carousels/ ·
https://www.nngroup.com/articles/mobile-carousels/ · https://baymard.com/blog/page-control-ui ·
https://baymard.com/blog/checkout-flow-ux-optimization ·
https://www.nngroup.com/articles/modal-nonmodal-dialog/ · https://www.nngroup.com/articles/confirmation-dialog/ ·
https://www.nngroup.com/articles/hamburger-menus/ · https://www.nngroup.com/articles/mobile-ux/ ·
https://www.nngroup.com/articles/push-notification/ · https://www.nngroup.com/articles/indicators-validations-notifications/ ·
https://www.uxtigers.com/post/ux-roundup-20250609 · https://jnd.org/gestural-interfaces-a-step-backwards-in-usability/ ·
https://hal.archives-ouvertes.fr/hal-02293836 · https://calmtech.com/papers/coming-age-calm-technology ·
https://www.caseorganic.com/post/principles-of-calm-technology ·
https://humanetech.substack.com/p/redesigning-chatgpt-slack-and-xtwitter · https://arxiv.org/pdf/2001.02479 ·
https://ceeconference.vse.cz/proceedings-2026/c36/ ·
https://marketing.wharton.upenn.edu/wp-content/uploads/2016/10/Etkin-Jordan-11-12-15-Hidden-Cost.pdf ·
https://www.fuqua.duke.edu/duke-fuqua-insights/etkin-counting-steps ·
https://udspace.udel.edu/items/42ce576b-8e1f-429a-8541-e29e48dbcfbb ·
https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions ·
https://www.fortune.com/well/2025/01/24/apple-watch-bullied-burn-calories-close-rings-obsession-fitness-trackers-notifications ·
https://lr.psf.lt/r/duolingo/comments/1hgj15n/duolingo_is_deteriorating_fast/m2om0l7/?context=3 ·
https://experiments.lazyweb.com/research/what-percent-of-apps-have-a-celebration-screen.md ·
https://updates.pushpress.com/en/members-app-v3180 ·
https://www.trainerroad.com/forum/t/progress-confetti-future-possible-request/64062 ·
https://pubmed.ncbi.nlm.nih.gov/19204579/ · https://pubmed.ncbi.nlm.nih.gov/26605807/ ·
https://pubmed.ncbi.nlm.nih.gov/19691365/

Issues, forums and reviews on anti-patterns: https://github.com/traxon99/jim/issues/318 ·
https://github.com/traxon99/jim/issues/491 · https://github.com/traxon99/jim/pull/240 ·
https://github.com/thomasz-nyt/gym-tracker-android/pull/76 · https://github.com/Roogry/roogo-fitness/issues/76 ·
https://github.com/bpronin90/kilo/issues/1446 · https://github.com/Flameingskull/FitLens/issues/103 ·
https://github.com/saroj990/pulseworkout/issues/12 · https://github.com/chino4242/refactor-athletics/issues/58 ·
https://github.com/wger-project/flutter/issues/305 · https://github.com/wger-project/flutter/issues/784 ·
https://github.com/wger-project/flutter/issues/1245 · https://github.com/fvnky07/benchmrk/issues/54 ·
https://newreleases.io/project/github/DuarteSantos8/openGym/release/v1.2.3 ·
https://feedback.bevel.health/feature-requests/p/keep-screen-alive-during-workout ·
https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/45891910-change-the-regular-workout-functionality-to-have-a ·
https://ideas.abcfitness.com/forums/167887-coach-trainer-abc-trainerize/suggestions/50876828-more-bigger-bolder-fonts-please ·
https://forum.freeletics.com/t/exercise-indicator-turns-white-in-dark-mode/1381 ·
https://community.fitbit.com/t5/Ionic/Activity-display-picture/td-p/2368728 ·
https://wahoox.forum.wahoofitness.com/t/how-to-undo-workout-done-box/9608 ·
https://liliiamandrino.medium.com/gymaholic-app-review-ed0f4683d7b2
