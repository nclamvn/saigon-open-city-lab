# TIP BUILDINGS — Gia Lộc public building footprint acquisition

Builder: buildings_enrichment. Contractor: /root. Date: 2026-09-14. Requirements: R01/R03/R04 partial/R06 partial.

## Context

Batch 02 uses the Batch 01 pilot AOI at `../tayninh-data-batch-01/sources/aoi.json`: `[106.3276338, 11.0830401, 106.3576338, 11.1130401]` in EPSG:4326. This AOI is an OSM-derived technical pilot bbox, not an official Gia Lộc ward boundary. Batch 01 OSM building query returned zero elements; this is an OSM/query data gap only, not evidence that buildings do not exist on the ground.

## Task

Acquire at least one nonempty public building-footprint dataset intersecting the pilot AOI from a primary source among Microsoft Global ML Building Footprints, Overture Maps, or Google Open Buildings. Preserve source/license snapshots, raw acquisition bytes, hashes, source dates where available, CRS, confidence fields, and limitations. Normalize/clip to the exact AOI as browser-consumable GeoJSON under `derived/buildings`.

## Ownership

Only write:

- `sources/buildings`
- `raw/buildings`
- `derived/buildings`
- `sources/building-records.json`
- `governance/COMPLETION-BUILDINGS.md`

Do not edit UI, registry builder, HCMC artifacts, Batch 01 history, or other Batch 02 roles.

## Acceptance Criteria

- AC1: At least one acquired raw building footprint layer is nonempty and intersects the pilot AOI. Catalog-only or blocked providers do not count.
- AC2: Source snapshot/license evidence and acquired raw bytes are saved with SHA-256 hashes and URLs.
- AC3: Derived GeoJSON is clipped/indexed to the exact pilot AOI, browser-consumable, and contains valid Polygon/MultiPolygon features only.
- AC4: QA reports feature count, geometry types, invalid/empty counts, bounds, area fields, height fields, confidence fields, and limitations. Height is null unless supplied by the source.
- AC5: `sources/building-records.json` records acquired/candidate/blocked states honestly and preserves exact hashes/evidence.
- AC6: Completion report lists exact commands run and AC pass/fail.

## Constraints

- Use `apply_patch` for text/code edits. Binary/download acquisition may use direct download commands.
- Prefer primary source data and official license documentation. Do not count a discovery page as acquired data.
- Do not imply official boundary, full-ward coverage, survey accuracy, cadastral authority, measured heights, or Hera-grade capture.
