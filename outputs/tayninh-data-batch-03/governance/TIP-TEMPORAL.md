# TIP-TEMPORAL — Batch 03 Gia Lộc Temporal Sentinel Epoch

Date: 2026-09-14

Builder: TEMPORAL

## Context

Batch 03 extends the public-data campaign for the Gia Lộc pilot AOI. The AOI is inherited from Batch 01 as an OSM-derived pilot bbox, not an official ward boundary:

```json
[106.3276338, 11.0830401, 106.3576338, 11.1130401]
```

Batch 02 already acquired the comparison surface epoch:

- Item: `S2B_T48PXT_20251130T033239_L2A`
- Date: `2025-11-30T03:34:50.914000Z`
- Tile: `T48PXT`
- TCI derivative grid: EPSG:32648, 10 m, bounds `[644990, 1225480, 648290, 1228820]`, dimensions `330 × 334`
- SCL derivative grid: EPSG:32648, 20 m, bounds `[644980, 1225480, 648300, 1228820]`, dimensions `166 × 167`

## Task

Acquire one additional Sentinel-2 Collection 1 Level-2A epoch, prioritizing tile `T48PXT` and the same seasonal window around November/December 2024. Use primary/public STAC and AWS-hosted assets where accessible. Preserve STAC search/item/license/source snapshots, raw provider bytes and hashes, and provider checksum verification where the STAC item exposes asset checksums.

Normalize the new epoch to the Batch 02 comparison grid/AOI. Produce browser-consumable visuals for the previous epoch and the new epoch, plus a candidate change heatmap/difference product with documented algorithm, thresholds, masks, pixel statistics, and alignment QA.

Do not label any changed pixels as new buildings, construction, violations, or ground-truth change. The result is only a Sentinel-resolution candidate difference layer.

## Owned Paths

- `outputs/tayninh-data-batch-03/sources/temporal`
- `outputs/tayninh-data-batch-03/raw/temporal`
- `outputs/tayninh-data-batch-03/derived/temporal`
- `outputs/tayninh-data-batch-03/sources/temporal-records.json`
- `outputs/tayninh-data-batch-03/governance/TIP-TEMPORAL.md`
- `outputs/tayninh-data-batch-03/governance/COMPLETION-TEMPORAL.md`

## Acceptance Criteria

1. A second Sentinel-2 L2A epoch intersecting the pilot AOI is acquired, preferably same tile `T48PXT` and same season around 2024-11/12.
2. STAC search, item metadata, public source/license evidence, raw files, hashes, and provider checksum verification are recorded.
3. TCI and SCL are clipped/normalized to the Batch 02 AOI grids. B04/B08 are acquired only if the chosen difference algorithm needs them.
4. Cloud, cloud-shadow, nodata, and unclassified masks are applied before computing candidate differences.
5. Derived browser visuals include old epoch visual, new epoch visual, mask visual, and candidate change heatmap/difference visual.
6. QA reports CRS, dimensions, bounds, pixel sizes, grid/alignment checks, mask counts, threshold values, candidate pixel counts/percentages, and source-to-derived lineage.
7. `sources/temporal-records.json` is a top-level array following the Batch02 manifest contract with required fields, raw/derived lineage, honest requirements mapping, limitations, and hashes.
8. Completion report lists exact commands, AC pass/fail, limitations, and clear non-claims.

