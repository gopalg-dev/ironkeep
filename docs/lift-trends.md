# Lift performance trends

Updated 2026-10-31 following the deadlift (5,5,6 → 6,6,6) and duplicate Dead Bug reports.

## Evidence and limits

Increasing repetitions at a fixed load is a valid way to progress training, alongside increasing load. The randomized trial by Plotkin et al. (2022) compared these approaches: https://pubmed.ncbi.nlm.nih.gov/36199287/. ACSM's 2026 position stand distinguishes strength, hypertrophy, endurance and other outcomes: https://acsm.org/science-spotlight-acsm-releases-new-position-stand-on-resistance-training/.

These sources support recognizing repetitions and load. They do **not** prescribe this app's labels, 5% decline threshold, idle timeout, or set-matching algorithm. Those are explicit product rules. An estimated score is not a strength measurement. Logs cannot establish equivalent technique, range of motion, rest, assistance or effort, and a decline does not establish fatigue or prescribe a deload.

## Identity and comparisons

- A lift's Stats identity is its Unicode-normalized, case-insensitive name with collapsed whitespace, plus logging mode. Old IDs and plan-day copies feed the same derived history. Stored IDs and workouts are not rewritten.
- Distinct variant names and weighted/bodyweight/timed modes stay separate. There is no fuzzy matching of different movement names. Same-named custom variants should use distinct names when they represent different movements.
- Aliases within one workout combine into one session; repeat sessions remain separate observations. Every identity has one status and contributes once to filter counts.
- Compare the latest two finished sessions, using valid positive completed sets. Ignore unfinished sessions, future timestamps, empty/invalid sets and invalid dates.
- Match the same number of strongest sets. Adding a set or session alone cannot create an improvement. Dropping sets cannot produce a positive classification by selecting a smaller sample. A deliberate reduction in volume alone is not a performance decline.
- At matched identical loads, compare total load × reps (equivalent to total reps at a uniform load). Mixed-load work therefore credits an extra heavier rep correctly. Across different loads, compare mean Epley estimates over matched sets. These estimates have the usual limitations of rep-based predictions, especially at high repetitions or different effort.
- Bodyweight work uses reps when either weigh-in is missing; when both exist, include each session's bodyweight. Never compare a rep count to a kilogram estimate. Timed work uses seconds.

## Status rules

| Status   | Rule                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Climbing | Latest comparable performance increased, even if an old all-time best was higher.                                                 |
| Holding  | No improvement, with a decline smaller than 5%, or fewer completed sets prevent a positive conclusion.                            |
| Slipping | Latest comparable performance decreased by at least 5%. This describes the latest observation, not a diagnosed long-term decline. |
| Idle     | More than 14 × 24 hours since the latest valid session, regardless of when the best set was recorded.                             |
| New      | No valid session or no comparable preceding session. A change in logging mode creates a separate identity.                        |

Holding is not automatically a plateau. Stall alerts require an older baseline, at least three sessions in four weeks, and no session improvement during that window. The two-week movement/deload check also counts improvements across completed sets, compares only lifts with compatible baselines in the preceding two weeks, and returns no verdict when there is nothing to compare. Existing effort gates remain. Early set-ramp eligibility retains its three-observed-week evidence gate before a flat session can block it; a clear decline still blocks it immediately.

Trend duration counts consecutive calendar weeks with that status at the final session of each week. Missing weeks break the run. Idle duration counts weeks since crossing the inactivity threshold. If a selected filter loses its last member after history changes, the view returns to All.

Best-set charts, best-set change columns and personal records retain their explicit best-set meaning. More work across sets may correctly show Climbing with a flat best-set chart. Report attention uses the same combined histories and classification as Stats; period bests remain best-set records.

## Regression evidence

`tests/lift-performance.test.ts`, `tests/trend.test.ts`, `tests/gains.test.ts`, `tests/effort.test.ts`, `tests/ramp.test.ts`, report and repository integration tests cover the reported examples, identity collisions, set counts, mixed loads, missing weigh-ins, time, boundaries, ordering, future/unfinished data, inactivity dates and filter partitions. The rep-increase invariant runs across 432 combinations of weighted, bodyweight and timed work. Equivalent shared source/tests are ported to mobile after the web suite passes.

Browser verification mounts the actual Lifts component with five representative statuses and alias histories. It checks each filter, expandable charts and fallback after Holding disappears, at 360/412/1280 widths in light/dark. A synthetic backup and maintained Maestro flow verify the same scenarios on a disposable Android emulator. Synthetic data is never installed on the user's phone.

On mobile, the equivalent unit tests live in `src/lib/logic/`; the maintained device flow is `.maestro/lift-trends.yaml`. Final runtime results and screenshots are archived in the sibling web repository under `audit/mobile-fixes/trend-ui-verification.json` and `trend-native-verification.json`.
