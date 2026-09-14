# BLUEPRINT — Batch 04: Gia Lộc 2.5D Fusion Experience

Owner: `/root` (Contractor)  
Approved direction: user explicitly requested **“Batch 04 — hợp nhất địa hình 2.5D, công trình, tán cây và thủy hệ thành trải nghiệm phân tích 3D”** on 2026-09-14. This request is treated as approval of the previously proposed Batch 04 direction, so no additional approval pause is needed.

## Vision

Create a leadership-ready, browser-based analytical 3D experience for the Gia Lộc pilot AOI. The scene must fuse existing public evidence from Batches 01–03 without inventing survey accuracy: Copernicus DEM terrain, Sentinel-2 surface colour, Microsoft building footprints, OSM roads/water, ETH modeled canopy height, and JRC surface-water history.

The first three seconds should communicate terrain, settlement, vegetation, and water as one spatial system. Every analytical mode must expose its source, date/resolution, and claim boundary.

## Requirements

- **B04-R01 / FUSION CONTRACT:** Build a deterministic `derived/fusion/scene-data.json` from existing local artifacts. It must contain AOI metadata, terrain grid, building footprints, road paths, water geometry/history cells, sampled canopy cells, input hashes, output hash/QA, and explicit display-method labels.
- **B04-R02 / TERRAIN:** Render a real DEM-derived terrain mesh with Sentinel-2 colour draped on it. Display the actual public DEM min/max/mean and disclose any vertical exaggeration. The viewer must offer an elevation-analysis mode.
- **B04-R03 / BUILDINGS:** Extrude all usable Microsoft footprints. Because all 657 source height fields are null, display height must be a deterministic area-class proxy and visibly labeled as such. No building may be presented as having measured height. Geometry must follow terrain rather than float or sink materially.
- **B04-R04 / CANOPY:** Render a sampled ETH canopy-height field as performant instanced canopy cells/clumps anchored to terrain. Each visual instance represents a raster sample, not an individual tree. Provide height and uncertainty context and a canopy-analysis mode.
- **B04-R05 / WATER + ROADS:** Render OSM roads/water above terrain and JRC occurrence/seasonality/change evidence as separate analytical water layers. Water-history pixels must remain descriptive remote-sensing evidence, not a flood/drainage model.
- **B04-R06 / EXPERIENCE:** Provide six modes: Overview, Elevation, Buildings, Canopy, Water, and Temporal Change. Include orbit/pan/zoom, keyboard navigation, reset, auto-tour, layer disclosure, compact inspector, legend, north indicator, source drawer, and collapse/expand UI. Vietnamese leadership-facing copy must be concise.
- **B04-R07 / PERFORMANCE:** Use local Three.js, merged/instanced geometry, capped device-pixel ratio, adaptive visual quality, and no per-frame object allocation in hot paths. Target smooth interaction on a current desktop browser and keep console warnings/errors at zero.
- **B04-R08 / HONESTY:** Always show that the AOI is an OSM-derived sample bbox, terrain is public 30 m-class context, Sentinel is 10 m visual data, canopy is a 2020 model, water history is nominal 30 m, and building heights are proxy classes. No official-boundary, cadastral, 1 cm ortho, LiDAR, individual-tree, measured-height, or flood-model claim.
- **B04-R09 / VERIFY:** Pass deterministic rebuild, hashes/lineage checks, syntax checks, HTTP asset smoke, browser interaction, responsive layout, visual screenshots, numerical probes, and runtime logs. Contractor report must count requirements and deferred items explicitly.

## Scene data contract

`derived/fusion/scene-data.json` uses local metre coordinates centered on the Batch 01 AOI. Required top-level keys:

```text
schema, generated_at, aoi, sources, disclosure, terrain,
buildings, roads, osm_water, canopy_samples, jrc_water_cells, statistics
```

- `terrain`: `rows`, `cols`, `heights_m`, `bbox_wgs84`, `min_m`, `max_m`, `mean_m`, `vertical_exaggeration`, and source metadata.
- `buildings[]`: stable source ID, footprint points in local metres, area, sampled base elevation, proxy display height, and `height_method="area_class_proxy_no_source_height"`.
- `roads[]`: OSM ID/class/name, width proxy, local-metre path, and terrain-following elevations.
- `osm_water[]`: OSM ID/type/name and local-metre path/polygon.
- `canopy_samples[]`: raster row/column, local x/z, modeled height, predictive standard deviation where available, and terrain base elevation.
- `jrc_water_cells[]`: local x/z, occurrence, 2024 seasonality, normalized change when comparable, and terrain base elevation.
- `sources[]`: exact input path, SHA-256, product/date/resolution/license/provenance statement.

Large raw provider rasters remain in earlier batches; Batch 04 stores only derived scene data and links to their evidence.

## UI and visual direction

- Art direction: warm ivory information surfaces over a deep green-blue geospatial scene; restrained amber for selected/proxy evidence; cyan for measured public raster values; water blue; canopy green.
- Map-first layout. A compact top rail selects the six modes. A collapsible left narrative card gives one sentence and three verified metrics. A right inspector appears only after selection. Bottom strip contains disclosure and navigation help.
- Default view: oblique overview with terrain relief visible, buildings readable, canopy grouped, roads continuous, and water legible. Default camera must not start inside geometry.
- No opaque full-height panels, overlapping copy, excessive labels, tiny text, or persistent modal dialogs.

## Task graph and ownership

1. **TIP-B04-FUSION** — scene-data compiler, QA, provenance. Owns `scripts/`, `derived/fusion/`, and its Completion Report.
2. **TIP-B04-ENGINE** — Three.js scene, analytical modes, interaction, inspector, performance. Owns `static/app.js`, `vendor/`, and its Completion Report. Depends on the documented scene-data contract.
3. **TIP-B04-EXPERIENCE** — semantic HTML and executive UI styling. Owns `index.html`, `static/styles.css`, and its Completion Report. Depends on the documented DOM contract in its TIP.
4. Contractor integrates and verifies. Builders may read all earlier batches but must not modify them.

## Acceptance boundary

Batch 04 is complete when the local URL opens an interactive fused 3D scene, all six modes visibly change the analysis, navigation and inspector work, disclosures remain visible, deterministic data checks pass, browser logs are clean, and visual QA confirms a coherent scene rather than a flat map or generic blocks.

Deferred: official ward boundary, authoritative planning/cadastre, measured building heights, street-level facades, true ortho near 1 cm, GCP/CP, airborne LiDAR, individual-tree inventory, drainage network, calibrated flood model, and Hera payload ground truth.

