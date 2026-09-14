"""Independent Rasterio/GDAL oracle: computational registration, not survey QC."""
import hashlib
import json
import math
from pathlib import Path
import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / 'outputs'
QA = Path(__file__).parent
manifest_bytes = (OUT / 'hcmc-poc/data/surface-18/manifest.json').read_bytes()
manifest = json.loads(manifest_bytes)
catalog_bytes = (OUT / 'hcmc-poc/data/tiles-18/catalog.json').read_bytes()
catalog = json.loads(catalog_bytes)
scene = json.loads((OUT / 'hcmc-poc/data/scene.json').read_bytes())
assets = manifest['assets']
ground = assets['ground']
with rasterio.open(OUT / ground['url'].lstrip('/')) as ds:
    grid = ds.read(1)

def sample(lon, lat):
    west, south, east, north = ground['bbox']
    px = (lon-west)/(east-west)*ground['width']-.5
    py = (north-lat)/(north-south)*ground['height']-.5
    if not (0 <= px <= ground['width']-1 and 0 <= py <= ground['height']-1):
        raise ValueError('Sample outside pixel-centre domain')
    ix, iy = math.floor(px), math.floor(py)
    jx, jy = min(ix+1, ground['width']-1), min(iy+1, ground['height']-1)
    fx, fy = px-ix, py-iy
    result = 0.
    for x, y, weight in [(ix,iy,(1-fx)*(1-fy)),(jx,iy,fx*(1-fy)),(ix,jy,(1-fx)*fy),(jx,jy,fx*fy)]:
        if weight <= 0:
            continue
        raw = float(grid[y,x])
        if not math.isfinite(raw) or raw == ground['nodata']:
            raise ValueError('Contributing NoData sample')
        result += raw*weight
    return result*ground.get('scale',1)+ground.get('offset',0)

frame = manifest['frame']
reference = sample(*frame['origin'])
errors = []
count = 0
for tile in catalog['tiles']:
    index = json.loads((OUT / tile['fine']['featureIndexUrl'].lstrip('/')).read_bytes())
    for feature in index['features']:
        item = scene['buildings'][feature['modelIndex']]
        points = [p for ring in item['r'] for p in ring]
        cx = (min(p[0] for p in points)+max(p[0] for p in points))/2
        cz = (min(p[1] for p in points)+max(p[1] for p in points))/2
        lon = frame['origin'][0]+cx/frame['metresPerDegreeLon']
        lat = frame['origin'][1]-cz/frame['metresPerDegreeLat']
        expected = sample(lon,lat)-manifest['referenceHeightM']
        errors.append(abs(expected-feature['baseOffsetM']))
        assert feature['baseSource'] == 'ground'
        count += 1

browser = json.loads((QA / 'cog-browser-results.json').read_bytes())
buffer_checks = []
for row in browser['rows']:
    a = assets[row['assetId']]
    level = row['stats']['selectedOverview']
    # Read the actual TIFF directory directly; GDAL's out_shape heuristic can
    # choose a different level, and odd-size overviews need not use ceil(n/factor).
    source_path = OUT / a['url'].lstrip('/')
    with rasterio.open(f'GTIFF_DIR:{level+1}:{source_path}') as ds:
        image = ds.read()
    x0,y0,x1,y1 = row['stats']['sourceWindow']
    patch = image[:,y0:y1,x0:x1]
    cols = np.floor((np.arange(row['width'])+.5)*(x1-x0)/row['width']).astype(int)
    rows = np.floor((np.arange(row['height'])+.5)*(y1-y0)/row['height']).astype(int)
    sampled = patch[:,rows[:,None],cols[None,:]]
    if row['dtype'] == 'rgba8':
        valid = np.all(np.isfinite(sampled),axis=0)&~np.all(sampled==a['nodata'],axis=0)
        values = np.empty((row['height'],row['width'],4),dtype=np.uint8)
        values[:,:,:3] = sampled.transpose(1,2,0)
        values[:,:,3] = valid.astype(np.uint8)*255
    else:
        valid = np.isfinite(sampled[0])&(sampled[0]!=a['nodata'])
        values = (sampled[0].astype(np.float64)*a.get('scale',1)+a.get('offset',0)).astype('<f4')
        values[~valid] = np.nan
    digest = hashlib.sha256(values.tobytes()).hexdigest()
    mask_digest = hashlib.sha256(valid.astype(np.uint8).tobytes()).hexdigest()
    check = {'name':row['name'],'pixels':row['width']*row['height'],'valuesExact':digest==row['valuesSha256'],'maskExact':mask_digest==row['validMaskSha256']}
    buffer_checks.append(check)
    assert check['valuesExact'] and check['maskExact'],check
report = {'schema':'rtr-independent-ground-registration/1.0','engine':{'rasterio':rasterio.__version__,'gdal':rasterio.__gdal_version__,'numpy':np.__version__},'manifestSha256':hashlib.sha256(manifest_bytes).hexdigest(),'catalogSha256':hashlib.sha256(catalog_bytes).hexdigest(),'buildingBases':count,'maxBaseDifferenceM':max(errors),'referenceDifferenceM':abs(reference-manifest['referenceHeightM']),'computationalToleranceM':1e-9,'browserBuffers':buffer_checks,'limitations':'Independent decoder and pixel-centre arithmetic check computed alignment only; source horizontal/vertical accuracy is not established. One flat base per footprint; display reference is not absolute geodetic survey height.','pass':count==70709 and max(errors)<1e-9 and abs(reference-manifest['referenceHeightM'])<1e-9}
(QA / 'ground-alignment-oracle.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
assert report['pass']
