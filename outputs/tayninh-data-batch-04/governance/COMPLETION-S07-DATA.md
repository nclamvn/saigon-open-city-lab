# COMPLETION-S07-DATA

Status: PASS

Implemented S07-A DATA for the 250 m sample cell around `msft_0615`. The work is additive and offline: no S06/C05/raw source files, product engine, UI, renderer or upstream Batch04 fusion/visual files were modified.

## Outputs

| Path | Role | sha256 |
|---|---|---|
| `scripts/s07-collect-data.py` | acquisition helper / local artifact check | `d36ffdd4d00dc5a4b892d13c8cc0ec2c6c388f0e73e111acee26050ca1b1b9b2` |
| `scripts/s07-prepare-data.py` | deterministic S07 manifest/material/photo compiler | `1084fe85ce8e7f3806ae5ff65697f1129fb3325abe04112ff47077c6d386c0a5` |
| `scripts/s07-qa-data.py` | S07 data validator | `651fd2030c4ac381ac7acc4580606090ed6775f962c08a51510a9b2564637606` |
| `derived/s07/sample-manifest.json` | 250 m ROI + 20 target manifest | `1cc8dd274ee6ea5699c3c1d0b3bd4fa7847f442061b6913ca2e29e5849c3ff4f` |
| `derived/s07/materials/manifest.json` | offline material library manifest | `22f4a39d44665a174f60af6c691a7d1203688dafe7fb42afb9eb386f8f35bed9` |
| `sources/s07/photo-registry.json` | target photo availability registry | `d1c0070fc97d427ad5e9596d2ae2a34a261a5e022de056b4179d4029d5478262` |
| `derived/s07/qa.json` | compact QA summary | `4b35a7a1e07df8752f8c6350e6499e0390dc97e0447930972aeb5b43cfcc91a1` |

## Schemas handed to B/C

`derived/s07/sample-manifest.json`

- schema: `tayninh-s07-sample-manifest/v1`
- main keys: `source_solution`, `frame`, `roi_250m`, `target_selection`, `targets[]`, `photo_registry_path`, `materials_manifest_path`, `material_runtime_selection`, `source_fingerprints`, `limitations`
- `targets[]` fields include `id`, `stable_id`, `rank_nearest_to_roi_center`, `centroid_scene_m`, `centroid_wgs84`, `bbox_scene_m`, `footprint_scene_m`, `display_height_m`, `height_kind`, `model_height_m`, `photo_record_status`

`derived/s07/materials/manifest.json`

- schema: `tayninh-s07-materials/v1`
- `assets[]` fields include `asset_id`, `role`, `subtype`, `title`, `provider`, `license`, `license_url`, `source_url`, `download_url`, `original`, `maps[]`, `physical_size_m`, `scale_basis`, `active_runtime`, `estimated_gpu_bytes_rgba8_mipmapped`
- `maps[]` fields include `type`, `path`, `source_member`, `sha256`, `width`, `height`, `dimension_note`, `bytes`, `mime`, `color_space`

`sources/s07/photo-registry.json`

- schema: `tayninh-s07-photo-registry/v1`
- `records[]` fields include `target_id`, `status`, `source`, `query`, `receipt_paths`, `candidate_url`, `candidate_local_file`, `rights`, `license_url`, `gps_wgs84`, `epoch`, `point_match`, `confidence`, `pending_reason`

## ROI and target registry

The sample ROI is a visualization cell, not an administrative boundary.

- center target: `msft_0615`
- center scene metres: `[928.023355, -778.339734]`
- center WGS84: `[106.351129246874, 11.091048155205]`
- bounds scene metres: `[803.023355, -903.339734, 1053.023355, -653.339734]`
- centroid members: `52`
- footprint intersections: `57`
- border-only intersections: `5`
- border-only IDs: `msft_0129`, `msft_0152`, `msft_0308`, `msft_0370`, `msft_0631`

Target rule: 20 nearest building centroids to `msft_0615` among centroid members, stable-id tie-break. The target list includes both required IDs `msft_0615` and `msft_0309`.

Target IDs:

`msft_0615`, `msft_0590`, `msft_0418`, `msft_0508`, `msft_0611`, `msft_0119`, `msft_0199`, `msft_0626`, `msft_0309`, `msft_0477`, `msft_0430`, `msft_0048`, `msft_0614`, `msft_0397`, `msft_0610`, `msft_0403`, `msft_0356`, `msft_0426`, `msft_0424`, `msft_0147`.

## Photo source search

Public photo availability result:

- verified usable target photos: `0`
- pending records: `20`
- fabricated or unverified overlays: `0`

Search/evidence captured:

- Wikimedia Commons geosearch 250 m: succeeded, empty `geosearch[]`
- Wikimedia Commons geosearch 2500 m: DNS failure receipt, counted as no usable photo
- KartaView/OpenStreetCam 250 m: succeeded, empty response
- KartaView/OpenStreetCam 2500 m: provider returned max-radius error; retained as evidence
- KartaView/OpenStreetCam 2000 m: DNS failure receipt, counted as no usable photo
- Violet THCS Gia Lộc page: saved as reference-only; rights/location not verified for S07 target overlay
- MAE EIA PDF lead: download failed by connection reset; retained only as a reference lead, no footprint claim

No page or image was assigned to a footprint without GPS/rights/point-match evidence.

## Material library

Provider: ambientCG. License: CC0 1.0. License and API receipts are stored under `sources/s07/evidence`.

Active runtime selection respects C budget:

- active assets: `4`
- active maps: `12`
- budget: `12` textures / `64 MiB`
- estimated active GPU bytes RGBA8 with mipmaps: `58,720,256`

Active assets:

| Role | Asset | Subtype | Maps | Notes |
|---|---|---|---:|---|
| roof | `RoofingTiles013A` | `roof_tiles` | 3 | generic photographed roof tiles; not a local roof fact |
| wall | `Plaster001` | `light_plaster_primary` | 3 | primary wall material; provider physical extent not published |
| wall | `Bricks104` | `exposed_brick_sparse_variant` | 3 | sparse variant only; maps are 1024×512 and disclosed as non-square provider maps |
| road | `Asphalt033` | `unmarked_asphalt` | 3 | selected instead of marked `Road007` to avoid tiled lane/edge markings |

Optional inactive asset:

- `ScatteredLeaves009`, role `foliage_ground_litter`, subtype `leaf_litter_ground_only_not_tree_canopy`; not active in runtime selection and not a tree canopy/species claim.

## Commands run

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/s07-collect-data.py
```

Result: PASS, all required local acquisition artifacts present.

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/s07-prepare-data.py
```

Result: regenerated S07 manifests and extracted material maps from local ZIPs.

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-04/scripts/s07-qa-data.py
```

Result:

```json
{
  "status": "PASS",
  "errors": [],
  "sample_manifest_sha256": "1cc8dd274ee6ea5699c3c1d0b3bd4fa7847f442061b6913ca2e29e5849c3ff4f",
  "materials_manifest_sha256": "22f4a39d44665a174f60af6c691a7d1203688dafe7fb42afb9eb386f8f35bed9",
  "photo_registry_sha256": "d1c0070fc97d427ad5e9596d2ae2a34a261a5e022de056b4179d4029d5478262"
}
```

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 -m py_compile outputs/tayninh-data-batch-04/scripts/s07-collect-data.py outputs/tayninh-data-batch-04/scripts/s07-prepare-data.py outputs/tayninh-data-batch-04/scripts/s07-qa-data.py
```

Result: syntax compile PASS; generated cache files were removed.

## Acceptance

| Requirement | Result | Evidence |
|---|---|---|
| S07-A01 registry20 and honest photo availability | PASS | 20 target records, including `0615` and `0309`; verified usable photos `0`, pending `20`; receipts stored; no unverified image applied. |
| S07-A02 free licensed material pack | PASS | ambientCG CC0 receipts, 5 assets acquired, 4 active assets / 12 active maps under 64 MiB; hashes/dimensions/map types/scale basis recorded. |
| S07-A03 exact sample manifest from canonical frame | PASS | ROI center/bounds, 52 centroid members, 57 footprint intersections, 5 border-only IDs, target rule and S06 source hash recorded; QA PASS. |

## Limitations

- The S07 cell is a sample ROI for visualization, not a verified official local boundary.
- No target building has a verified free photo; all photo records remain pending.
- Materials are generic CC0 PBR assets, not observed Gia Lộc roofs/walls/roads/foliage.
- `ScatteredLeaves009` is ground litter only and inactive; it is not a canopy or species asset.
- `Bricks104` is sparse variant only; plaster remains the primary active wall material.
