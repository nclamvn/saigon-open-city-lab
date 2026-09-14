/* S07-B actual geometry and cache checks; no app/data/old receipts are changed. */
const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto');
const base=path.resolve(__dirname,'..');global.window=global;const THREE=require(path.join(base,'vendor/three.min.js'));
require(path.join(base,'static/solution-layer.js'));require(path.join(base,'static/s07-surface.js'));
const layers=global.B04SolutionLayers,surface=global.B04S07Surface,data=JSON.parse(fs.readFileSync(path.join(base,'derived/fusion/scene-data.json'))),solution=JSON.parse(fs.readFileSync(path.join(base,'derived/solution/solution-data.json'))),visual=JSON.parse(fs.readFileSync(path.join(base,'derived/visual/visual-data.json')));
const byId=new Map(solution.buildings.map(v=>[v.id,v])),transform=solution.coordinate_transform.legacy_to_canonical,canonical=p=>({...p,x:p.x*transform.x_scale,z:p.z*transform.z_scale});
const features=data.buildings.map(v=>({...v,footprint_local_m:byId.get(v.id).footprint_scene_m})),center=byId.get('msft_0615').centroid_scene_m;
const sample={west:center[0]-125,east:center[0]+125,south:center[1]-125,north:center[1]+125};
const first=visual.terrain_frame.pixel_centers.first_pixel_center_scene_m,last=visual.terrain_frame.pixel_centers.last_pixel_center_scene_m,frame={xMin:first[0],xMax:last[0],zMin:last[1],zMax:first[1],width:last[0]-first[0],depth:first[1]-last[1],rows:109,cols:109},heights=solution.terrain_profiles.gedtm.heights_m;
const ground=(x,z)=>{const gx=(x-frame.xMin)/frame.width*108,gy=(frame.zMax-z)/frame.depth*108,c=Math.min(107,Math.max(0,Math.floor(gx))),r=Math.min(107,Math.max(0,Math.floor(gy))),tx=gx-c,ty=gy-r,a=heights[r][c],b=heights[r][c+1],d=heights[r+1][c],e=heights[r+1][c+1];return tx+ty<=1?a+tx*(b-a)+ty*(d-a):e+(1-tx)*(d-e)+(1-ty)*(b-e);};
const heightFor=f=>{const m=byId.get(f.id),modeled=layers.acceptedGoogle(m);return{height:modeled?m.model_height_m:f.display_height_m,modeled,method:modeled?'Google model':'area proxy',date:'2023'};};
const selected=features.filter(f=>{const p=f.footprint_local_m;return Math.min(...p.map(v=>v.x))<sample.east&&Math.max(...p.map(v=>v.x))>sample.west&&Math.min(...p.map(v=>v.z))<sample.north&&Math.max(...p.map(v=>v.z))>sample.south;});
const coarse=layers.buildingLayer({THREE,ground,frame,detailLevel:'coarse'},selected,heightFor),standard=layers.buildingLayer({THREE,ground,frame},selected,heightFor),fine=layers.buildingLayer({THREE,ground,frame,detailLevel:'fine',sampleBounds:sample,chunkId:'qa-msft0615-250m'},selected,heightFor);
assert.equal(coarse.qa.detailTriangles,0);assert(fine.fineLayer.qa.triangles>0);assert.equal(fine.fineLayer.qa.buildings,selected.length);
assert.deepEqual(fine.foundations,coarse.foundations,'Foundation inputs unchanged');
assert.deepEqual(fine.buildings.map(b=>[b.id,b.height,b.topY]),coarse.buildings.map(b=>[b.id,b.height,b.topY]),'Envelope inputs unchanged');
const descriptor=new Map(fine.buildings.map(b=>[b.id,b]));let nonfinite=0,projectedOutside=0,aboveEnvelope=0,downwardSeamFaces=0;
for(const mesh of fine.fineLayer.pickables){const p=mesh.geometry.attributes.position,n=mesh.geometry.attributes.normal;
 for(let i=0;i<p.count;i++){const b=descriptor.get(mesh.geometry.userData.triangleToFeature[Math.floor(i/3)].featureId),x=p.getX(i),z=p.getZ(i),y=p.getY(i);
  if(![x,y,z,n.getX(i),n.getY(i),n.getZ(i)].every(Number.isFinite))nonfinite++;
  if(!layers.contains(b.sourcePolygon,x,z)&&Math.min(...b.sourcePolygon.map((a,j)=>layers.segmentDistance(x,z,a,b.sourcePolygon[(j+1)%b.sourcePolygon.length])))>.002)projectedOutside++;
  if(y>b.topY+.00001)aboveEnvelope++;
  if(mesh.name.includes('roof panel')&&n.getY(i)<-.01)downwardSeamFaces++;
 }}
assert.equal(nonfinite,0);assert.equal(projectedOutside,0);assert.equal(aboveEnvelope,0);assert.equal(downwardSeamFaces,0);
let uvDiscontinuities=0,vNotWorldHeight=0,maxUErrorM=0;
for(const layer of [coarse,fine]){const mesh=layer.pickables[0],p=mesh.geometry.attributes.position,uv=mesh.geometry.attributes.uv,bodies=new Map(layer.buildings.map(b=>[b.id,b]));
 for(let i=0;i<p.count;i++){const b=bodies.get(mesh.geometry.userData.triangleToFeature[Math.floor(i/3)].featureId),poly=b.polygon,x=p.getX(i),z=p.getZ(i);let best=Infinity,expected=0,offset=0;
  for(let j=0;j<poly.length;j++){const a=poly[j],q=poly[(j+1)%poly.length],d=Math.hypot(q.x-a.x,q.z-a.z),distance=layers.segmentDistance(x,z,a,q);if(distance<best){best=distance;expected=offset+Math.max(0,Math.min(d,((x-a.x)*(q.x-a.x)+(z-a.z)*(q.z-a.z))/d));}offset+=d;}
  const err=Math.min(Math.abs(uv.getX(i)-expected),Math.abs(uv.getX(i)-expected+offset),Math.abs(uv.getX(i)-expected-offset));maxUErrorM=Math.max(maxUErrorM,err);if(err>.002)uvDiscontinuities++;
  if(Math.abs(uv.getY(i)-p.getY(i))>.00001)vNotWorldHeight++;
 }}
assert.equal(uvDiscontinuities,0,'Wall metre UV continuity at dense cuts');assert.equal(vNotWorldHeight,0);
// Sloping wall/high region fixture: missing opening area is clipped, not entire valid strips.
function steepFixture(ga,gb){let area=0;const out={triangle(a,b,c){area+=Math.abs((b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x))/2;},quad(a,b,c,d){this.triangle(a,b,c);this.triangle(a,c,d);}};
 surface.writeWallSegment(out,{a:{x:0,z:0,edgeIndex:0},b:{x:4,z:0},ga,gb,top:5,u0:0,u1:4,polygon:[{x:0,z:0},{x:4,z:0},{x:4,z:-2},{x:0,z:-2}],openings:[{edgeIndex:0,start:0,end:4,y0:2,y1:3}],color:'#fff',payload:{}});return area;}
assert(Math.abs(steepFixture(0,4)-9.5)<1e-7);assert(Math.abs(steepFixture(4,0)-9.5)<1e-7);
const concave={polygon:[{x:0,z:0},{x:0,z:5},{x:1,z:5},{x:1,z:1},{x:5,z:1},{x:5,z:0}],roofType:'hipped',roofParameters:{axis:{x:1,z:0},lo:0,hi:5,mid:2.5},wallTop:4,topY:5,roofRise:1};assert.equal(surface.roofPlanes(concave).length,0,'Concave standalone roof fan rejected');
const roads=data.roads.map(v=>({...v,path_local_m:v.path_local_m.map(canonical)})),roadLayer=layers.roadLayer({THREE,ground,frame,buildings:coarse.buildings},roads),water=data.osm_water.map(v=>({...v,path_local_m:v.path_local_m.map(canonical)})),cells=data.jrc_water_cells.map(canonical),waterSegments=water.flatMap(v=>v.path_local_m.slice(0,-1).map((a,i)=>({a,b:v.path_local_m[i+1],width:Math.min(25,Math.max(2,v.width_proxy_m||8))})));
const vegetation=layers.vegetationLayer({THREE,ground,frame,waterSegments},layers.buildingLayer({THREE,ground,frame,detailLevel:'coarse'},features,heightFor).buildings,roadLayer.segments,visual.eth_canopy_field_10m,cells),originalPositions=JSON.stringify(vegetation.candidates),detail=surface.enrichVegetation({THREE,ground,frame,sampleBounds:sample,chunkId:'qa'},vegetation);
detail.updateLOD({x:center[0],z:center[1]},125,true);assert(detail.qa.lodTrees>0&&detail.qa.lodTrees<=96);assert.equal(detail.qa.branches,detail.qa.lodTrees*7);assert.equal(detail.qa.leafCards,detail.qa.lodTrees*18);assert.equal(JSON.stringify(vegetation.candidates),originalPositions);
let leavesAboveSourceHeight=0,foliageIntersections=0;const matrix=new THREE.Matrix4(),v=new THREE.Vector3(),lp=detail.leaves.geometry.attributes.position;
for(let i=0;i<detail.leaves.count;i++){detail.leaves.getMatrixAt(i,matrix);const tree=detail.visibleCandidates[Math.floor(i/18)];for(let j=0;j<lp.count;j++){v.fromBufferAttribute(lp,j).applyMatrix4(matrix);if(v.y>tree.y+tree.sourceRasterHeight+.0001)leavesAboveSourceHeight++;}}
assert.equal(leavesAboveSourceHeight,0);const leafTexture=surface.foliageTexture(THREE),bytes=leafTexture.image.data,size=leafTexture.image.width;assert([0,size-1,size*(size-1),size*size-1].every(i=>bytes[i*4+3]===0));let opaque=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i])opaque++;assert(opaque>0&&opaque<size*size*.7);
const allSourcePolygons=features.map(f=>f.footprint_local_m);
for(const mesh of [detail.branches,detail.leaves]){const p=mesh.geometry.attributes.position;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(matrix);
 if(allSourcePolygons.some(poly=>layers.contains(poly,v.x,v.z))||[...roadLayer.segments,...waterSegments].some(s=>layers.segmentDistance(v.x,v.z,s.a,s.b)<s.width/2)||cells.some(c=>c.occurrence_percent>10&&Math.hypot(v.x-c.x,v.z-c.z)<6))foliageIntersections++;
}}}assert.equal(foliageIntersections,0,'Actual leaf/branch vertices intersect footprint/road/water glyph');
const close={...detail.qa};detail.updateLOD({x:0,z:0},2000,true);assert.equal(detail.leaves.count,0);assert.equal(detail.branches.count,0);
let disposed=0;leafTexture.addEventListener('dispose',()=>disposed++);layers.dispose(detail.group,true);assert.equal(disposed,0);assert.strictEqual(surface.foliageTexture(THREE),leafTexture);
const report={schema:'s07.b.surface-check/v1',status:'PASS',rendererVersion:layers.VERSION,surfaceVersion:surface.VERSION,centerSceneM:center,sampleBounds:sample,selectedIds:selected.map(v=>v.id),geometry:{coarse:coarse.qa,standard:standard.qa,fine:fine.qa,fineExtra:fine.fineLayer.qa},nonfinite,projectedOutside,aboveEnvelope,downwardSeamFaces,uv:{uvDiscontinuities,vNotWorldHeight,maxUErrorM,units:'metres',intentionalPerimeterWrap:true},steepWallArea:{ascending:steepFixture(0,4),descending:steepFixture(4,0),expected:9.5},concaveStandaloneFanSkipped:true,foundationAndEnvelopeInputsUnchanged:true,foliage:{close,far:{...detail.qa},leavesAboveSourceHeight,foliageIntersections,sourcePlacementUnchanged:true,alphaCornersTransparent:true,alphaCoverage:opaque/(size*size),sharedTextureIdentityStable:true,sharedTextureDisposedOnChunkRemoval:false,modeled:true,observedSpecies:false},sourceDataSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(base,'derived/solution/solution-data.json'))).digest('hex'),note:'Actual constructed geometry/UV/masks/cache checks; no field accuracy or browser GPU/performance claim.'};
const output=path.join(base,'scripts/s07-b-qa/surface-geometry.json');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,selected:selected.length,extraTriangles:fine.fineLayer.qa.triangles,uvDiscontinuities,projectedOutside,aboveEnvelope,foliageTrees:close.lodTrees,output}));
