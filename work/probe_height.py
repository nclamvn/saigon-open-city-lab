import rasterio,json
from rasterio.windows import from_bounds
from rasterio.warp import transform_bounds
from rasterio.enums import Resampling
url='https://storage.googleapis.com/open-buildings-temporal-data/v1/geotiffs/31754_2023_06_30/tile_TJmqX_9eRXo.tif'
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif',GDAL_HTTP_TIMEOUT='25'):
 with rasterio.open(url) as ds:
  print(ds.profile,ds.descriptions,flush=True)
  bbox=(106.698,10.768,106.710,10.782)
  w=from_bounds(*transform_bounds('EPSG:4326',ds.crs,*bbox),ds.transform)
  a=ds.read(window=w,out_shape=(ds.count,400,400),resampling=Resampling.average)
  meta=ds.profile.copy();meta.update(width=400,height=400,transform=ds.window_transform(w)*rasterio.Affine.scale(w.width/400,w.height/400),compress='deflate')
  with rasterio.open('outputs/hcmc-poc/data/google-height-pilot-2023.tif','w',**meta)as out:out.write(a)
  print('SAVED',a.shape,[(float(x.min()),float(x.max()))for x in a],flush=True)
