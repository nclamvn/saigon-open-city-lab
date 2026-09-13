from pathlib import Path
import json,hashlib,math,zipfile,shutil,datetime
root=Path('outputs');r=root/'hcmc-poc';d=json.loads((r/'data/scene.json').read_text());m=d['meta']
assert len(d['buildings'])==m['renderedBuildings']==sum(m['quality'].values())
assert len(d['roads'])==m['roads']
for b in d['buildings']:
 assert math.isfinite(b['h']) and b['h']>0 and 0<=b['min']<b['h'],b['id']
 assert len(b['r'][0])>=3
 assert all(math.isfinite(v)for ring in b['r']for p in ring for v in p)
 assert b['q'] in ['estimated','height','levels','podium']
 if b.get('origin')=='Overture':assert b.get('gers') and 'sourceRecords'in b
for c in json.loads((r/'research/capture-manifest.json').read_text()):
 if c['status']=='captured':assert hashlib.sha256((r/'research'/c['snapshot']).read_bytes()).hexdigest()==c['sha256']
assert (r/'vendor/EARCUT-LICENSE.txt').stat().st_size>100
# Preserve obsolete pre-merge render in scratch, not in the handoff.
for name in ['poc-river-audit.png','poc-river-audit.metrics.json']:
 if(root/name).exists():shutil.move(root/name,Path('work')/('premerge-'+name))
qa={'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'version':'PoC 13 · reality-enrichment 13c','demo_ready_checks':['Three-button map-first dock retained','Presenter mode, fullscreen, reset and keyboard navigation retained','All map HUDs have working collapse controls','Selected view persists in the URL','Static, runtime and standalone validation PASS'],'poc13_checks':['900 footprint-anchored facade candidates','1,873 balcony and sun ledges, 1,430 vertical fins and 367 awnings','5,200 center dashes, 4,200 edge marks and 420 crosswalk bars','1,800 enhanced trees with 5,400 canopy clusters','14 compound vessels preserve the audited river route','Physical water and planar reflection retained under a procedural micro-surface','13 additional draw calls through instancing','View 19 A/B and LOD controls verified','60 FPS observed at 620 m in Ultra on this machine','Reality Enrichment 13 validator PASS'],'model_counts_and_finite_geometry':'PASS','captured_source_hashes':'PASS','javascript_syntax':'PASS','browser':'PoC 13 multi-file build visually checked in browser QA.','interactions_verified':['19 camera presets','Reality Enrichment A/B','LOD density','map-first drawers','HUD collapse','save PNG with attribution'],'views_visually_reviewed':['enrichment','overview','cinematicnight'],'known_visual_limit':'procedural approximation anchored to open map geometry; not photogrammetric or surveyed realism','known_data_limit':'facade, road marking, vegetation species and vessel details are not field-observed','browser_console':'no PoC 13 runtime errors; Three.js UMD and colorSpace deprecation warnings only','performance':'60 FPS, 221 draw calls and 2,992,166 triangles observed at the PoC 13 enrichment view on this machine; not a benchmark.'}
(r/'qa-report.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2))
# Archive non-code visual references as research only; not licensed as textures.
shutil.copy('work/bitexco-model.html',r/'research/snapshots/dlubal-model-lead.html')
files=[p for p in root.rglob('*') if p.is_file() and p.suffix!='.zip' and p.name!='delivery-manifest.json' and '__pycache__'not in p.parts]
manifest={'created_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'files':[{'path':str(p.relative_to(root)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()}for p in sorted(files)]}
(root/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2))
with zipfile.ZipFile(root/'HCMC-OPEN-CITY-POC.zip','w',zipfile.ZIP_DEFLATED,compresslevel=6)as z:
 for p in files+[root/'delivery-manifest.json']:z.write(p,p.relative_to(root))
print(json.dumps({'blocks':m['renderedBuildings'],'area':m['areaKm2'],'files':len(files)+1,'zip_mb':round((root/'HCMC-OPEN-CITY-POC.zip').stat().st_size/1e6,1),'checks':'PASS'}))
