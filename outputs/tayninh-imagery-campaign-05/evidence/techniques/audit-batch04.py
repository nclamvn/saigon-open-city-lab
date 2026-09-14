from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, math, statistics, re

root=Path('outputs/tayninh-data-batch-04')
out=Path('outputs/tayninh-imagery-campaign-05/evidence/techniques/batch04-source-audit.json')
files=['static/app.js','scripts/compile_fusion_scene.py','scripts/prepare_visual_layers.py','derived/fusion/scene-data.json','derived/visual/visual-data.json','derived/visual/visual-qa.json','vendor/three.min.js']
inputs=[{'path':str(root/p),'sha256':hashlib.sha256((root/p).read_bytes()).hexdigest()} for p in files]
scene=json.loads((root/'derived/fusion/scene-data.json').read_text());visual=json.loads((root/'derived/visual/visual-data.json').read_text())
heights=scene['terrain']['heights_m'];rows=len(heights);cols=len(heights[0]);pixels=visual['terrain_frame']['pixel_centers']
first=pixels['first_pixel_center_scene_m'];last=pixels['last_pixel_center_scene_m']
xmin,xmax=first[0],last[0];zmax,zmin=first[1],last[1];dx=(xmax-xmin)/(cols-1);dz=(zmax-zmin)/(rows-1)
slopes=[]
for r in range(rows-1):
    for c in range(cols-1):
        slopes.append(math.hypot((heights[r][c+1]-heights[r][c])/dx,(heights[r+1][c]-heights[r][c])/dz))

def ground(x,z):
    gx=max(0,min(1,(x-xmin)/(xmax-xmin)))*(cols-1)
    gy=max(0,min(1,(zmax-z)/(zmax-zmin)))*(rows-1)
    c=min(cols-2,max(0,math.floor(gx)));r=min(rows-2,max(0,math.floor(gy)))
    tx,ty=gx-c,gy-r;h00=heights[r][c];h10=heights[r][c+1];h01=heights[r+1][c];h11=heights[r+1][c+1]
    if tx+ty<=1:return h00+tx*(h10-h00)+ty*(h01-h00)
    return h11+(1-tx)*(h01-h11)+(1-ty)*(h10-h11)

def centroid(points):
    # Match the renderer's arithmetic vertex mean, not the compiler's polygon area centroid.
    return statistics.mean(p['x'] for p in points),statistics.mean(p['z'] for p in points)

clearances=[]
for building in scene['buildings']:
    points=building['footprint_local_m'];cx,cz=centroid(points);base=ground(cx,cz)
    clearances.extend((base-ground(p['x'],p['z']))*scene['terrain']['vertical_exaggeration'] for p in points)
native=visual['sentinel_rgb_10m_native'];asset=native['asset'];source=root/native['source']['tci_png']['path'];target=root/asset['path']
code=(root/'static/app.js').read_text();lines=code.splitlines();compiler=(root/'scripts/compile_fusion_scene.py').read_text().splitlines()
excerpts=[]
for name in ['function recordImageryDiagnostics','function loadTexture','async function makeTerrain','function buildingHeight','function makeBuildings','function makeCanopy']:
    start=next((i for i,l in enumerate(lines) if name in l),None)
    if start is None:continue
    end=next((i for i in range(start+1,len(lines)) if re.match(r'^  (async )?function ',lines[i])),len(lines))
    excerpts.append({'path':str(root/'static/app.js'),'function':name,'first_line':start+1,'last_line':end,'text':'\n'.join(lines[start:end])})
revision_match=re.search(r'const e="([0-9]+)"', (root/'vendor/three.min.js').read_text())
result={
 'schema':'c05.batch04-readonly-audit.v1','audited_at':datetime.now(timezone.utc).isoformat(),'input_files':inputs,
 'three_revision':revision_match.group(1) if revision_match else 'not parsed; inspect bundled library',
 'imagery':{'native_dimensions':native['dimensions'],'gsd_m':native['geotiff_pixel_scale_m'],'acquisition_datetime':native['source_item']['acquisition_datetime'],
 'native_source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'native_asset_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
 'native_bytes_equal':source.read_bytes()==target.read_bytes(),'legacy_fallback_dimensions':[cols,rows],
 'sampling_over_native_linear_ratio':cols/native['dimensions'][0],
 'uv_node_stats':native['terrain_node_texture_uv']['stats'],'has_native_path':asset['path'],
 'filtering':'TextureLoader defaults; engine sets sRGB and anisotropy min(8, device max). Nearest/linear A-B requires implementation and visual QA.'},
 'terrain':{'dimensions':[cols,rows],'spacing_m':[dx,dz],'source':'COPDEM GLO-30 DSM; scene heights are raw provider window rounded at compile',
 'min_m':scene['terrain']['min_m'],'max_m':scene['terrain']['max_m'],'mean_m':scene['terrain']['mean_m'],'vertical_exaggeration':scene['terrain']['vertical_exaggeration'],
 'provider_dsm_relief_m':scene['terrain']['max_m']-scene['terrain']['min_m'],'rendered_relief_m':(scene['terrain']['max_m']-scene['terrain']['min_m'])*scene['terrain']['vertical_exaggeration'],
 'finite_values':sum(math.isfinite(h) for row in heights for h in row),
 'forward_difference_slope_deg':{'median_native':math.degrees(math.atan(statistics.median(slopes))),'max_native':math.degrees(math.atan(max(slopes))),
 'max_rendered_2_5x':math.degrees(math.atan(max(slopes)*2.5))},'slope_method':'Forward finite differences, one x/z edge per interior cell; not survey slope accuracy.'},
 'buildings':{'count':len(scene['buildings']),'source_height_null_count':scene['statistics']['buildings']['source_height_null_count'],
 'area_m2_median':statistics.median(b['area_m2'] for b in scene['buildings']),
 'equivalent_native_pixel_area_median':statistics.median(b['area_m2'] for b in scene['buildings'])/100,
 'area_under_4_native_pixel_equivalents_count':sum(b['area_m2']<400 for b in scene['buildings']),
 'proxy_heights_m':sorted(set(b['display_height_m'] for b in scene['buildings'])),
 'centroid_base_corner_clearance_rendered_m':{'min':min(clearances),'max':max(clearances),'abs_over_1m_vertices':sum(abs(v)>1 for v in clearances),'vertices':len(clearances)},
 'clearance_method':'Reimplements current triangle sampler and arithmetic-vertex-mean-base extrusion; predicts corner clearance, not independent runtime raycast or ground survey.'},
 'canopy':{'full_dimensions':visual['eth_canopy_field_10m']['dimensions'],'nodata':visual['eth_canopy_field_10m']['source_nodata'],
 'valid_pixels':visual['eth_canopy_field_10m']['height_stats']['valid_pixels'],'renderer_representation':'continuous_raster_texture_field',
 'cone_count_in_current_source':0,'adds_height_to_terrain':False,'overlay_y_offset_m':0.8,'legacy_fusion_sample_count':len(scene['canopy_samples'])},
 'findings':['Current native image and continuous canopy fixes already exist; fallback remains a distinct degraded path.',
 '10 m imagery cannot observe house roof/facade detail at this footprint scale.',
 '2.5x exaggeration amplifies DSM buildings/vegetation relief and interpolation into visible mounds.',
 'A flat centroid-based building base can float or penetrate at footprint corners on slopes; diagnosis needs vertex/runtime cross-checks.',
 'No source product or renderer file was changed by this audit.'],
 'source_excerpts':excerpts}
out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:v for k,v in result.items() if k not in ['input_files','source_excerpts']},ensure_ascii=False,indent=2))
