# TIP-16B-UI — Glass interface refinement

Priority P1. Contractor authorized implementation from the user's request. Builder owns only leadership-16.js/css and this UI audit trail. Existing renderer, source catalog and planning restrictions remain unchanged.

Design plan (frontend-design skill): City Lab's map remains the main visual surface. Smoked river-blue glass conveys depth while the photographed city remains visible behind the controls. Palette: river glass #122c36, deep shade #09212b, paper text #f1f3e9, secondary text #dce7df, active ivory #e9e0cf, source amber #e5c794. Retain the bundled interface typeface; 18px title, 13px primary/body and 11px metadata. One left-aligned rail aligns a four-column navigation bar with one drawer beneath it. Spacing uses 4/8/12/16/20/24px increments. A translucent shared panel does the visual work; avoid adding ornamental tiles or a competing hero treatment.

Brief review: the UI should not become an opaque generic dashboard. Use approximately68% smoked tint, blur10px only on actual navigation/drawer surfaces, and no stacked fullscreen filters. Use one consistent rail width rather than unrelated menu/content widths. Reduce text before adding space. Compare mode keeps short truthful status on screen and expands technical explanation on request. Preserve held-photo restrictions and sampled-material caveat.

Acceptance:
1. Navigation and drawer share identical left/width tokens on desktop and390px; four equal nav columns.
2. Map remains visibly discernible through glass, with readable text, visible keyboard focus and no opaque sticky-header block.
3. Comparison starts with concise instructions; detail disclosure retains provenance, height restoration and non-future-planning qualification. Held/sampled notes remain visible.
4. Existing exploration, planning, comparison, tour, keyboard, fullscreen and research mode behavior remain unchanged.
5. The400ms synchronization loop mutates DOM text/attributes only when values change; no layout reads are introduced.
6. Blur capped at10px, optional city-interacting class reduces blur to2px, reduced-motion styling avoids motion decoration.

Verification: JavaScript syntax, prior integration validator, Contractor screenshots and bounding boxes at390px and desktop; compare A/B and disclosures; DOM idle mutation sampling. Completion report must distinguish tested facts from pending visual review.
