# TIP-GLOBAL — Batch01
Status: APPROVED by Contractor assignment; Builder geometry_audit.
Dependencies: planning_sources sourced pilot AOI; leadership_ui registry contract.
Priority: R02/R03 tangible data and provenance.

Scan: Batch output is newly scaffolded. No application code touched. Global raster catalogs can establish regional context, not surveyed city geometry.
Task: verify 6–10 primary sources covering DEM/DSM, optical imagery, land cover/water/canopy and laser/point cloud availability; save official source snapshots, hashes and evidence spans. Acquire a geographically relevant raster subset using source-located AOI, retaining raw provenance and actual geospatial metadata.

Acceptance:
- Given a sourced pilot bbox, downloaded sample intersects it and has readable CRS, shape, bounds, values and integrity hash.
- Given every source record, publisher/source URL, evidence file/hash/spans, license and limitations are explicit; unknown is null.
- Geographic coverage is distinguished from generic datasets and unacquired catalogs; failed requests are logged without claiming absence of data.
- No guessed administrative boundary, centimetre accuracy claim from coarse DEM, HCMC app change, or huge global download.

Output ownership: raw/global/, sources/global/, sources/global-records.json, derived/global/ and this TIP/Completion.
Tests: parse records, verify evidence/raw hashes, raster bounds/nodata/statistics; report acquired versus catalog-only counts.
Decision: Contractor already authorized public read-only research and reversible acquisition; no extra approval gate.
