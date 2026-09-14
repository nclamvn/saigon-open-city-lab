# Batch 02 — Gia Lộc visual data enrichment before Hera

Contractor: `/root`. This batch continues the user-authorized Vibecode data campaign. It turns the Batch 01 pilot AOI and provenance registry into richer public-data layers that can be inspected visually and later replaced or calibrated by Hera payload data.

Source AOI: `../tayninh-data-batch-01/sources/aoi.json`. It remains an OSM-derived pilot bbox, not an official ward boundary. Batch 02 must not claim full-ward coverage, survey accuracy, legal planning authority, centimetre orthophoto, airborne LiDAR or measured building height.

## Requirements

- R01 BUILDINGS: acquire at least one nonempty public building-footprint dataset intersecting the pilot AOI from a source with inspectable provenance and reuse terms. Prefer Microsoft Global ML Building Footprints, Overture Maps or Google Open Buildings. Preserve source confidence and dates; height stays null unless the source actually supplies it.
- R02 SURFACE: acquire at least one land-cover raster and one dated optical image/visual asset intersecting the AOI. Record resolution, acquisition/product date, cloud/quality metadata, CRS, license and bounds. Public satellite imagery must not be described as GSD 1 cm orthophoto.
- R03 NORMALIZE: clip or index acquired data to the exact pilot AOI and emit browser-consumable derivatives. Validate geometry/raster bounds, counts, empty/null values, class distributions, hashes and source-to-derived lineage.
- R04 REGISTRY: build a deterministic Batch 02 registry that imports Batch 01 records and adds Batch 02 records without changing history. Distinguish source snapshot, acquired raw bytes and derived bytes. Fail on missing hash, missing evidence, AOI mismatch, duplicate ID or derived input mismatch.
- R05 VISUAL: provide a local, key-free visual workbench showing AOI, roads/water/elevation from Batch 01 and new building/surface layers. UI must expose source, quality and limitations without implying official accuracy.
- R06 VERIFY: Contractor independently checks provenance, hashes, spatial intersection, layer counts, failure gates, browser interactions and console health. Report exact coverage gained against the 23 review groups and 237 questions.

## Roles and ownership

- `buildings_enrichment`: source research, download, normalize and QA building footprints under `sources/buildings`, `raw/buildings`, `derived/buildings`; manifest `sources/building-records.json`; TIP and Completion Report.
- `surface_enrichment`: source research, download, subset/normalize and QA land cover plus dated optical imagery under `sources/surface`, `raw/surface`, `derived/surface`; manifest `sources/surface-records.json`; TIP and Completion Report.
- `batch02_workbench`: registry/validators/visual workbench only. It must consume Builder manifests and Batch 01 artifacts but not edit their owned raw/derived data.
- Contractor integrates and verifies. Existing HCMC app and Batch 01 source history are read-only.

## Acceptance boundary

Batch 02 is ready when at least one nonempty building layer, one land-cover layer and one dated optical visual intersect the AOI; each has raw bytes, source snapshot, hashes and honest limitations; normalized derivatives render in the local workbench; all validator bites and browser scenarios pass. A blocked provider does not satisfy acquisition even if its catalog page exists.

Deferred by design: official boundary, cadastral/legal planning layers, GCP/CP, 1 cm ortho, dense LiDAR, survey-grade DTM/DSM, façade imagery and authoritative building heights. These remain explicit future inputs for provincial data sharing or Hera capture.
