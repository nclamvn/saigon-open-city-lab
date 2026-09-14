# COMPLETION LOCAL — Gia Lộc location and vector pilot

STATUS: DONE

FILES CHANGED:
- Created raw/local/osm-highway.json
- Created raw/local/osm-water.json
- Created raw/local/osm-transport-water.json
- Created sources/local/osm-highway-receipt.json
- Created sources/local/osm-water-receipt.json
- Updated sources/local/osm-transport-water-receipt.json from timeout receipt to successful combined receipt
- Created sources/local-records.json
- Created governance/COMPLETION-LOCAL.md

SCOPE:
- Only LOCAL artifacts were changed. Registry builder, UI, HCMC artifacts and global records were not edited.
- AOI remains the source-located pilot bbox from sources/aoi.json: [106.3276338, 11.0830401, 106.3576338, 11.1130401] in EPSG:4326. It is not an official Gia Lộc ward boundary and must not be used as full-ward coverage.

EVIDENCE AND COUNTS:
- Official identity: raw/local/nq1682-2025.pdf, SHA-256 f2b86665b1f90ffa70c56ab565433afce8f8d1565f8f6555e05fbc6d6b44d5dc. Text snapshot sources/local/official-resolution.txt contains item 96: Phước Đông + phường Gia Lộc thành phường Gia Lộc. NQ1682 also says official area/boundary determination remains a government implementation task; no machine-readable boundary was acquired here.
- OSM relation reference: sources/local/osm-relation.json, SHA-256 e2cc313f127bf3c81380c48f056c5ccd7bdaa22c69de17badffaa08d63d17b8e; relation 14929839 has name "Phường Gia Lộc" and center [106.3426338, 11.0980401]. This is community OSM evidence only.
- OSM buildings query: raw/local/osm-buildings.json, SHA-256 e82cfbf8b7fb12f515d2d5026a3d5e3217a9f141cfb53f1282703eb6c2239fb7; 0 elements at OSM base timestamp 2026-09-14T02:36:00Z. This is evidence that this Overpass building query returned zero features, not evidence that there are no buildings on the ground.
- OSM highway query: raw/local/osm-highway.json, SHA-256 4674c4be82b122c3a1d50002e32f4f58ef6b98ea0441841360d2f9e267259814; 629 elements, all 629 tagged highway, OSM base timestamp 2026-09-14T02:43:06Z. Returned geometry bounds [106.2238458,10.9383009,106.6025974,11.1275133].
- OSM water query: raw/local/osm-water.json, SHA-256 2d2267b1e7d33ae4791bece9a385ebc1ff344dcf19f389b86b40e4ec73558497; 1 element, 1 tagged waterway, 0 tagged natural=water, OSM base timestamp 2026-09-14T02:43:06Z. Returned geometry bounds [106.3529955,11.0707605,106.3856204,11.1342328].
- OSM combined transport/water Contractor snapshot: raw/local/osm-transport-water.json, SHA-256 c72cd5e36b96e94eb55de72f1a5ae3e497572d7228089ab8e476d559813f1a3e; 630 elements = 629 tagged highway + 1 tagged waterway + 0 tagged natural=water, OSM base timestamp 2026-09-14T02:37:59Z. Returned geometry bounds [106.2238458,10.9383009,106.6025974,11.1342328].
- Official portal boundary page: sources/local/official-boundary.html, SHA-256 744410b9e533332f46d799ac6fe33ba60c085ce9c6d135b95503961ea5e7a184; candidate page titled "Bản đồ địa giới hành chính" but no machine-readable boundary geometry was acquired.
- CKAN portal catalog: sources/local/ckan-local-catalog.json, SHA-256 ca0060e5d4388719f90bad648221ec6769a19dad1a73415fa94c2b066d4462ee; 16 results. Some portal records are candidates, while industrial/economic records with isopen=false/null license are recorded as blocked-rights, not acquired.
- Provenance correction: NQ1682 and CKAN records use the existing pilot AOI bbox only as an indexing envelope. NQ1682 and the CKAN catalog snapshots do not provide a verified spatial extent for Gia Lộc, and the bbox must not be read as a sourced province, catalog coverage, legal boundary or full-ward extent.

QA RESULTS:
- JSON parse sanity passed for sources/aoi.json, registry/RECORD_CONTRACT.json, sources/local-records.json, raw/local/osm-buildings.json, raw/local/osm-highway.json, raw/local/osm-water.json, and all JSON files under sources/local.
- Required contract fields are present in every source record. Acquired records have existing local_file paths and SHA-256 hashes matching bytes on disk. The combined Contractor source file had pre-patch SHA-256 c0b8a0622c39dd0b6cb9f62f6b9d241ccd9d7a4ababda09ddda3e6e17d911402; the persisted line-based JSON snapshot hash is c72cd5e36b96e94eb55de72f1a5ae3e497572d7228089ab8e476d559813f1a3e. Candidate/blocked records keep local_file/local_sha256 null.
- Evidence spans in sources/local-records.json are substrings of their snapshots.
- Extents intersect the pilot AOI or are explicitly labeled indexing/catalog envelopes. OSM highway/water extents can extend beyond AOI because Overpass returns full ways intersecting the query bbox.

ACCEPTANCE CRITERIA:
- AC1: PASS. Administrative identity is traced to NQ1682 and OSM relation evidence; AOI coordinates are in sources/aoi.json with explicit no-boundary/no-full-coverage limitations.
- AC2: PASS. Nonempty actual vector raw responses are saved for OSM highway, water, and the Contractor-verified combined transport/water snapshot. Buildings raw response is retained as a zero-result OSM data/query gap.
- AC3: PASS. Receipts and source records include URLs, query/source timestamps where available, captured_at, CRS/unknowns, hashes, counts, extents and limitations.
- AC4: PASS. Official boundary remains null; portal/CKAN leads are candidate or blocked and are not counted as downloaded vector datasets.

DEVIATIONS:
- Added separate highway and water raw responses and then persisted the Contractor-verified combined transport/water snapshot that supersedes the earlier local 504 receipt.
- For NQ1682, the PDF is local_file and the extracted text snapshot is the evidence snapshot so registry validation can check evidence text.

SUGGESTIONS:
- Next Contractor VERIFY should run scripts/build-registry.mjs against real sources after GLOBAL supplies sources/global-records.json.
- If official Gia Lộc boundary becomes available, add it as a new acquired record and keep the current pilot AOI labeled as nonofficial historical bootstrap evidence.


