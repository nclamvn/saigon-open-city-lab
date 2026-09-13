import sys,json,hashlib,base64,collections
sys.path.insert(0,str(__import__('pathlib').Path(__file__).resolve().parents[3]/'work/pylib'))
from PIL import Image,ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parents[1];im=Image.open(root/'assets/facades16d/times-original.jpg').convert('RGB')
quad=[(750,708),(1182,459),(1190,1450),(666,1615)]
w,h=1024,1856
rows=[]
for (x,y),(u,v) in zip([(0,0),(w-1,0),(w-1,h-1),(0,h-1)],quad):rows.extend([[x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]])
for i in range(8):
 j=max(range(i,8),key=lambda j:abs(rows[j][i]));rows[i],rows[j]=rows[j],rows[i];f=rows[i][i];rows[i]=[x/f for x in rows[i]]
 for j in range(8):
  if j!=i:
   f=rows[j][i];rows[j]=[a-f*b for a,b in zip(rows[j],rows[i])]
coef=[rows[i][8]for i in range(8)];out=im.transform((w,h),Image.Transform.PERSPECTIVE,coef,Image.Resampling.BICUBIC)
asset=root/'assets/facades16d';out.save(asset/'times-front.jpg',quality=96)
mask=Image.new('L',(w,h),255);pix=out.load();m=mask.load();q=collections.deque((x,0)for x in range(w));seen=set()
while q:
 x,y=q.popleft()
 if not(0<=x<w and 0<=y<210)or(x,y)in seen:continue
 seen.add((x,y));rgb=pix[x,y]
 if min(rgb)<142 or max(rgb)-min(rgb)>65:continue
 m[x,y]=0;q.extend([(x-1,y),(x+1,y),(x,y+1)])
# Preserve every original letter/logo pixel; sky masking must not erase bright sign strokes.
ImageDraw.Draw(mask).rectangle((310,65,930,180),fill=255)
ImageDraw.Draw(mask).rectangle((70,40,280,205),fill=255)
mask.save(asset/'times-mask.png')
out.crop((0,h-512,w,h)).save(asset/'times-sign-free-extension.jpg',quality=96)
out.crop((35,600,150,1080)).save(asset/'times-glass-sample.jpg',quality=96)
# Color is sampled only from unobstructed blue glass; this is a finish, not hidden architecture.
sample=out.crop((35,450,160,900));channels=list(zip(*sample.getdata()));rgb=tuple(sorted(c)[len(c)//2]for c in channels)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
receipt=json.loads((root/'research/vibecode-16d/source-receipt.json').read_text())
meta={'version':'16d','key':'times','building_id':165491082,'source_original':'assets/facades16d/times-original.jpg','source_sha256':sha(asset/'times-original.jpg'),'source_dimensions':im.size,'quad_pixels':quad,'quad_normalized':[[x/im.width,y/im.height]for x,y in quad],'texture_dimensions':[w,h],'sign_free_extension_crop':[0,h-512,w,h],'glass_sample_crop':[35,600,150,1080],'extension_sha256':sha(asset/'times-sign-free-extension.jpg'),'glass_sha256':sha(asset/'times-glass-sample.jpg'),'color_sha256':sha(asset/'times-front.jpg'),'mask_sha256':sha(asset/'times-mask.png'),'glass_srgb':list(rgb),'masked_fraction':round(mask.histogram()[0]/(w*h),5),'source_receipt':'research/vibecode-16d/source-receipt.json','classification':'high_resolution_observed_upper_front_with_inferred_glass_finish_on_unseen_proxy_surfaces','physical_sign':'original photograph pixels only; no generated text or repeated logo','limitations':['Front below the photographed area is occluded by foreground buildings.','Photo alignment and vertical placement are approximate; no surveyed control points.','All-wall blue glass finish and fine mullion spacing are inferred, not independently registered facade imagery.']}
(root/'research/vibecode-16d/texture-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
bundle={'manifest':meta,'color':'data:image/jpeg;base64,'+base64.b64encode((asset/'times-front.jpg').read_bytes()).decode(),'mask':'data:image/png;base64,'+base64.b64encode((asset/'times-mask.png').read_bytes()).decode(),'extension':'data:image/jpeg;base64,'+base64.b64encode((asset/'times-sign-free-extension.jpg').read_bytes()).decode(),'glass':'data:image/jpeg;base64,'+base64.b64encode((asset/'times-glass-sample.jpg').read_bytes()).decode()}
(root/'data/times-facade-16d.js').write_text('window.TIMES_FACADE_16D='+json.dumps(bundle,ensure_ascii=False,separators=(',',':'))+';\n')
p=root/'research/facades-15/selections.json';d=json.loads(p.read_text());e=next(e for e in d['entries']if e['key']=='times');e.update(source_file='assets/facades16d/times-original.jpg',quad=meta['quad_normalized'],horizontal=[.38,1],vertical=[.4242,.91],detail_texture='assets/facades16d/times-front.jpg',detail_mask='assets/facades16d/times-mask.png',inferred='Ảnh gốc độ phân giải cao chỉ phủ phần mặt chính quan sát được. Toàn bộ vỏ kính còn lại và nhịp thanh mảnh được suy dựng từ màu/vật liệu ảnh; không phải ảnh đầy đủ từng mặt. Cao độ/UV gần đúng, chưa đo kiểm.')
e['surface_review']['note']='Vùng mặt phẳng chính cùng cao độ, chứa trọn chữ Times Square; loại cánh mái cao và phần thân dưới bị nhà phía trước che. UV/cao độ đặt gần đúng.'
p.write_text(json.dumps(d,ensure_ascii=False,indent=2))
print(json.dumps(meta,ensure_ascii=False))
