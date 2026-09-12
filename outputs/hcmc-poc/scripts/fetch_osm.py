import urllib.request,urllib.parse,json,pathlib,datetime
root=pathlib.Path(__file__).resolve().parents[1]
q='''[out:json][timeout:90];(way["building"](10.750,106.684,10.808,106.739);way["building:part"](10.750,106.684,10.808,106.739);way["highway"](10.750,106.684,10.808,106.739);way["natural"="water"](10.750,106.684,10.808,106.739);relation["natural"="water"](10.750,106.684,10.808,106.739);way["landuse"](10.750,106.684,10.808,106.739);way["leisure"="park"](10.750,106.684,10.808,106.739););out body geom;'''
(root/'data/query.overpass').write_text(q)
url='https://overpass.kumi.systems/api/interpreter'
req=urllib.request.Request(url,data=urllib.parse.urlencode({'data':q}).encode(),headers={'User-Agent':'HCMC-Research-PoC/0.1 (bounded open-data research)'})
with urllib.request.urlopen(req,timeout=150) as r: raw=r.read()
(root/'data/osm-raw.json').write_bytes(raw)
d=json.loads(raw)
print(json.dumps({'bytes':len(raw),'elements':len(d.get('elements',[])),'timestamp':d.get('osm3s'),'remark':d.get('remark')},ensure_ascii=False))
