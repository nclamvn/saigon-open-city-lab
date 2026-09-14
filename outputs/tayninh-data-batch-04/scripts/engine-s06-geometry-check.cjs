/* Independent source-polygon and actual THREE triangle-ray checks, no browser or compiler writes. */
const fs = require('fs'), path = require('path'), assert = require('assert'), { performance } = require('perf_hooks');
const base = path.resolve(__dirname, '..');
global.window = global; const THREE = require(path.join(base, 'vendor/three.min.js'));
require(path.join(base, 'static/solution-layer.js')); const layers = global.B04SolutionLayers;
const data = JSON.parse(fs.readFileSync(path.join(base, 'derived/fusion/scene-data.json')));
const visual = JSON.parse(fs.readFileSync(path.join(base, 'derived/visual/visual-data.json')));
const solution = JSON.parse(fs.readFileSync(path.join(base, 'derived/solution/solution-data.json'))), byId = new Map(solution.buildings.map(v=>[v.id,v]));
const transform = solution.coordinate_transform.legacy_to_canonical;
data.buildings=data.buildings.map(v=>({...v,footprint_local_m:byId.get(v.id).footprint_scene_m}));
data.roads=data.roads.map(v=>({...v,path_local_m:v.path_local_m.map(p=>({...p,x:p.x*transform.x_scale+transform.x_offset,z:p.z*transform.z_scale+transform.z_offset}))}));
const first = visual.terrain_frame.pixel_centers.first_pixel_center_scene_m, last = visual.terrain_frame.pixel_centers.last_pixel_center_scene_m;
const frame = { xMin: first[0], xMax: last[0], zMax: first[1], zMin: last[1], width: last[0] - first[0], depth: first[1] - last[1], rows: 109, cols: 109 };
const terrainName=process.argv[2]||'copdem',scale=Number(process.argv[3]||1),heightName=process.argv[4]||'proxy';
const heights = solution.terrain_profiles[terrainName].heights_m;
assert(heights.flat().every(Number.isFinite));assert(solution.terrain_profiles[terrainName].coverage.complete);
function ground(x, z) {
 const gx = Math.max(0,Math.min(108,(x-frame.xMin)/frame.width*108)), gy = Math.max(0,Math.min(108,(frame.zMax-z)/frame.depth*108));
 const c=Math.min(107,Math.floor(gx)),r=Math.min(107,Math.floor(gy)),tx=gx-c,ty=gy-r;
 const a=heights[r][c],b=heights[r][c+1],d=heights[r+1][c],e=heights[r+1][c+1];
 return (tx+ty<=1?a+tx*(b-a)+ty*(d-a):e+(1-tx)*(d-e)+(1-ty)*(b-e))*scale;
}
const positions=[],index=[];
for(let r=0;r<109;r++)for(let c=0;c<109;c++)positions.push(frame.xMin+c/108*frame.width,heights[r][c]*scale,frame.zMax-r/108*frame.depth);
for(let r=0;r<108;r++)for(let c=0;c<108;c++){const a=r*109+c;index.push(a,a+1,a+109,a+1,a+110,a+109);}
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(index);geo.computeVertexNormals();
const terrain=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
const started=performance.now(), result=layers.buildingLayer({THREE,ground,frame},data.buildings,f=>{
 const model=byId.get(f.id),modeled=heightName==='google'&&layers.acceptedGoogle(model);
 return {height:modeled?model.google_model_height_m:f.display_height_m,method:modeled?'Google model':'source area-proxy',date:'input',modeled};
});
assert.equal(result.qa.buildingCount+result.qa.excludedCount,657);assert.equal(result.qa.sourceHeightNullCount,657);
const sourceById=new Map(result.buildings.map(b=>[b.id,b]));let roofOutside=0,downwardRoofFaces=0,nonfinite=0;
const roof=result.pickables[1].geometry,p=roof.attributes.position,n=roof.attributes.normal;
for(let i=0;i<p.count;i+=3){
 const b=sourceById.get(roof.userData.triangleToFeature[i/3].featureId),x=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3;
 if(Math.abs(n.getY(i))>.01&&!layers.contains(b.sourcePolygon,x,z))roofOutside++;
 if(n.getY(i)<-.01)downwardRoofFaces++;
 for(let k=0;k<3;k++)if(![p.getX(i+k),p.getY(i+k),p.getZ(i+k)].every(Number.isFinite))nonfinite++;
}
assert.equal(roofOutside,0,'Roof crosses source polygon');assert.equal(downwardRoofFaces,0,'Roof winding is down');assert.equal(nonfinite,0);
const actualTops=new Map();
for(const mesh of result.pickables){const a=mesh.geometry.attributes.position;
 for(let i=0;i<a.count;i++){const id=mesh.geometry.userData.triangleToFeature[Math.floor(i/3)].featureId;actualTops.set(id,Math.max(actualTops.get(id)??-Infinity,a.getY(i)));}}
let maxEnvelopeHeightErrorM=0;
for(const b of result.buildings){const actual=actualTops.get(b.id)-b.groundReference,error=Math.abs(actual-b.height);maxEnvelopeHeightErrorM=Math.max(maxEnvelopeHeightErrorM,error);
 assert(error<.001,`Actual envelope vs input height mismatch ${b.id}`);assert(b.wallHeight>0&&b.roofRise>=0&&Math.abs(b.wallHeight+b.roofRise-b.height)<1e-9);}
const qaStarted=performance.now(), grounding=layers.groundQA(THREE,terrain,result.foundations);
if(grounding.rayMisses)console.error(JSON.stringify(grounding,null,2));
assert.equal(grounding.sampledFeatures,result.qa.buildingCount);assert.equal(grounding.rayMisses,0);assert.equal(grounding.overTolerance,0);
assert.equal(terrain.geometry.index.array.length,index.length,'Full actual terrain index restored');
const raycastQaCpuMs=performance.now()-qaStarted;
const corrupt=layers.groundQA(THREE,terrain,[{...result.foundations[0],y:result.foundations[0].y+.5}]);assert.equal(corrupt.overTolerance,1,'Independent grounding catches displaced geometry');
const roads=layers.roadLayer({THREE,ground,frame,buildings:result.buildings},data.roads);assert.equal(roads.qa.features+roads.qa.excludedFeatures,data.roads.length);
const roadGrounding=layers.groundQA(THREE,terrain,layers.geometryGroundSamples(roads.surfaceMesh,Infinity),1,.07,'road');assert.equal(roadGrounding.rayMisses,0);assert.equal(roadGrounding.overTolerance,0);
let roadInsideBuilding=0; const rp=roads.surfaceMesh.geometry.attributes.position;
for(let i=0;i<rp.count;i+=3){const x=(rp.getX(i)+rp.getX(i+1)+rp.getX(i+2))/3,z=(rp.getZ(i)+rp.getZ(i+1)+rp.getZ(i+2))/3;
 for(const b of result.buildings){if(x<=b.bounds.west||x>=b.bounds.east||z<=b.bounds.south||z>=b.bounds.north)continue;
  if(layers.contains(b.sourcePolygon,x,z)&&Math.min(...b.sourcePolygon.map((v,j)=>layers.segmentDistance(x,z,v,b.sourcePolygon[(j+1)%b.sourcePolygon.length])))>.001)roadInsideBuilding++;
 }}
assert.equal(roadInsideBuilding,0,'Ribbon geometry enters source building polygon');
const report={schema:'s06.engine.geometry-check.v1',terrainName,scale,heightName,threeRevision:THREE.REVISION,sourceBuildings:data.buildings.length,buildingGeometry:result.qa,roofOutside,downwardRoofFaces,nonfinite,maxEnvelopeHeightErrorM,heightReference:'maximum_terrain_perimeter',grounding,roadGeometry:roads.qa,roadGrounding,roadInsideBuilding,totalQaCpuMs:performance.now()-started,raycastQaCpuMs,negativeDisplacedFoundationDetected:true,actualTerrainIndexRestored:true,accuracyNote:'Geometry/input QA only; no source field-accuracy claim.'};
if(process.argv[5]==='natural'){
 const canonicalPoint=p=>({...p,x:p.x*transform.x_scale+transform.x_offset,z:p.z*transform.z_scale+transform.z_offset});
 const water=data.osm_water.map(v=>({...v,path_local_m:v.path_local_m.map(canonicalPoint)})),cells=data.jrc_water_cells.map(canonicalPoint);
 const waterLayer=layers.roadLayer({THREE,ground,frame},water,{water:true});
 const waterGrounding=layers.groundQA(THREE,terrain,layers.geometryGroundSamples(waterLayer.surfaceMesh,Infinity),1,.07,'water');
 assert.equal(waterGrounding.rayMisses,0);assert.equal(waterGrounding.overTolerance,0);
 const waterSegments=water.flatMap(v=>v.path_local_m.slice(0,-1).map((a,i)=>({a,b:v.path_local_m[i+1],width:Math.min(25,Math.max(2,v.width_proxy_m||8))})));
 const field=visual.eth_canopy_field_10m,vegetation=layers.vegetationLayer({THREE,ground,frame,waterSegments},result.buildings,roads.segments,field,cells);
 assert(vegetation.candidates.length>0&&vegetation.candidates.length<=1200);let exclusionViolations=0,maskViolations=0;
 for(const v of vegetation.candidates){
  if(result.buildings.some(b=>v.x>=b.bounds.west-7&&v.x<=b.bounds.east+7&&v.z>=b.bounds.south-7&&v.z<=b.bounds.north+7)||[...roads.segments,...waterSegments].some(s=>layers.segmentDistance(v.x,v.z,s.a,s.b)<s.width/2+7)||cells.some(c=>c.occurrence_percent>10&&Math.hypot(v.x-c.x,v.z-c.z)<22))exclusionViolations++;
  const fb=field.edge_bounds_scene_m.bounds_m,c=Math.floor((v.x-fb[0])/(fb[2]-fb[0])*field.dimensions[0]),r=Math.floor((fb[3]-v.z)/(fb[3]-fb[1])*field.dimensions[1]);
  if(field.height_grid_u8_rows[r][c]<5||field.height_grid_u8_rows[r][c]>35||field.uncertainty_grid_u8_rows[r][c]>12)maskViolations++;
 }
 assert.equal(exclusionViolations,0);assert.equal(maskViolations,0);
 vegetation.updateLOD({x:0,z:0},2000,true);const far={...vegetation.qa};
 const focus=result.buildings[100].polygon[0];vegetation.updateLOD(focus,125,true);const near={...vegetation.qa};
 assert(near.lodNearTrees>0&&near.lodNearTrees<=500);assert.equal(near.detectedIndividuals,false);
 const repeat=layers.vegetationLayer({THREE,ground,frame,waterSegments},result.buildings,roads.segments,field,cells);assert.deepEqual(repeat.candidates,vegetation.candidates,'Deterministic placement');
 const jrc={};for(const [metric,kind]of [['occurrence_percent','water-occurrence'],['seasonality_2024_months','water-seasonality'],['normalized_change_percent','water-change']]){
  assert(cells.every(c=>Number.isFinite(c[metric])),'Actual JRC metric values present');
  const layer=layers.rasterEvidenceLayer({THREE,ground,frame},cells,metric,kind),q=layers.groundQA(THREE,terrain,layers.geometryGroundSamples(layer.mesh,Infinity),1,.16,`jrc_${kind}`);
  assert.equal(q.rayMisses,0);assert.equal(q.overTolerance,0);assert(layer.qa.renderedCells>0);jrc[kind]={coverage:layer.qa,grounding:q};
 }
 const library=layers.textureLibrary(THREE),cached=layers.sharedTextures(THREE),ids=cached.map(t=>t.uuid);let textureDisposals=0;cached.forEach(t=>t.addEventListener('dispose',()=>textureDisposals++));
 layers.dispose(result.group,true);layers.dispose(roads.group,true);assert.equal(textureDisposals,0);assert.deepEqual(layers.sharedTextures(THREE).map(t=>t.uuid),ids);assert.strictEqual(layers.textureLibrary(THREE),library);
 report.natural={waterCoverage:waterLayer.qa,waterGrounding,vegetation:{candidates:vegetation.candidates.length,exclusionViolations,maskViolations,deterministic:true,far,near},jrc,proceduralMaterials:{cachedTextures:cached.length,size:[64,64],cacheIdentityStable:true,sharedTextureDisposedOnLayerRebuild:false,nativeRgbChanged:false}};
}
report.totalQaCpuMs=performance.now()-started;
const output=path.join(base,'scripts/engine-s06-qa',`${process.argv[5]==='natural'?'natural-':''}${terrainName}-${scale}-${heightName}.json`);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({case:`${terrainName}-${scale}-${heightName}`,roofOutside,roadInsideBuilding,groundMisses:grounding.rayMisses,roadMisses:roadGrounding.rayMisses,totalQaCpuMs:report.totalQaCpuMs,output}));
