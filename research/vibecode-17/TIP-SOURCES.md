# TIP-SOURCES — Shared source, coordinate and quality contracts

Status: BUILD authorized by the user's explicit implementation request. Builder: twin_sources. Dependencies: existing HCMC and Gia Lộc source files; no edits to either scene. Priority: P0.

Deliverable: a browser/CommonJS source kernel, JSON schema, deterministic project manifests, project preparation script and meaningful adversarial source/coordinate tests. Namespace `RTRTwin.SourceCore`. Geographic coordinates use GeoJSON WGS84; existing render frames remain explicit adapters, never a survey CRS.

Acceptance criteria:

1. HCMC representations retain stable representation IDs separately from source IDs; building parts cannot inflate a claimed count of independently surveyed buildings. Illustrative landmark parts are classified separately.
2. HCMC south-positive and Gia Lộc north-positive render frames convert reversibly to WGS84. Unknown/mismatched frames fail loudly. Invalid coordinates and degenerate rings are rejected; rings and holes are retained.
3. Catalogs fingerprint actual local assets with SHA-256. Dataset release, acquisition timestamp, capture date and native/effective/output resolution are distinct. Unknown capture dates and vertical datums remain null.
4. Rights and acquisition gates block missing permissions, leads with no downloaded assets, missing hashes and unverified survey/plan claims.
5. Source contracts describe current observed/modelled/reference assets and official leads. Future STAC, COG, 3D Tiles, CityGML/BIM and Gaussian-splat techniques state readiness and prerequisites without certification claims.
6. Both project manifests validate and exercise the same core; a deterministic preparation script reproduces hashes and normalized inventory. Only HCMC UI integration belongs to the sibling Builder.

Constraints: no UAV operations; no invented future plans or physical detail; no redistribution of noncommercial GlobalBuildingAtlas assets; retain attribution and original provenance. Own only `outputs/shared/digital-twin-core/source-core.js`, `schema.json`, `README.md`, `projects/`, source scripts/tests and this TIP/completion.
