"""Conservative experimental zonal medians; does not modify source scene geometry."""
from pathlib import Path
import json,hashlib,datetime
import numpy as np
import rasterio
from rasterio.features import geometry_mask
from rasterio.windows import from_bounds
from rasterio.warp import transform_geom
r=Path(__file__).resolve().parents[1]
d=json.loads((r/'data/scene.json').read_text());cx,cy=d['meta']['center'];scale=111320*np.cos(cy*np.pi/180);out=[]
with rasterio.open(r/'data/google-height-region-2023.tif')as ds:
 a=ds.read();h=a[1];presence=a[2]
 for bi,b in enumerate(d['buildings']):
  if b['q'] not in ['estimated','height','levels'] or b.get('type','').startswith('illustrative'):continue
  lon=cx+b['center'][0]/scale;lat=cy-b['center'][1]/110574
  if not(106.684<lon<106.739 and 10.750<lat<10.808):continue
  rings=[[[cx+x/scale,cy-z/110574]for x,z in ring] for ring in b['r']]
  geom=transform_geom('EPSG:4326',ds.crs,{'type':'Polygon','coordinates':[ring+[ring[0]] for ring in rings]})
  pts=geom['coordinates'][0];xs=[p[0]for p in pts];ys=[p[1]for p in pts];w=from_bounds(min(xs),min(ys),max(xs),max(ys),ds.transform).round_offsets().round_lengths()
  if w.width<1 or w.height<1:continue
  x=max(0,int(w.col_off));y=max(0,int(w.row_off));x2=min(ds.width,int(w.col_off+w.width+1));y2=min(ds.height,int(w.row_off+w.height+1))
  if x2<=x or y2<=y:continue
  trans=ds.transform*rasterio.Affine.translation(x,y)
  mask=geometry_mask([geom],out_shape=(y2-y,x2-x),transform=trans,invert=True)
  valid=mask&(presence[y:y2,x:x2]>=.5)&(h[y:y2,x:x2]>2)&(h[y:y2,x:x2]<95)
  vals=h[y:y2,x:x2][valid]
  if len(vals)<4 or valid.sum()/max(1,mask.sum())<.5:continue
  value=float(np.median(vals))
  if value<=b['min'] or b['h']>=95:continue
  out.append({'quality':b['q'],'index':bi,'id':b['id'],'baseline':b['h'],'height':round(value,1),'pixels':len(vals),'delta':round(value-b['h'],1)})
result={'source':'Google Open Buildings Temporal v1, 2023-06-30','status':'experimental; not surveyed; presence >=0.5 is a filter, not calibrated probability','method':'median within footprint; 4+ pixels; >=50% valid coverage; reject height >=95m; only original estimated blocks','raster_sha256':hashlib.sha256((r/'data/google-height-region-2023.tif').read_bytes()).hexdigest(),'candidates':[b for b in out if b['quality']=='estimated'],'reference_comparison':[b for b in out if b['quality']!='estimated']}
(r/'data/height-region.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));(r/'data/height-region.js').write_text('window.HEIGHT_PILOT='+json.dumps(result,ensure_ascii=False)+';')
print({'candidates':len(result['candidates']),'references':len(result['reference_comparison']),'median_delta':float(np.median([b['delta']for b in out]))})
