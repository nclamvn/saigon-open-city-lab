# COMPLETION-B04-INTER — Local Inter typography

Status: **PASS**

Owner: Builder `surface_enrichment`; independent browser verification: Contractor `/root`.

Completed: 2026-09-14. Scope: Batch 04 typography only, following `TIP-B04-INTER.md` and the user's explicit Inter request.

## Files and provenance

- `static/fonts/InterVariable.woff2`: unmodified provider bytes downloaded from the [official Inter font endpoint](https://rsms.me/inter/font-files/InterVariable.woff2), 352,240 bytes; SHA-256 `693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3`.
- `static/fonts/OFL.txt`: complete copyright and license snapshot from [rsms/inter LICENSE.txt](https://raw.githubusercontent.com/rsms/inter/master/LICENSE.txt), 4,380 bytes; SHA-256 `262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a`. The font is distributed under SIL Open Font License 1.1, with the original Inter Project Authors notice retained.
- `static/styles.css`: local Inter `@font-face`, UI/display family replacement, and heading hierarchy. SHA-256 `8dd9be7d77593220bdaffb517f95e97e4a4f90bf142f232ff2a44eb8f66c832e`.
- `index.html`: font preload and CSS version `v=20260914-inter1`. SHA-256 `2cea96d21575974d578f8d10edcac98147e94b4eed57d28d8d7417a2728e2e0e`.

The download was acquired on 2026-09-14 from the official project, without a renamed substitute or font transformation. The embedded font metadata reports family `Inter Variable`, style `Regular`, PostScript name `InterVariable`, and version `4.001;git-9221beed3`. The provider endpoint is mutable; the bundled bytes and recorded SHA-256 identify this exact copy.

## Typography change

The UI and display variables now both resolve to `Inter, system-ui, sans-serif`. Body and buttons inherit Inter; all heading elements explicitly use the display family. The local normal font face declares weights 100–900 with `font-display: swap`, and `font-optical-sizing: auto` uses the font's optical-size axis.

Narrative headings use weight 650, tracking −0.025em, and line-height 1.18 on desktop / 1.22 on narrow screens. Secondary headings use weights 600–650 with line-height 1.24–1.25. These values give Vietnamese diacritics more vertical room while keeping the existing panel sizes and compact map-first composition. No active Avenir, Iowan, Palatino, or Georgia family remains in the stylesheet.

## Font and static verification

The one-time font inspection used fontTools 4.65.0 and Brotli 1.2.0 in a temporary QA directory, without adding a production dependency or automated test suite.

- WOFF2 signature: `wOF2`; the header's declared length equals the actual 352,240-byte file.
- FontTools decoded the genuine font and its Unicode cmap: 2,852 entries.
- Variable axes: `wght` 100–900, default 400; `opsz` 14–32, default 14.
- Vietnamese coverage: 186 code points checked, including every precomposed character U+1EA0–U+1EF9, the basic Latin alphabet, Latin accented vowels, and Ă/ă, Đ/đ, Ĩ/ĩ, Ũ/ũ, Ơ/ơ, Ư/ư. Missing glyphs: **0**.
- Combining coverage: U+0300, U+0301, U+0302, U+0303, U+0306, U+0309, U+031B, and U+0323. Missing glyphs: **0**.
- Representative Vietnamese UI strings, punctuation, ×, and σ: 64 unique non-space code points checked. Missing glyphs: **0**.
- HTML parser: one local font preload with `as="font"`, `type="font/woff2"`, and `crossorigin`; stylesheet cache version changed; zero duplicate IDs; all six mode buttons preserved in their contract order.
- CSS: balanced delimiters, weight range and swap declaration present, zero old family names, and zero trailing whitespace.
- Runtime resource scan: zero external font/CDN references; font URL is relative to local CSS.

## Independent browser verification

Contractor verified the actual loaded font and rendering through the local Batch 04 viewer:

- Local font response: HTTP 200, `font/woff2`, 352,240 bytes.
- Body and title computed family: `Inter, system-ui, sans-serif`; title weight: 650; desktop leading: 33.984 px.
- 1280×720: document dimensions equal the viewport; narrative height 237.09 px, top rail 72 px, dock 60.5 px; no primary-control overlap. Screenshot confirmed Inter with readable Vietnamese accents.
- 390×844: document dimensions equal the viewport; narrative height 205.29 px; disclosure remains visible; screenshot confirmed readable accents and no overflow.
- Console warnings: **0**. Console errors: **0**. QA viewport was reset after inspection.

## Acceptance and boundaries

| Criterion | Result |
|---|---|
| INTER-R01: genuine local WOFF2, Vietnamese coverage, license/provenance | PASS — valid signature, decoded internal names/axes, zero missing Vietnamese glyphs, full OFL retained |
| INTER-R02: UI, buttons, and all headings use Inter | PASS — CSS family audit and actual browser computed styles |
| INTER-R03: desktop/narrow layout and diacritics remain readable | PASS — independent 1280×720 and 390×844 measurements and screenshots |
| INTER-R04: local loading, valid HTML/CSS, completion report | PASS — HTTP 200 local font, preload/cache checks, static validation, report present |

The normal variable face covers the viewer's current typography; an italic file is not bundled because the interface has no italic font requirement. `font-display: swap` allows a brief system-font fallback during first load. Font changes do not alter the scene, branding, data, or functionality.

The following checksums are unchanged from the pre-polish baseline:

- `static/app.js`: `674284ca1e4ca5764d0ec658ae9ab0a4c5d37c20ba801800414c8be823dee08d`.
- `derived/fusion/scene-data.json`: `20efe02b00f9c9f9d00a5b79853e596afdbeb8ee4d49391387e49c310d8f8878`.

No prior batch was modified.
