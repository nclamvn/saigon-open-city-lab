"""Synthetic numerical COG fixtures only; not a surveyed or real-city asset."""
import json,pathlib,sys
import numpy as np,rasterio
from rasterio.transform import from_bounds
from rasterio.shutil import copy
out=pathlib.Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
rng=np.random.default_rng(18)
for kind in ['rgb','ground']:
    values=rng.integers(1,255,(3,512,512),dtype='uint8') if kind=='rgb' else (np.indices((512,512))[0]+2*np.indices((512,512))[1]).astype('float32')[None,:,:]
    if kind=='ground':values[0,250:255,250:255]=-9999
    working=out/(kind+'-working.tif')
    with rasterio.open(working,'w',driver='GTiff',width=512,height=512,count=values.shape[0],dtype=values.dtype,crs='EPSG:4326',transform=from_bounds(106,10,106.01,10.01,512,512),nodata=0 if kind=='rgb' else -9999) as dst:dst.write(values)
    copy(working,out/(kind+'.tif'),driver='COG',compress='DEFLATE',blocksize=128,overview_resampling='nearest')
print(json.dumps({'generated':'synthetic numerical COGs','path':str(out)}))
