"""Validate retained research lineage and acceptance artifacts, without product writes."""
from pathlib import Path
from datetime import datetime,timezone
import json,hashlib,re,ast

root=Path('outputs/tayninh-imagery-campaign-05');ev=root/'evidence/techniques'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
records=json.loads((root/'research/technique-sources.json').read_text())
index=json.loads((ev/'acquisition-index.json').read_text())
errors=[];checked={}
def walk(x):
 if isinstance(x,dict):
  if 'path' in x and 'sha256' in x:
   p=x['path'];expected=x['sha256']
   if not Path(p).is_file():errors.append('Missing '+p)
   elif sha(p)!=expected:errors.append('Hash mismatch '+p)
   else:checked[p]=expected
  for v in x.values():walk(v)
 elif isinstance(x,list):
  for v in x:walk(v)
walk(records);walk(index);audit=json.loads((ev/'batch04-source-audit.json').read_text());walk(audit)
qa=json.loads((ev/'gedtm-pilot/qa.json').read_text());walk(qa)
walk(json.loads((ev/'gedtm-pilot/range-receipts.json').read_text()))
walk(json.loads((ev/'gedtm-pilot/copdem-comparison.json').read_text()))
required=['id','title','priority','readiness','prerequisite_inputs','trustworthy_output','modeled_or_inferred','unrecoverable_from_10m','geometry_constraints','accuracy_limits','tools_and_licenses','computational_effort','project_fit','blockers','sources']
if not isinstance(records,list):errors.append('Manifest must be top-level array')
for r in records:
 for k in required:
  if not r.get(k):errors.append(r['id']+' missing '+k)
 for s in r['sources']:
  if s['status']!='verified_primary_snapshot':errors.append('Unverified source '+s['id'])
  if not s.get('snapshots'):errors.append('No snapshots '+s['id'])
if len({r['id'] for r in records})!=len(records):errors.append('Duplicate technique IDs')
for s in index:
 if s['status']!='verified_primary_snapshot':errors.append('Incomplete primary source '+s['id'])
 if s.get('repository') and not re.fullmatch('[0-9a-f]{40}',s.get('commit','')):errors.append('Unpinned '+s['id'])
for p in ev.glob('*.py'):
 try:ast.parse(p.read_text())
 except SyntaxError as e:errors.append(str(p)+': '+str(e))
report=root/'research/techniques.md'
completion=root/'governance/COMPLETION-C05-TECHNIQUES.md'
for doc in [report,completion]:
 for label,target in re.findall(r'\[([^\]]+)\]\(([^)]+)\)',doc.read_text()):
  if '://' in target:continue
  p=(doc.parent/target.split('#')[0]).resolve()
  if not p.exists():errors.append('Broken artifact link '+str(doc)+': '+target)
digests={'technique-sources.json':root/'research/technique-sources.json','techniques.md':report,'acquisition-index.json':ev/'acquisition-index.json','batch04-source-audit.json':ev/'batch04-source-audit.json','gedtm-pilot/qa.json':ev/'gedtm-pilot/qa.json'}
for label,expected in re.findall(r'\|\s*([^|]+?)\s*\|\s*([0-9a-f]{64})\s*\|',completion.read_text()):
 if label not in digests:errors.append('Unknown Completion digest artifact '+label)
 elif sha(digests[label])!=expected:errors.append('Completion digest mismatch '+label)
receipts=json.loads((ev/'gedtm-pilot/range-receipts.json').read_text())
raw=[r for r in receipts if r.get('path')]
if sum(r['bytes'] for r in raw)!=qa['provider_bytes_downloaded']:errors.append('Provider byte receipt mismatch')
if any(r.get('status')!=206 or not r.get('range') for r in raw):errors.append('Non-range provider acquisition')
for k in ['dtm','uncertainty']:
 l=qa['layers'][k]
 if l['dimensions']!=[109,109] or l['valid_pixels']!=11881 or l['nodata_pixels']!=0:errors.append('Unexpected GEDTM window '+k)
 if l['exact_aoi_resampled']['bounds']!=qa['aoi_bbox_wgs84']:errors.append('Not exact AOI '+k)
result={'schema':'c05.research-validation.v1','validated_at':datetime.now(timezone.utc).isoformat(),'errors':errors,'error_count':len(errors),'technique_records':len(records),'primary_source_groups':len(index),'primary_snapshots':sum(len(s['snapshots']) for s in index),'unique_hash_checked_files':len(checked),'raw_range_files':len(raw),'raw_provider_bytes':qa['provider_bytes_downloaded'],'batch04_input_hashes_unchanged':all(sha(i['path'])==i['sha256'] for i in audit['input_files']),'manifest_sha256':sha(root/'research/technique-sources.json'),'report_sha256':sha(report),'acquisition_index_sha256':sha(ev/'acquisition-index.json'),'source_audit_sha256':sha(ev/'batch04-source-audit.json'),'gedtm_qa_sha256':sha(ev/'gedtm-pilot/qa.json'),'scope':'Only C05 owned research/evidence/Completion changed; source Batch04 files rehashed read-only, no renderer/data implementation.'}
(ev/'validation.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(result,ensure_ascii=False,indent=2))
if errors:raise SystemExit(1)
