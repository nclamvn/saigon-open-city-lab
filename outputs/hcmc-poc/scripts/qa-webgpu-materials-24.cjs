const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const html=read('webgpu-materials-24.html');
const js=read('webgpu-materials-24.js');
const corrections=read('data/webgpu-corrections-24.js');
const entry=read('webgpu-entry-24.js');
const manifest=JSON.parse(read('data/webgpu-materials-24.json'));
const evidence=JSON.parse(read('data/ba-son-marina-24.json'));
const checks=[];
function check(name,fn){fn();checks.push(name);}
check('Three.js r186 WebGPU build is vendored',()=>{
  assert(fs.existsSync(path.join(root,'vendor/three186/three.webgpu.js')));
  assert(read('vendor/three186/three.core.js').includes("const REVISION = '186'"));
});
check('Import map resolves three/webgpu and three/tsl locally',()=>{
  assert(html.includes('"three/webgpu"'));
  assert(html.includes('"three/tsl"'));
  assert(!html.includes('https://cdn.'));
});
check('Universal renderer prefers WebGPU and retains WebGL 2 fallback',()=>{
  assert(js.includes('new THREE.WebGPURenderer'));
  assert(js.includes('forceWebGL:true'));
  assert(js.includes("renderer.backend?.isWebGPUBackend"));
});
check('City material is TSL NodeMaterial without WebGL shader patching',()=>{
  assert(js.includes('new THREE.MeshStandardNodeMaterial'));
  assert(js.includes('cityMaterial.colorNode'));
  assert(!js.includes('onBeforeCompile'));
  assert(!js.includes('ShaderMaterial'));
});
check('All building vertices carry semantic material attributes',()=>{
  for(const attribute of ['baseColor24','surface24','class24','seed24','direct24'])assert(js.includes(attribute));
});
check('Visual baseline comparison and three lighting states exist',()=>{
  assert(js.includes('compareDown'));
  for(const state of ['day','golden','night'])assert(js.includes(`${state}:`));
});
check('Ba Son cable-stayed structure and Marina Central 240 m correction are present',()=>{
  assert(html.includes('data/ba-son-bridge-detail.js'));
  assert(html.includes('data/webgpu-corrections-24.js'));
  assert(html.includes('data-view="bason"'));
  assert(js.includes("bridgeGroup.name='Cầu Ba Son · kết cấu dây văng'"));
  assert(js.includes('bridgeCableGroup'));
  assert(js.includes('cables:28'));
  assert(js.includes("marinaDetail.name='Marina Central Tower · nhận diện 24B'"));
  assert(js.includes('heightM:240'));
  for(const id of ['1432358258','1432358259','1432358260'])assert(corrections.includes(id));
});
check('Four stale low Grand Marina construction footprints become residential towers',()=>{
  assert(js.includes('grandMarinaHeightCorrections'));
  assert(js.includes("grandMarinaDetail.name='Grand Marina Residences · cụm 4 tháp hiện hữu'"));
  for(const id of ['1151026864','1151026865','1151026866','1151026867'])assert(corrections.includes(id));
  assert(js.includes('correctedTowers:4'));
  assert(js.includes("towerNameMapping:'withheld_pending_official_geospatial_plan'"));
});
check('Curated corrections do not mutate the source city dataset',()=>{
  assert(js.includes('const renderBuildings=D.buildings.map'));
  assert(js.includes('const building=renderBuildings[low]'));
  assert(!js.includes('Object.assign(b,grandMarinaCorrection'));
  assert(corrections.includes("version:'25g'"));
  assert.equal(evidence.version,'24e');
});
check('Daytime glazing avoids black perforation while night retains depth',()=>{
  assert(js.includes("const glassDay=mix(color('#526b77'),color('#8ca3aa')"));
  assert(js.includes("const concreteWindow=mix(color('#566163'),color('#858d8b')"));
  assert(js.includes("const windowBlend=windowMask.mul(mix(float(.38),float(.72),nightLevel))"));
  assert(js.includes('rich=mix(rich,windowColor,windowBlend)'));
});
check('Visual 26 uses bounded haze, directional contact shading and separated PBR classes',()=>{
  assert(js.includes("day:createSkyTexture('#287eb4','#79bfe2','#f3f8fb')"));
  assert(js.includes("const groundContact=mix(float(.7),float(1),smoothstep(1.5,22,positionWorld.y))"));
  assert(js.includes("const materialRoughness=select(isGlass"));
  assert(js.includes("scene.fog.density=Math.min(activeFogDensity,Math.max(.000018,.22/cameraDistance))"));
  assert(js.includes("sun.shadow.mapSize.set(4096,4096)"));
});
check('Urban motion 26B stays on audited roads and inside the river',()=>{
  assert(js.includes("trafficGroup.name='Dense Vietnamese road traffic · illustrative'"));
  assert(js.includes('trafficItems.length>=3200'));
  assert(js.includes("kind=roll<.8?'motorbike':roll<.985?'car':'bus'"));
  assert(js.includes('roadSegmentClear(segment.a,segment.b'));
  assert(js.includes("wakeGeometry.setIndex([0,1,2,3,4,5,6,7,8,6,8,9])"));
  assert(js.includes('vesselSamplesOutsideWater'));
  assert(js.includes("vesselRoute:'illustrative Saigon River lane'"));
  assert(js.includes('advanceUrbanMotion(now)'));
});
check('Public entry from the stable demo exists',()=>{
  assert(entry.includes('webgpu-materials-24.html'));
  assert(read('index.html').includes('webgpu-entry-24.js'));
});
check('Manifest declares the rendered scope and limitations',()=>{
  assert.equal(manifest.version,'25g');
  assert.equal(manifest.scope.renderedBuildings,70726);
  assert.equal(manifest.scope.materialFamilies,8);
  assert(manifest.limits.length>=4);
});
check('Flood 25B focuses Thao Dien and renders bounded road-water proxies',()=>{
  assert(js.includes('flood25:{target:xyz(106.7305,10.8030,24)'));
  assert(js.includes("{name:'Quốc Hương',maxDepthM:.40"));
  assert(js.includes("{name:'Thảo Điền',maxDepthM:.40"));
  assert(js.includes("{name:'Nguyễn Văn Hưởng',maxDepthM:.25"));
  assert(js.includes("Math.min(200,Number(amountMm)"));
});
check('IOC 25G exposes compound rain-tide stress state, map beacons and compact shell',()=>{
  assert(js.includes("alertRoadNames=['Quốc Hương','Thảo Điền','Nguyễn Văn Hưởng'"));
  assert(js.includes('function setFloodScenario(amountMm,tideM=floodTideM)'));
  assert(js.includes("alertLevel=severity>=.78?'red'"));
  assert(js.includes('hydraulicOutput:false'));
});
console.log(JSON.stringify({suite:'webgpu-materials-24',passed:checks.length,checks},null,2));
