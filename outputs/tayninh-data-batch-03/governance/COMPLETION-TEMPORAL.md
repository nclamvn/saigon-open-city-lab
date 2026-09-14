# COMPLETION REPORT — TIP-TEMPORAL

**STATUS:** DONE

Completed 2026-09-14. Batch 03 TEMPORAL acquired one additional same-tile Sentinel-2 Collection 1 Level-2A epoch for the Gia Lộc pilot AOI and normalized it to the Batch 02 Sentinel grid. The handoff contains source/license/STAC snapshots, raw TCI and SCL provider COGs with provider checksum verification, AOI derivatives, reference-epoch browser copies, a masked RGB-distance candidate heatmap, machine-readable QA, and a Batch02-contract-style top-level manifest.

## FILES CHANGED

Created under the TEMPORAL-owned paths only:

- `governance/TIP-TEMPORAL.md`
- `governance/COMPLETION-TEMPORAL.md`
- `sources/temporal-records.json`
- `sources/temporal/sentinel-2-aws-registry.html`
- `sources/temporal/Sentinel_Data_Legal_Notice.pdf`
- `sources/temporal/sentinel-2-c1-l2a-collection.json`
- `sources/temporal/sentinel-2-search-2024-11-12.json`
- `sources/temporal/sentinel-2-item-S2A_T48PXT_20241220T032629_L2A.json`
- `raw/temporal/S2A_T48PXT_20241220T032629_L2A_TCI.tif`
- `raw/temporal/S2A_T48PXT_20241220T032629_L2A_SCL.tif`
- `derived/temporal/process_temporal.py`
- `derived/temporal/sentinel-2-20241220-aoi-tci.{tif,png,pgw,prj}`
- `derived/temporal/sentinel-2-20241220-aoi-scl.{tif,png,pgw,prj}`
- `derived/temporal/sentinel-2-20251130-reference-aoi-tci.{tif,png,pgw,prj}`
- `derived/temporal/sentinel-2-20251130-reference-aoi-scl.{tif,png,pgw,prj}`
- `derived/temporal/sentinel-2-20241220-vs-20251130-rgb-distance.tif`
- `derived/temporal/sentinel-2-20241220-vs-20251130-change-heatmap.{png,pgw,prj}`
- `derived/temporal/sentinel-2-20241220-vs-20251130-mask-candidates.{png,pgw,prj}`
- `derived/temporal/temporal-aoi-qa.json`

Integration follow-up modified `sources/ecosystem-records.json` only to add the registry-required temporal alignment object for the existing JRC occurrence-change record surfaced by the same strict build command. No Batch01, Batch02, registry-builder, UI, HCMC, raw, or derived bytes were modified.

## ACQUIRED DATA

Selected item:

- Candidate epoch: `S2A_T48PXT_20241220T032629_L2A`
- Reference epoch: `S2B_T48PXT_20251130T033239_L2A` from Batch 02 surface
- Tile: `T48PXT`
- Candidate acquisition datetime: `2024-12-20T03:34:56.687000Z`
- Reference acquisition datetime: `2025-11-30T03:34:50.914000Z`
- Candidate provider scene cloud cover: `24.386743%`
- Candidate provider scene nodata: `7.167047%`
- Candidate provider cloud shadow: `0.372492%`
- Candidate medium/high/cirrus scene percentages: `6.957198%`, `2.016055%`, `15.41349%`

Raw files:

| Asset | Bytes | SHA-256 | Provider checksum result |
|---|---:|---|---|
| `raw/temporal/S2A_T48PXT_20241220T032629_L2A_TCI.tif` | 290,987,703 | `41e87720ab9670934baf448d6f813a9c9a198bba09f336dbef004700ff6e105a` | PASS: STAC `file:checksum` payload matched |
| `raw/temporal/S2A_T48PXT_20241220T032629_L2A_SCL.tif` | 3,350,316 | `38d938a734671c8d8338d841b8d2e6e21b30a14a768cc1dd498b5fddc9c6b514` | PASS: STAC `file:checksum` payload matched |

B04/B08 were not acquired because the implemented change candidate algorithm uses TCI RGB distance plus SCL masks. No NDVI or reflectance-index difference was computed.

## NORMALIZATION AND QA

All temporal derivatives use the Batch 02 Sentinel grid:

- TCI comparison grid: EPSG:32648, `330 × 334`, 10 m, bounds `[644990, 1225480, 648290, 1228820]`
- SCL mask grid: EPSG:32648, `166 × 167`, 20 m, bounds `[644980, 1225480, 648300, 1228820]`
- WGS84 visual envelope: `[106.32747646376076, 11.08286805681983, 106.3578237405214, 11.113201106075287]`
- Alignment QA: PASS. Candidate epoch uses the same tile transform, crop windows, dimensions, CRS, and bounds as the Batch 02 Sentinel derivative grid.

Local AOI SCL distribution for the candidate 2024 epoch:

| SCL code | Class | Pixels | Share |
|---:|---|---:|---:|
| 2 | Dark area pixels | 8 | 0.028858% |
| 4 | Vegetation | 21,331 | 76.946108% |
| 5 | Not vegetated | 6,157 | 22.209797% |
| 6 | Water | 14 | 0.050501% |
| 7 | Unclassified | 212 | 0.764736% |

Masked comparison:

- Total TCI pixels: `110,220`
- Valid comparison pixels after combined old/new SCL and all-band nodata masks: `109,338` (`99.199782%`)
- Masked pixels: `882` (`0.800218%`)
- Candidate TCI all-band nodata pixels: `0`
- Reference TCI all-band nodata pixels: `0`
- Candidate AOI SCL cloud codes 8/9/10: `0`
- Candidate AOI SCL cloud-shadow code 3: `0`
- Candidate AOI unclassified SCL code 7: `212` pixels at 20 m; these were masked before comparison.

Difference algorithm:

```text
rgb_distance = sqrt((dR^2 + dG^2 + dB^2)) / (sqrt(3) * 255)
luma_delta = abs(0.2126*dR + 0.7152*dG + 0.0722*dB) / 255
```

Pixels are valid only where both epochs pass SCL/nodata masks. Moderate candidates require `rgb_distance >= 0.217665` and `luma_delta >= 0.05`. Strong candidates require `rgb_distance >= 0.289010` and `luma_delta >= 0.08`. The RGB thresholds are the valid-pixel p90 and p95 values with fixed floors of 0.12 and 0.18.

Candidate difference statistics:

- Valid score min/mean/p50/p90/p95/max: `0.0`, `0.09162`, `0.056784`, `0.217665`, `0.28901`, `0.840854`
- Moderate-or-stronger candidate pixels: `10,922` (`9.989208%` of valid)
- Strong candidate pixels: `5,455` (`4.989116%` of valid)

These pixels are Sentinel-resolution spectral differences only. They are not building detections, new construction, violations, object-level changes, or ground truth.

## EXACT COMMANDS

Read governing inputs:

```bash
cat /Users/os/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/vibecode-kit/SKILL.md
node - <<'NODE'
const fs=require('fs');
for (const p of [
  'outputs/tayninh-data-batch-03/governance/BLUEPRINT.md',
  'outputs/tayninh-data-batch-02/sources/surface-records.json',
  'outputs/tayninh-data-batch-02/governance/COMPLETION-SURFACE.md'
]) console.log(fs.existsSync(p) ? fs.readFileSync(p,'utf8') : 'MISSING '+p);
NODE
```

Create owned directories:

```bash
mkdir -p outputs/tayninh-data-batch-03/sources/temporal outputs/tayninh-data-batch-03/raw/temporal outputs/tayninh-data-batch-03/derived/temporal
```

Search Earth Search STAC:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
from urllib.request import Request, urlopen
import json
from pathlib import Path
out=Path('outputs/tayninh-data-batch-03/sources/temporal')
url='https://earth-search.aws.element84.com/v1/search'
payload={
 'collections':['sentinel-2-c1-l2a'],
 'bbox':[106.3276338,11.0830401,106.3576338,11.1130401],
 'datetime':'2024-11-01T00:00:00Z/2024-12-31T23:59:59Z',
 'limit':100,
 'sortby':[{'field':'properties.eo:cloud_cover','direction':'asc'}]
}
req=Request(url,data=json.dumps(payload).encode(),headers={'Content-Type':'application/json','User-Agent':'codex-temporal-batch03'})
with urlopen(req, timeout=60) as r:
 data=json.load(r)
(out/'sentinel-2-search-2024-11-12.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
PY
```

Save selected STAC item:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
import json
from pathlib import Path
out=Path('outputs/tayninh-data-batch-03/sources/temporal')
search=json.load(open(out/'sentinel-2-search-2024-11-12.json'))
item=search['features'][0]
assert item['id']=='S2A_T48PXT_20241220T032629_L2A'
(out/'sentinel-2-item-S2A_T48PXT_20241220T032629_L2A.json').write_text(json.dumps(item,indent=2,ensure_ascii=False)+'\n')
PY
```

Fetch source/license snapshots:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
from urllib.request import Request, urlopen
from pathlib import Path
urls={
 'sentinel-2-c1-l2a-collection.json':'https://earth-search.aws.element84.com/v1/collections/sentinel-2-c1-l2a',
 'sentinel-2-aws-registry.html':'https://registry.opendata.aws/sentinel-2-l2a-cogs/',
 'Sentinel_Data_Legal_Notice.pdf':'https://sentinels.copernicus.eu/documents/247904/690755/Sentinel_Data_Legal_Notice'
}
out=Path('outputs/tayninh-data-batch-03/sources/temporal')
for name,url in urls.items():
 req=Request(url,headers={'User-Agent':'codex-temporal-batch03'})
 with urlopen(req, timeout=60) as r:
  data=r.read()
 (out/name).write_bytes(data)
PY
```

Download raw TCI/SCL:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
from urllib.request import Request, urlopen
from pathlib import Path
import json
item=json.load(open('outputs/tayninh-data-batch-03/sources/temporal/sentinel-2-item-S2A_T48PXT_20241220T032629_L2A.json'))
out=Path('outputs/tayninh-data-batch-03/raw/temporal')
for key,name in [('visual','S2A_T48PXT_20241220T032629_L2A_TCI.tif'),('scl','S2A_T48PXT_20241220T032629_L2A_SCL.tif')]:
 url=item['assets'][key]['href']
 dest=out/name
 req=Request(url,headers={'User-Agent':'codex-temporal-batch03'})
 with urlopen(req, timeout=120) as r, dest.open('wb') as f:
  while True:
   chunk=r.read(1024*1024)
   if not chunk: break
   f.write(chunk)
PY
```

Verify provider checksums:

```bash
shasum -a 256 outputs/tayninh-data-batch-03/raw/temporal/S2A_T48PXT_20241220T032629_L2A_TCI.tif outputs/tayninh-data-batch-03/raw/temporal/S2A_T48PXT_20241220T032629_L2A_SCL.tif
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
import json, hashlib
from pathlib import Path
item=json.load(open('outputs/tayninh-data-batch-03/sources/temporal/sentinel-2-item-S2A_T48PXT_20241220T032629_L2A.json'))
for key,name in [('visual','S2A_T48PXT_20241220T032629_L2A_TCI.tif'),('scl','S2A_T48PXT_20241220T032629_L2A_SCL.tif')]:
 p=Path('outputs/tayninh-data-batch-03/raw/temporal')/name
 h=hashlib.sha256(p.read_bytes()).hexdigest()
 chk=item['assets'][key].get('file:checksum')
 print(key, h, chk, h==chk[4:])
PY
```

Process temporal derivatives:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 outputs/tayninh-data-batch-03/derived/temporal/process_temporal.py
```

Validate manifest and hashes:

```bash
/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 - <<'PY'
import json, hashlib, sys
from pathlib import Path
base=Path('outputs/tayninh-data-batch-03')
records=json.load(open(base/'sources/temporal-records.json'))
errors=[]
required=['id','publisher','title','url','status','snapshot','snapshot_sha256','local_file','local_sha256','license','license_url','data_date','captured_at','crs','vertical_datum','resolution','extent','evidence_span','requirements','limitations']
def resolve(p):
 p=str(p)
 if p.startswith('../tayninh-data-batch-02/'):
  return Path('outputs/tayninh-data-batch-02')/p[len('../tayninh-data-batch-02/'):]
 return base/p
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
for r in records:
 for k in required:
  if k not in r: errors.append(f'{r.get("id")}: missing {k}')
 for group in ['source_snapshots','input_files','derived_files','sidecar_files']:
  for e in r.get(group,[]):
   p=resolve(e['path'])
   if not p.exists(): errors.append(f'missing {e["path"]}')
   elif e.get('sha256') and sha(p)!=e['sha256']: errors.append(f'hash mismatch {e["path"]}')
 for v in r.get('provider_checksum_verification',[]):
  payload=v['provider_file_checksum'][4:]
  if sha(resolve(v['path'])) != payload: errors.append(f'provider checksum failed {v["path"]}')
print(json.dumps({'records':len(records),'errors':errors}, indent=2))
sys.exit(1 if errors else 0)
PY
```

Strict Batch03 registry gate:

```bash
cd outputs/tayninh-data-batch-03
node scripts/build-registry.mjs --strict --out=/tmp/b03-temporal-check.json
```

Result:

```text
batch03 registry: 25 records (3 batch03), 0 validation errors -> ../../../../../../../../tmp/b03-temporal-check.json
```

Final hashes after the integration P1 correction:

```text
a86c070c90c88dd1141c49725e9e808f5740c75080d5ebcad8daf7f666f3917e  sources/temporal-records.json
3bbea8371abbe0137da8b7578f6b6b09ffb604521ce703fc1937c69cc6559d75  sources/ecosystem-records.json
562c83b4d13ad4f352f212f00aa87dbe5296617d5005073693959a6b90b6c743  /tmp/b03-temporal-check.json
```

The top-level temporal `evidence_span` is now the exact contiguous STAC snapshot text `"eo:cloud_cover": 24.386743`. The temporal manifest also includes `temporal_alignment` with EPSG:32648, TCI/SCL dimensions, bounds, pixel sizes, epochs, method, lineage inputs and PASS check matching `temporal-aoi-qa.json`.

## ACCEPTANCE RESULTS

| AC | Result | Evidence |
|---|---|---|
| AC1 — second Sentinel-2 L2A epoch, same tile and same season | PASS | `S2A_T48PXT_20241220T032629_L2A`, tile `T48PXT`, 2024-12-20, selected from 11 Nov/Dec 2024 same-tile candidates. |
| AC2 — source snapshots, license, raw hashes, provider checksum | PASS | STAC search/item, collection, AWS registry and Copernicus legal notice saved; TCI/SCL local SHA-256 values match STAC `file:checksum` payloads. |
| AC3 — normalize to Batch02 grid/AOI | PASS | Candidate TCI/SCL use the exact Batch02 crop windows, dimensions, EPSG:32648 bounds and pixel sizes. |
| AC4 — cloud/nodata masking | PASS | Combined old/new SCL bad codes `0,1,3,7,8,9,10,11` and all-band TCI nodata mask applied before difference computation. |
| AC5 — browser visuals and candidate heatmap | PASS | New epoch, reference epoch, SCL QA, heatmap and mask/candidate PNGs created under `derived/temporal`. |
| AC6 — QA statistics and algorithm | PASS | `temporal-aoi-qa.json` records grid, masks, thresholds, score distribution, candidate pixel counts and non-claim. |
| AC7 — top-level manifest contract | PASS | `sources/temporal-records.json` is a top-level array with Batch02-required fields, exact evidence span, temporal alignment, lineage, hashes, provider checksum verification and limitations. |
| AC8 — exact commands and non-claims in completion | PASS | This report includes commands and states that candidate pixels are not new buildings, violations or ground truth. |

## LIMITATIONS

- The AOI is an OSM-derived pilot bbox, not an official Gia Lộc boundary.
- Sentinel-2 TCI is 10 m public satellite imagery, not 1 cm orthophoto or survey-grade imagery.
- The 2024 scene has `24.386743%` provider scene cloud cover, even though the local AOI SCL subset contains no SCL cloud-class pixels.
- SCL is a product layer, not independent visual cloud validation.
- RGB distance is sensitive to atmosphere, phenology, illumination and seasonal vegetation differences. The heatmap is useful only as a candidate review layer.
- No object matching, field validation, cadastral overlay, building classification or enforcement conclusion was produced.

## SUGGESTIONS

- The Batch03 workbench should expose the 2024 and 2025 epoch visuals, the combined mask/candidate visual, the heatmap, thresholds, valid-pixel percentage and the non-claim beside the layer controls.
- If Contractor wants object-specific R10 or exact 2D-L question coverage later, add a separate reviewed workflow with two registered high-resolution epochs, object extraction/matching and validation.
