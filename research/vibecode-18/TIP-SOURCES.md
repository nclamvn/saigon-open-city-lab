# TIP-SOURCES — Batch 18 surface sources and georeferenced COG preparation

Builder: twin_sources. Priority P0. User authorized the next source/streaming/LOD/capture batch; root records Blueprint approval. Own only shared `scripts/prepare-surfaces-18.py`, HCMC `data/surface-18/` and this task's evidence/TIP/completion.

Six acceptance criteria:

1. Investigate official HCMC data/GIS and raw-access/rights evidence; public pages with unknown rights remain leads or held, never acquired operational geometry.
2. Retrieve actual recent Sentinel-2 RGB plus scene quality for existing central HCMC bbox, preserving actual source date, CRS, resolution, rights, immutable provider-window derivation and byte fingerprints. No synthetic fine detail.
3. Retrieve modeled DTM ground and uncertainty, and DSM where available. Keep DSM/DTM distinct and preserve vertical datum, model period and no-survey limitations.
4. Produce north-up EPSG:4326 tiled DEFLATE COGs with overviews and explicit source/destination transforms, masks, dimensions, nodata, native/effective resolution and COG QC; use map-origin terrain height only as relative visual reference.
5. Deliver reusable offline/online preparation and verification commands, manifest `rtr-surface-project/1.0`, quantitative DSM-versus-DTM comparison and meaningful algorithm/QC tests. Never overwrite source files or publish on failure.
6. Investigate licensed real multi-view HCMC photographs; retain existing real facade references and declare SfM/3DGS unavailable unless adequate captured/registered overlapping imagery exists.

Scope: existing technical sample bbox [106.684,10.750,106.739,10.808], not whole city or survey certification. Native resampling cannot invent 1 cm imagery. No UAV operation, fake photogrammetry, official future geometry, UI/GIS/17-core changes or original-source replacement.
