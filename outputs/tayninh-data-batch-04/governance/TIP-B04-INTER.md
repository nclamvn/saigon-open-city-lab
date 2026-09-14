# TIP-B04-INTER — Typography refinement

Owner: Builder `surface_enrichment`; Contractor `/root`.
Priority: small UI polish; approved by user 2026-09-14: “dùng font khác (inter hỗ trợ tốt tiếng Việt) cho thẩm mỹ”.

## Context and decision

Target is the Gia Lộc Batch04 viewer only. Existing CSS uses system Avenir for UI and Iowan/Georgia for headings. Replace both with genuine local Inter, supporting Vietnamese, with a coherent sans-serif hierarchy. The explicit font choice and existing UI scope authorize implementation; no separate Blueprint checkpoint is necessary.

## Task

- Bundle the official Inter regular variable WOFF2 and SIL OFL license locally under `static/fonts/`.
- Declare local `@font-face`, weight range and `font-display: swap`; preload the required font.
- Set UI and display families to Inter; refine heading weight/leading/tracking for Vietnamese diacritics while preserving compact map-first layout.
- Bump CSS cache version so an existing browser picks up the change.
- Write `COMPLETION-B04-INTER.md` with provenance, exact files, checks and limitations.

## Acceptance criteria

- INTER-R01: Real font file present, WOFF2 signature valid, Vietnamese glyph coverage verified, font/license provenance recorded.
- INTER-R02: Body, buttons and all headings use Inter; no old Avenir/Iowan/Georgia display family remains active.
- INTER-R03: Desktop and narrow-screen layout stay within viewport with readable diacritics and no new overlap.
- INTER-R04: No CDN/runtime external font call; font loads locally; CSS/HTML remain valid; completion report exists.

## Constraints

Do not modify app.js, derived scene data, prior batches, branding or functionality. Contractor will independently verify browser rendering and layout; no new automated test suite is required for this reversible typography polish.
