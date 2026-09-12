import urllib.request,concurrent.futures,json,pathlib,hashlib,datetime
root=pathlib.Path('outputs/hcmc-poc/research')
sources=[
('osm','https://www.openstreetmap.org/copyright'),
('overpass','https://dev.overpass-api.de/overpass-doc/en/preface/commons.html'),
('geofabrik','https://download.geofabrik.de/asia/vietnam.html'),
('overture','https://docs.overturemaps.org/guides/buildings/'),
('overture-license','https://registry.opendata.aws/overture/'),
('microsoft','https://raw.githubusercontent.com/microsoft/GlobalMLBuildingFootprints/main/README.md'),
('google-temporal','https://sites.research.google/gr/open-buildings/temporal/'),
('copernicus','https://dataspace.copernicus.eu/about'),
('terrain','https://registry.opendata.aws/terrain-tiles/'),
('terrain-license','https://raw.githubusercontent.com/tilezen/joerd/master/docs/attribution.md'),
('eox-license','https://cloudless.eox.at/license-non-commercial'),
('eox-capabilities','https://tiles.maps.eox.at/wms?service=WMS&request=GetCapabilities'),
('oam','https://docs.openaerialmap.org/api/api/'),
('oam-query','https://api.openaerialmap.org/meta?bbox=106.684,10.750,106.739,10.808&limit=100'),
('gitc','https://hcmgis.vn/'),
('hcm-portal','https://geoportal-stnmt.tphcm.gov.vn/'),
('odm','https://docs.opendronemap.org/faq/'),
('webodm','https://webodm.org/'),
('colmap','https://colmap.github.io/'),
('gsplat','https://raw.githubusercontent.com/nerfstudio-project/gsplat/main/LICENSE'),
('cesium','https://cesium.com/learn/3d-tiling/'),
('three-license','https://raw.githubusercontent.com/mrdoob/three.js/r160/LICENSE'),
('google-tiles-policy','https://developers.google.com/maps/documentation/tile/policies'),
('mapillary','https://www.mapillary.com/developer/api-documentation/'),
('overture-access','https://docs.overturemaps.org/getting-data/'),
]
def get(s):
 name,url=s; p=root/'snapshots'/f'{name}.html';row={'id':name,'url':url,'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'HCMC-Research-PoC/0.1'})
  with urllib.request.urlopen(req,timeout=25) as r: raw=r.read();row['http_status']=r.status;row['final_url']=r.url
  p.write_bytes(raw);row.update(snapshot='snapshots/'+p.name,sha256=hashlib.sha256(raw).hexdigest(),bytes=len(raw),status='captured')
 except Exception as e: row.update(status='failed',error=str(e))
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex: rows=list(ex.map(get,sources))
(root/'capture-manifest.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps([{k:r.get(k) for k in ['id','status','bytes','error']} for r in rows],indent=2))
