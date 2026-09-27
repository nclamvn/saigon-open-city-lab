const assert=require('assert');
const crypto=require('crypto');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const runtime=read('city-visual-runtime-30.js');
const renderer=read('webgpu-materials-24.js');
const hero=read('city-hero-corridor-30.js');
const identity=read('city-identity-facades-30.js');
const html=read('webgpu-materials-24.html');
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};

check('quality tiers have bounded render and shadow budgets',()=>{
  for(const name of ['performance','balanced','presentation'])assert(runtime.includes(`${name}: Object.freeze({`));
  assert(runtime.includes('minPixelRatio'));
  assert(runtime.includes('maxPixelRatio'));
  assert(runtime.includes('targetLowFps'));
  assert(runtime.includes('targetHighFps'));
  assert(renderer.includes("const requestedQuality=params.get('quality')||'presentation'"));
});

check('presentation graph uses AO, temporal history, selective bloom and sharpening',()=>{
  for(const token of ['ao(normalDepth, normalTexture, camera)','traa(sceneColor, sceneDepth, sceneVelocity, camera)',"getTextureNode('emissive')",'sharpen(composed'])assert(runtime.includes(token));
  assert(runtime.includes('builtinAOContext'));
  assert(runtime.includes('normalPass.setMRT'));
  assert(runtime.includes('scenePass.setMRT'));
});

check('CSM initializes through the active node builder and keeps a fallback',()=>{
  assert(runtime.includes('new CSMShadowNode(light'));
  assert(!runtime.includes('csm.camera = camera'));
  assert(runtime.includes('light.shadow.shadowNode = csm'));
  assert(runtime.includes("type: 'single'"));
  assert(renderer.includes('shadowSystem.update(target,cameraDistance)'));
});

check('hero corridor replaces exactly three coarse source envelopes',()=>{
  assert(renderer.includes('const heroEnvelopeIds=new Set([801710792,2000032897,39598465])'));
  assert(renderer.includes('if(heroEnvelopeIds.has(Number(b.id)))'));
  for(const name of ['Nhà hát Thành phố','Hotel Continental Saigon','Caravelle Saigon'])assert(hero.includes(name));
  for(const asset of ['opera-arch-rectified-hd.jpg','continental-facade-rectified-hd.jpg','caravelle-wing-rectified-hd.jpg'])assert(hero.includes(asset));
});

check('corridor is reachable from both navigation surfaces',()=>{
  assert.equal((html.match(/data-view="corridor"/g)||[]).length,2);
  assert(renderer.includes('corridor:{target:new THREE.Vector3'));
  assert(renderer.includes("activeView==='corridor'"));
});

check('corridor PBR atlas has UV scale, four maps per surface and verified receipts',()=>{
  assert(hero.includes("geometry.setAttribute('uv1'"));
  for(const token of ["['map'","['normalMap'","['roughnessMap'","['aoMap'",'texture.channel=1','assets/pbr30/SOURCES.json'])assert(hero.includes(token),token);
  const receipt=JSON.parse(read('assets/pbr30/SOURCES.json'));
  assert.equal(receipt.license,'CC0 1.0');
  assert.equal(receipt.provider,'Poly Haven');
  assert.equal(receipt.assets.length,2);
  for(const asset of receipt.assets){
    assert.equal(asset.maps.length,4,asset.id);
    for(const map of asset.maps){
      const bytes=fs.readFileSync(path.join(root,'assets/pbr30',map.file));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),map.sha256,map.file);
    }
  }
});

check('identity facade atlas only promotes audited planar registrations',()=>{
  const manifest=JSON.parse(read('data/facades-30.json'));
  assert.equal(manifest.entries.length,20);
  assert.equal(manifest.entries.filter(entry=>entry.surface_fit?.eligible&&entry.render_mode!=='sampled_envelope').length,14);
  assert(identity.includes("entry.surface_fit?.eligible===true&&entry.render_mode!=='sampled_envelope'"));
  assert(identity.includes('HERO_IDS.has(Number(entry.building_id))'));
  assert(identity.includes("ACTIVE_VIEWS=new Set(['materials','boulevard','corridor'])"));
  for(const item of [manifest.atlas,manifest.alpha_mask]){
    const bytes=fs.readFileSync(path.join(root,item.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),item.sha256,item.file);
  }
});

check('vendored official addons and their license are present',()=>{
  for(const file of ['vendor/three186/addons/tsl/display/GTAONode.js','vendor/three186/addons/tsl/display/TRAANode.js','vendor/three186/addons/tsl/display/BloomNode.js','vendor/three186/addons/csm/CSMShadowNode.js','vendor/three186/LICENSE'])assert(fs.existsSync(path.join(root,file)),file);
});

console.log(JSON.stringify({suite:'visual-runtime-30b',passed:checks.length,checks},null,2));
