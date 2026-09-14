from urllib.request import Request, urlopen
from pathlib import Path
from datetime import datetime, timezone
import json,hashlib
p=Path('outputs/tayninh-imagery-campaign-05/evidence/techniques')
a=json.loads((p/'acquisition-index.json').read_text())
e=next(x for x in a if x['id']=='opencv-homography')
e['attempts']=[{'url':e['url'],'error':'HTTP Error 403: Forbidden'},{'url':'https://docs.opencv.org/4.13.0/d9/dab/tutorial_homography.html','error':'HTTP Error 403: Forbidden'},{'url':f'https://raw.githubusercontent.com/opencv/opencv/{next(x["commit"] for x in a if x["id"]=="opencv")}/doc/tutorials/features2d/homography/homography.markdown','error':'HTTP Error 404: Not Found; corrected official tree path'}]
commit=next(x['commit'] for x in a if x['id']=='opencv')
u=f'https://raw.githubusercontent.com/opencv/opencv/{commit}/doc/tutorials/features/homography/homography.markdown'
with urlopen(Request(u,headers={'User-Agent':'RtR-C05-primary-evidence/1.0'}),timeout=20) as r:
 b=r.read();f=p/'opencv-homography.markdown';f.write_bytes(b)
 e['snapshots']=[{'url':u,'resolved_url':r.url,'path':str(f),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'captured_at':datetime.now(timezone.utc).isoformat(),'role':'primary_document'}]
 e['status']='verified_primary_snapshot';e['recovery']='Official pinned repository documentation, equivalent homography tutorial.';e.pop('error',None)
(p/'acquisition-index.json').write_text(json.dumps(a,ensure_ascii=False,indent=2)+'\n')
print(e['status'],len(b))
