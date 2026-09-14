from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.request import Request, urlopen
from datetime import datetime, timezone
import json, hashlib, re

root = Path('outputs/tayninh-imagery-campaign-05/evidence/techniques')
root.mkdir(parents=True, exist_ok=True)
repos = [
 ('three', 'mrdoob/three.js'), ('gdal', 'OSGeo/gdal'),
 ('colmap', 'colmap/colmap'), ('odm', 'OpenDroneMap/ODM'),
 ('nerfstudio', 'nerfstudio-project/nerfstudio'), ('gsplat', 'nerfstudio-project/gsplat'),
 ('gaussian-original', 'graphdeco-inria/gaussian-splatting'), ('spark', 'sparkjsdev/spark'),
 ('supersplat', 'playcanvas/supersplat'), ('opensr-model', 'ESAOpenSR/opensr-model'),
 ('opensr-test', 'ESAOpenSR/opensr-test'), ('highres-net', 'ServiceNow/HighRes-net'),
 ('cesium', 'CesiumGS/cesium'), ('maplibre', 'maplibre/maplibre-gl-js'),
 ('stereo-pipeline', 'NeoGeographyToolkit/StereoPipeline'),
 ('eth-canopy', 'langnico/global-canopy-height-model'), ('opencv', 'opencv/opencv'),
]
pages = [
 ('three-texture', 'https://threejs.org/docs/pages/Texture.html'),
 ('three-pbr', 'https://threejs.org/docs/pages/MeshStandardMaterial.html'),
 ('gdal-warp', 'https://gdal.org/en/stable/programs/gdalwarp.html'),
 ('gdal-overviews', 'https://gdal.org/en/stable/programs/gdaladdo.html'),
 ('copdem-dsm', 'https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM'),
 ('sentinel-bands', 'https://sentiwiki.copernicus.eu/web/s2-mission'),
 ('blender-pbr', 'https://docs.blender.org/manual/en/latest/render/shader_nodes/shader/principled.html'),
 ('blender-license', 'https://www.blender.org/about/license/'),
 ('polyhaven-license', 'https://polyhaven.com/license'),
 ('opencv-homography', 'https://docs.opencv.org/4.x/d9/dab/tutorial_homography.html'),
 ('colmap-tutorial', 'https://colmap.github.io/tutorial.html'),
 ('odm-gcp', 'https://docs.opendronemap.org/gcp/'),
 ('nerf-paper', 'https://arxiv.org/abs/2003.08934'),
 ('gaussian-paper', 'https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/'),
 ('spark-docs', 'https://sparkjs.dev/docs/'),
 ('highres-paper', 'https://arxiv.org/abs/2002.06460'),
 ('dsen2-paper', 'https://arxiv.org/abs/1803.04271'),
 ('stereo-docs', 'https://stereopipeline.readthedocs.io/en/latest/'),
 ('cesium-tiles', 'https://cesium.com/learn/cesiumjs/ref-doc/Cesium3DTileset.html'),
 ('ogc-tiles', 'https://docs.ogc.org/cs/22-025r4/22-025r4.html'),
 ('maplibre-terrain', 'https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/'),
 ('reference-process', 'https://somethingbig.ai/3d-worlds'),
]

def get(url, name):
    with urlopen(Request(url, headers={'User-Agent':'RtR-C05-primary-evidence/1.0'}), timeout=45) as response:
        data=response.read()
        path=root/name
        path.write_bytes(data)
        return {'url':url,'resolved_url':response.url,'path':str(path),'sha256':hashlib.sha256(data).hexdigest(),
                'bytes':len(data),'content_type':response.headers.get('Content-Type'),
                'captured_at':datetime.now(timezone.utc).isoformat()},data

def repo_task(slug, repo):
    result={'id':slug,'publisher':repo.split('/')[0],'repository':repo,'url':f'https://github.com/{repo}', 'snapshots':[]}
    try:
        meta,b=get(f'https://api.github.com/repos/{repo}',f'{slug}-repository.json')
        result['snapshots'].append(meta); info=json.loads(b)
        branch=info['default_branch']; result['default_branch']=branch
        result['license_spdx_from_provider']=(info.get('license') or {}).get('spdx_id')
        commit,b=get(f'https://api.github.com/repos/{repo}/commits/{branch}',f'{slug}-commit.json')
        result['snapshots'].append(commit); sha=json.loads(b)['sha']; result['commit']=sha
        listing,b=get(f'https://api.github.com/repos/{repo}/contents/?ref={sha}',f'{slug}-root-files.json')
        result['snapshots'].append(listing)
        files=json.loads(b)
        wanted=[f for f in files if f['type']=='file' and (f['name'].lower().startswith('readme') or re.match(r'^(license|copying)(\.|$)',f['name'], re.I))]
        for f in wanted:
            asset,_=get(f'https://raw.githubusercontent.com/{repo}/{sha}/{f["name"]}',f'{slug}-{f["name"]}')
            asset['role']='readme' if f['name'].lower().startswith('readme') else 'license'
            result['snapshots'].append(asset)
        result['status']='verified_primary_snapshot'
    except Exception as e:
        result['status']='incomplete'; result['error']=str(e)
    return result

def page_task(slug,url):
    result={'id':slug,'url':url,'snapshots':[]}
    try:
        snap,_=get(url,f'{slug}.html');snap['role']='primary_document';result['snapshots'].append(snap);result['status']='verified_primary_snapshot'
    except Exception as e:
        result['status']='incomplete';result['error']=str(e)
    return result

results=[]
with ThreadPoolExecutor(max_workers=4) as pool:
    tasks=[pool.submit(repo_task,*entry) for entry in repos]+[pool.submit(page_task,*entry) for entry in pages]
    for task in as_completed(tasks):
        result=task.result(); results.append(result)
        print(result['id'],result['status'],len(result['snapshots']), result.get('license_spdx_from_provider',''),result.get('error',''),flush=True)
results.sort(key=lambda r:r['id'])
(root/'acquisition-index.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print('TOTAL',len(results),'INCOMPLETE',sum(r['status']=='incomplete' for r in results),flush=True)
