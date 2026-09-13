import urllib.request,json,concurrent.futures,datetime,hashlib
from pathlib import Path
import argparse
parser=argparse.ArgumentParser(description='Capture a NEW batch of 30 official sources; preserves existing snapshots.')
parser.add_argument('--output',type=Path,required=True)
R=parser.parse_args().output;S=R/'snapshots'
if R.exists(): raise SystemExit('Output must be a new directory; frozen snapshots are never overwritten.')
S.mkdir(parents=True)
repos=[('three','mrdoob/three.js','render','Engine hiện tại; nâng module theo nhánh riêng'),('tiles','NASA-AMMOS/3DTilesRendererJS','streaming','Stream các tile GLB theo sai số màn hình'),('cesium','CesiumGS/cesium','geospatial','WGS84, terrain và 3D Tiles cho quy mô thành phố'),('maplibre','maplibre/maplibre-gl-js','geospatial','Nền vector, DEM, giao diện bản đồ'),('gltf-transform','donmccurdy/glTF-Transform','optimization','Chuẩn hóa, nén và kiểm định GLB'),('meshoptimizer','zeux/meshoptimizer','optimization','LOD mesh và nén hình học'),('basis','BinomialLLC/basis_universal','optimization','KTX2/Basis cho bộ nhớ texture GPU'),('n8ao','N8python/n8ao','lighting','AO tiếp xúc và chiều sâu cận cảnh'),('postprocessing','pmndrs/postprocessing','lighting','SMAA, bloom, tone mapping'),('spark','sparkjsdev/spark','splat','Viewer splat tích hợp Three.js'),('gaussian','mkkellogg/GaussianSplats3D','splat','Viewer splat thay thế để benchmark'),('gsplat','nerfstudio-project/gsplat','reconstruction','Huấn luyện splat trên dữ liệu chụp'),('colmap','colmap/colmap','reconstruction','Camera pose, sparse/dense reconstruction'),('openmvg','openMVG/openMVG','reconstruction','Structure from Motion'),('openmvs','cdcseacave/openMVS','reconstruction','Dense mesh và texture từ ảnh'),('meshroom','alicevision/Meshroom','reconstruction','Pipeline photogrammetry dạng graph'),('odm','OpenDroneMap/ODM','reconstruction','Orthophoto, DSM, point cloud và mesh UAV'),('ez-tree','dgreenheck/ez-tree','vegetation','Cây phân nhánh procedural; cần kiểm tra khả năng bundle')]
pages=[('ambient-license','https://docs.ambientcg.com/license/'),('ambient-api','https://docs.ambientcg.com/api/'),('cgbookcase','https://www.cgbookcase.com/textures'),('poly-license','https://polyhaven.com/license'),('poly-api','https://raw.githubusercontent.com/Poly-Haven/Public-API/master/README.md'),('kenney','https://kenney.nl/support'),('quaternius','https://quaternius.com/'),('blenderkit','https://www.blenderkit.com/docs/licenses/'),('wikimedia','https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia'),('mapillary','https://www.mapillary.com/developer/api-documentation/'),('kartaview','https://kartaview.org/'),('three-pbr','https://threejs.org/docs/pages/MeshStandardMaterial.html')]
def get(item):
 k,u=item
 try:
  req=urllib.request.Request(u,headers={'User-Agent':'CityLab-PoC14-research/1.0','Accept':'application/vnd.github+json' if 'api.github' in u else '*/*'})
  with urllib.request.urlopen(req,timeout=22) as resp:raw=resp.read();final=resp.url
  suffix='.json' if 'api.github' in u else '.html';path=S/(k+suffix);path.write_bytes(raw)
  return {'id':k,'url':u,'resolved_url':final,'snapshot':path.name,'sha256':hashlib.sha256(raw).hexdigest(),'bytes':len(raw),'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'status':'captured'}
 except Exception as e:return {'id':k,'url':u,'status':'failed','error':str(e)}
items=[(k,'https://api.github.com/repos/'+repo) for k,repo,cat,use in repos]+pages
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:captures=list(pool.map(get,items))
(R/'captures.json').write_text(json.dumps(captures,ensure_ascii=False,indent=2))
libs=[]
for k,repo,cat,use in repos:
 c=next(c for c in captures if c['id']==k);row={'id':k,'name':repo,'category':cat,'proposed_use':use,'integrated':False,'tested_with_current_engine':False,'capture':c,'license':None}
 if c['status']=='captured':
  d=json.loads((S/c['snapshot']).read_text());row.update(description=d.get('description'),license=(d.get('license')or{}).get('spdx_id'),archived=d.get('archived'),pushed_at=d.get('pushed_at'),default_branch=d.get('default_branch'),url=d.get('html_url'))
 libs.append(row)
(R/'libraries.json').write_text(json.dumps(libs,ensure_ascii=False,indent=2))
for row in libs:print(row['id'],row['license'],row['capture']['status'],row.get('description'))
for c in captures[len(repos):]:print(c['id'],c['status'],c.get('bytes'),c.get('error'))
