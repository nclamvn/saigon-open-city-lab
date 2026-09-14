# REQUIREMENT MAPPING CORRECTION — Batch 01

Date: 2026-09-14

STATUS: DONE

## Reason

Contractor audit found historical semantic debt in Batch 01 requirements mapping. Some OSM highway/water records were mapped to question IDs that they do not answer:

- `2D-C-01`: "Toàn phường có bao nhiêu công trình/khối nhà nhìn thấy được trên ảnh?"
- `2D-G-01`: "Chiều rộng mặt đường thực tế theo từng đoạn là bao nhiêu?"

OSM road/water ways provide neither building counts nor measured road widths. This correction updates only requirement mappings; source snapshots, raw files, local hashes, extents, evidence spans and provenance fields are unchanged.

## Files Changed

- `sources/local-records.json`
- `sources/global-records.json`
- `governance/REQUIREMENT-MAPPING-CORRECTION.md`

## Mapping Changes

### Local Records

- `official-nq1682-gialoc-admin-identity`: `R01,R03` -> `R02,R20`
- `osm-relation-14929839-gialoc-reference`: `R01,R02,R03` -> `R02,R04,R20`
- `osm-buildings-zero-elements-gialoc-pilot`: `R02,R03` -> `R04,R05,R20`
- `osm-highway-gialoc-pilot`: `R02,R03,2D-C-01,2D-G-01` -> `R04,R20`
- `osm-water-gialoc-pilot`: `R02,R03,2D-C-01,2D-G-01` -> `R04,R20`
- `osm-transport-water-combined-gialoc-pilot`: `R02,R03,2D-C-01,2D-G-01` -> `R04,R20`
- `official-gialoc-ward-home-portal`: `R01,R03` -> `R02,R20`
- `official-gialoc-boundary-page-candidate`: `R01,R02,R03` -> `R02,R20`
- `tayninh-ckan-open-business-candidate`: `R02,R03,R04` -> `R02,R04,R20`
- `tayninh-ckan-industrial-rights-blocked`: `R02,R03,R04` -> `R02,R04,R20`

### Global Records

- `global-copdem-glo30-n11-e106-acquired`: `R02,R03,R12,R14,R20,3D-C-01,3D-F-01` -> `R02,R12,R14,R20,3D-C-01,3D-F-01`
- `global-sentinel-2-l2a-cog-candidate`: `R02,R03,R05,R10,R20,2D-L-01` -> `R02,R05,R10,R20`
- `global-jrc-surface-water-candidate`: `R02,R05,R18,R20,3D-F-01` -> `R02,R05,R18,R20`
- `global-eth-canopy-height-2020-candidate`: `R02,R05,R13,R16,R20,3D-E-01` -> `R02,R05,R13,R16,R20`
- `global-nasa-gedi-products-candidate`: `R12,R13,R14,R16,R20,3D-E-01` -> `R12,R13,R14,R16,R20`

The Sentinel-2 candidate keeps `R10` only as a candidate capability. Its limitations now state that construction/change comparison would require at least two comparable scene dates, cloud screening, co-registration/registration, band selection, CRS, tile asset hashes and explicit change logic. `R03` and `2D-L-01` were removed because a 10 m public satellite archive is not a 1 cm orthophoto product and no acquired two-epoch comparison was produced.

The later bounded candidate audit removed unrelated exact question IDs only. `3D-E-01` asks for road cross-sections and is not answered by ETH canopy height or NASA GEDI candidate catalog records. `3D-F-01` asks for terrain depressions/low points and is not answered by a JRC surface-water history catalog candidate. Review-group mappings remain because the records can still indicate candidate capability or source gaps at group level; they do not count as acquired question coverage.

## Before / After Coverage

Before rebuild:

```json
{
  "status_counts": {
    "acquired": 7,
    "blocked": 2,
    "candidate": 9,
    "missing": 0
  },
  "coverage": {
    "document_groups_touched_by_acquired": ["2D-C", "2D-G", "3D-C", "3D-F"],
    "questions_touched_by_acquired": ["2D-C-01", "2D-G-01", "3D-C-01", "3D-F-01"],
    "review_groups_touched_by_acquired": ["R01", "R02", "R03", "R12", "R14", "R20"]
  }
}
```

After canonical rebuild:

```json
{
  "status_counts": {
    "acquired": 7,
    "blocked": 2,
    "candidate": 9,
    "missing": 0
  },
  "coverage": {
    "document_groups_touched_by_acquired": ["3D-C", "3D-F"],
    "questions_touched_by_acquired": ["3D-C-01", "3D-F-01"],
    "review_groups_touched_by_acquired": ["R02", "R04", "R05", "R12", "R14", "R20"]
  }
}
```

## Validation

Command:

```bash
cd outputs/tayninh-data-batch-01
node scripts/build-registry.mjs --strict --out=registry/data-registry.json
```

Result:

```text
registry source-records: 18 records, 0 validation errors -> registry/data-registry.json
```

Canonical registry hash after rebuild:

```text
0a12d8b99c3c66260b54cd81b5bec1e20f6b69955675af25004118e6d77fff7f  registry/data-registry.json
```

Focused JSON/hash/evidence sanity after rebuild:

```json
{
  "records": 18,
  "registry_records": 18,
  "warnings": [],
  "errors": []
}
```

## Notes

- `2D-C-01` and `2D-G-01` are no longer touched by acquired Batch 01 records.
- COPDEM remains mapped to `3D-C-01` and `3D-F-01` because it provides coarse terrain/elevation context for natural elevation and low-point screening, with limitations already recorded.
- Sentinel-2 no longer maps to `R03` or `2D-L-01`; retained `R10` is a candidate only and not acquired coverage.
- ETH canopy and NASA GEDI candidates no longer map to `3D-E-01`; JRC surface-water candidate no longer maps to `3D-F-01`.
- Batch 02 history should be rebuilt before final Batch 03 import so downstream registries inherit the corrected Batch 01 candidate semantics.
- The zero-building OSM query maps to `R04,R05,R20` as a documented model/source gap for object extraction and QC, not as proof that real buildings are absent.
