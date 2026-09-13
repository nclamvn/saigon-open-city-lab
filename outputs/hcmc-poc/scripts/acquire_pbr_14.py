"""Bounded official CC0 download; retain metadata + per-map hashes. No recursive crawl."""
from pathlib import Path
import urllib.request,json,hashlib,zipfile,io,datetime,concurrent.futures,sys,subprocess
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT.parents[1]/'work/pylib'))
from PIL import Image,ImageOps,ImageDraw
S=ROOT/'research/visual-14/snapshots';A=ROOT/'assets/pbr14'
PICKS=[('asphalt','Asphalt033','Asphalt',2.5),('plaster','PaintedPlaster017','Plaster',3.0),('ground','Ground037','Grass',2.1),('bark','Bark014','Bark',1.2),('paving','PavingStones036','PavingStones',2.0)]
def run(pick):
 key,aid,cat,meters=pick;data=json.loads((S/(cat+'-catalog.json')).read_text());asset=next(a for a in data['foundAssets'] if a['assetId']==aid)
 download=next(x for x in asset['downloadFolders']['default']['downloadFiletypeCategories']['zip']['downloads'] if x['attribute']=='1K-JPG')
 cache=Path('/tmp')/download['fileName']
 if not cache.exists() or cache.stat().st_size!=download['size']:
  subprocess.run(['curl','-L','--fail','--max-time','90','--retry','1','-sS','-A','CityLab-PoC14/1.0',download['downloadLink'],'-o',str(cache)],check=True)
 raw=cache.read_bytes()
 assert len(raw)==download['size'],(aid,len(raw),download['size'])
 z=zipfile.ZipFile(io.BytesIO(raw));record={'id':aid,'key':key,'source_url':asset['shortLink'],'download_url':download['downloadLink'],'license':'CC0-1.0','license_snapshot':'ambient-license.html','creation_method':asset['creationMethod'],'site_observed':False,'meters_per_tile':meters,'scale_basis':'source_cm' if asset.get('dimensionX') else 'illustrative_assumption','zip_bytes':len(raw),'zip_sha256':hashlib.sha256(raw).hexdigest(),'metadata_snapshot':cat+'-catalog.json','maps':{}}
 for ch,suffix in [('color','Color'),('normal','NormalGL'),('roughness','Roughness')]:
  name=next(n for n in z.namelist() if n.endswith('_'+suffix+'.jpg'));b=z.read(name);out=A/(key+'-'+ch+'.jpg');
  with Image.open(io.BytesIO(b)) as im:
   width,height=im.size;assert max(width,height)<=4096
   im.save(out,quality=88)
  source_hash=hashlib.sha256(b).hexdigest();b=out.read_bytes()
  record['maps'][ch]={'path':str(out.relative_to(ROOT)),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'source_member':name,'source_sha256':source_hash,'transformation':'JPEG quality 88; dimensions preserved','width':width,'height':height,'color_space':'sRGB' if ch=='color' else 'linear'}
 return record
A.mkdir(parents=True,exist_ok=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:records=list(pool.map(run,PICKS))
manifest={'version':'14a','acquired_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'classification':'cc0_library_pbr_materials_not_hcmc_surface_capture','assets':records}
(A/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
# Embed the exact downloaded maps for file:// portability; multi-file and single-file use identical bytes.
import base64
embedded={r['key']:{ch:'data:image/jpeg;base64,'+base64.b64encode((ROOT/m['path']).read_bytes()).decode() for ch,m in r['maps'].items()}for r in records}
(ROOT/'data/pbr-assets-14.js').write_text('window.PBR_ASSETS_14='+json.dumps({'manifest':manifest,'images':embedded},separators=(',',':'))+';\n')
board=Image.new('RGB',(len(records)*280,340),'#132c31');draw=ImageDraw.Draw(board)
for i,r in enumerate(records):
 im=Image.open(ROOT/r['maps']['color']['path']);im.thumbnail((264,264));board.paste(im,(i*280+8,8));draw.text((i*280+8,283),r['id'],fill='#ecd4ae');draw.text((i*280+8,306),r['creation_method'],fill='#b8d0ce')
board.save(A/'contact-sheet.jpg',quality=88)
print(json.dumps({'assets':len(records),'maps':sum(len(r['maps'])for r in records),'bytes':sum(m['bytes']for r in records for m in r['maps'].values())}))
