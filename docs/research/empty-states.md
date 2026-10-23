# Empty states

Research for making Ironkeep's blank screens engaging without breaking the app's own rules. Written
2026-10-23. Sources at the end.

## The rule we must not break

Ironkeep's contract (CLAUDE.md, `00-requirements.md`): the app surfaces stats, facts and controls and
**never pushes the user toward a decision**. No "do it now", no streak guilt, no "sessions left". And
**no explanatory copy**: no page subtitles, no "tap X to" hints; only data, controls, and warnings
that state a consequence. The Guide is the one screen allowed to explain.

This clashes head-on with the usual empty-state advice.

## What the field says (and where it conflicts)

Common best practice for empty states (NN/g-style, Material, practitioner guides):
- Tell the user **why** the screen is empty and **what to do next**, in specific copy, not "no data".
- Give **one primary action**, sized for touch, with at most one quiet secondary link.
- Add a **light illustration** that supports the screen but is not itself actionable and does not sit
  on the critical path.
- Classify the state: **first-run**, **user-cleared**, **no-results** (an error/search miss), and do
  not use one generic layout for all three.
- For content apps, Material suggests **starter content** so the screen is not empty at all.

The conflict: "tell them what to do next" and "one primary action / CTA" are exactly the nudge and the
explanatory hint our app forbids. So we take the parts that fit and drop the parts that nag.

## What fits Ironkeep

Keep: the classification (first-run vs no-results differ), a calm supporting illustration, and above
all Material's **starter content / show-don't-tell** idea. Drop: CTA buttons, "what to do next" copy,
anything urgent.

Three directions, from plainest to richest:
- **A — A quiet line.** What we have now on Lifts: a single muted fact, "Nothing logged yet." Honest
  and on-ethos, but not engaging.
- **B — A ghost of the real screen (recommended).** Draw the page's own layout as a faint, non-
  interactive placeholder: a ghost chart and a few ghost rows on Lifts, a ghost report on Report. It
  shows what the screen _will_ be once there is data, which is engaging and informative, yet says
  nothing, asks for nothing, and reuses the real components. This is "show, don't tell" and it reads as
  data-in-waiting, not a prompt.
- **C — A calm illustration and a fact.** A small tasteful graphic (in the app's palette, not
  actionable) over a plain factual line. Engaging through art, still no CTA. Needs the custom-picture
  work (still open on the checklist) to look right.

A and C can be combined; B is the strongest fit for a logbook because the "interesting" part is a
preview of the user's own future data, not decoration or a pitch.

## The pages that can go blank

- **Stats → Lifts** — no logged strength yet (first-run). Today: "Nothing logged yet."
- **Report** — a fresh period with no sessions: empty "Went well" / "Needs attention", flat lines.
- **Stats → Body** — no bodyweight and no tape yet: the chart and tape sections are hidden, leaving
  the two "Log" rows alone.
- **Stats → Sessions** — not blank (it shows zeros, the calendar and the body map), so it needs no
  empty state, only a check that the zeros read calmly.
- **Lifts → Recent bests** — none yet (a sub-section, first-run).
- **Library search** — a search or filter that matches nothing (no-results, distinct from first-run).
- **Snapshots / Your data** — already say "None yet" in a row; fine as is.

First-run (Lifts, Report, Body, Recent bests) wants the ghost-preview or illustration treatment;
no-results (Library search) wants a plain "nothing matches" line, not a preview.

## Recommendation

Direction **B** (ghost preview) for the first-run pages, built from faint copies of each page's real
components so the empty and filled screens always agree, with a plain muted line under them. Direction
A's line stays as the floor. Hold C until the custom pictures exist. This keeps every blank screen
engaging and informative while obeying the no-nudge, no-explanatory-copy rule.

## Decision (2026-10-23, after a first build)

Direction B (the ghost) was built first and read as a loading skeleton, not an empty state. Direction C was then tried as hand-drawn inline SVGs (a climbing chart, a scale, a bar card) and also rejected as not beautiful enough. Decision: **wait for the custom-picture (Blender / SVG) work** to make one consistent, on-brand illustration set, recoloured to the tokens. Until then the empty states show only a calm centred line. A shared `EmptyState` (`src/components/empty-state.tsx`) holds the art and the one line; the three drawings are inline SVG in the muted token colour. react-native-reusables has no `Empty` component to lean on, so this is a small custom one, per the "build custom when none fits" rule. The ghost `Ghost`/`GhostBlock` component was removed.

## Sources

- Material Design, Empty states: https://m2.material.io/design/communication/empty-states.html
- NN/g-style and practitioner guides on empty-state UX (uxpin, eleken, mobbin, floow.design, babich.biz)
- Ironkeep's own rules: `CLAUDE.md`, `docs/00-requirements.md` (no nudges, no explanatory copy)
