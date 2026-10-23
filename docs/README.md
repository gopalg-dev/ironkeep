# Docs

Read in this order.

| File                       | What it is                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `00-requirements.md`       | The contract: goal, stack, features kept / dropped / new, data formats, quality bar, open points                                                       |
| `01-web-app-inventory.md`  | What the web app (`workout_plan_v3`) does today, screen by screen, with the data model, logic modules, export formats and tests                        |
| `research/stack.md`        | Expo, structure, component kit, styling, icons, fonts, charts, data layer, tooling, testing, build, OSS hygiene, with sources                          |
| `research/offline-data.md` | Local database, persistence across updates, OS backups, file APIs, export / import, email, snapshots, data-safety patterns, distribution, with sources |
| `02-design-brief.md`       | The look: direction, tokens, type, icons, Zen mode, and the canvas link                                                                                |
| `engineering.md`           | How the code is written: bun, TypeScript, Biome, structure, React Native rules, tests, git                                                             |
| `research/zen-mode.md`     | How focus-mode loggers work, with evidence and the rules adopted                                                                                       |
| `decisions.md`             | Why each decision was made and what it replaced                                                                                                        |
| `../CHECKLIST.md`          | The live status: what is planned, running and done, and the test counts                                                                                |

Research files keep their source links. When a library is upgraded or swapped, update the
research file and add a line to `decisions.md`.
