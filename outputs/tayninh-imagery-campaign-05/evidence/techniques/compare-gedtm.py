from pathlib import Path
import rasterio,numpy as np,json,hashlib
from rasterio.warp import reproject,Resampling
from rasterio.transform import from_bounds
from PIL import Image
root=Path('outputs/tayninh-imagery-campaign-05/evidence/techniques/gedtm-pilot')
qa=json.loads((root/'qa.json').read_text());bbox=qa['aoi_bbox_wgs84'];aoi_t=from_bounds(*bbox,108,108)
def sha(f):return hashlib.sha256(f.read_bytes()).hexdigest()
for slug in ['dtm','uncertainty']:
 with rasterio.open(root/f'{slug}-provider-window.tif') as src:
  arr=np.full((108,108),np.nan,dtype=np.float32)
  reproject(rasterio.band(src,1),arr,src_transform=src.transform,src_crs=src.crs,dst_transform=aoi_t,dst_crs=src.crs,resampling=Resampling.bilinear,dst_nodata=np.nan)
  f=root/f'{slug}-exact-aoi-resampled.tif'
  with rasterio.open(f,'w',driver='GTiff',width=108,height=108,count=1,dtype='float32',crs=src.crs,transform=aoi_t,nodata=np.nan,compress='deflate') as dst:
   dst.write(arr,1);dst.update_tags(**src.tags(),PROCESSING='Bilinear reprojection to exact AOI bounds; not original provider-grid values.')
  qa['layers'][slug]['exact_aoi_resampled']={'dimensions':[108,108],'bounds':bbox,'transform':list(aoi_t),'pixel_size_deg':[aoi_t.a,-aoi_t.e],'resampling':'bilinear; grid shifted to exact AOI, not additional resolution','valid_pixels':int(np.isfinite(arr).sum()),'min_m':float(np.nanmin(arr)),'max_m':float(np.nanmax(arr)),'mean_m':float(np.nanmean(arr))}
  qa['layers'][slug]['files'].append({'path':str(f),'sha256':sha(f),'role':'exact_AOI_bounds_bilinear_derived_GeoTIFF'})
with rasterio.open(root/'dtm-provider-window.tif') as src:
 dtm=src.read(1);dsm=np.full(dtm.shape,np.nan,dtype=np.float32)
 p=Path('outputs/tayninh-data-batch-01/raw/global/copdem-glo30-n11-e106.tif')
 with rasterio.open(p) as dem:
  # GDAL reads only relevant source blocks; target is the original GEDTM provider grid.
  reproject(rasterio.band(dem,1),dsm,src_transform=dem.transform,src_crs=dem.crs,dst_transform=src.transform,dst_crs=src.crs,resampling=Resampling.bilinear,dst_nodata=np.nan)
 delta=dsm-dtm;valid=np.isfinite(delta)
 q={'comparison':'COPDEM DSM bilinearly registered onto original GEDTM30 DTM grid, 109x109','method':'Horizontal common CRS and provider EGM2008 datum; no local control points or epoch correction. Difference is between products, never inferred per-building height or site error.','input_files':[{'path':str(p),'sha256':sha(p)},{'path':str(root/'dtm-provider-window.tif'),'sha256':sha(root/'dtm-provider-window.tif')}],'paired_valid_pixels':int(valid.sum()),'dsm_minus_dtm_m':{'min':float(delta[valid].min()),'max':float(delta[valid].max()),'mean':float(delta[valid].mean()),'median':float(np.median(delta[valid])),'p05':float(np.percentile(delta[valid],5)),'p95':float(np.percentile(delta[valid],95))},'negative_difference_pixels':int((delta[valid]<0).sum()),'gedtm_relief_m':float(dtm.max()-dtm.min()),'copdem_resampled_relief_m':float(np.nanmax(dsm)-np.nanmin(dsm))}
 f=root/'copdem-comparison.json';f.write_text(json.dumps(q,ensure_ascii=False,indent=2)+'\n');qa['comparison']={'path':str(f),'sha256':sha(f)}
(root/'qa.json').write_text(json.dumps(qa,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(q,ensure_ascii=False,indent=2))
