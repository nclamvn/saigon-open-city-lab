from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
js=(root/'reality-enrichment-13.js').read_text()
html=(root/'index.html').read_text()
checks={
 'script_loaded':'reality-enrichment-13.js?v=13c' in html,
 'view_19':"<small>19</small> Reality Enrichment" in js,
 'five_layers':all(x in js for x in ['FacadeMicroGeometry','MappedRoadMarkings','LayeredVegetation','DetailedRiverTraffic','WaterMicroSurface']),
 'instancing':js.count('new T.InstancedMesh')>=5 and js.count('instances(')>=7,
 'lod':all(x in js for x in ['facadeGroup.visible','roadGroup.visible','treeGroup.visible','boatGroup.visible','waterGroup.visible']),
 'ab':"id=\"re13AB\"" in js and 'setEnabled' in js,
 'honest_classification':'not_surveyed_reality' in js and 'chưa phải texture chụp' in js,
 'draw_budget':'additionalDrawCalls:13' in js,
 'metrics':'realityEnrichment13Status' in (root/'app.js').read_text(),
 'report':(root.parent/'POC-13-REALITY-ENRICHMENT.md').exists(),
}
failed=[k for k,v in checks.items() if not v]
assert not failed,failed
print('Reality Enrichment 13 validator PASS',checks)
