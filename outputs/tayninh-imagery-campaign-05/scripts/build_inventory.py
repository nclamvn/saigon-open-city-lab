#!/usr/bin/env python3
import argparse, json, hashlib, re
from pathlib import Path

ROOT_DEFAULT = Path(__file__).resolve().parents[1]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def rel_path(root: Path, value):
    if not value:
        return None
    s = str(value)
    marker = 'outputs/tayninh-imagery-campaign-05/'
    if marker in s:
        s = s.split(marker, 1)[1]
    if s.startswith('./'):
        s = s[2:]
    return s


def evidence_item(root, path, sha=None, label=None, kind=None, url=None):
    rp = rel_path(root, path)
    return {
        'path': rp,
        'sha256': sha,
        'label': label or kind or 'evidence',
        'kind': kind,
        'url': url,
    }


def access_bucket(access_status='', free_export_status='', use_class='', record_id=''):
    rid = str(record_id or '')
    text = ' '.join(str(x or '').lower() for x in [access_status, free_export_status, use_class])
    if rid in {'google-open-buildings-temporal-2023-aoi', 'C05-L08'}:
        return 'asset_acquired'
    if rid == 'baseline-house-pixel-bottleneck':
        return 'metadata_or_diagnostic_acquired'
    blocked_markers = ['visual_only', 'blocked', 'no_exportable', 'not_acquired', 'not_evidenced', 'empty', 'zero', 'no_aoi_event_asset']
    restricted_markers = ['credentials_required', 'paid', 'auth_blocked', 'restricted', 'candidate', 'agency_held', 'eligibility_restricted', 'commercial']
    if any(x in text for x in restricted_markers):
        return 'candidate_restricted'
    if any(x in text for x in blocked_markers):
        return 'blocked_or_none'
    if any(x in text for x in ['publicly_downloadable', 'downloaded', 'public_api_accessible', 'service_metadata_public', 'public_catalog_accessible', 'metadata_downloaded']):
        return 'metadata_or_diagnostic_acquired'
    return 'unknown'


def category_from_id(rid):
    if rid.startswith('C05-T'):
        return 'technique'
    if rid.startswith('C05-L'):
        return 'local'
    if rid.startswith('baseline'):
        return 'baseline'
    return 'optical'


def normalize_optical(root, r):
    evidence = []
    if r.get('receipt_path'):
        evidence.append(evidence_item(root, r['receipt_path'], r.get('receipt_sha256'), 'receipt', 'receipt', r.get('actual_AOI_query') or r.get('primary_url')))
    if r.get('source_snapshot_path'):
        evidence.append(evidence_item(root, r['source_snapshot_path'], r.get('source_snapshot_sha256'), 'source snapshot', 'snapshot', r.get('license_url') or r.get('primary_url')))
    for local in r.get('local_files') or []:
        path = local.get('path')
        if path:
            evidence.append(evidence_item(root, path, local.get('sha256'), Path(path).name, 'recorded_local_file'))
    return {
        'id': r.get('id'),
        'category': 'optical',
        'title': r.get('title'),
        'publisher': r.get('publisher') or publisher_from_title(r.get('title','')),
        'data_type': r.get('data_type'),
        'primary_url': r.get('primary_url'),
        'license_url': r.get('license_url'),
        'nominal_gsd_m': r.get('nominal_gsd_m'),
        'raster_grid_m': r.get('raster_grid_m'),
        'effective_resolution_m': r.get('effective_resolution_m'),
        'data_date': r.get('imagery_date'),
        'access_status': r.get('access_status'),
        'coverage_status': r.get('coverage_status'),
        'free_export_status': r.get('free_export_status'),
        'license_status': r.get('license_status'),
        'use_class': r.get('use_class'),
        'access_bucket': access_bucket(r.get('access_status'), r.get('free_export_status'), r.get('use_class'), r.get('id')),
        'limits': split_limits(r.get('limits')),
        'next_action': r.get('next_action'),
        'actual_aoi_query': r.get('actual_AOI_query'),
        'bbox': r.get('bbox_if_known'),
        'evidence': evidence,
        'distinctions': distinction_tags(r),
        'lineage_source': 'research/optical-sources.json',
    }


def publisher_from_title(title):
    t = (title or '').lower()
    if 'google' in t: return 'Google Research / Google Maps Platform'
    if 'planet' in t or 'nicfi' in t: return 'Planet / NICFI / TFO'
    if 'maxar' in t: return 'Maxar/Vantor'
    if 'esri' in t: return 'Esri'
    if 'bing' in t: return 'Microsoft Bing Maps'
    if 'airbus' in t: return 'Airbus OneAtlas'
    if 'copernicus' in t: return 'Copernicus'
    if 'open' in t or 'hotosm' in t: return 'Open imagery catalog'
    return None


def split_limits(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [str(value)]


def distinction_tags(r):
    text = json.dumps(r, ensure_ascii=False).lower()
    tags=[]
    if 'not rgb' in text or 'not optical' in text or 'model-derived' in text or 'mô hình' in text:
        tags.append('model_raster_not_rgb')
    if 'visual_only' in text or 'tile' in text or 'basemap' in text:
        tags.append('visual_service_not_export')
    if 'credentials' in text or 'paid' in text or 'commercial' in text or 'restricted' in text:
        tags.append('restricted_or_paid')
    if 'no_' in text or 'zero' in text or 'not_acquired' in text:
        tags.append('not_acquired')
    return sorted(set(tags))


def normalize_local(root, r):
    evidence=[]
    for rec in r.get('receipts') or []:
        evidence.append(evidence_item(root, rec.get('snapshot'), rec.get('sha256'), rec.get('id'), rec.get('receipt_kind'), rec.get('requested_url')))
    return {
        'id': r.get('id'), 'category': 'local', 'title': r.get('title'), 'publisher': r.get('publisher'),
        'data_type': r.get('data_type'), 'primary_url': r.get('primary_url'), 'license_url': r.get('license_url'),
        'nominal_gsd_m': r.get('nominal_gsd_m'), 'data_date': r.get('data_date') or r.get('date'),
        'date_semantics': r.get('date_semantics'), 'access_status': r.get('access_status'),
        'coverage_status': r.get('coverage_status'), 'free_export_status': r.get('free_export_status'),
        'license_status': r.get('license_status'), 'access_bucket': access_bucket(r.get('access_status'), r.get('free_export_status'), r.get('license_status'), r.get('id')),
        'limits': split_limits(r.get('limits')), 'next_action': r.get('next_action'), 'evidence_span': r.get('evidence_span'),
        'bbox': r.get('bbox'), 'crs': r.get('crs'), 'vertical_datum': r.get('vertical_datum'), 'evidence': evidence,
        'distinctions': distinction_tags(r), 'lineage_source': 'research/local-sources.json',
    }



def gedtm_local_evidence(root):
    qa_path = root / 'evidence/techniques/gedtm-pilot/qa.json'
    if not qa_path.exists():
        return []
    qa = json.loads(qa_path.read_text())
    out = [evidence_item(root, 'evidence/techniques/gedtm-pilot/qa.json', sha256_file(qa_path), 'GEDTM pilot QA receipt', 'acquired_asset_receipt')]
    for layer_name, layer in (qa.get('layers') or {}).items():
        for f in layer.get('files') or []:
            path = f.get('path')
            sha = f.get('sha256')
            if path and sha:
                role = f.get('role') or f.get('label') or Path(path).name
                out.append(evidence_item(root, path, sha, f'GEDTM {layer_name} {role}', 'acquired_asset'))
    for key, label in [('range_receipts', 'GEDTM range receipts'), ('comparison', 'GEDTM COPDEM comparison')]:
        item = qa.get(key) or {}
        if item.get('path') and item.get('sha256'):
            out.append(evidence_item(root, item['path'], item['sha256'], label, 'acquired_asset_receipt'))
    for rel, label in [('evidence/techniques/acquisition-index.json', 'C05 acquisition index'), ('evidence/techniques/batch04-source-audit.json', 'Batch04 source audit')]:
        path = root / rel
        if path.exists():
            out.append(evidence_item(root, rel, sha256_file(path), label, 'provenance_receipt'))
    return out

def normalize_technique(root, r):
    evidence=[]
    primary_groups=0
    snapshots=0
    filechecks=0
    for source in r.get('sources') or []:
        primary_groups += 1
        for snap in source.get('snapshots') or []:
            snapshots += 1
            evidence.append(evidence_item(root, snap.get('path'), snap.get('sha256'), f"{source.get('id')} snapshot", 'snapshot', snap.get('url')))
    for f in r.get('input_files') or []:
        filechecks += 1
        evidence.append(evidence_item(root, f.get('path'), f.get('sha256'), f.get('label') or Path(str(f.get('path'))).name, 'input_file'))
    record = {
        'id': r.get('id'), 'category': 'technique', 'title': r.get('title'), 'publisher': 'tool/method research',
        'data_type': 'technique_or_workflow', 'primary_url': first_source_url(r), 'license_url': None,
        'priority': r.get('priority'), 'readiness': r.get('readiness'), 'access_status': r.get('readiness'),
        'coverage_status': 'method_not_dataset', 'free_export_status': None, 'license_status': '; '.join(r.get('tools_and_licenses') or []),
        'access_bucket': 'technique_roadmap', 'limits': split_limits(r.get('accuracy_limits')) + split_limits(r.get('blockers')),
        'next_action': r.get('project_fit'), 'evidence': evidence, 'primary_groups': primary_groups, 'snapshot_count': snapshots,
        'filecheck_count': filechecks, 'distinctions': ['technique_not_source_imagery'], 'lineage_source': 'research/technique-sources.json',
        'prerequisite_inputs': r.get('prerequisite_inputs'), 'trustworthy_output': r.get('trustworthy_output'),
        'unrecoverable_from_10m': r.get('unrecoverable_from_10m'),
    }
    if r.get('id') == 'C05-T13':
        record.update({
            'data_type': 'acquired modeled DTM and uncertainty raster; testing-only, not RGB imagery',
            'nominal_gsd_m': 30,
            'data_date': '2006–2015 source epoch; 2026 release',
            'coverage_status': 'bounded AOI DTM and RF spread acquired; not integrated live',
            'access_bucket': 'asset_acquired',
            'acquired_model_input': True,
            'distinctions': ['technique_not_source_imagery', 'model_raster_not_rgb', 'testing_only_acquired_input'],
        })
        record['evidence'] = record.get('evidence', []) + gedtm_local_evidence(root)
    return record


def first_source_url(r):
    for s in r.get('sources') or []:
        if s.get('url'): return s.get('url')
    return None


def baseline_record(root):
    p=root/'evidence/baseline/house-image-sampling.json'
    data=json.loads(p.read_text())
    return {
        'id':'baseline-house-pixel-bottleneck', 'category':'baseline', 'title':'Chẩn đoán lấy mẫu nhà ở GSD 10 m',
        'publisher':'C05 baseline / Batch04 scene-data', 'data_type':'derived_diagnostic', 'primary_url':'evidence/baseline/house-image-sampling.json',
        'nominal_gsd_m':10, 'data_date':'2026-09-14', 'access_status':'locally_computed_receipt', 'coverage_status':'657_current_footprints_only',
        'free_export_status':'local_report_artifact', 'license_status':'derived_from_internal_batch_artifact', 'access_bucket':'metadata_or_diagnostic_acquired',
        'limits':[data.get('note'), 'Các hàng dưới 10 m trong bảng là ví dụ toán học, không phải ảnh đã thu.'],
        'next_action':'Dùng như guardrail khi đánh giá ảnh sắc hơn: không claim cấp nhà nếu không có GSD/quan sát phù hợp.',
        'metrics': data, 'evidence':[evidence_item(root, 'evidence/baseline/house-image-sampling.json', sha256_file(p), 'house sampling receipt','receipt')],
        'distinctions':['math_example_not_acquired_imagery'], 'lineage_source':'evidence/baseline/house-image-sampling.json'
    }


def build(root: Path):
    records=[]
    records.append(baseline_record(root))
    opt=json.loads((root/'research/optical-sources.json').read_text())
    records += [normalize_optical(root,r) for r in opt]
    loc=json.loads((root/'research/local-sources.json').read_text())['records']
    records += [normalize_local(root,r) for r in loc]
    tech=json.loads((root/'research/technique-sources.json').read_text())
    records += [normalize_technique(root,r) for r in tech]
    for rec in records:
        rec['evidence_count']=len(rec.get('evidence') or [])
        rec['downloadable']=rec.get('access_bucket') in {'asset_acquired','metadata_or_diagnostic_acquired'}
    summary={
        'record_count': len(records),
        'by_category': counts(r['category'] for r in records),
        'by_access_bucket': counts(r['access_bucket'] for r in records),
        'actual_highres_rgb_usable_count': 0,
        'actual_model_rasters_count': sum(1 for r in records if r['id'] in ['google-open-buildings-temporal-2023-aoi','C05-T13']),
        'actual_asset_records': [r['id'] for r in records if r.get('access_bucket') == 'asset_acquired'],
        'actual_acquired_asset_count': sum(1 for r in records if r.get('access_bucket') == 'asset_acquired'),
        'metadata_or_diagnostic_records': [r['id'] for r in records if r.get('access_bucket') == 'metadata_or_diagnostic_acquired'],
        'visual_service_rights_blocked_count': sum(1 for r in records if 'visual_service_not_export' in r.get('distinctions',[])),
        'generated_at': 'deterministic-from-source-hashes',
        'source_files': source_file_hashes(root),
    }
    return {'schema':'c05.inventory.v1','schema_version':'1.0.0','aoi':{'bbox_wgs84':[106.3276338,11.0830401,106.3576338,11.1130401],'label':'Gia Lộc pilot technical bbox','official_boundary':False},'summary':summary,'records':records}


def counts(items):
    d={}
    for x in items: d[x]=d.get(x,0)+1
    return dict(sorted(d.items()))


def source_file_hashes(root):
    rels=['research/optical-sources.json','research/local-sources.json','research/technique-sources.json','evidence/baseline/house-image-sampling.json','BAO-CAO-C05.md']
    out=[]
    for rel in rels:
        p=root/rel
        if p.exists(): out.append({'path':rel,'sha256':sha256_file(p),'bytes':p.stat().st_size})
    return out


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('--root', default=str(ROOT_DEFAULT))
    ap.add_argument('--out', default='registry/inventory.json')
    args=ap.parse_args()
    root=Path(args.root).resolve()
    inv=build(root)
    out=root/args.out
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(inv, ensure_ascii=False, indent=2, sort_keys=True))
    print(json.dumps({'out':str(out),'records':len(inv['records']),'by_category':inv['summary']['by_category']}, ensure_ascii=False))
if __name__=='__main__': main()
