/* Library PBR + instanced foliage. Library surfaces are not observations of HCMC. */
(() => {
  'use strict';
  const bundle = window.PBR_ASSETS_14;
  if (!bundle) return;
  const state = {enabled: true, ready: false, loaded: 0, errors: [], leafTrees: 0};
  const uniforms = {enabled: {value: 0}, wallColor: {value: null}, wallRough: {value: null}};
  const loader = new T.TextureLoader();
  const textures = {};
  const originals = new Map();
  const materials = [roadMeshes.asphalt.material, roadMeshes.pedestrian.material, parkMesh.material, trunks.material, buildingMat];
  const hud = document.createElement('aside');
  hud.id = 'surface14Hud'; hud.className = 'map-hud'; hud.hidden = true;
  hud.innerHTML = `<small>POC 14 / SURFACE REALISM</small><h3>Chạm vào bề mặt thành phố</h3><div class="surface14-swatches"></div><p id="surface14Load" role="status">Đang nạp vật liệu…</p><div class="p12-actions"><button id="surface14AB" aria-pressed="true">PBR · đang bật</button><button id="surface14River">Ven sông</button></div><details><summary>Nguồn & độ thật</summary><p>Vật liệu thư viện ambientCG · CC0. Vị trí nhà, đường từ bản đồ mở. Lá và tán cây được dựng thủ tục; chưa xác định loài tại từng vị trí.</p><a href="research/visual-14/index.html" target="_blank">Mở thư viện giải pháp ↗</a></details>`;
  $('#viewport').append(hud); window.decorateMapHud(hud);
  for (const asset of bundle.manifest.assets) {
    const figure = document.createElement('figure');
    const img = document.createElement('img'); img.src = bundle.images[asset.key].color; img.alt = asset.id;
    const label = document.createElement('figcaption'); label.textContent = asset.id;
    figure.append(img, label); hud.querySelector('.surface14-swatches').append(figure);
  }
  function setPlaneUV(geometry, meters) {
    const p = geometry.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / meters; uv[i * 2 + 1] = p.getZ(i) / meters; }
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
  }
  setPlaneUV(roadMeshes.asphalt.geometry, 2.5);
  setPlaneUV(parkMesh.geometry, 2.1);
  setPlaneUV(roadMeshes.pedestrian.geometry, 2.0);
  for (const m of materials) originals.set(m, {map: m.map, normalMap: m.normalMap, roughnessMap: m.roughnessMap, normalScale: m.normalScale.clone(), roughness: m.roughness, color: m.color.clone()});
  function apply(m, set, normalScale) {
    m.map = set.color; m.normalMap = set.normal; m.roughnessMap = set.roughness;
    m.normalScale.set(normalScale, normalScale); m.roughness = 1; m.needsUpdate = true;
  }
  const previousCompile = buildingMat.onBeforeCompile;
  const previousKey = buildingMat.customProgramCacheKey.bind(buildingMat);
  buildingMat.onBeforeCompile = shader => {
    previousCompile(shader);
    shader.uniforms.uSurface14 = uniforms.enabled;
    shader.uniforms.uWall14 = uniforms.wallColor;
    shader.uniforms.uWallRough14 = uniforms.wallRough;
    shader.fragmentShader = 'uniform float uSurface14;uniform sampler2D uWall14,uWallRough14;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      vec2 wallUV14 = vSurface < .5 ? vRealityXZ / 3. : vFacade / 3.;
      vec3 wall14 = texture2D(uWall14, wallUV14).rgb;
      float opaque14 = (1. - step(1.5, vSurface)) * (1. - windowMask * .9) * uSurface14 * (1. - uAudit);
      diffuseColor.rgb *= mix(vec3(1.), mix(vec3(.64), wall14 * 1.35, .62), opaque14 * .55);
      roughnessFactor = mix(roughnessFactor, texture2D(uWallRough14, wallUV14).g * .8 + .15, opaque14);
    `);
    // Existing window shading is kept; the normal map contributes only to opaque wall/roof pixels.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      vec3 normalBefore14 = normal;
      #include <normal_fragment_maps>
      normal = normalize(mix(normalBefore14, normal, (1. - step(1.5, vSurface)) * (1. - windowMask) * uSurface14));
    `);
  };
  buildingMat.customProgramCacheKey = () => previousKey() + ':surface14';

  // Leaf cards with cutout alpha produce an irregular silhouette instead of closed polyhedra.
  // Positions reuse the existing green-polygon tree anchors; this is a botanical approximation.
  const vegetation = new T.Group(); vegetation.name = 'Surface14LeafCanopies'; scene.add(vegetation);
  const focus = xyz(106.7067, 10.7754);
  const selected = trees.map((p, i) => ({...p, i})).filter(p => Math.hypot(p.x - focus.x, p.z - focus.z) < 2300).sort((a,b)=>Math.hypot(a.x-focus.x,a.z-focus.z)-Math.hypot(b.x-focus.x,b.z-focus.z)).slice(0,1200);
  const savedFoliage = selected.map(p => { const m = new T.Matrix4(); foliage.getMatrixAt(p.i, m); return m; });
  const cardCanvas = document.createElement('canvas'); cardCanvas.width = cardCanvas.height = 128;
  const ctx = cardCanvas.getContext('2d');
  let seed14 = 419731;
  function rnd() { seed14 = (Math.imul(seed14, 1664525) + 1013904223) >>> 0; return seed14 / 4294967296; }
  for (let i = 0; i < 95; i++) {
    const a = rnd() * Math.PI * 2, radius = Math.sqrt(rnd()) * 51;
    ctx.save(); ctx.translate(64 + Math.cos(a)*radius, 64 + Math.sin(a)*radius); ctx.rotate(a);
    ctx.fillStyle = ['#638248','#769757','#54743d','#88a05e'][i%4];
    ctx.beginPath(); ctx.ellipse(0,0,5+rnd()*4,2+rnd()*2,0,0,Math.PI*2); ctx.fill(); ctx.restore();
  }
  const leafMap = new T.CanvasTexture(cardCanvas); leafMap.colorSpace = T.SRGBColorSpace;
  const leafMaterial = new T.MeshStandardMaterial({map: leafMap, alphaTest: .45, side: T.DoubleSide, roughness: .95, metalness: 0});
  const cardsPerTree = 20;
  const leaves = new T.InstancedMesh(new T.PlaneGeometry(1,1), leafMaterial, selected.length*cardsPerTree);
  const transform = new T.Object3D();
  selected.forEach((p,i) => { for(let k=0;k<cardsPerTree;k++) {
    const a = rnd()*Math.PI*2, r = Math.sqrt(rnd())*p.h*.27, y = p.h*(.55+rnd()*.37);
    transform.position.set(p.x+Math.cos(a)*r, 1+y, p.z+Math.sin(a)*r);
    transform.rotation.set((rnd()-.5)*1.7,rnd()*Math.PI, rnd()*.5);
    const s=p.h*(.31+rnd()*.16);transform.scale.set(s,s*.85,1);transform.updateMatrix();leaves.setMatrixAt(i*cardsPerTree+k,transform.matrix);
    leaves.setColorAt(i*cardsPerTree+k,new T.Color().setHSL(.24+rnd()*.035,.16,.73+rnd()*.15));
  }});
  leaves.castShadow = true; leaves.receiveShadow = true;
  leaves.customDepthMaterial = new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking,map:leafMap,alphaTest:.45,side:T.DoubleSide});
  vegetation.add(leaves); vegetation.visible = false; state.leafTrees = selected.length;
  let vegetationWasVisible = false;
  const hiddenMatrix = new T.Matrix4().makeScale(0,0,0);
  function syncVegetation(visible) {
    vegetation.visible = visible;
    if (visible === vegetationWasVisible) return;
    selected.forEach((p,i)=>foliage.setMatrixAt(p.i, visible ? hiddenMatrix : savedFoliage[i]));
    foliage.instanceMatrix.needsUpdate = true; vegetationWasVisible = visible;
  }
  function surfaceColors() {
    const night = window.currentView === 'cinematicnight';
    roadMeshes.asphalt.material.color.set(night ? '#665e52' : '#c9c6be');
    roadMeshes.pedestrian.material.color.set(night ? '#777064' : '#ded7c9');
  }
  function setEnabled(enabled) {
    state.enabled = enabled;
    if (state.ready) {
      uniforms.enabled.value = +enabled;
      if(enabled) {
        apply(roadMeshes.asphalt.material,textures.asphalt,.38); roadMeshes.asphalt.material.color.set('#c9c6be');
        apply(roadMeshes.pedestrian.material,textures.paving,.4); roadMeshes.pedestrian.material.color.set('#ded7c9');
        apply(parkMesh.material,textures.ground,.55); parkMesh.material.color.set('#acba88');
        apply(trunks.material,textures.bark,.8); trunks.material.color.set('#d5c4ae');
        buildingMat.normalMap = textures.plaster.normal; buildingMat.normalScale.set(.12,.12); buildingMat.needsUpdate=true; surfaceColors();
      } else for(const [m,old] of originals) {Object.assign(m,{map:old.map,normalMap:old.normalMap,roughnessMap:old.roughnessMap,roughness:old.roughness});m.normalScale.copy(old.normalScale);m.color.copy(old.color);m.needsUpdate=true;}
    }
    $('#surface14AB').textContent = enabled ? 'PBR · đang bật' : 'PBR · đã tắt';
    $('#surface14AB').setAttribute('aria-pressed',String(enabled));
    toggle.setAttribute('aria-pressed',String(enabled));
  }
  const toggle = document.createElement('button');toggle.id='surface14Toggle';toggle.innerHTML='◈ <span>Bề mặt PBR & lá cây</span>';toggle.setAttribute('aria-pressed','true');addVisualControl(toggle);
  toggle.onclick = () => setEnabled(!state.enabled); $('#surface14AB').onclick=toggle.onclick;
  $('#surface14River').onclick=()=>view('enrichment');
  presets.surfaces={target:xyz(106.7064,10.7754,12),distance:420,az:1.5,polar:1.23,label:'POC 14 · BỀ MẶT & CÂY XANH'};
  const viewButton=document.createElement('button');viewButton.dataset.view='surfaces';viewButton.innerHTML='<small>20</small> Bề mặt & cây xanh';$('.views').append(viewButton);
  viewButton.onclick=()=>{stopCinema();follow=false;view('surfaces');document.body.classList.add('hero-view');illumination(.22);};
  const loads=[];
  for(const [key,images] of Object.entries(bundle.images)) {
    textures[key]={};
    for(const [channel,url] of Object.entries(images)) loads.push(new Promise((resolve,reject)=> {
      loader.load(url, texture=> {
        texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        texture.colorSpace=channel==='color'?T.SRGBColorSpace:T.NoColorSpace;
        if(key==='plaster')texture.repeat.set(1/3,1/3);
        textures[key][channel]=texture;state.loaded++;resolve();
      },undefined,()=>reject(new Error(key+'/'+channel)));
    }));
  }
  Promise.all(loads).then(()=>{
    state.ready=true;uniforms.wallColor.value=textures.plaster.color;uniforms.wallRough.value=textures.plaster.roughness;
    $('#surface14Load').textContent='5 bộ PBR · 15 texture · 1.200 cây có lá';setEnabled(state.enabled);
  }).catch(error=>{state.errors.push(error.message);$('#surface14Load').textContent='Vật liệu chưa nạp đủ; đang giữ bề mặt nền.';setEnabled(false);});
  let previousNight = window.currentView === 'cinematicnight';
  window.advanceSurface14=()=>{
    const isNight = window.currentView === 'cinematicnight';
    if(isNight !== previousNight && state.enabled && state.ready) surfaceColors();
    previousNight = isNight;
    const visible=state.enabled&&state.ready&&distance<2200&&!audit;
    syncVegetation(visible);
    // Turn off overlapping PoC13 canopy clusters while the cutout canopy layer is visible.
    if(visible&&window.reality13Layers)window.reality13Layers.treeGroup.visible=false;
    hud.hidden=window.currentView!=='surfaces';
    window.surface14Status={...state,visibleLeafCards:visible?leaves.count:0,materialSets:5,textureMaps:state.loaded,source:'ambientCG CC0',classification:bundle.manifest.classification};
    const runtimeJSON=JSON.stringify(window.surface14Status);if(!window.performance16b?.optimized||hud.dataset.runtime!==runtimeJSON)hud.dataset.runtime=runtimeJSON;
  };
})();
