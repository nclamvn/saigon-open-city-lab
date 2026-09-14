"""Bounded public metadata acquisition. Raster subsets handled separately after sourced AOI."""
import urllib.request,json,hashlib,datetime,concurrent.futures,re
from pathlib import Path
from html.parser import HTMLParser
BASE=Path(__file__).resolve().parents[2]
SOURCES={
'worldcover':'https://esa-worldcover.org/en/data-access',
'copdem':'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM',
'copdem-aws':'https://copernicus-dem-30m.s3.amazonaws.com/readme.html',
'sentinel':'https://registry.opendata.aws/sentinel-2-l2a-cogs/',
'water':'https://global-surface-water.appspot.com/download',
'canopy':'https://langnico.github.io/globalcanopyheight/',
'canopy-index':'https://share.phys.ethz.ch/~pf/nlangdata/ETH_GlobalCanopyHeight_10m_2020_version1/',
'buildings':'https://sites.research.google/gr/open-buildings/temporal/',
'buildings-catalog':'https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1',
'gedi':'https://data.nasa.gov/dataset/gedi-l2a-elevation-and-height-metrics-data-global-footprint-level-v002-d2f2d',
'gedi-products':'https://gedi.umd.edu/dataproducts/products/',
'lidar':'https://opentopography.org/developers',
'lidar-openapi':'https://portal.opentopography.org/apidocs/openapi.json',
'copdem-license':'https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf'
}
class Extract(HTMLParser):
 def __init__(self): super().__init__();self.parts=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  if tag in ('script','style'): self.skip+=1
 def handle_endtag(self,tag):
  if tag in ('script','style'):self.skip=max(0,self.skip-1)
 def handle_data(self,data):
  t=' '.join(data.split())
  if t and not self.skip:self.parts.append(t)
def fetch(k,u):
 now=datetime.datetime.now(datetime.timezone.utc).isoformat()
 try:
  with urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'CityLab-Research/1.0 public geospatial provenance'}),timeout=40) as r:
   raw=r.read(12*1024*1024);ct=r.headers.get('Content-Type','');status=r.status;final=r.url
  ext='.pdf' if 'pdf' in ct else '.json' if 'json' in ct else '.html'
  p=BASE/'sources/global'/f'{k}{ext}';p.write_bytes(raw)
  out={'id':k,'url':u,'final_url':final,'captured_at':now,'status':status,'snapshot':str(p.relative_to(BASE)),'snapshot_sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw)}
  if ext=='.html':
   e=Extract();e.feed(raw.decode('utf-8',errors='replace'));t=p.with_suffix('.txt');t.write_text('\n'.join(e.parts)+'\n');out['text_snapshot']=str(t.relative_to(BASE));out['text_sha256']=hashlib.sha256(t.read_bytes()).hexdigest()
  print(k,status,len(raw),flush=True);return out
 except Exception as e:
  print(k,str(e),flush=True);return {'id':k,'url':u,'captured_at':now,'error':str(e)}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:r=list(ex.map(lambda kv:fetch(*kv),SOURCES.items()))
 (BASE/'sources/global/snapshot-receipts.json').write_text(json.dumps(r,indent=2)+'\n')
