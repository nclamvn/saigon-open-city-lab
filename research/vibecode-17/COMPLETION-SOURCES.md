# COMPLETION-SOURCES — DONE

Builder: twin_sources. TIP: `TIP-SOURCES.md`. Scope: shared source/coordinate/QC kernel and local project preparation/admission only. The user authorized implementation; root recorded the reversible Blueprint gate waiver. No scene, UI, GIS worker, old source file or published catalog outside this task was edited.

## Deliverables

- `outputs/shared/digital-twin-core/source-core.js`: browser/CommonJS `RTRTwin.SourceCore`; native-to-WGS84 adapter, geometry topology/semantic validation, source inspection, source-to-purpose gates, representation/source identity separation.
- `schema.json`, `README.md`: project/source contracts, status/coordinate/resolution distinctions and executable offline commands.
- `projects/hcmc.json`: 13 records; actual retained asset hashes plus official city-data/GIS/LiDAR/planning leads. Leads and unavailable permission remain blocked for ingestion and approved future render.
- `projects/gia-loc.json`: 6 retained acquired source records using the same kernel, including model heights and uncertainty/terrain limitations.
- `projects/techniques.json`: implemented source/GeoJSON logic versus planned COG/GeoParquet/3D Tiles/CityGML/real-capture adapters; no standards certification claimed. GlobalBuildingAtlas additional NC assets remain blocked from the commercial path.
- `scripts/prepare-project.py`: deterministic asset-derived catalog generation and `--check`, no network.
- `scripts/project-data.cjs`: offline `verify`, `prepare`, `import-geojson`; safe extensible project slugs, byte integrity separate from admission, contained new artifact directories and symlink checks, source/input/kernel hashes, held-input QC and no automatic publication.
- `tests/source-core.cjs`: 35 meaningful tests.
- `prepared/gia-loc-17a/{normalized.geojson,project.json,qc.json}`: actual 657-feature prepared demonstration, zero exclusions, current kernel hash, `published:false`. Builder refreshed its own unshared earlier staging output after review; original data were untouched.

## Acceptance evidence — 6/6 PASS

1. Identity/classification: HCMC normalizes all 70,719 baseline representations, of which 70,709 building representations and 10 illustrative landmark parts. There are 70,701 unique source identities, explicitly not a verified physical-building count. Duplicate source IDs remain separately represented; no inferred physical parent identity.
2. Coordinates/topology: HCMC x East/z South and Gia Lộc x East/z North roundtrip below 1e-10 degrees (arithmetic consistency, not survey accuracy). Wrong/missing frames and origins fail. Rings close, holes retain; self-crossing, outside/crossing/overlapping holes and overlapping MultiPolygon interiors reject. Polygon components located inside another component's hole pass. Point/line query geometry never becomes a footprint building.
3. Provenance: deterministic local SHA-256s; OSM snapshot timestamp is not a release/capture date. Google model epoch 2023 is separate from Microsoft release 2026-08-13 and unknown geometry capture. Geographic coordinate units are degree and projected units metre; value/height units separate. Source fields reduced in legacy scene are not invented; full original Overture source asset is fingerprinted for later recovery.
4. Purpose gating: source acquisition, permissions, hash, CRS, units and validation enforced inside normalization, not merely advisory. Missing/NC rights and leads cannot bypass API. Survey accuracy must be finite positive and independently checked metadata. Unverified measured-height claims reject instead of silently downgrading. Hydrology requires more than survey terrain; procedural assets cannot satisfy a dated registered real-capture gate; approved future plans stay disabled.
5. Shared architecture: both configs exercise the same SourceCore; HCMC/Gia Lộc retain all valid baseline geometries (zero exclusions), without modifying the old apps or claiming survey quality. Planned adapters state readiness and prerequisites. HCMC UI integration belongs to the sibling Builder.
6. Executable ingestion/QC: native Gia Lộc preparation ran (657/657, `partial:false`). Generic `future_source` WGS84 GeoJSON imported successfully into quarantine in tests; bad rights and empty/invalid inputs are held with QC and no normalized artifact. Existing directories cannot be overwritten; external asset or output symlink escapes and project slug traversal fail. Byte verification detects changed hashes without touching original sources.

## Technical verification

`node --test outputs/shared/digital-twin-core/tests/source-core.cjs`: **35 tests, 35 PASS, 0 FAIL, 0 skipped** (~792 ms on this machine, not a performance guarantee). Test fixtures are synthetic and never added to real scenes.

`python3 outputs/shared/digital-twin-core/scripts/prepare-project.py --check`: **3 catalog outputs match** (13 HCMC sources, 6 Gia Lộc sources, 8 techniques).

Direct baseline normalization: HCMC 70,719/70,719 and Gia Lộc 657/657, zero exclusions. Earlier Node normalization was ~227 ms HCMC/~2 ms Gia Lộc; this is CPU processing evidence, not GPU/interaction verification. Root verifies actual map UI and GIS integration.

## Limits and deviations

No orthophoto 1 cm, surveyed LiDAR/DTM/DSM, approved future plan geometry, photogrammetry mesh, BIM ingest or Gaussian-splat capture was added. Native schema is not certified STAC/OGC. CLI currently admits **one WGS84 footprint GeoJSON asset** plus a complete source contract; it does not decode raster/LAS/mesh/BIM or transform other CRSs. Existing raster files are fingerprinted and their previous project-specific processing remains upstream. Source-QC fields are declared, testable metadata conditions; matching hashes and validation flags do not independently prove truth. Leadership/GIS analysis must retain those limits in exports.

No outstanding issue within this source/kernel scope. Root integration and final visual verification remain before whole-batch readiness.
