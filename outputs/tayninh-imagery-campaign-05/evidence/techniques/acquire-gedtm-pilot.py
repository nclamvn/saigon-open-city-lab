from pathlib import Path
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from urllib.request import Request,urlopen
from datetime import datetime,timezone
from threading import Thread,Lock
import json,hashlib,traceback,math
import rasterio,numpy as np
from rasterio.windows import from_bounds,Window
from rasterio.warp import reproject,Resampling
from PIL import Image

root=Path('outputs/tayninh-imagery-campaign-05/evidence/techniques/gedtm-pilot');root.mkdir(parents=True,exist_ok=True)
raw=root/'raw-ranges';raw.mkdir(exist_ok=True)
urls={k:'https://s3.opengeohub.org/global/dtm/v1.2/'+n for k,n in {
 'dtm':'gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif',
 'uncertainty':'gedtm_rf_std_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif'}.items()}
lock=Lock();receipts=[];total=0
def sha(b):return hashlib.sha256(b).hexdigest()
class Proxy(BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_HEAD(self):self.forward('HEAD')
 def do_GET(self):self.forward('GET')
 def forward(self,method):
  global total
  slug=self.path.strip('/').split('.')[0]
  if slug not in urls:self.send_error(404);return
  ran=self.headers.get('Range');headers={'User-Agent':'RtR-C05-bounded-COG/1.0'}
  if ran:headers['Range']=ran
  try:
   with urlopen(Request(urls[slug],headers=headers,method=method),timeout=20) as r:
    size=int(r.headers.get('Content-Length','0'))
    if method=='GET' and (not ran or r.status!=206 or size>16*1024*1024):raise ValueError('Bounded range gate rejected provider response')
    b=r.read(16*1024*1024+1) if method=='GET' else b''
    with lock:
     total+=len(b)
     if total>64*1024*1024:raise ValueError('Total acquisition 64 MiB cap reached')
     rec={'provider_url':urls[slug],'method':method,'range':ran,'status':r.status,'headers':dict(r.headers),'bytes':len(b),'captured_at':datetime.now(timezone.utc).isoformat()}
     if b:
      f=raw/f'{len(receipts):03d}-{slug}.bin';f.write_bytes(b);rec.update(path=str(f),sha256=sha(b))
     receipts.append(rec)
    self.send_response(r.status)
    for k in ['Content-Length','Content-Type','Content-Range','Accept-Ranges','Last-Modified','ETag']:
     if r.headers.get(k):self.send_header(k,r.headers[k])
    self.end_headers()
    if b:self.wfile.write(b)
  except Exception as e:
   with lock:receipts.append({'provider_url':urls[slug],'method':method,'range':ran,'error':str(e),'captured_at':datetime.now(timezone.utc).isoformat()})
   self.send_error(502,str(e))

server=ThreadingHTTPServer(('127.0.0.1',0),Proxy);Thread(target=server.serve_forever,daemon=True).start()
aoi_path=Path('outputs/tayninh-data-batch-01/sources/aoi.json');bbox=json.loads(aoi_path.read_text())['bboxWGS84']
result={'schema':'c05.gedtm-bounded-pilot.v1','provider_urls':urls,'aoi_bbox_wgs84':bbox,'input_files':[{'path':str(aoi_path),'sha256':sha(aoi_path.read_bytes())}],'layers':{},'status':'blocked'}
try:
 with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT='25',GDAL_HTTP_MAX_RETRY='0'):
  for slug in urls:
   local=f'http://127.0.0.1:{server.server_port}/{slug}.tif'
   with rasterio.open(local) as ds:
    w=from_bounds(*bbox,transform=ds.transform)
    c0,r0=math.floor(w.col_off),math.floor(w.row_off);c1,r1=math.ceil(w.col_off+w.width),math.ceil(w.row_off+w.height)
    window=Window(c0,r0,c1-c0,r1-r0);arr=ds.read(1,window=window,masked=True);transform=ds.window_transform(window)
    profile=ds.profile.copy();profile.update(width=arr.shape[1],height=arr.shape[0],transform=transform,driver='GTiff',compress='deflate',tiled=False)
    profile.pop('blockxsize',None);profile.pop('blockysize',None)
    f=root/f'{slug}-provider-window.tif'
    with rasterio.open(f,'w',**profile) as target:target.write(arr.filled(ds.nodata),1);target.update_tags(**ds.tags())
    scale=ds.scales[0];offset=ds.offsets[0];vals=arr.compressed().astype(float)*scale+offset
    # Raster COG metadata takes precedence over the coarser Zenodo-file table.
    meta={'provider_dimensions':[ds.width,ds.height],'crs':str(ds.crs),'transform':list(ds.transform),'pixel_size_deg':[ds.transform.a,-ds.transform.e],'dtype':ds.dtypes[0],'nodata':ds.nodata,'scale':scale,'offset':offset,'band_tags':ds.tags(1),'dataset_tags':ds.tags(),'window':[c0,r0,c1-c0,r1-r0],'dimensions':[arr.shape[1],arr.shape[0]],'bounds':list(rasterio.windows.bounds(window,ds.transform)),'valid_pixels':len(vals),'nodata_pixels':int(arr.size-len(vals)),'raw_min':float(arr.min()),'raw_max':float(arr.max()),'scaled_min_m':float(vals.min()),'scaled_max_m':float(vals.max()),'scaled_mean_m':float(vals.mean()),'scaled_std_m':float(vals.std()),'files':[{'path':str(f),'sha256':sha(f.read_bytes()),'role':'original_grid_AOI_covering_provider_window'}]}
    # Only trim/mask the provider-grid window at exact AOI; never claim an exact-bound output kept native pixel spacing.
    xs=transform.c+(np.arange(arr.shape[1])+.5)*transform.a;ys=transform.f+(np.arange(arr.shape[0])+.5)*transform.e
    mask=(xs[None,:]>=bbox[0])&(xs[None,:]<=bbox[2])&(ys[:,None]>=bbox[1])&(ys[:,None]<=bbox[3])&~np.ma.getmaskarray(arr)
    scaled=arr.data.astype(float)*scale+offset;lo,hi=np.percentile(scaled[mask],[2,98]);v=np.clip((scaled-lo)/(hi-lo if hi>lo else 1),0,1)
    rgba=np.zeros((*arr.shape,4),dtype=np.uint8);rgba[:,:,:3]=(v[:,:,None]*255).astype(np.uint8);rgba[:,:,3]=mask.astype(np.uint8)*255
    png=root/f'{slug}-aoi.png';Image.fromarray(rgba).save(png)
    world=root/f'{slug}-aoi.world.json';world.write_text(json.dumps({'crs':str(ds.crs),'transform':list(transform),'bounds':meta['bounds'],'aoi_bbox':bbox,'pixels_outside_aoi_center_masked':True,'nominal_resolution':'1 arc-second (~30m), not survey DTM','display_stretch_m':[float(lo),float(hi)]},indent=2)+'\n')
    meta['files'].extend([{'path':str(png),'sha256':sha(png.read_bytes()),'role':'browser_preview_center_masked_exact_AOI'},{'path':str(world),'sha256':sha(world.read_bytes()),'role':'world_metadata'}]);result['layers'][slug]=meta
    print(slug,json.dumps({k:meta[k] for k in ['dimensions','crs','dtype','nodata','scale','offset','scaled_min_m','scaled_max_m','scaled_mean_m']}),flush=True)
  result['status']='acquired_bounded_pilot_not_integrated'
except Exception as e:result['error']=str(e);result['traceback']=traceback.format_exc();print('BLOCKED',str(e),flush=True)
finally:
 server.shutdown();result['provider_bytes_downloaded']=total
 (root/'range-receipts.json').write_text(json.dumps(receipts,ensure_ascii=False,indent=2)+'\n')
 result['range_receipts']={'path':str(root/'range-receipts.json'),'sha256':sha((root/'range-receipts.json').read_bytes())}
 result['limitations']=['Machine-learning predicted 30m DTM, not local surveyed bare ground. Zenodo release states testing-only. RF tree standard deviation is model spread, not a site error guarantee. Do not subtract from COPDEM for house height without coregistration, vertical datum, epoch and checkpoints.','Provider window retains native grid and covers AOI; PNG alpha uses pixel-center inclusion, not geometric subpixel coverage. No global raster downloaded, no live product modified.']
 (root/'qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 print(result['status'],'bytes',total,flush=True)
