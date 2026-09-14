# COMPLETION-S07-IMPORTAUDIT

Status: PASS

This bounded follow-up created QA-only artifacts. It did not edit product importer/app/chunks/worker/UI/surface code and did not rebuild or alter frozen S07 data manifests.

## Files

| Path | Role | sha256 |
|---|---|---|
| `scripts/s07-data-importer-audit.cjs` | QA-only Node importer audit | `e686be2c9c1e2792e01e073d30021806587bc01ed1b7f58ed1f0777216517d93` |
| `derived/s07/importer-audit.json` | persistent audit receipt | `b0e0a55c780f80e576654f33ec3fd4b889aa7356100a90d140cdcd96b92ef690` |

Importer under audit:

- path: `static/s07-importer.js`
- sha256: `675c4c03acd81011fcb1f34b2759f16fd9f5c2f6440caba8ea79e7c39d79df4e`
- exported version: `s07-importer.1`

## Scope

The audit loads the actual `B04S07Importer` export under Node, then runs synthetic fixtures against:

- `parseGlbModel`
- `parseGlbHeader`
- `parseGeoJSONFootprints`
- `parseRasterMetadata`
- `requireSource`

It uses a real binary GLB fixture with raw float32 positions, uint16 indices, one non-degenerate triangle, 4-byte-aligned GLB chunks and the actual SHA-256 passed through `parseGlbModel`.

Valid GLB fixture:

- positions: `[[0,0,0],[1,0,0],[0,1,0]]`
- indices: `[0,1,2]`
- byte length: `444`
- sha256: `1bb3bfe291e4467e22d178c940e98e03f2c15d9525e9b6280bc8a3679833e478`
- expected triangle estimate: `1`

## Results

Total cases: `27`

- positive cases: `4`
- negative cases: `23`
- passed: `27`
- failed: `0`
- failed P0: `0`
- failed P1: `0`

Positive cases passed:

- valid GLB triangle with actual SHA through `parseGlbModel`
- valid canonical-scene GeoJSON polygon
- valid WGS84 GeoJSON polygon with origin
- valid raster metadata with affine-derived bounds

Negative categories passed:

- GLB truncated/chunk/accessor/component/index/nonfinite/degenerate/sparse/external-buffer/tamper-hash
- GeoJSON unclosed ring, bowtie/self-intersection, duplicate IDs, nonfinite coordinate, unknown CRS, holes, MultiPolygon
- Raster singular transform, affine bounds mismatch, width/height bounds mismatch
- Future source record with `available:true`

The earlier two P1 findings are closed:

- `glb_chunk_alignment_rejected`: now rejected; the positive fixture was corrected to a valid aligned GLB.
- `geojson_duplicate_ids_rejected`: now rejected by current importer.

## Command

```bash
S07_AUDIT_GENERATED_AT=2026-09-14T09:22:49.047Z node outputs/tayninh-data-batch-04/scripts/s07-data-importer-audit.cjs
```

Current result:

```json
{
  "status": "PASS",
  "counts": {
    "total": 27,
    "passed": 27,
    "failed": 0,
    "positives": 4,
    "negatives": 23,
    "failed_p0": 0,
    "failed_p1": 0
  },
  "open_findings": []
}
```

The receipt is byte-stable when replayed with `S07_AUDIT_GENERATED_AT=2026-09-14T09:22:49.047Z`.

## Notes

- This audit is not browser/GPU evidence.
- S07-A data hashes remain unchanged: `sample-manifest.json` `1cc8dd274ee6ea5699c3c1d0b3bd4fa7847f442061b6913ca2e29e5849c3ff4f`; materials manifest `22f4a39d44665a174f60af6c691a7d1203688dafe7fb42afb9eb386f8f35bed9`.
- The S07-A generator timestamp was not changed in this follow-up to avoid rebuilding frozen data. It remains acceptable as a frozen snapshot timestamp; future S07-A data reruns should use true UTC or an explicit replay option. The importer audit script supports `S07_AUDIT_GENERATED_AT` so this receipt can be reproduced byte-stably.
