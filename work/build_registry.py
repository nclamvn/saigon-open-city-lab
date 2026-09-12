import pathlib,json,urllib.parse,shutil
r=pathlib.Path('outputs/hcmc-poc/research');manifest=json.loads((r/'capture-manifest.json').read_text());m={x['id']:x for x in manifest};claims=[]
def claim(entity,field,value,sid,needle):
 raw=(r/m[sid]['snapshot']).read_text(errors='replace');i=raw.find(needle)
 if i<0:print('MISSING',sid,needle);return
 span=raw[max(0,i-40):i+len(needle)+70]
 claims.append({'entity':entity,'field':field,'value':value,'evidence_span':span,'extraction':'normalized','tier':'A','capture':{'url':m[sid]['url'],'fetched_at':m[sid]['retrieved_at'],'snapshot':pathlib.Path(m[sid]['snapshot']).name,'source':urllib.parse.urlparse(m[sid]['url']).hostname}})
claim('OpenStreetMap','license','ODbL; attribution and database share-alike conditions','osm','Open Data Commons Open Database License')
claim('Overpass API','access','Public API for bounded queries; use extracts/self-host for larger workloads','overpass','planet')
claim('Geofabrik Vietnam','access','Download Vietnam OSM extract','geofabrik','vietnam-latest.osm.pbf')
claim('Overture Buildings','fields','Building geometry and optional heights','overture','height')
claim('Overture Buildings','license','CDLA Permissive 2.0 or source-required ODbL; inspect theme/source','overture-license','Community Database License Agreement')
claim('Microsoft Buildings','license','CDLA Permissive 2.0','microsoft','CDLA Permissive 2.0')
claim('Microsoft Buildings','fields','Detected footprints; source imagery is not granted by the footprint license','microsoft','building footprints')
claim('Google Open Buildings 2.5D','coverage','Vietnam included','google-temporal','VNM Vietnam')
claim('Google Open Buildings 2.5D','resolution','Effective 4 m; raster grid 50 cm does not imply 50 cm resolution','google-temporal','effective spatial resolution')
claim('Google Open Buildings 2.5D','limitation','Height capped at 100 m','google-temporal','Heights for buildings are capped at 100 meters.')
claim('Google Open Buildings 2.5D','license','CC BY 4.0 or ODbL 1.0, user chooses','google-temporal','CC BY-4.0')
claim('Google Open Buildings 2.5D','access','Raster download from Google Cloud Storage; Earth Engine not the only route','google-temporal','Google Cloud Storage')
claim('Copernicus Data Space','access','Free access within quotas; large scale resources may be commercial','copernicus','free of charge')
claim('Mapzen Terrain Tiles','access','Public AWS bucket; no AWS account required','terrain','No AWS account required')
claim('Mapzen Terrain Tiles','fields','Global tiled terrain heights; source-specific attribution','terrain','bare-earth terrain heights')
claim('EOX 2016','license','CC BY 4.0 historical mosaic','eox-capabilities','Sentinel-2 cloudless layer for 2016')
claim('EOX 2018–2025','license','CC BY-NC-SA 4.0; free noncommercial layer','eox-license','CC BY-NC-SA 4.0')
claim('OpenAerialMap','access','Imagery metadata API','oam','metadata endpoint')
claim('OpenAerialMap','poc_result','0 results for queried bbox on capture date; not proof of no other imagery','oam-query','"found":0')
claim('OpenDroneMap','license','AGPLv3','odm','AGPLv3')
claim('WebODM','access','Free and open source, runs locally','webodm','free and open source')
claim('COLMAP','fields','Structure from motion and multi-view stereo','colmap','Structure-from-Motion')
claim('gsplat','license','Apache 2.0','gsplat','Apache License')
claim('Cesium','fields','Tile geospatial 3D data for streaming','cesium','3D Tiles')
claim('Three.js','license','MIT','three-license','MIT License')
claim('Google Map Tiles','limitation','Check platform restrictions before storage/reuse; not an unrestricted open dataset','google-tiles-policy','caching')
(r/'claims.jsonl').write_text(''.join(json.dumps(c,ensure_ascii=False)+'\n' for c in claims))
fields=['license','access','fields','coverage','resolution','limitation','poc_result','hcmc_survey_accuracy']
import yaml
(r/'domain.yaml').write_text(yaml.safe_dump({'domain':'hcmc_open_geodata','entity_label':'Nguồn dữ liệu và công cụ đã nghiên cứu','schema':{'type_field':None,'fields':fields},'rollup_field':'license','universe':{'estimate':len(set(c['entity'] for c in claims)),'basis':'Danh sách nguồn cố định được kiểm tra trong đợt PoC này; không phải toàn bộ nguồn trên thế giới.'},'refresh_days':{'default':30},'alias_map':{},'ambiguous_clusters':[]},allow_unicode=True,sort_keys=False))
for f in ['refinery.py','bites.py']:
 shutil.copy(pathlib.Path('/Users/os/.codex/plugins/cache/claude-cowork/anthropic-skills/1.0.0/skills/refinery')/f,r/f)
print('claims',len(claims),'entities',len(set(c['entity'] for c in claims)))
