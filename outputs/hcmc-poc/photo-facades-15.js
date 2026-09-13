/* Site photographs on mapped facade strips. Geometry is an explicit approximation. */
(() => {
  'use strict';
  const bundle = window.FACADES_15;
  if (!bundle) return;
  const entries = bundle.manifest.entries;
  const group = new T.Group(); group.name = 'PhotoFacades15'; scene.add(group);
  const state = {enabled:true, ready:false, loaded:0, selected:0, errors:[]};
  const meshes = [], centers = [], heightEdits = [];
  const eligible = e => e.surface_fit?.eligible === true;
  const acceptedCount = entries.filter(eligible).length;
  const p = bg.attributes.position;
  const envelope = new Float32Array(p.count), envelopeOn={value:0},envelopeAtlas={value:null};
  const envelopeEntry=entries.find(e=>e.envelope_parts?.length),envelopeRect={value:new T.Vector4(...envelopeEntry.atlas_rect)};
  const overrides = new Map();
  for(const e of entries.filter(eligible)) {
    if(e.height_override) overrides.set(e.building_id,e.height_m);
    for(const part of e.envelope_parts||[]) overrides.set(part.building_id,part.meters);
  }
  // Preserve the original survey-confidence layer. A documented height is a reversible visual override.
  for (const [id,height] of overrides) {
    const bi = D.buildings.findIndex(b => b.id === id);
    if(bi<0||D.buildings[bi].q==='podium') {state.errors.push('Rejected height target '+id);continue;}
    const b=D.buildings[bi],start = bi ? faceEnds[bi-1]*3 : 0, end = faceEnds[bi]*3;
    const original = new Float32Array(end-start), adjusted = new Float32Array(end-start);
    for (let i=start;i<end;i++) {original[i-start]=p.getY(i);adjusted[i-start]=1.5+(p.getY(i)-1.5)*height/b.h;}
    const originalUV=new Float32Array(end-start),adjustedUV=new Float32Array(end-start);
    for(let i=start;i<end;i++){originalUV[i-start]=bg.attributes.uv.getY(i);adjustedUV[i-start]=originalUV[i-start]===0?0:1.5+(originalUV[i-start]-1.5)*height/b.h;}
    heightEdits.push({start,end,original,adjusted,originalUV,adjustedUV});
    if(entries.some(e=>(e.envelope_parts||[]).some(part=>part.building_id===id))) envelope.fill(1,start,end);
  }
  // Upper unseen surfaces use a declared procedural frame/glass material, not another photograph.
  bg.setAttribute('envelope15',new T.BufferAttribute(envelope,1));
  const previousCompile=buildingMat.onBeforeCompile;
  buildingMat.onBeforeCompile=shader=>{
    previousCompile(shader);shader.uniforms.uEnvelope15=envelopeOn;shader.uniforms.uEnvelopeAtlas15=envelopeAtlas;shader.uniforms.uEnvelopeRect15=envelopeRect;
    shader.vertexShader='attribute float envelope15;varying float vEnvelope15;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvEnvelope15=envelope15;');
    shader.fragmentShader='uniform float uEnvelope15;uniform sampler2D uEnvelopeAtlas15;uniform vec4 uEnvelopeRect15;varying float vEnvelope15;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`if(uEnvelope15>.5&&vEnvelope15>.5&&vSurface>.5){vec2 q=fract(vec2(vFacade.x,vFacade.y)/vec2(80.,144.));q=1.-abs(q*2.-1.);diffuseColor.rgb=texture2D(uEnvelopeAtlas15,uEnvelopeRect15.xy+q*uEnvelopeRect15.zw).rgb;}
#include <roughnessmap_fragment>`);
  };buildingMat.needsUpdate=true;
  let heightsActive = false,geometryChecks={};
  function syncHeights(active) {
    if (active === heightsActive) return;
    for (const h of heightEdits) for (let i=h.start;i<h.end;i++) {p.setY(i,(active?h.adjusted:h.original)[i-h.start]);bg.attributes.uv.setY(i,(active?h.adjustedUV:h.originalUV)[i-h.start]);}
    if (heightEdits.length) {p.needsUpdate=true;bg.attributes.uv.needsUpdate=true; bg.computeBoundingBox();bg.computeBoundingSphere();bg.computeVertexNormals();}
    heightsActive=active;envelopeOn.value=active?1:0;
    const parent=D.buildings.findIndex(b=>b.id===envelopeEntry.parent_building_id),from=parent?faceEnds[parent-1]*3:0,to=faceEnds[parent]*3;
    let parentTop=0,uvAligned=true,restored=true;
    for(let i=from;i<to;i++)parentTop=Math.max(parentTop,p.getY(i)-1.5);
    for(const h of heightEdits)for(let i=h.start;i<h.end;i++){
      if(h.originalUV[i-h.start]>0&&Math.abs(p.getY(i)-bg.attributes.uv.getY(i))>.001)uvAligned=false;
      if(!active&&(p.getY(i)!==h.original[i-h.start]||bg.attributes.uv.getY(i)!==h.originalUV[i-h.start]))restored=false;
    }
    geometryChecks={podiumHeight:parentTop,heightUVAligned:uvAligned,baselineRestored:!active?restored:null};
  }
  const material = new T.MeshStandardMaterial({color:'#ffffff',roughness:.86,metalness:0,envMapIntensity:.25,alphaTest:.45,side:T.DoubleSide});
  window.photoFacadeResources15={material,group};
  const trimMat = new T.MeshStandardMaterial({color:'#bdb5a5',roughness:.82,metalness:.03});
  const relief = [];
  entries.forEach((e,index) => {
    const positions=[],uvs=[],startY=1.5+e.height_m*e.vertical[0],endY=1.5+e.height_m*e.vertical[1];
    const rect=e.atlas_rect, mid=[0,0];
    for(const strip of e.strips) {
      const n=strip.normal,range=e.horizontal||[0,1],lo=Math.max(range[0],strip.u0),hi=Math.min(range[1],strip.u1);if(hi<=lo)continue;
      const blend=u=>{const t=(u-strip.u0)/(strip.u1-strip.u0);return [strip.a[0]+(strip.b[0]-strip.a[0])*t,strip.a[1]+(strip.b[1]-strip.a[1])*t]};
      const a=blend(lo),b=blend(hi),w=(hi-lo)/(range[1]-range[0]);
      mid[0]+=(a[0]+b[0])*.5*w;mid[1]+=(a[1]+b[1])*.5*w;
      const f0=(lo-range[0])/(range[1]-range[0]),f1=(hi-range[0])/(range[1]-range[0]);const u0=e.reverse_u?1-f0:f0,u1=e.reverse_u?1-f1:f1;
      const v=[[a[0]+n[0]*.16,startY,a[1]+n[1]*.16],[b[0]+n[0]*.16,startY,b[1]+n[1]*.16],[a[0]+n[0]*.16,endY,a[1]+n[1]*.16],[b[0]+n[0]*.16,endY,b[1]+n[1]*.16]];
      const tex=[[rect[0]+rect[2]*u0,rect[1]],[rect[0]+rect[2]*u1,rect[1]],[rect[0]+rect[2]*u0,rect[1]+rect[3]],[rect[0]+rect[2]*u1,rect[1]+rect[3]]];
      for(const j of [0,1,2,1,3,2]) {positions.push(...v[j]);uvs.push(...tex[j]);}
      if(eligible(e)&&e.relief!=='none') {
        const length=Math.hypot(b[0]-a[0],b[1]-a[1]),angle=-Math.atan2(b[1]-a[1],b[0]-a[0]);
        const floors=Math.min(e.rows,9);
        for(const fraction of (e.relief==='balcony'?Array.from({length:floors+1},(_,row)=>row/floors):[0,1])) relief.push({index,x:(a[0]+b[0])*.5+n[0]*.24,z:(a[1]+b[1])*.5+n[1]*.24,y:startY+(endY-startY)*fraction,length,angle,depth:e.relief==='balcony'?.65:.26});
      }
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.name='Facade15_'+e.key;mesh.receiveShadow=true;mesh.userData.facadeIndex=index;mesh.visible=eligible(e)&&e.render_mode!=='sampled_envelope';group.add(mesh);meshes.push(mesh);
    centers.push({x:mid[0],z:mid[1],y:(startY+endY)/2,height:endY-startY});
  });
  const trim=new T.InstancedMesh(new T.BoxGeometry(1,1,1),trimMat,relief.length),dummy=new T.Object3D();
  relief.forEach((r,i)=>{dummy.position.set(r.x,r.y,r.z);dummy.rotation.set(0,r.angle,0);dummy.scale.set(r.length,.10,r.depth);dummy.updateMatrix();trim.setMatrixAt(i,dummy.matrix);});trim.castShadow=true;trim.receiveShadow=true;group.add(trim);
  const hud=document.createElement('aside');hud.id='facade15Hud';hud.className='map-hud';hud.hidden=true;
  hud.innerHTML='<small>POC 15 / PHOTO FACADE LAB</small><h3>Nhận diện từng công trình</h3><label for="facade15Select">Mặt đứng <span id="facade15Count"></span></label><select id="facade15Select"></select><div class="p12-actions"><button id="facade15Prev" aria-label="Công trình trước">← Trước</button><button id="facade15Next" aria-label="Công trình tiếp">Tiếp →</button></div><button id="facade15AB" aria-pressed="true">Ảnh mặt đứng · đang bật</button><details id="facade15Source"><summary>Ảnh đối chiếu & nguồn</summary><img id="facade15Reference" alt="Ảnh đối chiếu đúng công trình"><p id="facade15Credit"></p><a id="facade15Original" target="_blank" rel="noreferrer">Ảnh gốc & giấy phép ↗</a><p id="facade15Geometry"></p><p>Vùng ảnh có nguồn; hình học và độ sâu gần đúng. Ảnh khác thời điểm, chưa phải hiện trạng đã khảo sát.</p><a href="research/facades-15/index.html" target="_blank" rel="noreferrer">Xem đủ 20 mặt đứng ↗</a></details><p id="facade15Load" role="status">Đang nạp atlas…</p>';
  $('#viewport').append(hud);window.decorateMapHud(hud);
  const select=$('#facade15Select');
  entries.forEach((e,i)=>{const option=document.createElement('option');option.value=e.key;option.textContent=String(i+1).padStart(2,'0')+' · '+e.name+(eligible(e)?'':' · chờ tách mặt');select.append(option);});
  function updateSource() {
    const e=entries[state.selected];select.value=e.key;$('#facade15Count').textContent=(state.selected+1)+' / '+entries.length;
    $('#facade15Reference').src=bundle.references[e.key];$('#facade15Credit').textContent=e.photo_date+' · '+e.author+' · '+e.license;
    $('#facade15Original').href=e.source_url;$('#facade15Geometry').textContent=e.height_override?'Chiều cao hiển thị '+e.height_m+' m · '+e.height_override.basis:'Chiều cao và hình khối giữ theo mô hình nền; chưa đo kiểm.';
    if(!eligible(e)) $('#facade15Geometry').textContent='Chưa phủ ảnh: '+e.surface_fit.reason;
    if(e.detail_texture) $('#facade15Geometry').textContent=e.inferred;
    if(e.render_mode==='sampled_envelope') $('#facade15Geometry').textContent='Vỏ tháp chia theo bộ phận, vật liệu cửa lấy mẫu từ ảnh và lặp có kiểm soát. Không phải ảnh phủ đúng từng ô cửa. Đế giữ 9 m; cao độ bậc mái ước lượng.';
    $('#facade15Load').textContent=eligible(e)?'14 mặt đứng · 1 vỏ tháp · 5 chờ tách mặt':'Giữ hình khối nền · ảnh chỉ dùng để đối chiếu';
  }
  function clearCamera(e,c,wanted) {
    const own=new Set([e.building_id,e.parent_building_id,...(e.envelope_parts||[]).map(part=>part.building_id)]);
    const nearby=D.buildings.filter(b=>!own.has(b.id)&&Math.hypot(b.center[0]-c.x,b.center[1]-c.z)<wanted+180).map(b=>({ring:b.r[0],h:overrides.get(b.id)||b.h,x0:Math.min(...b.r[0].map(p=>p[0])),x1:Math.max(...b.r[0].map(p=>p[0])),z0:Math.min(...b.r[0].map(p=>p[1])),z1:Math.max(...b.r[0].map(p=>p[1]))}));
    const poses=[[wanted,1.38],[wanted,1.05],[wanted,.78],[wanted,.58],[wanted*.60,1.38],[wanted*.38,1.3],[wanted*.22,1.2]];
    for(const [d,p] of poses) {
      let blocked=false;
      for(let i=1;i<=24&&!blocked;i++) {
        const t=i/24,x=c.x+e.normal[0]*d*Math.sin(p)*t,z=c.z+e.normal[1]*d*Math.sin(p)*t,y=c.y+d*Math.cos(p)*t;
        blocked=nearby.some(b=>y<b.h+2&&x>b.x0&&x<b.x1&&z>b.z0&&z<b.z1&&contains([x,z],b.ring));
      }
      if(!blocked)return {distance:d,polar:p};
    }
    return {distance:wanted*.18,polar:1.1};
  }
  function focus(index,navigate=true) {
    state.selected=(index+entries.length)%entries.length;const e=entries[state.selected],c=centers[state.selected];
    if(e.envelope_parts?.length){c.y=1.5+Math.max(...e.envelope_parts.map(part=>part.meters))*.52;c.height=Math.max(...e.envelope_parts.map(part=>part.meters));}
    const pose=e.envelope_parts?.length?{distance:440,polar:1.05}:clearCamera(e,c,e.focus_distance||Math.max(65,Math.max(c.height,e.width_m*(e.horizontal?e.horizontal[1]-e.horizontal[0]:1)*.7)*1.9));
    presets.facades={target:new T.Vector3(c.x,c.y,c.z),...pose,az:Math.atan2(e.normal[0],e.normal[1]),label:e.name.toLocaleUpperCase('vi-VN')+' · ẢNH MẶT ĐỨNG'};
    updateSource();
    if(navigate) {hud.dataset.cameraSettled='false';stopCinema();follow=false;tour=false;view('facades');document.body.classList.add('hero-view');illumination(.18);const url=new URL(location.href);url.searchParams.set('view','facades');url.searchParams.set('facade',e.key);history.replaceState(null,'',url);}
  }
  select.onchange=()=>focus(entries.findIndex(e=>e.key===select.value));
  $('#facade15Prev').onclick=()=>focus(state.selected-1);$('#facade15Next').onclick=()=>focus(state.selected+1);
  function setEnabled(on) {state.enabled=on;$('#facade15AB').textContent=on?'Ảnh mặt đứng · đang bật':'Ảnh mặt đứng · đã tắt';$('#facade15AB').setAttribute('aria-pressed',String(on));toggle.setAttribute('aria-pressed',String(on));}
  $('#facade15AB').onclick=()=>setEnabled(!state.enabled);
  const toggle=document.createElement('button');toggle.id='facade15Toggle';toggle.innerHTML='▣ <span>Mặt đứng từ ảnh địa điểm</span>';toggle.setAttribute('aria-pressed','true');addVisualControl(toggle);toggle.onclick=()=>setEnabled(!state.enabled);
  const viewButton=document.createElement('button');viewButton.dataset.view='facades';viewButton.innerHTML='<small>21</small> 20 mặt đứng từ ảnh';$('.views').append(viewButton);viewButton.onclick=()=>focus(state.selected);
  let initial=entries.findIndex(e=>e.key===new URLSearchParams(location.search).get('facade'));focus(initial<0?3:initial,false);
  // Credits travel in the offline bundle, separately from the attribution on the external file pages.
  const credits=document.createElement('details');credits.className='facade15-credits';credits.innerHTML='<summary>Ảnh mặt đứng · nguồn và giấy phép</summary>';
  for(const e of entries){const row=document.createElement('p'),a=document.createElement('a');a.href=e.source_url;a.target='_blank';a.rel='noreferrer';a.textContent=e.name+' — '+e.author+' · '+e.license+' · '+e.photo_date;row.append(a);credits.append(row);}
  const infoPanel=document.querySelector('#research .tabbody')||document.querySelector('.intro');infoPanel?.append(credits);
  const loader=new T.TextureLoader();
  function load(url,color){return new Promise((resolve,reject)=>loader.load(url,t=>{t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());state.loaded++;resolve(t);},undefined,()=>reject(new Error('atlas decode failed'))));}
  Promise.all([load(bundle.color,true),load(bundle.mask,false)]).then(([map,mask])=>{material.map=map;material.alphaMap=mask;envelopeAtlas.value=map;material.needsUpdate=true;state.ready=true;updateSource();}).catch(e=>{state.errors.push(e.message);state.enabled=false;$('#facade15Load').textContent='Atlas chưa nạp đủ; giữ khối nền.';});
  window.advanceFacades15=()=>{
    const active=state.enabled&&state.ready&&!audit;
    group.visible=active&&distance<2500;syncHeights(active);
    hud.hidden=window.currentView!=='facades';hud.dataset.cameraSettled=String(!desired);document.body.classList.toggle('facade15-active',!hud.hidden);
    const e=entries[state.selected];
    window.facade15Status={version:bundle.manifest.version,enabled:state.enabled,ready:state.ready,loaded:state.loaded,facades:entries.length,accepted:acceptedCount,held:entries.length-acceptedCount,selected:e.key,selectedEligible:eligible(e),renderMode:e.render_mode||'photo_patch',visible:group.visible&&eligible(e),heightOverridesActive:heightsActive,heightOverrides:heightEdits.length,geometryChecks,errors:state.errors,classification:bundle.manifest.classification};const runtimeJSON=JSON.stringify(window.facade15Status);if(!window.performance16b?.optimized||hud.dataset.runtime!==runtimeJSON)hud.dataset.runtime=runtimeJSON;
  };
})();
