from pathlib import Path
import re,base64
r=Path(__file__).resolve().parents[1]
s=(r/'index.html').read_text()
s=re.sub(r'<link rel="stylesheet" href="([^"]+\.css)(?:\?[^"]*)?">',lambda m:'<style>'+(r/m.group(1)).read_text()+'</style>',s)
def script(m):
 path=m.group(1).split('?',1)[0];src=(r/path).read_text()
 if path=='app.js':
  image=base64.b64encode((r/'data/sentinel-2016.jpg').read_bytes()).decode()
  src=src.replace('data/sentinel-2016.jpg','data:image/jpeg;base64,'+image).replace("'data/overture-region.geojson'","'hcmc-poc/data/overture-region.geojson'")
 if path=='pbr-environment.js':
  hdri=base64.b64encode((r/'data/venice_sunset_1k.hdr').read_bytes()).decode()
  src=src.replace('data/venice_sunset_1k.hdr','data:application/octet-stream;base64,'+hdri)
 if path=='leadership-16.js':src=src.replace("'research/facades-15/index.html'","'hcmc-poc/research/facades-15/index.html'")
 if path=='experience.js':src=src.replace("'data/height-region-report.json'","'hcmc-poc/data/height-region-report.json'")
 if path=='reality-patch.js':src=src.replace('data/reality-patch-manifest.json','hcmc-poc/data/reality-patch-manifest.json')
 if path=='ground-capture-07c.js':src=src.replace('data/ground-capture-plan.json','hcmc-poc/data/ground-capture-plan.json')
 if path=='bridge-detail.js':src=src.replace('data/ba-son-bridge-detail.json','hcmc-poc/data/ba-son-bridge-detail.json')
 if path=='bach-dang-footbridge.js':src=src.replace('data/bach-dang-footbridge.json','hcmc-poc/data/bach-dang-footbridge.json')
 if path=='semantic-materials-08.js':src=src.replace('data/semantic-materials-08.json','hcmc-poc/data/semantic-materials-08.json')
 if path=='texture-atlas-09.js':src=src.replace('data/texture-atlas-09.json','hcmc-poc/data/texture-atlas-09.json')
 if path=='urban-detail-10.js':src=src.replace('data/urban-detail-10.json','hcmc-poc/data/urban-detail-10.json')
 if path=='confidence-map-11.js':src=src.replace('data/confidence-map-11.json','hcmc-poc/data/confidence-map-11.json')
 if path=='reality-tile-07b.js':
  tile=base64.b64encode((r/'tiles/rp-r2c3/lod2.glb').read_bytes()).decode()
  src="window.REALITY_TILE_07B_BASE64='"+tile+"';\n"+src
 return '<script>'+src.replace('</script','<\\/script')+'</script>'
s=re.sub(r'<script src="([^"]+)"></script>',script,s)
s=s.replace('../POC-05-TIEN-DO.md','POC-05-TIEN-DO.md').replace('../POC-06-VISUAL-CEILING.md','POC-06-VISUAL-CEILING.md').replace('../POC-07A-REALITY-PATCH.md','POC-07A-REALITY-PATCH.md').replace('../POC-07B-REALITY-TILE.md','POC-07B-REALITY-TILE.md').replace('../POC-07C-GROUND-CAPTURE.md','POC-07C-GROUND-CAPTURE.md')
s=s.replace('../POC-04-TIEN-DO.md','POC-04-TIEN-DO.md')
s=s.replace('../POC-03-TIEN-DO.md','POC-03-TIEN-DO.md')
s=s.replace('../POC-02-TIEN-DO.md','POC-02-TIEN-DO.md')
s=s.replace('../POC-07C1-BA-SON-BRIDGE.md','POC-07C1-BA-SON-BRIDGE.md').replace('../POC-07C2-BACH-DANG-FOOTBRIDGE.md','POC-07C2-BACH-DANG-FOOTBRIDGE.md').replace('../POC-08-SEMANTIC-MATERIALS.md','POC-08-SEMANTIC-MATERIALS.md').replace('../POC-09-COLOR-CALIBRATION-TEXTURE-ATLAS.md','POC-09-COLOR-CALIBRATION-TEXTURE-ATLAS.md').replace('../POC-10-URBAN-DETAIL.md','POC-10-URBAN-DETAIL.md').replace('../POC-11-CONFIDENCE-ACQUISITION.md','POC-11-CONFIDENCE-ACQUISITION.md').replace('../POC-12-CINEMATIC-MAP-UI.md','POC-12-CINEMATIC-MAP-UI.md').replace('../POC-13-REALITY-ENRICHMENT.md','POC-13-REALITY-ENRICHMENT.md')
s=s.replace('../POC-15-PHOTO-FACADES.md','POC-15-PHOTO-FACADES.md').replace('href="research/facades-15/index.html"','href="hcmc-poc/research/facades-15/index.html"')
s=s.replace('../POC-14-VISUAL-RESEARCH.md','POC-14-VISUAL-RESEARCH.md').replace('href="research/visual-14/index.html"','href="hcmc-poc/research/visual-14/index.html"')
s=s.replace('../BAO-CAO-POC.md','BAO-CAO-POC.md').replace('../DEMO-RUNBOOK-POC-12.md','DEMO-RUNBOOK-POC-12.md').replace('href="data/quality-report.json"','href="hcmc-poc/data/quality-report.json"')
(r.parent/'SAIGON-3D.html').write_text(s)
print('Single file:',(r.parent/'SAIGON-3D.html').stat().st_size,'bytes')
