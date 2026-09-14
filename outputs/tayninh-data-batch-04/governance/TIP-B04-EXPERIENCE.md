# TIP-B04-EXPERIENCE — Leadership UI and visual shell

Priority: P0  
Owner: Builder `surface_enrichment`  
Dependencies: DOM contract in `TIP-B04-ENGINE.md`  
Owned paths: `outputs/tayninh-data-batch-04/index.html`, `static/styles.css`, `governance/COMPLETION-B04-EXPERIENCE.md`

## Task

Build a polished Vietnamese map-first shell for the 3D scene. Use exactly the DOM IDs required by ENGINE. Provide a compact six-mode rail, collapsible narrative panel, three metric cells, source drawer, contextual inspector, loading state, legend/disclosure strip, north indicator, keyboard help, tour/reset/hide controls, and graceful no-WebGL message. Copy must be concise and consistently distinguish public evidence, model outputs, and display proxies.

## Acceptance criteria

- Desktop, tablet, and mobile layouts preserve most of the viewport for the scene and never overlap primary controls.
- Glass surfaces are translucent, widths/radii/spacing are consistent, focus states are visible, and contrast is readable over bright/dark terrain.
- Default state immediately states `Vùng mẫu — không phải ranh phường` and `Chiều cao công trình là proxy`.
- Source drawer lists exact products: Copernicus DEM GLO-30, Sentinel-2 L2A, Microsoft Building Footprints, OpenStreetMap, ETH Global Canopy Height 2020, and JRC Global Surface Water v1.5.
- All buttons have accessible names/states; panels are keyboard dismissible by engine and copy remains readable at 1280×720 and 390×844.
- No external fonts, icons, analytics, network APIs, or unrelated HCMC assets.
- HTML/CSS static checks pass and Completion Report is complete.
