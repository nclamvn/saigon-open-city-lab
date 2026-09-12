import json,pathlib,math,collections,hashlib
from shapely.geometry import Polygon,shape
from shapely.ops import transform
from shapely.strtree import STRtree
r=pathlib.Path('outputs/hcmc-poc/data');d=json.loads((r/'scene.json').read_text());o=json.loads((r/'overture-pilot.geojson').read_text());lon0,lat0=d['meta']['center'];sx=111320*math.cos(math.radians(lat0));sy=110574
ps=[Polygon(b['r'][0],b['r'][1:]).buffer(0) for b in d['buildings']];tr=STRtree(ps);matches=0;fresh=[];sources=collections.Counter()
for f in o['features']:
 p=transform(lambda x,y:((x-lon0)*sx,(lat0-y)*sy),shape(f['geometry'])).buffer(0)
 ids=tr.query(p,predicate='intersects');ratio=sum(p.intersection(ps[i]).area for i in ids)/max(p.area,1)
 if ratio>.1:matches+=1
 else:fresh.append(f)
 for s in f['properties'].get('sources',[]):sources[s.get('dataset','unknown')]+=1
rep={'bbox':[106.698,10.768,106.710,10.782],'release':'2026-08-19.0','downloadedFeatures':len(o['features']),'heightPresent':sum(f['properties'].get('height') is not None for f in o['features']),'floorsPresent':sum(f['properties'].get('num_floors') is not None for f in o['features']),'overlapsCurrentModel':matches,'candidateAdditionalFootprints':len(fresh),'matchRule':'Intersection area sum / Overture feature area > 0.1; preliminary overlap test, not an identity match. Potential candidates can include segmentation differences or artifacts.','sourceRecords':dict(sources),'integratedInViewer':False,'sha256':hashlib.sha256((r/'overture-pilot.geojson').read_bytes()).hexdigest()}
(r/'overture-quality.json').write_text(json.dumps(rep,ensure_ascii=False,indent=2));(r/'overture-candidates.geojson').write_text(json.dumps({'type':'FeatureCollection','features':fresh},ensure_ascii=False));print(json.dumps(rep,ensure_ascii=False,indent=2))
