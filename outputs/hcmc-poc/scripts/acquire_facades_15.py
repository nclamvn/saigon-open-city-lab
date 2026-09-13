"""Bounded Wikimedia source discovery. Resume from immutable local query snapshots."""
from pathlib import Path
import urllib.request,urllib.parse,urllib.error,json,concurrent.futures,datetime,time
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'research/facades-15';S=R/'snapshots'
QUERIES={'cityhall':'Ho Chi Minh City City Hall','rex':'Rex Hotel Saigon','union':'Union Square Ho Chi Minh','cafe42':'42 Nguyen Hue','sunwah':'Sunwah Tower','palace':'Palace Hotel Saigon','prince':'Saigon Prince Hotel','garden':'Saigon Garden Nguyen Hue','times':'Times Square Ho Chi Minh','lucky':'Lucky Plaza Saigon','vietcombank':'Vietcombank Tower Ho Chi Minh','melinh':'Me Linh Point','renaissance':'Renaissance Riverside Saigon','majestic':'Majestic Hotel Saigon','grand':'Grand Hotel Saigon','riverside':'Riverside Hotel Saigon','liberty':'Liberty Central Riverside Saigon','hilton':'Hilton Saigon','opera':'Saigon Opera House','caravelle':'Caravelle Hotel Saigon','continental':'Continental Hotel Saigon','sheraton':'Sheraton Saigon','huongsen':'Huong Sen Hotel','royal':'Royal Hotel Saigon'}
def fetch(item):
 key,q=item;p=S/(key+'-search.json')
 if p.exists():data=json.loads(p.read_text())
 else:
  params={'action':'query','format':'json','generator':'search','gsrsearch':q,'gsrnamespace':6,'gsrlimit':6,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':1280}
  url='https://commons.wikimedia.org/w/api.php?'+urllib.parse.urlencode(params)
  req=urllib.request.Request(url,headers={'User-Agent':'CityLab-FacadeResearch/1.0 (local 3D prototype; public source attribution)'})
  for attempt in range(3):
   try:
    with urllib.request.urlopen(req,timeout=40) as resp:data=json.load(resp)
    break
   except urllib.error.HTTPError as error:
    if error.code != 429 or attempt == 2: raise
    pause=max(60,int(error.headers.get('Retry-After','60')));print('Rate limited; backoff',pause,flush=True);time.sleep(pause)
  time.sleep(3)
  data['_capture']={'url':url,'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat()};p.write_text(json.dumps(data,ensure_ascii=False,indent=2))
 return key,[{'title':v['title'],'image':v.get('imageinfo',[{}])[0]}for v in data.get('query',{}).get('pages',{}).values()]
if __name__=='__main__':
 S.mkdir(parents=True,exist_ok=True)
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
  for key,rows in pool.map(fetch,QUERIES.items()):print(key,[(x['title'],x['image'].get('extmetadata',{}).get('LicenseShortName',{}).get('value'))for x in rows],flush=True)
