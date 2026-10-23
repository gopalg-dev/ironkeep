# Text sizes: what Apple and Google ask, and what Ironkeep uses

Adopted 21 Oct 2026 from the OBP Traveler research (`obp-mobile-v2/docs/research/type-sizes.md`,
19 Oct 2026), when the app moved from pixel classes to Tailwind's built-in scale on the user's rule:
no hard-coded pixel values, Tailwind scale classes only.

## The platforms

**Apple, Human Interface Guidelines, Typography**

| Platform    | Default size | Minimum size |
| ----------- | ------------ | ------------ |
| iOS, iPadOS | 17 pt        | 11 pt        |

> "Follow the recommended default and minimum text sizes for each platform — for both custom and
> system fonts — to ensure your text is legible on all devices."

iOS text styles at the default setting: Large Title 34/41, Title 1 28/34, Title 2 22/28, Title 3
20/25, Headline 17/22 semibold, Body 17/22, Callout 16/21, Subhead 15/20, Footnote 13/18,
Caption 1 12/16, Caption 2 11/13.

**Google, Android accessibility (Design for vision)**

> "To allow users to adjust the font size, specify font size in scalable pixels (sp)."
> "Don't make the body size any smaller than 12 sp."

Material 3 type scale (sp, size/line height): body large 16/24, body medium 14/20, body small
12/16; label large 14/20, medium 12/16, small 11/16; title large 22/28, medium 16/24, small 14/20;
headline small 24/32, medium 28/36, large 32/40; display small 36/44.

**Tailwind** (theme values are the design tokens; square brackets are an escape hatch): xs 12/16,
sm 14/20, base 16/24, lg 18/28, xl 20/28, 2xl 24/32, 3xl 30/36, 4xl 36/40, 5xl 48/1, 6xl 60/1,
7xl 72/1.

## What Ironkeep uses

The design brief's roles (13, 15, 17, 34, 44, 64, 72) each move to the nearest step of the scale,
rounding up where a role sat between steps, so nothing shrinks below the brief. Classes live in
`src/components/typography.ts`; the canvas's `ik.css` carries the same numbers.

| Role (brief)             | Was | Class                  | Matches                               |
| ------------------------ | --- | ---------------------- | ------------------------------------- |
| Hero number (set logger) | 64  | text-6xl 60            | Numbers stay the largest thing        |
| Hero number, weight step | 72  | text-7xl 72            |                                       |
| Display (welcome)        | 44  | text-5xl 48            |                                       |
| Screen title             | 34  | text-4xl 36/40         | Material display small                |
| Section title            | 20  | text-xl 20/28          | Apple Title 3                         |
| Row title                | 17  | text-lg 18/28          | Above Apple's 17 pt default           |
| Body                     | 16  | text-base 16/24        | Material body large; Apple callout 16 |
| Secondary                | 15  | text-base 16/24, muted |                                       |
| Caption                  | 13  | text-sm 14/20, muted   | Material body medium                  |
| Tab labels               | 12  | text-xs 12/16          | Google's 12 sp floor, Android's tabs  |

Rules kept: nothing below 12 and 12 only on the tab bar; sizes scale with the phone's font setting
(React Native's default `allowFontScaling`); five static weights, each its own font file (see
`src/global.css`); icon-only buttons are 44 pt with a spoken label (docs/engineering.md).

## Sources

- Apple HIG, Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Android, Accessibility (Design for vision): https://developer.android.com/design/ui/mobile/guides/foundations/accessibility
- Material 3 type scale tokens: https://m3.material.io/styles/typography/type-scale-tokens
- Tailwind, Font size: https://tailwindcss.com/docs/font-size
