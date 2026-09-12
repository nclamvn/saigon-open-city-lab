import urllib.request,urllib.parse,pathlib,json,math,hashlib
r=pathlib.Path('outputs/hcmc-poc/data')
p={'service':'WMS','request':'GetMap','version':'1.1.1','layers':'s2cloudless','styles':'','format':'image/jpeg','srs':'EPSG:4326','bbox':'106.684,10.750,106.739,10.808','width':2048,'height':2048}
u='https://tiles.maps.eox.at/wms?'+urllib.parse.urlencode(p)
b=urllib.request.urlopen(u,timeout=40).read();(r/'sentinel-2016.jpg').write_bytes(b)
(r/'imagery-source.json').write_text(json.dumps({'url':u,'source':'EOX Sentinel-2 cloudless 2016','license':'CC-BY-4.0','date_scope':'2016/2017 historical mosaic, not current imagery','sha256':hashlib.sha256(b).hexdigest()},indent=2))
print('imagery',len(b))
lat,lon,z=10.78,106.71,12
x=int((lon+180)/360*2**z); y=int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**z)
u=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
b=urllib.request.urlopen(u,timeout=30).read();(r/'terrain.png').write_bytes(b)
(r/'terrain-source.json').write_text(json.dumps({'url':u,'z':z,'x':x,'y':y,'sha256':hashlib.sha256(b).hexdigest()},indent=2));print('terrain',len(b))
