#!/usr/bin/env python3
"""Bounded, provenance-first surface compiler: real provider windows -> geographic COGs.
Runtime: PYTHONPATH=/private/tmp/c05-optical-pylib /Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 (Python 3.12.14), rasterio 1.5.1 / GDAL 3.12.4.
"""
import argparse, hashlib, json, math, os, unittest, urllib.request
import tempfile
import concurrent.futures, re
import xml.etree.ElementTree as ET
import urllib.parse, zipfile, struct
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from threading import Thread, Lock
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.shutil import copy as rio_copy
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import Window, from_bounds as window_from_bounds
ROOT=Path(__file__).resolve().parents[4]
OUT=ROOT/'outputs/hcmc-poc/data/surface-18'
EVIDENCE=ROOT/'research/vibecode-18/evidence-source-owned'
PROJECT=ROOT/'outputs/shared/digital-twin-core/projects/hcmc.json'
GEDTM='https://s3.opengeohub.org/global/dtm/v1.2/gedtm_rf_m_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif'
UNCERTAINTY='https://s3.opengeohub.org/global/dtm/v1.2/gedtm_rf_std_30m_s_20060101_20151231_go_epsg.4326.3855_v1.2.tif'
COPDEM='https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N10_00_E106_00_DEM/Copernicus_DSM_COG_10_N10_00_E106_00_DEM.tif'
def load(p):return json.loads(Path(p).read_text())
def digest(p):
 h=hashlib.sha256()
 with Path(p).open('rb') as f:
  for b in iter(lambda:f.read(1048576),b''):h.update(b)
 return h.hexdigest()
def dcat_spatial_screen(xml_bytes,keywords):
 if b'<!DOCTYPE' in xml_bytes.upper() or b'<!ENTITY' in xml_bytes.upper():raise ValueError('External/entity XML declarations are not admitted')
 ns={'dcat':'http://www.w3.org/ns/dcat#','dct':'http://purl.org/dc/terms/'};rdf='{http://www.w3.org/1999/02/22-rdf-syntax-ns#}'
 root=ET.fromstring(xml_bytes)
 def value(node,field):
  child=node.find(field,ns)
  return None if child is None else child.attrib.get(rdf+'resource') or child.text
 distributions={d.attrib.get(rdf+'about'):d for d in root.findall('.//dcat:Distribution',ns)}
 all_datasets=root.findall('.//dcat:Dataset',ns);selected=[]
 for d in all_datasets:
  title=value(d,'dct:title') or '';description=value(d,'dct:description') or ''
  if not any(word in (title+' '+description).lower() for word in keywords):continue
  refs=[node.attrib.get(rdf+'resource') for node in d.findall('dcat:distribution',ns)];resources=[]
  for ref in refs:
   node=distributions.get(ref)
   if node is None:resources.append({'distributionUrl':ref,'resolved':False});continue
   resources.append({'distributionUrl':ref,'resolved':True,'title':value(node,'dct:title'),'accessUrl':value(node,'dcat:accessURL'),'downloadUrl':value(node,'dcat:downloadURL'),'mediaType':value(node,'dcat:mediaType'),'format':value(node,'dct:format'),'declaredBytes':value(node,'dcat:byteSize'),'license':value(node,'dct:license'),'publishedDate':value(node,'dct:issued'),'captureDate':None})
  selected.append({'title':title,'description':description,'datasetUrl':d.attrib.get(rdf+'about'),'publisher':value(d,'dct:publisher'),'publishedDate':value(d,'dct:issued'),'captureDate':None,'license':value(d,'dct:license'),'resources':resources,'geometryAcquired':False,'rightsGate':'held_pending_specific_dataset_rights_and_raw_geometry_validation'})
 return {'datasetCount':len(all_datasets),'spatialCandidateCount':len(selected),'keywords':keywords,'spatialCandidates':selected,'notes':'RDF dataset → distribution edges resolved. Publication dates are not capture dates. A downloadable PDF schema is not acquired planning geometry; unknown raw-data rights remain held.'}
def audit_sources():
 catalog=EVIDENCE/'hcm-public-dcat-catalog.xml';screen=dcat_spatial_screen(catalog.read_bytes(),['quy hoạch','bản đồ','lidar','địa hình','không gian','đất đai','geospatial','orthophoto'])
 screen['catalogSnapshot']=receipt(catalog);dump_new(EVIDENCE/'hcm-dcat-spatial-resolved.json',screen)
 official={'schema':'rtr-source-leads/1.0','projectId':'hcmc','officialCatalogSnapshot':receipt(catalog),'officialPlanningCandidates':screen['spatialCandidates'],'apiAccessEvidence':receipt(EVIDENCE/'official-raw-access-and-photo-receipts.json'),'apiResults':{'publicThuaDatFeatureServer':'401 Unauthorized; no authentication bypass or personal records requested.','otherDiscoveredArcgisProxyMetadata':'200 with zero-byte body; not valid GIS metadata or acquired geometry.'},'schemaAppendix':{'asset':receipt(EVIDENCE/'hcm-qhpk-resource-schema.pdf'),'interpretation':'Official PDF describes database field names/types. It is not georeferenced planning geometry.','licenseForRawGeometry':None},'ingestionAllowed':False,'status':'held'}
 entries=load(ROOT/'outputs/hcmc-poc/research/facades-15/manifest.json')['entries'];existing=[]
 for e in entries:
  p=ROOT/'outputs/hcmc-poc'/e['source_file'];exists=p.exists();actual=digest(p) if exists else None
  existing.append({'id':e['key'],'name':e['name'],'url':e['source_url'],'sourceFile':e['source_file'],'license':e.get('license'),'licenseUrl':e.get('license_url'),'captureDateRaw':e.get('photo_date'),'sha256':actual,'declaredSha256':e.get('source_sha256'),'hashMatches':actual==e.get('source_sha256'),'bytes':p.stat().st_size if exists else None,'facadeEligible':e.get('surface_fit',{}).get('eligible',False),'surveyedGeometry':False})
 images=[]
 for p in sorted(EVIDENCE.glob('commons-hcmc-images-*.json')):
  for page in load(p).get('query',{}).get('pages',{}).values():
   info=(page.get('imageinfo') or [{}])[0];ex=info.get('extmetadata',{});fields={item['name'] for item in info.get('metadata',[])}
   title=page.get('title','');date=ex.get('DateTimeOriginal',{}).get('value') or ex.get('DateTime',{}).get('value')
   images.append({'title':title,'url':info.get('descriptionurl'),'license':ex.get('LicenseShortName',{}).get('value'),'captureDateRaw':date,'dimensions':[info.get('width'),info.get('height')],'focalExifPresent':'FocalLength' in fields,'gpsExifPresent':'GPSLatitude' in fields and 'GPSLongitude' in fields,'verifiedCameraPose':False,'verifiedCalibration':False,'verifiedGroundControl':False})
 sets=[{'name':'Nhà hát Thành phố, 2023-11-02','photos':[i for i in images if 'Municipal Theatre of Ho Chi Minh City, 2023 (' in i['title']]},{'name':'Nhà hát Thành phố, 2023-12-10','photos':[i for i in images if '2023-12-10 Saigon Opera House' in i['title']]}]
 photos={'schema':'rtr-photo-readiness/1.0','existingReferenceCount':len(existing),'existingReferences':existing,'metadataRecordsAudited':len(images),'newMultiViewLeads':sets,'readyReconstructionAssets':0,'sfmStatus':'unavailable_verified_capture_set','gaussianSplatStatus':'unavailable_verified_capture_set','notes':['Two licensed same-day Opera House candidate sets found: four photos in November and three in December 2023. Camera make/focal EXIF are present; GPS EXIF is present in the December candidate. These are leads, not verified calibrated complete overlapping capture sets or reconstructed assets.','No image bytes from these new leads were ingested, no COLMAP/3DGS training was executed, no camera poses/control/checkpoint accuracy was invented.','20 existing real building reference photographs retained; per-file hashes checked. They support reference/photo textures, not surveyed 3D reconstruction.']}
 dump_new(OUT/'official-source-leads.json',official);dump_new(OUT/'photo-readiness.json',photos)
 return {'dcatDatasets':screen['datasetCount'],'spatialCandidates':screen['spatialCandidateCount'],'existingPhotoHashesMatch':all(e['hashMatches'] for e in existing),'existingReferenceCount':len(existing),'metadataRecordsAudited':len(images),'multiViewLeadSizes':[len(s['photos']) for s in sets],'readyReconstructionAssets':0}
def acquire_official_forest():
 """Acquire public official ZIP bytes for quarantine audit, with raw rights held.
 No ZIP members are extracted. Only bounded headers/WKT/license text are read.
 """
 screen=dcat_spatial_screen((EVIDENCE/'hcm-public-dcat-catalog.xml').read_bytes(),['hiện trạng rừng'])
 resource=next(r for d in screen['spatialCandidates'] for r in d['resources'] if r.get('mediaType')=='application/zip')
 url=resource['downloadUrl'];parsed=urllib.parse.urlsplit(url)
 if parsed.scheme!='https' or parsed.hostname!='opendata.hochiminhcity.gov.vn' or parsed.username or parsed.password:raise ValueError('Official download does not match verified public catalog host')
 path=OUT/'quarantine'/'official-forest-2024-provider.zip';receipt_path=path.with_suffix('.acquisition.json')
 if not path.exists():
  part=path.with_suffix('.part')
  if part.exists():raise FileExistsError('Incomplete prior acquisition is quarantined; investigate before retrying')
  with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RtR Digital Twin / official vector byte audit'}),timeout=35) as response, part.open('xb') as target:
   size=0
   while True:
    chunk=response.read(1048576)
    if not chunk:break
    size+=len(chunk)
    if size>16*1024*1024:raise ValueError('Official ZIP exceeds bounded 16 MiB cap')
    target.write(chunk)
   if int(response.headers.get('Content-Length',size))!=size:raise ValueError('Official ZIP response length mismatch')
   acquisition={'providerUrl':url,'retrievedAt':datetime.now(timezone.utc).isoformat(),'ETag':response.headers.get('ETag'),'LastModified':response.headers.get('Last-Modified'),'status':response.status,'declaredCatalogBytes':resource['declaredBytes'],'captureDate':None,'rights':{'license':None,'ingestionAllowed':False,'commercialAllowed':None},'statusForOperationalUse':'held_pending_raw_geometry_rights_and_QC'}
  part.rename(path);acquisition['asset']=receipt(path);dump_new(receipt_path,acquisition)
 acquisition=load(receipt_path)
 if digest(path)!=acquisition['asset']['sha256']:raise ValueError('Official quarantine ZIP hash mismatch')
 scope=load(PROJECT)['bbox'];layers=[];license_files=[]
 with zipfile.ZipFile(path) as archive:
  infos=archive.infolist();names={entry.filename for entry in infos}
  for entry in infos:
   name=entry.filename;lower=name.lower()
   if any(word in lower for word in ['license','licence','readme','copyright']) and entry.file_size<=262144:
    with archive.open(entry) as stream:content=stream.read(262145)
    license_files.append({'member':name,'text':content.decode('utf-8','replace')})
   if not lower.endswith('.shp'):continue
   with archive.open(entry) as stream:header=stream.read(100)
   if len(header)!=100 or struct.unpack('>i',header[:4])[0]!=9994:raise ValueError('Invalid shapefile header in official ZIP')
   bounds=list(struct.unpack('<4d',header[36:68]));stem=name[:-4];prj=next((n for n in names if n.lower()==(stem+'.prj').lower()),None);count=None;wkt=None;epsg=None;geographic=None
   shx=next((n for n in names if n.lower()==(stem+'.shx').lower()),None)
   if shx:
    with archive.open(shx) as stream:index_header=stream.read(100)
    count=(struct.unpack('>i',index_header[24:28])[0]*2-100)//8
   if prj:
    with archive.open(prj) as stream:wkt=stream.read(262145).decode('utf-8','replace')
    if len(wkt)>262144:raise ValueError('CRS member exceeds bounded text cap')
    crs=rasterio.crs.CRS.from_wkt(wkt);epsg=crs.to_epsg();geographic=list(transform_bounds(crs,'EPSG:4326',*bounds,densify_pts=21))
   overlap=None if geographic is None else not (geographic[2]<scope[0] or geographic[0]>scope[2] or geographic[3]<scope[1] or geographic[1]>scope[3])
   layers.append({'member':name,'shapefileType':struct.unpack('<i',header[32:36])[0],'sourceBounds':bounds,'declaredFeatureCountFromShx':count,'sourceCRSEpsg':epsg,'sourceCRSWkt':wkt,'approximateWgs84BBox':geographic,'bboxOverlapsCentralScope':overlap,'geometryValidated':False,'verticalDatum':None,'notes':'Archive header/CRS bounds audit only; feature topology, attribute semantics and registration are not validated. Bbox overlap is not exact feature intersection.'})
  report={'schema':'rtr-official-archive-quarantine/1.0','asset':receipt(path),'acquisition':acquisition,'archiveMemberCount':len(infos),'archiveMembers':[{'name':e.filename,'bytes':e.file_size,'compressedBytes':e.compress_size} for e in infos],'declaredUncompressedBytes':sum(e.file_size for e in infos),'layers':layers,'licenseOrReadmeMembers':license_files,'ingestionAllowed':False,'status':'held','sourceYearLabel':'2024 in provider filename; not verified capture date','scope':'Official archive bytes acquired for audit only. No members extracted, no operational layer generated, no raw-data reuse rights inferred from public access.'}
  native=[name for name in names if re.search(r'\.(shp|gpkg|geojson|gml|kml|kmz|tab|gdb)(/|$)',name,re.IGNORECASE)]
  report.update(nativeVectorMembers=native,nativeVectorFeatureCount=None if not native else sum(layer['declaredFeatureCountFromShx'] or 0 for layer in layers),nativeVectorCRS=None if not layers else [layer['sourceCRSEpsg'] for layer in layers],centralScopeGeometryOverlap=None,geometryStatus='Native vector availability is not established from PDFs or tabular spreadsheets. PDF georegistration and spreadsheet coordinate/geometry columns were not validated.' if not native else 'Native containers found; only shapefile header metadata inspected. Full geometry remains unvalidated.')
 dump_new(OUT/'official-forest-quarantine-report.json',report)
 return {'archiveBytes':path.stat().st_size,'layerCount':len(layers),'featureCounts':[l['declaredFeatureCountFromShx'] for l in layers],'bboxOverlapsCentralScope':[l['bboxOverlapsCentralScope'] for l in layers],'status':'held'}
def dump_new(p,obj):
 p=Path(p);p.parent.mkdir(parents=True,exist_ok=True)
 raw=json.dumps(obj,indent=2,ensure_ascii=False,allow_nan=False)+'\n'
 if p.exists():
  if json.loads(p.read_text())!=obj:raise FileExistsError('Refusing to replace existing immutable artifact: '+str(p))
 else:p.write_text(raw)
def receipt(p):return {'path':str(Path(p).relative_to(ROOT)), 'sha256':digest(p),'bytes':Path(p).stat().st_size}
@contextmanager
def bounded_range_reader(provider_url, key):
 """Relay bounded public ranges through urllib, preserving provider response receipts.
 Direct GDAL/curl access to this provider stalled in a tile transfer; the relay
 checks complete 206 bodies before GDAL can consume them. No global download.
 """
 records=[];lock=Lock();total=[0];rawroot=OUT/'quarantine'/'raw-ranges'/key
 def request_part(start,end):
  ran=f'bytes={start}-{end}'
  index=rawroot/f'range-{start}-{end}.json'
  if index.exists():
   stored=load(index);p=ROOT/stored['asset']['path']
   if digest(p)!=stored['asset']['sha256']:raise ValueError('Stored range fingerprint mismatch')
   return p.read_bytes(),stored
  with urllib.request.urlopen(urllib.request.Request(provider_url,headers={'Range':ran,'User-Agent':'RtR-Batch18-bounded-window/1.0'}),timeout=25) as r:
   body=r.read(end-start+2)
   expected=end-start+1
   if r.status!=206 or len(body)!=expected or not r.headers.get('Content-Range','').startswith(f'bytes {start}-{end}/'):raise ValueError('Provider chunk response has inconsistent range/body')
   rawroot.mkdir(parents=True,exist_ok=True);p=rawroot/(hashlib.sha256(body).hexdigest()+'.bin')
   if not p.exists():p.write_bytes(body)
   rec={'range':ran,'status':r.status,'bytes':len(body),'asset':receipt(p),'ETag':r.headers.get('ETag'),'Content-Range':r.headers.get('Content-Range'),'providerUrl':provider_url,'retrievedAt':datetime.now(timezone.utc).isoformat()}
   dump_new(index,rec)
   return body,rec
 class Relay(BaseHTTPRequestHandler):
  def log_message(self,*args):pass
  def do_HEAD(self):self.forward('HEAD')
  def do_GET(self):self.forward('GET')
  def forward(self,method):
   requested=self.headers.get('Range');headers={'User-Agent':'RtR-Batch18-bounded-window/1.0'}
   if requested:headers['Range']=requested
   try:
    match=re.fullmatch(r'bytes=(\d+)-(\d+)',requested or '')
    if method=='GET' and match and int(match[2])-int(match[1])+1>1024*1024:
     start,end=map(int,match.groups());size=end-start+1
     if size>16*1024*1024:raise ValueError('Provider request exceeds 16 MiB cap')
     ranges=[(a,min(end,a+262143)) for a in range(start,end+1,262144)]
     with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:parts=list(pool.map(lambda bounds:request_part(*bounds),ranges))
     b=b''.join(part[0] for part in parts);part_receipts=[part[1] for part in parts]
     if len({r['ETag'] for r in part_receipts})!=1 or len({r['Content-Range'].split('/')[1] for r in part_receipts})!=1:raise ValueError('Provider identity changed between chunks')
     provider_size=part_receipts[0]['Content-Range'].split('/')[1]
     with lock:
      total[0]+=len(b)
      if total[0]>64*1024*1024:raise ValueError('Per-source acquisition exceeds 64 MiB budget')
      records.append({'providerUrl':provider_url,'method':'GET','range':requested,'status':206,'bytes':len(b),'subranges':part_receipts,'retrievedAt':datetime.now(timezone.utc).isoformat()})
     self.send_response(206);self.send_header('Content-Length',str(len(b)));self.send_header('Content-Range',f'bytes {start}-{end}/{provider_size}');self.send_header('Accept-Ranges','bytes');self.end_headers();self.wfile.write(b);return
    with urllib.request.urlopen(urllib.request.Request(provider_url,headers=headers,method=method),timeout=35) as r:
     length=int(r.headers.get('Content-Length','0'))
     if method=='GET' and (not requested or r.status!=206 or length>16*1024*1024):raise ValueError('Provider range response is not bounded 206')
     b=r.read(16*1024*1024+1) if method=='GET' else b''
     if method=='GET' and len(b)!=length:raise ValueError('Incomplete provider range body')
     rec={'providerUrl':provider_url,'method':method,'range':requested,'status':r.status,'bytes':len(b),'headers':{k:r.headers.get(k) for k in ['Content-Length','Content-Range','ETag','Last-Modified']},'retrievedAt':datetime.now(timezone.utc).isoformat()}
     with lock:
      total[0]+=len(b)
      if total[0]>64*1024*1024:raise ValueError('Per-source acquisition exceeds 64 MiB budget')
      if b:
       rawroot.mkdir(parents=True,exist_ok=True);p=rawroot/(hashlib.sha256(b).hexdigest()+'.bin')
       if not p.exists():p.write_bytes(b)
       rec['asset']=receipt(p)
      records.append(rec)
     self.send_response(r.status)
     for k in ['Content-Length','Content-Type','Content-Range','Accept-Ranges','Last-Modified','ETag']:
      if r.headers.get(k):self.send_header(k,r.headers[k])
     self.end_headers()
     if b:self.wfile.write(b)
   except Exception as e:
    with lock:records.append({'providerUrl':provider_url,'method':method,'range':requested,'error':str(e)})
    self.send_error(502,str(e))
 server=ThreadingHTTPServer(('127.0.0.1',0),Relay);server.daemon_threads=True;Thread(target=server.serve_forever,daemon=True).start()
 try:yield f'http://127.0.0.1:{server.server_port}/{key}.tif'
 finally:
  server.shutdown()
  stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
  dump_new(OUT/'quarantine'/'raw-ranges'/f'{key}-{stamp}-receipts.json',{'providerUrl':provider_url,'totalBytes':total[0],'ranges':records})
@contextmanager
def access_url(url,key):
 if url.startswith('https://s3.opengeohub.org/'):
  with bounded_range_reader(url,key) as local:yield local
 else:yield url
def write_native_window(target, src, array, window):
 profile=src.profile.copy();profile.update(driver='GTiff',width=array.shape[2],height=array.shape[1],transform=src.window_transform(window),tiled=True,blockxsize=128,blockysize=128,compress='DEFLATE')
 target.parent.mkdir(parents=True,exist_ok=True)
 with rasterio.open(target,'w',**profile) as dst:
  dst.write(array);dst.update_tags(**src.tags());dst.scales=src.scales;dst.offsets=src.offsets
  for band in range(1,src.count+1):dst.update_tags(band,**src.tags(band))
def integer_window(bounds,transform):
 w=window_from_bounds(*bounds,transform);left=math.floor(w.col_off);top=math.floor(w.row_off)
 return Window(left,top,math.ceil(w.col_off+w.width)-left,math.ceil(w.row_off+w.height)-top)
def crop_native(url,key,bbox):
 if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9._-]{0,160}',key) or '..' in key:raise ValueError('Unsafe source-window identifier')
 target=OUT/'quarantine'/f'{key}-provider-native-window.tif';metadata=target.with_suffix('.json')
 if target.exists():
  m=load(metadata)
  if digest(target)!=m['asset']['sha256']:raise ValueError('Native window fingerprint mismatch')
  if m['providerUrl']!=url:raise ValueError('Stored provider URL does not match requested source')
  bounds=transform_bounds('EPSG:4326',m['sourceCRS'],*bbox,densify_pts=21);stored=m['windowBounds']
  if bounds[0]<stored[0]-1e-10 or bounds[1]<stored[1]-1e-10 or bounds[2]>stored[2]+1e-10 or bounds[3]>stored[3]+1e-10:raise ValueError('Stored native window cannot cover requested scope')
  return target,m
 with access_url(url,key) as readable_url, rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',GDAL_HTTP_TIMEOUT='300',GDAL_HTTP_MAX_RETRY='0',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif'):
  with rasterio.open(readable_url) as src:
   pb=transform_bounds('EPSG:4326',src.crs,*bbox,densify_pts=21);w=integer_window(pb,src.transform)
   if w.col_off<0 or w.row_off<0 or w.col_off+w.width>src.width or w.row_off+w.height>src.height:raise ValueError('Requested bbox not fully contained in provider raster')
   a=src.read(window=w);write_native_window(target,src,a,w)
   m={'schema':'rtr-provider-window/1.0','providerUrl':url,'sourceCRS':str(src.crs),'providerDimensions':[src.width,src.height],'providerTransform':list(src.transform)[:6],'window':list(w.flatten()),'windowBounds':list(src.window_bounds(w)),'pixelSizeSourceUnits':[abs(src.transform.a),abs(src.transform.e)],'sourceNodata':src.nodata,'sourceScale':list(src.scales),'sourceOffset':list(src.offsets),'sourceTags':src.tags(),'bandTags':[src.tags(b) for b in range(1,src.count+1)],'asset':receipt(target),'derivation':'Lossless re-encoding of the native integer pixel window read from the remote provider by GDAL HTTP range access. Local SHA-256 is not the hash of the entire remote TIFF. Source grid, scale, offset, band tags and raw pixel values retained; no resampling in this quarantined asset.'}
   dump_new(metadata,m)
 return target,m
def grid_for_bbox(bbox,minimum_m):
 west,south,east,north=bbox;lat=(south+north)/2;lon_m=111320*math.cos(math.radians(lat));lat_m=111320
 width=max(2,math.floor((east-west)*lon_m/minimum_m));height=max(2,math.floor((north-south)*lat_m/minimum_m))
 return width,height,from_bounds(*bbox,width,height)
def bilinear(a,bbox,lon,lat,nodata=-9999):
 h,w=a.shape;u=(lon-bbox[0])/(bbox[2]-bbox[0])*w-.5;v=(bbox[3]-lat)/(bbox[3]-bbox[1])*h-.5
 if u<0 or v<0 or u>w-1 or v>h-1:return None
 x=math.floor(u);y=math.floor(v);dx=u-x;dy=v-y;num=0.
 for j,wy in [(y,1-dy),(min(h-1,y+1),dy)]:
  for i,wx in [(x,1-dx),(min(w-1,x+1),dx)]:
   z=float(a[j,i]);weight=wx*wy
   if weight<=0:continue
   if not math.isfinite(z) or z==nodata:return None
   num+=weight*z
 return num
def cog_from_window(native,key,bbox,minimum_m,kind):
 target=OUT/'cog'/f'{key}-wgs84.tif';qcpath=target.with_suffix('.qc.json')
 if target.exists():
  q=load(qcpath)
  if digest(target)!=q['asset']['sha256']:raise ValueError('COG fingerprint mismatch')
  return target,q
 width,height,tr=grid_for_bbox(bbox,minimum_m);nodata=0 if kind=='rgb' else -9999.
 with rasterio.open(native) as src:
  count=src.count;dtype='uint8' if kind=='rgb' else 'float32';a=np.full((count,height,width),nodata,dtype=dtype)
  for b in range(1,count+1):
   raw=src.read(b).astype(dtype);scale=src.scales[b-1];offset=src.offsets[b-1]
   if kind!='rgb':
    valid=np.isfinite(raw)
    if src.nodata is not None:valid&=raw!=src.nodata
    raw=np.where(valid,raw*scale+offset,nodata).astype('float32')
   reproject(raw,a[b-1],src_transform=src.transform,src_crs=src.crs,src_nodata=src.nodata if kind=='rgb' else nodata,dst_transform=tr,dst_crs='EPSG:4326',dst_nodata=nodata,resampling=Resampling.bilinear)
  profile={'driver':'GTiff','width':width,'height':height,'count':count,'dtype':dtype,'crs':'EPSG:4326','transform':tr,'nodata':nodata,'tiled':True,'blockxsize':512,'blockysize':512,'compress':'DEFLATE','predictor':2 if dtype=='uint8' else 3}
  temporary=OUT/'working'/f'{key}-working.tif';temporary.parent.mkdir(parents=True,exist_ok=True)
  with rasterio.open(temporary,'w',**profile) as dst:
   dst.write(a);dst.update_tags(SOURCE_WINDOW_SHA256=digest(native),REPRESENTATION='observed' if kind=='rgb' else 'modeled',NOTE='Reprojection does not increase effective source detail; no survey accuracy implied.')
   levels=[];seen={(width,height)}
   for factor in [2,4]:
    shape=(math.ceil(width/factor),math.ceil(height/factor))
    if shape not in seen:levels.append(factor);seen.add(shape)
   if levels:dst.build_overviews(levels,Resampling.average if kind=='rgb' else Resampling.bilinear)
  target.parent.mkdir(parents=True,exist_ok=True)
  rio_copy(temporary,target,driver='COG',BLOCKSIZE=512,COMPRESS='DEFLATE',PREDICTOR=2 if dtype=='uint8' else 3,OVERVIEWS='FORCE_USE_EXISTING',OVERVIEW_RESAMPLING='AVERAGE' if kind=='rgb' else 'BILINEAR',BIGTIFF='IF_SAFER')
 with rasterio.open(target) as ds:
  values=ds.read(1);valid=np.isfinite(values)&(values!=nodata);q={'asset':receipt(target),'bbox':list(ds.bounds),'crs':str(ds.crs),'width':ds.width,'height':ds.height,'bands':ds.count,'dtype':ds.dtypes[0],'nodata':ds.nodata,'transform':list(ds.transform)[:6],'blockShapes':ds.block_shapes,'overviews':ds.overviews(1),'imageStructure':ds.tags(ns='IMAGE_STRUCTURE'),'validPixels':int(valid.sum()),'nodataPixels':int((~valid).sum()),'min':float(values[valid].min()) if valid.any() else None,'max':float(values[valid].max()) if valid.any() else None,'mean':float(values[valid].mean()) if valid.any() else None,'outputPixelSizeDegrees':[abs(ds.transform.a),abs(ds.transform.e)],'minimumOutputSpacingM':minimum_m,'sourceWindowSha256':digest(native),'reprojectionResampling':'bilinear; derived grid, no effective-resolution gain'}
  if ds.tags(ns='IMAGE_STRUCTURE').get('LAYOUT')!='COG' or ds.crs.to_epsg()!=4326 or ds.transform.b!=0 or ds.transform.d!=0 or ds.transform.e>=0:raise ValueError('COG grid layout QC failed')
 dump_new(qcpath,q)
 return target,q
def compatible_source(id,title,url,role,representation,crs,units,license,assets,**kw):
 return {'id':id,'title':title,'url':url,'role':role,'representation':representation,'horizontalCRS':crs,'coordinateUnits':'degree' if crs=='EPSG:4326' else 'm' if crs else None,'units':units,'valueUnits':{'height':'m'} if role=='terrain' else {'rgb':'digital_number'} if role=='context_imagery' else None,'verticalDatum':kw.get('verticalDatum'),'release':kw.get('release'),'captureDate':kw.get('captureDate'),'sourcePeriod':kw.get('sourcePeriod'),'acquisition':{'status':'acquired','retrievedAt':kw.get('retrievedAt')},'validation':{'stage':'geometry_validated','spatialRegistrationVerified':False},'rights':{'license':license,'ingestionAllowed':True,'commercialAllowed':True,'attributionRequired':True,'notes':'Use requires original producer terms and attribution; this contract is not independent survey certification.'},'assets':[{'path':str(p.relative_to(ROOT/'outputs')),'sha256':digest(p),'bytes':p.stat().st_size} for p in assets],'quality':{'surveyed':False,'independentCheckpointsVerified':False,'horizontalAccuracyM':None,'verticalAccuracyM':None},'status':'acquired','limitations':kw.get('limitations',[])}
def asset_record(id,p,q,sourceKey,kind,representation,native,effective,date,sourceCRS,datum,license):
 latitude=(q['bbox'][1]+q['bbox'][3])/2
 spacing=[q['outputPixelSizeDegrees'][0]*111320*math.cos(math.radians(latitude)),q['outputPixelSizeDegrees'][1]*111320]
 effective=math.ceil(max(native,max(spacing))*100)/100
 return {'id':id,'url':'/'+str(p.relative_to(ROOT/'outputs')),'sha256':digest(p),'bytes':p.stat().st_size,'bbox':q['bbox'],'crs':'EPSG:4326','sourceCRS':sourceCRS,'sourceVerticalDatum':datum,'width':q['width'],'height':q['height'],'bands':q['bands'],'nodata':q['nodata'],'kind':kind,'representation':representation,'units':'RGB digital numbers' if kind=='rgb' else 'm','coordinateUnits':'degree','sourceDate':date,'nativeResolutionM':native,'effectiveResolutionM':effective,'outputGridSpacingMAtMidLatitude':spacing,'resolutionNote':'Native/effective values describe nominal source detail and the derived display grid, not independent measured accuracy. Reprojection cannot recover finer objects.','outputPixelSizeDegrees':q['outputPixelSizeDegrees'],'sourceKey':sourceKey,'ingestionAllowed':True,'hashVerified':True,'license':license,'qcUrl':'/'+str(p.with_suffix('.qc.json').relative_to(ROOT/'outputs'))}
def build():
 project=load(PROJECT);bbox=project['bbox'];frame=project['frame'];candidates=load(EVIDENCE/'sentinel-local-quality-candidates.json')
 clear=[c for c in candidates if c['localCloudShadowPercent']==0 and c['localNodataPercent']==0]
 if not clear:raise ValueError('No clear selected AOI source; no fabricated image fallback')
 selected=max(clear,key=lambda c:c['captureDate']);item=load(EVIDENCE/(selected['id']+'-item.json'));date=item['properties']['datetime'];id=item['id'];rgburl=item['assets']['visual']['href'];sclurl=item['assets']['scl']['href'];rgbnative,rgbmeta=crop_native(rgburl,id+'-rgb',bbox);rgb,rgbqc=cog_from_window(rgbnative,id+'-rgb',bbox,10,'rgb');sclnative,sclmeta=crop_native(sclurl,id+'-scl',bbox)
 groundbbox=[bbox[0]-.0006,bbox[1]-.0006,bbox[2]+.0006,bbox[3]+.0006]
 groundnative,gmeta=crop_native(GEDTM,'gedtm-v1.2-dtm-padded',groundbbox);ground,gqc=cog_from_window(groundnative,'gedtm-v1.2-dtm-padded',groundbbox,31,'ground')
 with rasterio.open(ground) as ds:earlyref=bilinear(ds.read(1),groundbbox,*frame['origin'],ds.nodata)
 print(json.dumps({'groundReady':receipt(ground),'referenceHeightM':earlyref,'sourceScale':gmeta['sourceScale'],'sourceOffset':gmeta['sourceOffset'],'sourceVerticalDatum':gmeta['sourceTags'].get('VERTICAL_DATUM')}),flush=True)
 uncertnative,umeta=crop_native(UNCERTAINTY,'gedtm-v1.2-uncertainty-padded',groundbbox);uncert,uqc=cog_from_window(uncertnative,'gedtm-v1.2-uncertainty-padded',groundbbox,31,'ground')
 dsmnative,dmeta=crop_native(COPDEM,'copdem-glo30-dsm-padded',groundbbox);dsm,dqc=cog_from_window(dsmnative,'copdem-glo30-dsm-padded',groundbbox,31,'dsm')
 datum=gmeta['sourceTags'].get('VERTICAL_DATUM')
 if not datum or '2008' not in datum:raise ValueError('DTM vertical datum not verified from actual provider raster tags')
 with rasterio.open(ground) as g,rasterio.open(dsm) as d:
  ga=g.read(1);da=d.read(1);ref=bilinear(ga,groundbbox,*frame['origin'],g.nodata)
  if ref is None:raise ValueError('Origin DTM sample is nodata')
  common=np.isfinite(ga)&np.isfinite(da)&(ga!=g.nodata)&(da!=d.nodata);delta=da[common]-ga[common]
  compare={'comparison':'Copernicus DSM minus GEDTM modeled DTM on the same derived geographic grid; not independent survey error, not a reliable building/canopy height inventory. Different sources/epochs/algorithms may disagree or yield negative differences.','samples':int(common.sum()),'meanDeltaM':float(delta.mean()),'medianDeltaM':float(np.median(delta)),'p05DeltaM':float(np.percentile(delta,5)),'p95DeltaM':float(np.percentile(delta,95)),'minDeltaM':float(delta.min()),'maxDeltaM':float(delta.max()),'negativeDeltaSamples':int((delta<0).sum()),'verticalCompatibility':'GEDTM actual TIFF tag EGM2008; Copernicus DSM EGM2008 declared by producer documentation, not independently surveyed.'}
  from PIL import Image
  with rasterio.open(rgb) as image:Image.fromarray(np.moveaxis(image.read(),0,2)).save(OUT/'rgb-preview.png')
 license='Copernicus Sentinel Data Legal Notice';sources=[compatible_source('sentinel-2026','Sentinel-2 real RGB with local AOI SCL screening',rgburl,'context_imagery','observed','EPSG:32648','digital_number',license,[rgbnative,sclnative,rgb],captureDate=date,limitations=['10 m satellite RGB, not street facades or centimetre orthomosaic.','Local SCL cloud/shadow test is product classification, not independent atmospheric validation.','Native source window is re-encoded derivative of provider pixels, not full original remote TIFF.']),compatible_source('gedtm-ground','GEDTM30 v1.2 modeled ground plus model uncertainty',GEDTM,'terrain','modeled','EPSG:4326','m','CC-BY-4.0',[groundnative,uncertnative,ground,uncert],verticalDatum=datum,release='1.2',sourcePeriod=['2006-01-01','2015-12-31'],limitations=['Producer first release: use for testing purposes only. Predicted ground from machine learning fusion; no airborne LiDAR or surveyed engineering DTM.','Nominal 30 m / 1 arc-second grid. Interpolation and output mesh density do not improve effective physical detail.','Random-forest model uncertainty is not field checkpoint survey accuracy.']),compatible_source('copdem-dsm','Copernicus GLO-30 surface, including vegetation and buildings',COPDEM,'surface_model','modeled','EPSG:4326','m','Copernicus DEM GLO-30 licence',[dsmnative,dsm],verticalDatum='EGM2008 (producer documentation)',release='2021 public release',sourcePeriod=None,limitations=['DSM is not ground DTM; includes surface infrastructure and vegetation, coarse global context.','Capture dates for this AWS tile are unknown; datum is declared by producer documentation, with no current survey or independent XY/Z checkpoints.'])]
 assets={'imagery':asset_record('imagery',rgb,rgbqc,'sentinel-2026','rgb','observed',10,10,date,'EPSG:32648',None,license),'ground':asset_record('ground',ground,gqc,'gedtm-ground','ground','modeled',30,30,None,'EPSG:4326',datum,'CC-BY-4.0'),'dsm':asset_record('dsm',dsm,dqc,'copdem-dsm','dsm','modeled',30,30,None,'EPSG:4326','EGM2008 (producer documentation)','Copernicus DEM GLO-30 licence'),'ground-uncertainty':asset_record('ground-uncertainty',uncert,uqc,'gedtm-ground','uncertainty','modeled',30,30,None,'EPSG:4326',datum,'CC-BY-4.0')}
 manifest={'schema':'rtr-surface-project/1.0','version':'18a','projectId':'hcmc','bbox':bbox,'frame':frame,'sources':sources,'assets':assets,'referenceHeightM':ref,'referenceConvention':'displayHeight = sourceHeight - referenceHeightM; reference is a bilinear sample of the modeled geographic DTM at frame origin. Relative visual reference only, not geodetic surveyed elevation.','referenceSampling':{'method':'pixel-centre bilinear; u=(lon-west)/(east-west)*width-0.5; v=(north-lat)/(north-south)*height-0.5; strict pixel-centre domain; any contributing NoData/nonfinite value rejects the sample; zero-weight neighbors ignored','origin':frame['origin'],'bbox':groundbbox,'nodataPolicy':'strict','referenceHeightM':ref},'sourceQC':{'selectedSentinel':selected,'candidateCountScreened':len(candidates),'ground':gqc,'groundUncertainty':uqc,'dsm':dqc,'imagery':rgbqc},'dsmVsDtm':compare,'scope':'Existing central technical sample; not complete post-merger city coverage or approved official boundary.','limitations':['Satellite imagery and modeled terrain remain coarse context; no 1 cm orthomosaic, LiDAR survey or approved future planning data.','No SfM/3DGS asset has been generated from unrelated reference images.','New mesh density and material detail are display decisions, never physical-resolution improvement.']}
 dump_new(OUT/'manifest.json',manifest);dump_new(EVIDENCE/'surface-build-report.json',{'manifest':receipt(OUT/'manifest.json'),'selectedSentinel':selected,'nativeWindows':[rgbmeta,sclmeta,gmeta,umeta,dmeta],'dsmVsDtm':compare,'referenceHeightM':ref});return manifest
class ScientificTests(unittest.TestCase):
 def test_dcat_rdf_distribution_join(self):
  xml=b'<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcat="http://www.w3.org/ns/dcat#" xmlns:dct="http://purl.org/dc/terms/"><dcat:Dataset rdf:about="https://example.org/dataset"><dct:title>Planning map</dct:title><dcat:distribution rdf:resource="https://example.org/resource"/></dcat:Dataset><dcat:Distribution rdf:about="https://example.org/resource"><dct:title>Schema</dct:title><dcat:downloadURL rdf:resource="https://example.org/schema.pdf"/><dcat:mediaType>application/pdf</dcat:mediaType></dcat:Distribution></rdf:RDF>'
  m=dcat_spatial_screen(xml,['planning']);r=m['spatialCandidates'][0]['resources'][0]
  self.assertEqual(r['downloadUrl'],'https://example.org/schema.pdf');self.assertEqual(r['mediaType'],'application/pdf');self.assertIsNone(r['license']);self.assertFalse(m['spatialCandidates'][0]['geometryAcquired'])
 def test_dcat_unresolved_distribution_explicit(self):
  xml=b'<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dcat="http://www.w3.org/ns/dcat#" xmlns:dct="http://purl.org/dc/terms/"><dcat:Dataset><dct:title>Planning map</dct:title><dcat:distribution rdf:resource="https://example.org/missing"/></dcat:Dataset></rdf:RDF>'
  r=dcat_spatial_screen(xml,['planning'])['spatialCandidates'][0]['resources'][0];self.assertFalse(r['resolved'])
 def test_bilinear_centres(self):self.assertAlmostEqual(bilinear(np.array([[1.,3.],[5.,7.]]),[0,0,2,2],1,1),4)
 def test_bilinear_nodata(self):self.assertIsNone(bilinear(np.array([[1.,-9999],[5.,7.]]),[0,0,2,2],1,1))
 def test_bilinear_outside_pixel_centres(self):self.assertIsNone(bilinear(np.ones((2,2)),[0,0,2,2],0,1))
 def test_bilinear_zero_weight_nodata_ignored(self):self.assertEqual(bilinear(np.array([[1.,-9999],[-9999,-9999]]),[0,0,2,2],.5,1.5),1)
 def test_provider_nonidentity_scale_offset_preserved(self):
  with tempfile.TemporaryDirectory() as d:
   original=Path(d)/'provider.tif';window=Path(d)/'window.tif'
   with rasterio.open(original,'w',driver='GTiff',width=4,height=4,count=1,dtype='int16',crs='EPSG:4326',transform=from_bounds(0,0,4,4,4,4),nodata=-32768) as dst:
    dst.write(np.arange(16,dtype='int16').reshape(4,4),1);dst.scales=(.25,);dst.offsets=(-10.,);dst.update_tags(1,UNIT='m',MODEL='synthetic test only')
   with rasterio.open(original) as src:write_native_window(window,src,src.read(window=Window(1,1,2,2)),Window(1,1,2,2))
   with rasterio.open(window) as ds:
    self.assertEqual(ds.scales,(.25,));self.assertEqual(ds.offsets,(-10.,));self.assertEqual(ds.tags(1)['UNIT'],'m');self.assertEqual(float(ds.read(1)[0,0])*ds.scales[0]+ds.offsets[0],-8.75)
 def test_cog_applies_scale_and_preserves_nodata(self):
  global ROOT,OUT
  previous_root,previous_out=ROOT,OUT
  try:
   with tempfile.TemporaryDirectory() as d:
    ROOT=Path(d);OUT=ROOT/'outputs';native=ROOT/'scaled.tif';values=np.array([[8,-32768],[16,24]],dtype='int16')
    with rasterio.open(native,'w',driver='GTiff',width=2,height=2,count=1,dtype='int16',crs='EPSG:4326',transform=from_bounds(-1,-1,1,1,2,2),nodata=-32768) as ds:ds.write(values,1);ds.scales=(.25,);ds.offsets=(-10.,)
    p,q=cog_from_window(native,'synthetic-scaled',[-1,-1,1,1],111320,'ground')
    with rasterio.open(p) as ds:
     actual=ds.read(1);self.assertEqual(float(actual[0,0]),-8.);self.assertEqual(float(actual[0,1]),-9999.);self.assertEqual(float(actual[1,1]),-4.);self.assertEqual(q['validPixels'],3);self.assertEqual(ds.scales,(1.,))
  finally:ROOT,OUT=previous_root,previous_out
 def test_nodata_is_not_zero_ground(self):self.assertIsNone(bilinear(np.full((2,2),-9999),[0,0,2,2],1,1))
 def test_frame_grid_north_up(self):w,h,tr=grid_for_bbox([106.684,10.75,106.739,10.808],31);self.assertLess(tr.e,0);self.assertEqual(tr.b,0);self.assertEqual(tr.d,0);self.assertEqual(w,194);self.assertEqual(h,208)
 def test_native_window_expands_only_integer_source_pixels(self):tr=from_bounds(0,0,10,10,10,10);w=integer_window([1.2,2.1,5.3,7.8],tr);self.assertEqual(list(w.flatten()),[1,2,5,6])
 def test_coarse_spacing_not_advertised_as_high_resolution(self):bbox=[106.684,10.75,106.739,10.808];w,h,tr=grid_for_bbox(bbox,31);self.assertGreaterEqual((bbox[3]-bbox[1])*111320/h,31)
def verify():
 m=load(OUT/'manifest.json');checks=[]
 for id,a in m['assets'].items():
  p=ROOT/'outputs'/a['url'].lstrip('/');checks.append({'id':id,'hashMatches':digest(p)==a['sha256'],'bytesMatch':p.stat().st_size==a['bytes']})
  with rasterio.open(p) as ds:
   if ds.crs.to_epsg()!=4326 or ds.tags(ns='IMAGE_STRUCTURE').get('LAYOUT')!='COG':raise ValueError('Not an EPSG4326 COG')
   if list(ds.bounds)!=a['bbox'] or ds.width!=a['width'] or ds.height!=a['height']:raise ValueError('Asset shape/bounds do not match manifest')
   if ds.transform.e>=0 or not ds.is_tiled:raise ValueError('Grid orientation/tiled layout invalid')
 if not all(c['hashMatches'] and c['bytesMatch'] for c in checks):raise ValueError('Fingerprint mismatch')
 with rasterio.open(ROOT/'outputs'/m['assets']['ground']['url'].lstrip('/')) as ds:r=bilinear(ds.read(1),m['assets']['ground']['bbox'],*m['frame']['origin'],ds.nodata)
 if abs(r-m['referenceHeightM'])>1e-6:raise ValueError('Reference sample differs')
 return {'checks':checks,'referenceHeightM':r,'sourceObservedImageryDate':m['assets']['imagery']['sourceDate'],'valid':True,'notSurveyed':True}
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('--build',action='store_true');p.add_argument('--verify',action='store_true');p.add_argument('--self-test',action='store_true');p.add_argument('--audit-sources',action='store_true');p.add_argument('--acquire-official-forest',action='store_true');a=p.parse_args()
 if a.self_test:
  result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(ScientificTests))
  if not result.wasSuccessful():raise SystemExit(2)
 if a.build:
  m=build();print(json.dumps({'manifest':str(OUT/'manifest.json'),'referenceHeightM':m['referenceHeightM'],'assets':{k:{'url':v['url'],'bytes':v['bytes'],'width':v['width'],'height':v['height']}for k,v in m['assets'].items()}}),flush=True)
 if a.verify:print(json.dumps(verify(),indent=2))
 if a.audit_sources:print(json.dumps(audit_sources(),indent=2))
 if a.acquire_official_forest:print(json.dumps(acquire_official_forest(),indent=2))
if __name__=='__main__':main()
