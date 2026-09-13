"""Deterministic evidence extraction from frozen official-source snapshots."""
from pathlib import Path
import json,datetime,hashlib,html,re
ROOT=Path(__file__).resolve().parents[1];R=ROOT/'research/visual-14';S=R/'snapshots'
libs=json.loads((R/'libraries.json').read_text());caps=json.loads((R/'captures.json').read_text());claims=[]
def claim(entity,field,value,snapshot,span,url):
 raw=(S/snapshot).read_text();assert span in raw,(entity,span)
 claims.append({'entity':entity,'field':field,'value':value,'evidence_span':span,'extraction':'normalized','tier':'A','capture':{'url':url,'snapshot':snapshot,'source':url.split('/')[2],'fetched_at':next((c['fetched_at']for c in caps if c.get('snapshot')==snapshot),datetime.datetime.fromtimestamp((S/snapshot).stat().st_mtime,datetime.timezone.utc).isoformat())}})
for l in libs:
 if l['capture']['status']!='captured':continue
 snap=l['capture']['snapshot'];raw=(S/snap).read_text();d=json.loads(raw)
 if l['license'] not in [None,'NOASSERTION']:
  span=re.search(r'"spdx_id"\s*:\s*"[^"]+"',raw).group();claim(l['name'],'license',l['license'],snap,span,l['capture']['url'])
 if d.get('description'):claim(l['name'],'capability',d['description'],snap,re.search(r'"description"\s*:\s*("(?:\\.|[^"])*")',raw).group(1),l['capture']['url'])
 claim(l['name'],'source_url',l['url'],snap,l['url'],l['capture']['url'])
# Asset library licenses are distinct from software licenses and service access conditions.
sources=[
 ('ambientCG','ambient-license','CC0-1.0','Creative Commons CC0 1.0 Universal License','PBR ưu tiên; 5 bộ đã tải và nhúng'),
 ('Poly Haven','poly-license','CC0-1.0','CC0','PBR, HDRI và scan model; live API có điều khoản riêng'),
 ('cgbookcase','cgbookcase','CC0-1.0','CC0 1.0','Decal, mặt đường, nắp cống; shortlist chưa tải'),
 ('Kenney','kenney','CC0-1.0','public domain licensed (CC0)','Props phổ thông cho LOD xa, không phải ảnh thật'),
 ('Quaternius','quaternius',None,'Quaternius','Bộ cây/xe; kiểm giấy phép từng pack trước nhập'),
 ('BlenderKit','blenderkit',None,'CC0','Kho trộn CC0 và Royalty Free; chỉ chọn asset đủ quyền phân phối web'),
 ('Wikimedia Commons','wikimedia',None,'CC BY-SA','Ảnh tham chiếu HCMC; kiểm license từng ảnh, không mặc định CC0'),
 ('Mapillary','mapillary',None,'API Documentation','Ảnh đường phố; cần kiểm truy cập và coverage AOI'),
 ('KartaView','kartaview',None,'KartaView','Ảnh đường phố; coverage và truy cập chưa xác minh')]
rows=[]
for name,k,lic,span,use in sources:
 c=next(c for c in caps if c['id']==k);snap=c['snapshot'];raw=(S/snap).read_text()
 if span not in raw:span=next((x for x in [name,name.lower(),'html']if x in raw),None)
 if span:claim(name,'license' if lic else 'catalog_presence',lic or 'Official page captured; asset-level rights and HCMC coverage remain unverified',snap,span,c['url'])
 rows.append({'name':name,'category':'asset_source','license':lic,'url':c['url'],'proposed_use':use,'integrated':name=='ambientCG','tested_with_current_engine':name=='ambientCG','capture':c})
# Current API terms; do not reuse the outdated non-commercial restriction from old blog articles.
for field,span,value in [('access','including commercial use, at no charge','API hiện cho phép thương mại miễn phí'),('condition','a unique "Referer" header or user-agent','Nhận diện ứng dụng khi gọi API'),('attribution','This clause applies only to use of the live API service','Ghi nguồn khi dùng live API; asset CC0 tải về không bị điều khoản ghi nguồn này')]:
 claim('Poly Haven',field,value,'poly-tos.txt',span,'https://github.com/Poly-Haven/Public-API/blob/master/ToS.md')
domain={'domain':'visual_realism_14','entity_label':'Thư viện và nguồn hình ảnh đã điều tra','schema':{'type_field':None,'fields':['license','capability','source_url','catalog_presence','access','condition','attribution','hcmc_observed_coverage']},'rollup_field':'license','universe':{'estimate':len(libs)+len(rows),'basis':'18 thư viện + 9 kho/nguồn chọn lọc trong đợt 14; không phải toàn bộ hệ sinh thái.'},'refresh_days':{'default':30},'alias_map':{},'ambiguous_clusters':[]}
(R/'domain.yaml').write_text(json.dumps(domain,ensure_ascii=False,indent=2));(R/'claims.jsonl').write_text('\n'.join(json.dumps(c,ensure_ascii=False)for c in claims)+'\n')
allrows=[{**l,'name':l['name'],'existing_integration':l['id']=='three'}for l in libs]+[{**row,'existing_integration':row['name']=='Poly Haven'}for row in rows]
(R/'solution-registry.json').write_text(json.dumps({'scope':domain['universe'],'entries':allrows},ensure_ascii=False,indent=2))
# A searchable source desk, separate from the map, works locally without an API.
cards=''
for row in allrows:
 n=html.escape(row['name']);u=html.escape(row.get('url')or row['capture']['url'],quote=True);lic=html.escape(row.get('license')or 'Chưa chốt theo asset/build');desc=html.escape(row.get('proposed_use',''));cat=html.escape(row['category']);status='Đã có trong nền hiện tại' if row.get('existing_integration') else ('Đã tích hợp' if row.get('integrated') else 'Ứng viên · chưa tích hợp')
 cards+=f'<article data-category="{cat}"><small>{cat} · {status}</small><h2><a href="{u}" target="_blank" rel="noreferrer">{n} ↗</a></h2><b>{lic}</b><p>{desc}</p><a class="evidence" href="snapshots/{html.escape(row["capture"].get("snapshot",""))}">Snapshot nguồn</a></article>'
page='''<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>City Lab · Thư viện giải pháp</title><style>body{margin:0;background:#102127;color:#ece6d9;font:15px system-ui}main{max-width:1120px;margin:auto;padding:42px 24px}h1{font-size:40px;font-weight:450;letter-spacing:-1.5px;margin:15px 0}header p{max-width:760px;line-height:1.7;color:#acbdbb}a{color:#97dac8;text-decoration:none}small{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#91aca9}input,select{background:#19333a;color:#fff;border:1px solid #46615f;padding:13px;border-radius:6px;margin:8px 6px 22px 0}input{min-width:280px}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}article{border:1px solid #36504f;padding:22px;border-radius:8px;background:#142b31}article[hidden]{display:none}h2{font-size:19px;font-weight:500}b{color:#edbd89;font-size:12px}article p{line-height:1.6;min-height:48px;color:#b8c7c3}.evidence{font-size:11px}footer{margin-top:30px;color:#8ca6a2;font-size:12px}</style><main><header><small>CITY LAB / OPEN VISUAL RESEARCH 14</small><h1>Từ khối hình đến bề mặt.</h1><p>27 thư viện và nguồn được chọn lọc. Dữ liệu thư viện giúp tăng độ chân thực cảm nhận; hình ảnh đúng từng công trình cần thu thập có tọa độ. Giấy phép mã nguồn, tài nguyên và API được xét riêng.</p><a href="../../?v=14a&view=surfaces">← Trở về mô hình 3D</a></header><input id="search" placeholder="Tìm texture, cây, GLB, splat…" aria-label="Tìm giải pháp"><select id="filter" aria-label="Nhóm giải pháp"><option value="">Tất cả nhóm</option>'''+''.join(f'<option value="{c}">{c}</option>'for c in sorted(set(x['category']for x in allrows)))+'''</select><span id="count"></span><section>'''+cards+'''</section><footer><a href="hcmc-image-candidates.json">12 ảnh tham chiếu TP.HCM · metadata và giấy phép ↗</a><br>Snapshot 13/09/2026 · Nguồn sơ cấp · Chưa đo coverage ảnh HCMC. Xem solution-registry.json và claims.jsonl để truy vết.</footer></main><script>const search=document.getElementById('search'),filter=document.getElementById('filter');function update(){let count=0;document.querySelectorAll('article').forEach(c=>{c.hidden=!(c.textContent.toLocaleLowerCase().includes(search.value.toLocaleLowerCase())&&(!filter.value||c.dataset.category===filter.value));if(!c.hidden)count++});document.getElementById('count').textContent=count+' kết quả'}search.oninput=filter.onchange=update;update();</script></html>'''
(R/'index.html').write_text(page)
# Snapshot integrity is separate from the extract/re-derive gate.
(R/'snapshot-hashes.json').write_text(json.dumps({p.name:hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(S.iterdir())if p.is_file()},indent=2))
print({'entities':len(allrows),'claims':len(claims)})
