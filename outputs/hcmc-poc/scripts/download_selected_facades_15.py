"""Fetch only the 20 reviewed source images, preserving frozen Wikimedia metadata."""
from pathlib import Path
import json,urllib.request,urllib.error,time,sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT.parents[1]/'work/pylib'))
from PIL import Image
R=ROOT/'research/facades-15'
for entry in json.loads((R/'selections.json').read_text())['entries']:
 out=ROOT/entry['source_file']
 if out.exists():
  with Image.open(out) as image:image.verify()
  continue
 data=json.loads((R/'snapshots'/entry['source_snapshot']).read_text());page=next(p for p in data['query']['pages'].values()if p['title']==entry['source_title']);info=page['imageinfo'][0]
 assert info['extmetadata']['LicenseShortName']['value'].startswith(('CC BY','CC0','Public domain'))
 req=urllib.request.Request(info.get('thumburl',info['url']),headers={'User-Agent':'CityLab-FacadeResearch/1.0'})
 for attempt in range(3):
  try:
   with urllib.request.urlopen(req,timeout=45) as response:raw=response.read()
   out.write_bytes(raw)
   with Image.open(out) as image:image.verify()
   break
  except urllib.error.HTTPError as error:
   if error.code!=429 or attempt==2:raise
   time.sleep(max(60,int(error.headers.get('Retry-After','60'))))
 time.sleep(2)
print('20 reviewed source images present')
