# Ironkeep: design brief

Status: draft 1, 2026-10-21, canvas published. The canvas is "Ironkeep screens":
https://claude.ai/artifact/JjZZTUxBdyqfhz1ravLCLQ (private until shared). Full-height screenshots of
every artboard are in `design/screens/`, the artboard sources in `design/canvas-source/`. Sign-off
closes Gate 2.

## Keeping the canvas true

The canvas is the source of truth for the look, and it stays current: every UI change made in code
during the build is mirrored on the matching artboard (`design/canvas-source/`), republished, and
re-screenshotted in the same step. Nothing ships that the canvas does not show.

## The ask

Same features and screens as the web app, in a modern and minimalist look. Numbers stay the hero.
The two copy rules hold: no explanatory text, no pushing decisions.

## Subject

Iron, a keep, a logbook. The memorable thing in the app is the moment after a set: a big weight,
a big rep count, one tap. Everything else is quiet.

## Direction: graphite and chalk, one colour per screen

The web app is blue-slate with coloured day tiles, hairline lists and a photo on every row. The
mobile app drops the lines and most of the chrome. Surfaces are neutral; the only colour on a
screen is the one that means something: the day's family colour (push red, pull blue, legs yellow)
on that day's primary action, title mark and chart. Green keeps its one job: done.

What a visitor should feel: a well-made notebook. Calm, legible at arm's length, fast.

## Tokens

### Colour (Slate look, the default; the other looks swap these values)

The source of truth is now `src/global.css` in OKLCH (hex kept as comments). The table below is the
original brief; the canvas's "Design system: colour tokens" board is generated from the CSS with
`bun run design:tokens`, so it is the current reference.

| Token              | Light              | Dark               | Used for                                   |
| ------------------ | ------------------ | ------------------ | ------------------------------------------ |
| `background`       | `#F6F6F4` chalk    | `#121315` graphite | the screen                                 |
| `surface`          | `#FFFFFF`          | `#1C1E21`          | grouped lists, sheets, fields              |
| `surface-2`        | `#EEEEEB`          | `#26292D`          | pressed rows, segmented controls, chips    |
| `foreground`       | `#17191C`          | `#F2F2EF`          | text and ink buttons                       |
| `muted-foreground` | `#6B7078`          | `#9AA0A8`          | secondary text (4.5:1 on both backgrounds) |
| `border`           | `#E3E3DF`          | `#2E3136`          | only where a field needs an edge           |
| `primary`          | `foreground`       | `foreground`       | the one ink button on a screen             |
| `day-push`         | `#D23B3B`          | `#E05A5A`          | push, chest, shoulders                     |
| `day-pull`         | `#2F63C9`          | `#5B8AE8`          | pull, back                                 |
| `day-legs`         | `#D9A400`          | `#E8BD2E`          | legs, lower                                |
| `day-mixed`        | `muted-foreground` | `muted-foreground` | upper, full, arms, core                    |
| `success`          | `#1F8A4C`          | `#3FB36E`          | done                                       |
| `destructive`      | `#C8322E`          | `#E0514C`          | delete, discard                            |

Day colours darken slightly from the web app's values so white text on them passes 4.5:1 in light
mode. Legs keeps dark ink. Pure white never fills a whole screen; chalk does.

### Type

Two cuts of one family, as the web app: **Barlow** (static weights 400 to 800) for everything and **Barlow Condensed** 600 on the titles and big numbers (the user's call on 2026-10-23, after a day on Barlow Semi Condensed; it replaced Plus Jakarta Sans, picked on 2026-10-21 from nine
options on the canvas, replacing Manrope). Weights do the hierarchy, not families. Tabular figures
through `tnum` where the font supports it; verify on a device, fall back to fixed-width digits.

| Role                               | Size / weight / tracking    |
| ---------------------------------- | --------------------------- |
| Hero number (set logger, big stat) | 64 / 800 / -0.03em, tabular |
| Screen title                       | 34 / 800 / -0.02em          |
| Section title                      | 20 / 700 / -0.01em          |
| Row title                          | 17 / 600                    |
| Body                               | 16 / 400 / line-height 1.5  |
| Secondary                          | 15 / 500, muted             |
| Caption                            | 13 / 500, muted             |

No all-caps labels. No single accented word in a title. Dates and counts are set tabular.

### Shape and space

- Spacing on a 4pt grid: 4, 8, 12, 16, 20, 24, 32, 48. Screen gutter 20. Section gap 32.
- Radius by hierarchy: sheets and dialogs 24, grouped lists and fields 16, buttons 14, chips and
  pills 999, thumbnails 12. Nothing else is rounded.
- No shadows on surfaces. A sheet gets a 50% scrim, not a shadow.
- Rows are 56 tall (64 with a thumbnail), separated by 1px of `background` showing between
  surface rows, never by a drawn line.
- Icons: lucide, 1.75 stroke, 22px in rows, 26px in the tab bar. Tab bar: three tabs, icon
  over a 12px label, active in `foreground`, inactive in `muted-foreground`.

## Layout concept

Each screen opens with its large title at the top left and no app bar. The title scrolls away.
One column, left aligned, 20px gutters. Content is grouped on white surfaces with 16px radius and
breathing room between groups. The one primary action sits at the bottom, full width, 56 tall, in
the day colour on Today and in ink elsewhere.

```
+----------------------------------+
|  Wednesday, Oct 21          ðŸ”¥ 4 |   caption + streak, quiet
|  â–ŒPull A                         |   title 34, a 4px day-colour bar at the left
|  6 exercises, 20 sets            |   secondary
|                                  |
|  +----------------------------+  |   surface group, radius 16
|  | [img] Pull-ups      4 Ã— 6-12| |   row 64
|  | [img] Barbell Row   4 Ã— 6-10| |
|  | ...                         | |
|  +----------------------------+  |
|                                  |
|  [     Start Pull A (blue)     ] |   primary, 56, day colour
|   Pick another day   Skip or done|   text buttons
|                                  |
|  Today     Plan     Stats        |   tab bar, safe area
+----------------------------------+
```

Set logger (the hero):

```
|  Pull-ups                 1 of 4 |
|  +----------------------------+  |
|  |   weight          reps     |  |   two big numbers side by side, 64/800
|  |    60             8        |  |   minus and plus as 44px quiet circles under each
|  |  (-)  (+)       (-)  (+)   |  |
|  |      [  Set 1 done  ]      |  |   one ink button; turns success green when done
|  +----------------------------+  |
|  â—‹ â— â—‹ â—‹   sets                  |   dots, tap to open a set
```

## Icons (review pass, 2026-10-21)

- Secondary actions are icon buttons: icon-only circles where the meaning is unmistakable (add a set, swap, previous, next, dismiss, share), icon plus a short label everywhere else (Pick a day, Skip or done, Log, Finish workout, Undo set 2, Tick all, Restore, Save changes).
- Rows that open something carry a leading icon: every Settings row, every Guide section, the plan actions (add a day, bring your own plan, reset), the export row on Stats.
- Icon source order: lucide first; custom pictures (Blender or generated SVG, the user picks) only for the logo, the eleven day kinds, the four effort faces and the three progression methods.
- One ink button per screen stays the rule; icon buttons are surface or soft.

## Principles

1. Space over lines. If a divider is needed, the gap does its job.
2. One colour per screen, and it means something.
3. Numbers large, words small. The word next to a number is a caption.
4. No chrome. Large titles, no app bars, three tabs, sheets for anything secondary.
5. Motion answers taps only: a sheet rising, a tick filling, a row expanding.

## Generic-tell check

Not cream and clay, not black and acid green, not broadsheet hairlines, not a card kit with one
radius and grey shadows, no all-caps eyebrows, no middle dots, no mono labels, no arrows, not
Inter or Geist. The database's default suggestion (indigo, violet, Inter on navy) was set aside
for that reason.

## What changes from the web app, screen by screen

- Day kinds get a picture: a rounded tile in the family colour with the kind's glyph (push, pull, legs, upper, lower, full, chest, back, shoulders, arms, core). It sits beside the screen title, in day lists, the day picker, the add-a-day grid, the past-day sheet and Zen. The glyph tiles on the canvas are placeholders for Blender renders of the same eleven kinds in light and dark (review feedback 2026-10-21).
- Hairline lists become grouped surfaces with gaps.
- The set logger becomes two big numbers with steppers under them instead of a row of small fields; sets are dots below.
- The side menu becomes a menu sheet from a round button at the top right (Report, Library, Guide, Settings, Look).
- Charts lose gridlines; the last point is labelled directly.
- Zen mode (user request, 2026-10-21) shows every set of the lift as a table: set number, last session's weight and reps, today's weight and reps, a tick on done sets, the current set highlighted, upcoming sets muted. The dots are gone. A caption names the last session's date and set count.
- Every artboard is a full-height page (user request): the frame grows with the content, nothing is clipped, the tab bar or action buttons sit at the end of the page.
- Thumbnails (12px radius, 40px) on Today, Plan and Library rows, and in the swap sheet (review feedback: Plan keeps its pictures).
- Dialogs become bottom sheets except destructive confirmations, which stay centred.
- The exercise editor's name field states where the name came from: a thumbnail plus a Library badge when it is linked to the library, a pencil plus a Custom badge when it was typed (review feedback: the web app left this ambiguous).
- Zen mode is variant B (user pick, 2026-10-21); A stays on the canvas for the record. A keeps every set in a table (set, last time, today) under the logger, the current set marked by a day-colour dot and bold text, no row fill. B shows one set at a time: a lift progress strip, one pill per set with two lines: today's value on top (done in green, current reads Now, upcoming a dash) and last session's value for that set underneath in grey, the plan's rep range inside the Reps label, weight and reps stacked so a three-digit weight fits, no "last time" sentence (the pills carry it), a 56px photo beside the title, a 72px done button in the thumb zone. After a set the same screen moves to the next set with Undo at hand. There is no rest timer and no rest advice: the header shows the session time and the time since the last set, a fact the user can use however they like (user rule, 2026-10-21). Research behind B: `research/zen-mode.md`.
- Font: Plus Jakarta Sans is the choice. Eight alternatives stay on the canvas for the record (Plus Jakarta Sans, Outfit, Instrument Sans, Figtree, Sora, DM Sans, Bricolage Grotesque, Urbanist), each as a Today screen and a set-logger screen, plus a one-page comparison in `design/font-options.png`. Pending the user's pick.

## Screens on the canvas

Light: setup (start, units, split, weight, age, progression), Today (next up, alerts deck, weekday
rest day, pick a day, skip), workout (logger, reps left, swap, finish, summary), zen, plan today-sync
dialog, stats past-day log and body map, plan (list, exercise editor, add day, import),
stats (lifts, sessions, session editor, body), report (dashboard, share), library (list, detail),
settings (main, data, import preview, restore, delete all), menu sheet, guide, migration failed.
Dark: the main screens (setup start, Today, workout, plan, stats lifts, settings data); the rest
follow the same tokens.
