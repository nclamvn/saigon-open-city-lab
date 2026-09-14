# COMPLETION-C05-REGISTRY

## Scope delivered

Built and refined the C05 static analytical artifact and deterministic registry for `outputs/tayninh-imagery-campaign-05`.

Owned/touched files:

- `index.html`
- `static/app.js`
- `static/styles.css`
- `static/fonts/InterVariable.woff2`
- `static/fonts/OFL.txt`
- `registry/inventory.json`
- `scripts/build_inventory.py`
- `scripts/validate_inventory.py`
- `scripts/run_bites.py`
- `governance/COMPLETION-C05-REGISTRY.md`
- `BAO-CAO-C05.md` spacing/readability polish and URL typo repair only; facts and citations preserved.

No map renderer, Batch04 engine, raw evidence, source reports, or source JSON manifests were modified.

## Registry result

Final `registry/inventory.json`:

- Records: 35
- Categories: baseline 1, optical 11, local 10, technique 13
- Evidence items: 230
- Checked hashes: 235
- Actual usable high-resolution RGB count: 0
- Actual model rasters count: 2: Google Open Buildings 2.5D and GEDTM30 DTM/RF spread
- Asset-acquired records: `google-open-buildings-temporal-2023-aoi`, `C05-L08`, `C05-T13`
- Metadata/diagnostic-acquired records: `baseline-house-pixel-bottleneck`, `C05-L01`
- Access buckets: asset_acquired 3, metadata_or_diagnostic_acquired 2, candidate_restricted 5, blocked_or_none 13, technique_roadmap 12

Source hashes embedded in registry:

- `research/optical-sources.json` — `9bbecb5ca3e09ae6be4165871a06bd6f4177c7ea2f2bfba970fcac09707bdf4a`
- `research/local-sources.json` — `43832d079188e6401abc57e8c6566183c83eeadedb8179518ae20f2a2fb21016`
- `research/technique-sources.json` — `61acc9a2e9c39555f71cab220afbe5e75652666536912eab9c3a9b05a0d8de68`
- `evidence/baseline/house-image-sampling.json` — `238e99e802ce736d0bd17e77752c98064aff5bdd65acf0a58a1f36e53f8a4c0b`
- `BAO-CAO-C05.md` — `52865d16c874cdd8c172141eecc298264da11b5477eba1ff0b1dcfbd0d62f71a`

Semantic gates enforced:

- `not_acquired` is never classified as an acquired asset.
- Empty OAM/HOTOSM/Maxar catalog receipts are not counted as usable imagery.
- Google Open Buildings keeps `raster_grid_m = 0.5`, `effective_resolution_m = 4.0`, and `2023-06-30 model epoch`; UI labels it as model raster, not RGB improvement.
- C05-T13 remains category `technique` for lineage, but is classified `asset_acquired`, `downloadable=true`, with recorded-hash evidence for GEDTM provider-window TIFFs, exact-AOI TIFFs, PNG previews, world metadata, QA, range receipts, COPDEM comparison, acquisition index, and Batch04 source audit. UI distinguishes it as nominal 30 m, source epoch 2006–2015, 2026 release, testing-only, not RGB imagery.
- Evidence URLs are rendered as anchors only when they are HTTP(S); local receipts/files are rendered as local file links.
- Null/unknown values render as `—` in the UI instead of database jargon.

## UI result

The site is a local, key-free, static Vietnamese inventory page with:

- White/gray/black leadership-facing style and local Inter font.
- Smaller desktop hero header for denser first screen.
- Executive metric cards for 0 usable high-res RGB, 2 model rasters, 35 records, and 617/657 small footprints.
- “Dữ liệu thực đã tải” gallery showing local previews for Google presence/height PNG, GEDTM DTM/uncertainty PNG, and Commons JPEG with captions that distinguish model raster, testing-only terrain, no-GPS photo not mapped, and Google source grid 0,5 m vs local crop 4 m.
- GSD math card distinguishing examples from acquired imagery.
- Search, category filter, and access-status filter.
- Record cards with source, rights, time/epoch, resolution, limits, next action, and collapsed evidence lists to reduce scroll.
- Collapsible full `BAO-CAO-C05.md` reader.
- Markdown table rendering with table-local horizontal scroll.
- Markdown link parser preserving URLs with balanced parentheses, including the exact Commons File URL.
- Local download/source links and link back to Batch04.
- Fetch error state and mobile-responsive layout.
- Status text says “snapshot đã qua validator” rather than implying browser-side hash verification.

Root browser QA bounded URL when served from `outputs/`:

`http://127.0.0.1:8775/tayninh-imagery-campaign-05/`

Serve command:

```bash
python3 -m http.server 8775 --bind 127.0.0.1 --directory outputs
```

## Validation commands run

```bash
python3 -m py_compile outputs/tayninh-imagery-campaign-05/scripts/build_inventory.py outputs/tayninh-imagery-campaign-05/scripts/validate_inventory.py outputs/tayninh-imagery-campaign-05/scripts/run_bites.py
python3 outputs/tayninh-imagery-campaign-05/scripts/build_inventory.py --root outputs/tayninh-imagery-campaign-05
python3 outputs/tayninh-imagery-campaign-05/scripts/validate_inventory.py --root outputs/tayninh-imagery-campaign-05
python3 outputs/tayninh-imagery-campaign-05/scripts/run_bites.py --root outputs/tayninh-imagery-campaign-05
node --check outputs/tayninh-imagery-campaign-05/static/app.js
node markdown renderer VM test for table rendering and Commons URL with parentheses
python3 -m http.server 8775 --bind 127.0.0.1 --directory outputs
curl -I gallery/static endpoints
```

Validator result: PASS, `records=35`, `unique_ids=35`, `evidence_count=230`, `checked_hashes=235`, `errors=[]`.

`run_bites.py` result: PASS.

- Valid inventory passes.
- Duplicate ID fixture fails with `DUPLICATE_ID`.
- Corrupted evidence hash fixture fails with `EVIDENCE_HASH_MISMATCH`.
- Missing evidence file fixture fails with `EVIDENCE_FILE_MISSING`.

HTTP smoke results while served from `outputs/`:

- `/tayninh-imagery-campaign-05/` — 200 `text/html`
- `/tayninh-imagery-campaign-05/static/app.js` — 200 `text/javascript`
- `/tayninh-imagery-campaign-05/registry/inventory.json` — 200 `application/json`
- `/tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-presence.png` — 200 `image/png`
- `/tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-height.png` — 200 `image/png`
- `/tayninh-imagery-campaign-05/evidence/techniques/gedtm-pilot/dtm-aoi.png` — 200 `image/png`
- `/tayninh-imagery-campaign-05/evidence/techniques/gedtm-pilot/uncertainty-aoi.png` — 200 `image/png`
- `/tayninh-imagery-campaign-05/evidence/local/commons-gialoc-photo.jpg` — 200 `image/jpeg`

The localhost server was stopped after smoke testing.

## R04 mobile overflow closure

Applied CSS-only overflow and evidence-expansion fixes after 390 px QA found `.record`/`.meta` widening the page on the first OAM card and desktop expansion could stretch adjacent cards. The patch adds `min-width:0`, `max-width:100%`, wrapping, `overflow-wrap:anywhere`, `.records{align-items:start}`, `.record{align-content:start}`, and `.meta` alignment to keep badges compact.

## File hashes

- `index.html` — `633c2554136a66ed7f5c679c2d65331218832b1ef43c31518c9c8436fad6b196`
- `static/app.js` — `2631a86bba1e35285b2927bd3303c0fa33339e92ff40e23aff370046847e0e3d`
- `static/styles.css` — `aa34702c1c196ad0c95fa667e8a62bf0029394f9dbe2501f60e8bfb12db7f86f`
- `registry/inventory.json` — `6a1dda7c64100cb7ace55b5f2f4fefe9a0c6038fd598f1213345008d360cbe56`
- `scripts/build_inventory.py` — `2babdd3013cee5d98fcab0051dd08cce124c7f106a7e9e4dfcfd0ec267fc6555`
- `scripts/validate_inventory.py` — `d445936f67ef92beb4accc176aef569c98076df08764d88d7623d46747bf6d03`
- `scripts/run_bites.py` — `5c178b16e83cea10846cff3c5a33ba85991e8068b28a9965199fb172e7f41242`
- `BAO-CAO-C05.md` — `52865d16c874cdd8c172141eecc298264da11b5477eba1ff0b1dcfbd0d62f71a`
