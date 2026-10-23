# Logo: Fold

The user selected Fold on 2026-10-23 after requesting a modern minimalist black-and-white identity.
It combines an open training record with weight-like folded sides: strength, kept on record.
The finished brief and asset map are in `docs/design/logo/brief.md`; the master is
`assets/branding/fold/source.svg`. Unselected artwork has been removed at the user's request.

## Product fit

Ironkeep records training privately without coaching or accounts. A compact, quiet mark suits that
purpose. The symbol works in one colour, without a gradient, an illustration or a wordmark at icon
size. The same geometry is used in the app, launcher, splash and notification artwork.

## References

- [Strong](https://www.strong.app/), [FitNotes](https://www.fitnotesapp.com/) and
  [Hevy](https://www.hevyapp.com/press/) supplied workout-logbook category context. This was a limited
  reference review, not a comprehensive similarity or trademark search.
- [Android adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive):
  separate foreground/background layers and a monochrome layer; artwork fits the central 66 dp safe
  circle of the 108 dp layer.
- [Expo app configuration](https://docs.expo.dev/versions/latest/config/app/): launcher and adaptive
  assets are native build configuration and require a new APK.
- [Expo notifications](https://docs.expo.dev/versions/latest/sdk/notifications/): a 96 px white icon
  with transparency provides the small-icon mask. The current change supplies the artwork and native
  drawable only; the planned live-session notification will reference it when implemented.
