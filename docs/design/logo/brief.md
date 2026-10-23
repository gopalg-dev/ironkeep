# Ironkeep Fold

Selected by the user on 2026-10-23: a modern, minimalist black-and-white mark for an offline gym
logbook. Its two folded sides suggest an open training record and lifting weights; the central bar
connects that reading. The intended meaning is **strength, kept on record**.

## Assets

`assets/branding/fold/source.svg` is the vector master. Run `bun run design:logo` to regenerate:
- The single-colour and reversed symbols, including splash PNGs.
- The opaque launcher icon and transparent adaptive foreground and themed monochrome layer.
- A white-on-transparent notification icon at 96 px, plus Android density variants at 24–96 px.
- The app's shared path and the light and dark setup canvas marks.
- `docs/design/logo/fold/proof.png` and the actual-size raster proofs.

Colours come from `src/global.css`. The opaque launcher and adaptive icon use the pitch-black
`logo-background` token. The dark splash uses the dark screen background. The adaptive background is
set in the Expo config, so it does not need a separate image. Superseded concepts, comparison sheets
and template icons were removed at the user's request.

## Integration and verification

Expo uses Fold for the launcher, adaptive/themed icon, and light/dark splash. `AppMark` uses the same
path. `plugins/with-notification-icon.js` bundles `@drawable/ic_notification`; notification behaviour
remains a separate planned feature and this change adds no permission or background work.

The generator verifies an opaque launcher, a white transparent notification mask, adaptive artwork
inside the 66 dp safe circle, and all three parts remaining distinct at 16, 24, 32, 48 and 64 px.
The proof is visually inspected; it is not a device screenshot. Device verification and canvas
publication are tracked in `CHECKLIST.md`.
