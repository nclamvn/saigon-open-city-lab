"""Rebuild a source-attributed facade atlas from reviewed photo quadrilaterals.
No invented pixels or generative fill: occluded regions retain baseline geometry.
"""
from pathlib import Path
import json,sys,hashlib,base64,html,re,math
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT.parents[1]/'work/pylib'))
from PIL import Image,ImageOps,ImageDraw
R=ROOT/'research/facades-15';A=ROOT/'assets/facades15';cfg=json.loads((R/'selections.json').read_text());D=json.loads((ROOT/'data/scene.json').read_text())
def clean(s):return html.unescape(re.sub('<[^>]+>','',s or '')).strip()
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def coefficients(quad,w,h,size):
 mat=[]
 for (x,y),(u,v) in zip([(0,0),(size-1,0),(size-1,size-1),(0,size-1)],quad):
  u*=w;v*=h;mat.extend([[x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]])
 for i in range(8):
  p=max(range(i,8),key=lambda j:abs(mat[j][i]));mat[i],mat[p]=mat[p],mat[i];f=mat[i][i];assert abs(f)>1e-10
  mat[i]=[v/f for v in mat[i]]
  for j in range(8):
   if j!=i:
    f=mat[j][i];mat[j]=[a-f*b for a,b in zip(mat[j],mat[i])]
 return [mat[i][8]for i in range(8)]
def outward(a,b,ring):
 area=sum(p[0]*ring[(i+1)%len(ring)][1]-ring[(i+1)%len(ring)][0]*p[1]for i,p in enumerate(ring));dx,dz=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dz);return ([dz/l,-dx/l] if area>0 else [-dz/l,dx/l])
cell=512;pad=6;size=cell-2*pad;atlas=Image.new('RGB',(cell*4,cell*5));alpha=Image.new('L',atlas.size,0);manifest=[];thumbs={};cards=[]
for i,e in enumerate(cfg['entries']):
 b=next(b for b in D['buildings']if b['id']==e['building_id']);ring=b['r'][0]
 raw=json.loads((R/'snapshots'/e['source_snapshot']).read_text());source=next(v for v in raw['query']['pages'].values()if v['title']==e['source_title']);info=source['imageinfo'][0];meta=info['extmetadata'];license=meta['LicenseShortName']['value'];assert license.startswith(('CC BY','CC0','Public domain')),license
 src=ROOT/e['source_file'];im=Image.open(src).convert('RGB');coef=coefficients(e['quad'],*im.size,size);tile=im.transform((size,size),Image.Transform.PERSPECTIVE,coef,Image.Resampling.BICUBIC)
 mask=Image.new('L',(size,size),255)
 if e.get('detail_texture'):
  tile=Image.open(ROOT/e['detail_texture']).convert('RGB').resize((size,size),Image.Resampling.LANCZOS)
  mask=Image.open(ROOT/e['detail_mask']).convert('L').resize((size,size),Image.Resampling.LANCZOS)
 # City Hall's photographed foreground leaves are not wall texture; retain proxy through the mask.
 if e['key']=='cityhall':
  pix=tile.load();m=mask.load()
  for y in range(size):
   for x in range(size):
    rr,g,bb=pix[x,y]
    if y>size*.65 and g>rr*1.10 and g>bb*1.15:m[x,y]=0
 # Explicitly mask foreground occluders instead of painting photographed trees onto walls.
 exclusions={'royal':[(.70,.08),(1,.08),(1,1),(.64,1),(.47,.48),(.53,.20)],'majestic':[(0,.45),(.17,.45),(.17,1),(0,1)],'cafe42':[(.78,.86),(1,.86),(1,1),(.78,1)]}
 if e['key'] in exclusions:ImageDraw.Draw(mask).polygon([(int(u*size),int(v*size))for u,v in exclusions[e['key']]],fill=0)
 tile.save(A/(e['key']+'-rectified.jpg'),quality=92)
 x=(i%4)*cell;y=(i//4)*cell
 # Edge padding prevents neighbouring facades bleeding into mipmaps.
 atlas.paste(tile,(x+pad,y+pad));alpha.paste(mask,(x+pad,y+pad))
 for target,source_image in [(atlas,tile),(alpha,mask)]:
  target.paste(source_image.crop((0,0,1,size)).resize((pad,size)),(x,y+pad))
  target.paste(source_image.crop((size-1,0,size,size)).resize((pad,size)),(x+pad+size,y+pad))
  target.paste(source_image.crop((0,0,size,1)).resize((size,pad)),(x+pad,y))
  target.paste(source_image.crop((0,size-1,size,size)).resize((size,pad)),(x+pad,y+pad+size))
  for xx,yy,sx,sy in [(0,0,0,0),(cell-pad,0,size-1,0),(0,cell-pad,0,size-1),(cell-pad,cell-pad,size-1,size-1)]:
   target.paste(source_image.getpixel((sx,sy)),(x+xx,y+yy,x+xx+pad,y+yy+pad))
 strips=[];total=sum(math.dist(ring[j],ring[(j+1)%len(ring)])for j in e['edges']);cursor=0
 for j in e['edges']:
  a=ring[j];z=ring[(j+1)%len(ring)];length=math.dist(a,z);strips.append({'a':a,'b':z,'normal':outward(a,z,ring),'u0':cursor/total,'u1':(cursor+length)/total});cursor+=length
 # Outward-facing image reads left-to-right; clockwise footprint chains need reversal in x/z view.
 n=[sum(s['normal'][k]*(s['u1']-s['u0'])for s in strips)for k in range(2)];nlen=math.hypot(*n);n=[v/nlen for v in n];first=ring[e['edges'][0]];last=ring[(e['edges'][-1]+1)%len(ring)];right=[n[1],-n[0]];reverse=(last[0]-first[0])*right[0]+(last[1]-first[1])*right[1]<0
 # Provenance alone is not a surface-fit test. Fail closed on non-planar source/target pairs.
 spread=max(math.degrees(math.acos(max(-1,min(1,sum(a*z for a,z in zip(s['normal'],n))))))for s in strips)
 review=e.get('surface_review',{})
 eligible=review.get('status')=='accepted' and review.get('source_model')=='planar' and spread<=5
 assert not(e.get('height_override') and b['q']=='podium'), 'Cannot promote a podium into a full tower'
 author=clean(meta.get('Artist',{}).get('value','Unknown'));date=clean(meta.get('DateTimeOriginal',{}).get('value','Unknown'));license_url=meta.get('LicenseUrl',{}).get('value') or info['descriptionurl']
 record={**e,'source_url':info['descriptionurl'],'download_url':info['url'] if e.get('detail_texture') else info.get('thumburl',info['url']),'author':author,'photo_date':date,'license':license,'license_url':license_url,'source_sha256':sha(src),'source_dimensions':im.size,'rectified_sha256':sha(A/(e['key']+'-rectified.jpg')),'atlas_rect':[(x+pad)/atlas.width,1-(y+pad+size)/atlas.height,size/atlas.width,size/atlas.height],'strips':strips,'normal':n,'reverse_u':reverse,'width_m':round(total,3),'baseline_height_m':b['h'],'height_m':e.get('height_override',{}).get('meters',b['h']),'mapped_center':b['center'],'observed_site_image':True,'surveyed_geometry':False,'masked_fraction':round(mask.histogram()[0]/(size*size),4),'transform':'Manual 4-corner perspective rectification; no inpainting; 500px atlas tile'}
 if e.get('detail_texture'):record['transform']='Original Commons pixels rectified from the same-height main front; 1024×1856 dedicated texture with sky alpha mask; 500px atlas fallback. No painted text or generative fill.'
 manifest.append(record)
 record['surface_fit']={'eligible':eligible,'normal_spread_degrees':round(spread,3),'maximum_degrees':5,'reason':review.get('note','Surface review missing')}
 thumb=im.copy();thumb.thumbnail((520,340));thumb.save(A/(e['key']+'-reference.jpg'),quality=84);thumbs[e['key']]='data:image/jpeg;base64,'+base64.b64encode((A/(e['key']+'-reference.jpg')).read_bytes()).decode()
 title=html.escape(e['name']);key=e['key'];cards.append(f'<article id="{key}"><div class="pair"><img src="../../assets/facades15/{key}-reference.jpg" alt="Ảnh nguồn {title}"><img class="rectified" src="../../assets/facades15/{key}-rectified.jpg" alt="Vùng mặt đứng đã hiệu chỉnh phối cảnh"></div><small>{i+1:02} / {'ĐÃ KIỂM TRA MẶT PHẲNG' if eligible else 'CHƯA PHỦ · CẦN TÁCH BỀ MẶT'}</small><h2>{title}</h2><p>{html.escape(date)} · {html.escape(author)}<br><a href="{html.escape(license_url,quote=True)}">{html.escape(license)}</a> · ảnh đã cắt và hiệu chỉnh phối cảnh</p><p>{html.escape(e["inferred"])}</p><a href="{html.escape(info["descriptionurl"],quote=True)}">Ảnh gốc & giấy phép ↗</a><a class="view" href="../../?v=15b&view=facades&facade={key}">Xem trong mô hình →</a></article>')
atlas.save(A/'facade-atlas.jpg',quality=94);alpha.save(A/'facade-mask.png');doc={'version':cfg['version'],'scope':cfg['scope'],'classification':'site_photo_facade_patches_on_approximate_open_map_geometry','entries':manifest,'atlas':{'width':atlas.width,'height':atlas.height,'tile_pixels':size,'color_sha256':sha(A/'facade-atlas.jpg'),'mask_sha256':sha(A/'facade-mask.png')}}
(R/'manifest.json').write_text(json.dumps(doc,ensure_ascii=False,indent=2))
bundle={'manifest':doc,'color':'data:image/jpeg;base64,'+base64.b64encode((A/'facade-atlas.jpg').read_bytes()).decode(),'mask':'data:image/png;base64,'+base64.b64encode((A/'facade-mask.png').read_bytes()).decode(),'references':thumbs}
(ROOT/'data/facades-15.js').write_text('window.FACADES_15='+json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+';\n')
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>City Lab · 20 mặt đứng từ ảnh địa điểm</title><style>body{margin:0;background:#13262c;color:#e8e5dc;font:14px system-ui}main{max-width:1200px;margin:auto;padding:38px 24px}h1{font-size:40px;letter-spacing:-1px;font-weight:450}header p{max-width:850px;line-height:1.8;color:#bac8c2}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:18px}article{border:1px solid #53757066;padding:16px;background:#193139;scroll-margin-top:15px}.pair{display:grid;grid-template-columns:1.5fr 1fr;gap:8px;height:195px;margin-bottom:15px}.pair img{width:100%;height:100%;object-fit:contain;background:#0c1d24}.pair .rectified{object-fit:fill}small{font-size:9px;letter-spacing:1px;color:#b6ad8f}h2{font-size:20px;font-weight:500}p{font-size:12px;line-height:1.8;color:#b8c7c2}a{color:#9ddbc9;text-decoration:none}.view{float:right}header{margin-bottom:30px}</style><main><header><small>CITY LAB / PHOTO FACADE LAB 15</small><h1>Đúng nơi. Có nguồn. Có giới hạn.</h1><p>20 mặt đứng, 20 công trình trên trục Nguyễn Huệ–Bạch Đằng và các góc phố Đồng Khởi–Lam Sơn liền kề. Bên trái là ảnh tham chiếu, bên phải là vùng ảnh đã hiệu chỉnh phối cảnh. Ảnh có ngày chụp khác nhau; bề mặt không nhìn thấy và chiều sâu chưa được đo. Đây là photo-textured geometry, chưa phải mô hình tái dựng photogrammetry.</p><a href="../../?v=15b&view=facades&facade=cafe42">← Mở mô hình 3D</a></header><section>'''+''.join(cards)+'</section></main></html>'
(R/'index.html').write_text(page)
(R/'snapshot-hashes.json').write_text(json.dumps({p.name:sha(p)for p in sorted((R/'snapshots').iterdir())if p.is_file()},indent=2))
print({'facades':len(manifest),'atlas':atlas.size,'atlas_bytes':(A/'facade-atlas.jpg').stat().st_size,'embedded_bytes':(ROOT/'data/facades-15.js').stat().st_size})
