"""Finalize local public-request receipts without making network requests."""
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
requests = json.loads((HERE / 'request-index.json').read_text())
requests += [
    ['commons-gialoc-photo', 'https://upload.wikimedia.org/wikipedia/commons/5/5e/T%C3%A2y_Ninh_2022_%28bi%E1%BB%83n_hi%E1%BB%87u_c%E1%BB%ADa_h%C3%A0ng_%E1%BB%9F_p_Gia_L%E1%BB%99c%2C_Tx_Tr%E1%BA%A3ng_B%C3%A0ng%29.jpg'],
    ['kartaview-nearby', 'https://api.openstreetcam.org/2.0/photo/?lat=11.0980401&lng=106.3426338&zoomLevel=16&join=sequence&orderBy=id&orderDirection=desc&radius=500&limit=100'],
    ['kartaview-bbox', 'https://api.openstreetcam.org/2.0/photo/?nwLat=11.1130401&nwLng=106.3276338&seLat=11.0830401&seLng=106.3576338&zoomLevel=16&join=sequence&orderBy=id&orderDirection=desc&limit=100'],
    ['kartaview-api-client', 'https://github.com/kartaview/mcp-karta-view'],
    ['kartaview-api-config', 'https://github.com/kartaview/mcp-karta-view'],
    ['kartaview-mcp-tree', 'https://api.github.com/repos/kartaview/mcp-karta-view/git/trees/37ac5c062c9ace66bcc540086236127a3fb86bf0'],
]
status = {'tedi-tayninh': 502, 'dosm-rest': 500, 'dosm-search': 500, 'nrsd-catalog': 403, 'vnsdi-rest': None}
receipts = []
for source_id, url in requests:
    path = HERE / (source_id + '.raw')
    if source_id == 'commons-gialoc-photo':
        path = HERE / 'commons-gialoc-photo.jpg'
    failed = source_id == 'vnsdi-rest'
    if failed:
        path = HERE / 'vnsdi-rest-error.txt'
    body = path.read_bytes()
    receipts.append({
        'id': source_id, 'requested_url': url,
        'http_status': status.get(source_id, 200),
        'captured_at': datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(),
        'snapshot': str(path.relative_to(ROOT)),
        'sha256': hashlib.sha256(body).hexdigest(), 'bytes': len(body),
        'receipt_kind': 'observed_transport_failure_note' if failed else 'raw_http_response_body',
        'content_caveat': 'HTTP200 challenge shell; not substantive resolution content' if source_id == 'locality-nq' else None,
    })
for receipt in receipts:
    if receipt['id'] in ['kartaview-api-client','kartaview-api-config','kartaview-mcp-tree']:
        receipt['http_status'] = None
        receipt['receipt_kind'] = 'contractor_supplied_public_repository_snapshot'
        receipt['content_caveat'] = 'Repository provenance provided by Contractor; original HTTP transaction not independently observed by LOCAL Builder.'
    elif receipt['id'] in ['kartaview-nearby','kartaview-bbox']:
        receipt['receipt_kind'] = 'contractor_supplied_public_api_response'
        receipt['content_caveat'] = 'Request parameters and HTTP200 reported by Contractor; response bytes independently inspected and hashed.'
(HERE / 'receipts.json').write_text(json.dumps(receipts, ensure_ascii=False, indent=2) + '\n')
lookup = {r['id']: r for r in receipts}
registry_path = ROOT / 'research/local-sources.json'
registry = json.loads(registry_path.read_text())
photo = next(r for r in registry['records'] if r['id'] == 'C05-L08')
photo.update(data_type='ground_photo_original_acquired_location_withheld', access_status='publicly_downloadable_photo_acquired', free_export_status='downloaded_conditional_CC_BY_SA_4_0')
photo['snapshots'] = ['commons-gialoc', 'commons-geo', 'commons-gialoc-photo']
photo['evidence_span'] = 'Original JPEG3024×3481,2591343bytes; visually inspected. Sign reads KP.TânLộc,P.GiaLộc; EXIF DateTimeOriginal2022:09:17 11:37:48; no GPS IFD. Commons authorPhươngHuy,CCBY-SA4.0.'
photo['limits'] = ['Đã tải và kiểm tra ảnh gốc; biển hiệu ghi khu phố Tân Lộc, phường Gia Lộc, chưa có địa chỉ/tọa độ chính xác.', 'Chỉ là mặt tiền cửa hàng chụp xiên bị cắt khung và che khuất; không phải toàn bộ mặt đứng, ảnh trực giao hoặc texture dùng ngay.', 'Không gắn ảnh lên bản đồ/công trình khi chưa định vị độc lập; vẫn withheld exact footprint.', 'EXIF DateTimeOriginal17/09/2022; DateTime sửa tệp18/09/2022 là trường khác. Không có GPS IFD.']
photo['asset'] = {'local_file':'evidence/local/commons-gialoc-photo.jpg', 'sha256':lookup['commons-gialoc-photo']['sha256'], 'width':3024,'height':3481,'mapped':False,'attribution':'Phương Huy / Wikimedia Commons / CC BY-SA 4.0; nguyên bản, chưa chỉnh sửa'}
karta = next(r for r in registry['records'] if r['id'] == 'C05-L10')
karta.update(access_status='public_api_tested_empty_response',coverage_status='nearby_500m_empty_not_whole_AOI_absence')
karta['snapshots'] = ['kartaview-docs','kartaview-nearby','kartaview-bbox','kartaview-api-client','kartaview-api-config','kartaview-mcp-tree']
karta['evidence_span'] = 'Contractor publicAPI GETnearby center11.0980401,106.3426338 radius500 limit100 ->HTTP200/api601,resultnull. Bbox attempt alsoempty; runtime bboxparam support not independently confirmed. Official repository getNearbyPhotos/config inspected.'
karta['limits'] = ['Phép nearby500m không phủ toàn bộ AOI và không chứng minh toàn vùng không có ảnh.', 'Phép bbox trảempty nhưng chưa xác minh runtime thực sự áp dụng các tham sốbbox; không dùng làm kết luận độ phủ.', 'Chưa có asset hoặc license asset cụ thể.']
for record in registry['records']:
    record['receipts'] = [lookup[s] for s in record['snapshots']]
    record['captured_at'] = max(r['captured_at'] for r in record['receipts'])
    record['data_date'] = None
    if record['id'] == 'C05-L08':
        record['data_date'] = '2022-09-17'
    record['date_semantics'] = {'C05-L01':'resolution_date', 'C05-L04':'app_version_date', 'C05-L06':'report_publication_date', 'C05-L08':'photo_capture_date'}.get(record['id'])
registry_path.write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n')
for r in receipts:
    assert hashlib.sha256((ROOT / r['snapshot']).read_bytes()).hexdigest() == r['sha256']
assert registry['aoi']['bbox_wgs84'] == [106.3276338,11.0830401,106.3576338,11.1130401]
assert registry['aoi']['official_boundary'] is False
for r in registry['records']:
    assert r['receipts'] and r['evidence_span'] and r['limits'] and r['next_action']
    assert r['bbox'] is None, 'No exact asset footprint has been verified'
    assert r['license_status'] and r['coverage_status'] and r['access_status']
print(json.dumps({'records': len(registry['records']), 'receipts_validated': len(receipts), 'qualified_local_highres_imagery_assets': 0, 'aoi_unchanged': True}))
