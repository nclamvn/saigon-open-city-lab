/* Batch 20A: photo-derived architectural hero scene at the mapped Opera House facade. */
(() => {
  'use strict';
  const q=s=>document.querySelector(s), bundle=window.FACADES_15;
  const opera=bundle?.manifest?.entries?.find(e=>e.key==='opera');
  if(!opera||!opera.strips?.length||!window.cityScene)return;
  const heroPhoto={
    asset:'assets/hero20/opera-arch-rectified-hd.jpg',
    sourceUrl:'https://commons.wikimedia.org/wiki/File:Ho_Chi_Minh_City_Opera_House.jpg',
    author:'HĐ',license:'CC BY-SA 4.0',date:'2016-11-19',
    sourcePixels:[3920,2208],texturePixels:[1600,1600],
    transform:'Four-corner perspective rectification; no inpainting or generated fill.'
  };

  const start=opera.strips[0].a,end=opera.strips[opera.strips.length-1].b;
  const front={x:(start[0]+end[0])*.5,z:(start[1]+end[1])*.5};
  const outward=new T.Vector2(opera.normal[0],opera.normal[1]).normalize();
  const angle=Math.atan2(outward.x,outward.y);
  const width=Math.hypot(end[0]-start[0],end[1]-start[1]);
  const root=new T.Group();root.name='HeroZone20A';root.position.set(front.x,1.5,front.z);root.rotation.y=angle;root.visible=false;scene.add(root);
  const shell=new T.Group();shell.name='Hero20_ArchitecturalShell';root.add(shell);
  const micro=new T.Group();micro.name='Hero20_PublicRealmLOD';root.add(micro);
  const lights=new T.Group();lights.name='Hero20_PracticalLights';root.add(lights);
  const resources={textures:[],materials:[],geometries:[],lights:[]};
  const state={ready:false,loaded:0,errors:[],active:false,mood:'golden',microVisible:false,oldOperaVisible:null};

  function material(options){const m=new T.MeshStandardMaterial(options);resources.materials.push(m);return m;}
  const stucco=material({color:'#e8dfcc',roughness:.82,metalness:.01,envMapIntensity:.42});
  const stuccoShade=material({color:'#cfc4ae',roughness:.9,metalness:0});
  const trim=material({color:'#f2eadb',roughness:.68,metalness:.015,envMapIntensity:.48});
  const stone=material({color:'#9f9789',roughness:.94,metalness:0});
  const slate=material({color:'#394348',roughness:.78,metalness:.08,envMapIntensity:.65});
  const glass=material({color:'#213a44',roughness:.2,metalness:.34,envMapIntensity:1.4});
  const darkMetal=material({color:'#293235',roughness:.34,metalness:.72,envMapIntensity:1.1});
  const wood=material({color:'#4c3327',roughness:.72,metalness:.03});
  const foliageMat=material({color:'#456a43',roughness:.94,metalness:0});
  const trunkMat=material({color:'#685343',roughness:1,metalness:0});
  const warmMat=material({color:'#ffd28b',emissive:'#ff9b42',emissiveIntensity:.9,roughness:.35});
  const peopleMats=['#c66f50','#376b78','#d4b16e','#67734d','#3a4148'].map(color=>material({color,roughness:.9}));
  function proceduralTexture(base,accent,lines){const canvas=document.createElement('canvas');canvas.width=canvas.height=192;const ctx=canvas.getContext('2d'),image=ctx.createImageData(192,192),b=new T.Color(base);for(let i=0;i<image.data.length;i+=4){const n=((i*17+i/4*13)%31-15)*.42;image.data[i]=Math.max(0,Math.min(255,b.r*255+n));image.data[i+1]=Math.max(0,Math.min(255,b.g*255+n));image.data[i+2]=Math.max(0,Math.min(255,b.b*255+n));image.data[i+3]=255;}ctx.putImageData(image,0,0);ctx.strokeStyle=accent;ctx.lineWidth=1;for(const y of lines){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(192,y);ctx.stroke();}const tex=new T.CanvasTexture(canvas);tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,3);tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());resources.textures.push(tex);return tex;}
  stucco.map=proceduralTexture('#e8dfcc','rgba(111,101,85,.13)',[48,96,144]);stucco.needsUpdate=true;
  slate.map=proceduralTexture('#394348','rgba(220,226,218,.12)',[24,48,72,96,120,144,168]);slate.needsUpdate=true;

  function mesh(geometry,mat,name,parent=shell){resources.geometries.push(geometry);const m=new T.Mesh(geometry,mat);m.name=name;m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(name,w,h,d,x,y,z,mat=stucco,parent=shell){const m=mesh(new T.BoxGeometry(w,h,d),mat,name,parent);m.position.set(x,y,z);return m;}
  function archShape(w,h,spring){const s=new T.Shape();s.moveTo(-w/2,0);s.lineTo(-w/2,spring);for(let i=0;i<=20;i++){const a=Math.PI-i*Math.PI/20;s.lineTo(Math.cos(a)*w/2,spring+Math.sin(a)*(h-spring));}s.lineTo(w/2,0);s.closePath();return s;}
  function arch(name,w,h,spring,x,y,z,mat,parent=shell){const m=mesh(new T.ShapeGeometry(archShape(w,h,spring),10),mat,name,parent);m.position.set(x,y,z);return m;}
  function roofGeometry(w,d,h){
    const p=[-w/2,0,d/2,w/2,0,d/2,-w/2,h,0,w/2,h,0,-w/2,0,-d/2,w/2,0,-d/2];
    const ids=[0,1,2,1,3,2,2,3,4,3,5,4,0,2,4,0,4,0,1,5,3,1,5,3];
    const out=[];for(const i of ids)out.push(p[i*3],p[i*3+1],p[i*3+2]);
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(out,3));g.computeVertexNormals();return g;
  }
  function instanced(name,geometry,mat,items,parent=micro){resources.geometries.push(geometry);const im=new T.InstancedMesh(geometry,mat,items.length),o=new T.Object3D();im.name=name;items.forEach((v,i)=>{o.position.set(v.x,v.y,v.z);o.rotation.set(v.rx||0,v.ry||0,v.rz||0);o.scale.set(v.sx||1,v.sy||1,v.sz||1);o.updateMatrix();im.setMatrixAt(i,o.matrix);});im.instanceMatrix.needsUpdate=true;im.castShadow=true;im.receiveShadow=true;parent.add(im);return im;}

  // The shell stays inside the 26 m envelope recorded in the facade manifest.
  box('Opera20_MainVolume',width,18.4,13.5,0,9.2,-5.9,stucco);
  box('Opera20_CentralProjection',15.5,22.4,1.45,0,11.2,.55,stucco);
  const roof=mesh(roofGeometry(width,13.9,7.2),slate,'Opera20_MansardRoof');roof.position.set(0,18.4,-5.9);
  box('Opera20_FrontMansard',width+.15,7.1,.72,0,21.95,.58,slate);
  box('Opera20_LowerPlinth',width+1,.85,1.2,0,.43,.2,stone);
  box('Opera20_MainCornice',width+.8,.55,14.2,0,18.15,-5.9,trim);
  box('Opera20_CentralCornice',16.7,.55,2.1,0,17.7,.6,trim);
  box('Opera20_Balcony',10.7,.42,2.4,0,8.1,1.55,stone);
  box('Opera20_EntranceDoor',5.3,5.1,.28,0,2.6,1.38,wood);
  box('Opera20_EntranceLintel',7.2,.42,.46,0,5.3,1.53,trim);

  // Central image is a sourced identity patch, bounded by the architecture instead of covering the entire block.
  const photoMat=material({color:'#f5eee3',roughness:.76,metalness:0,envMapIntensity:.25,polygonOffset:true,polygonOffsetFactor:-2});
  const photo=mesh(new T.PlaneGeometry(14.3,20.2),photoMat,'Opera20_SourcedIdentityPatch');photo.position.set(0,11.9,1.31);photo.visible=false;
  const loader=new T.TextureLoader();
  loader.load(heroPhoto.asset,tex=>{
    tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;tex.repeat.set(.50,.96);tex.offset.set(.49,.02);resources.textures.push(tex);photoMat.map=tex;photoMat.needsUpdate=true;state.loaded=1;state.ready=true;
  },undefined,()=>{state.errors.push('Không nạp được ảnh nhận dạng Nhà hát.');state.ready=true;});

  // Architectural relief is photo-derived and deliberately separate from the sourced pixels.
  arch('Opera20_GrandArchTrim',13.3,19.8,10.8,0,2.05,1.47,trim);
  const identityOpening=arch('Opera20_GrandArchOpening',10.8,17.4,9.4,0,2.45,1.53,photoMat);
  const identityPosition=identityOpening.geometry.attributes.position,identityUv=identityOpening.geometry.attributes.uv;
  for(let i=0;i<identityPosition.count;i++)identityUv.setXY(i,identityPosition.getX(i)/10.8+.5,identityPosition.getY(i)/17.4);
  identityUv.needsUpdate=true;
  [-5.8,-4.55,4.55,5.8].forEach((x,i)=>{
    const col=mesh(new T.CylinderGeometry(.42,.5,12.5,18),trim,'Opera20_Column_'+i);col.position.set(x,7.25,1.74);
    const capital=box('Opera20_Capital_'+i,1.25,.62,.92,x,13.65,1.64,trim);
    capital.rotation.y=0;
  });
  [-14.8,14.8].forEach((x,i)=>{
    arch('Opera20_WingWindowTrim_'+i,5.2,10.4,5.7,x,3.8,.94,trim);
    arch('Opera20_WingWindow_'+i,4.05,9.15,5.0,x,4.35,1.02,glass);
  });
  [-14.8,14.8].forEach((x,i)=>{
    const outer=mesh(new T.TorusGeometry(1.22,.22,8,28),trim,'Opera20_RoofOculusTrim_'+i);outer.position.set(x,22.3,1.02);
    const inner=mesh(new T.CircleGeometry(.94,24),glass,'Opera20_RoofOculus_'+i);inner.position.set(x,22.3,1.04);
  });
  [-20.2,-8.1,8.1,20.2].forEach((x,i)=>box('Opera20_Pilaster_'+i,.68,16.5,.72,x,8.55,1.02,trim));
  const rustication=[];for(const side of [-1,1])for(let y=1.1;y<17.1;y+=1.28)rustication.push({x:side*14.8,y,z:1.18,sx:12.3,sy:.065,sz:.15});
  instanced('Opera20_RusticationLines',new T.BoxGeometry(1,1,1),stuccoShade,rustication,shell);
  const mullions=[];for(const cx of [-14.8,14.8]){for(const dx of [-1.25,0,1.25])mullions.push({x:cx+dx,y:7.7,z:1.20,sx:.09,sy:6.6,sz:.12});for(const y of [5.6,7.4,9.2])mullions.push({x:cx,y,z:1.21,sx:3.75,sy:.09,sz:.12});}
  instanced('Opera20_WindowMullions',new T.BoxGeometry(1,1,1),trim,mullions,shell);
  [-8.7,8.7].forEach((x,i)=>{box('Opera20_ReliefPanel_'+i,2.6,6.3,.22,x,8.0,1.2,trim);const medallion=mesh(new T.TorusGeometry(.55,.10,8,24),stuccoShade,'Opera20_Medallion_'+i);medallion.position.set(x,8.7,1.34);});
  const railItems=[];for(let x=-19.7;x<=19.7;x+=1.18)railItems.push({x,y:17.35,z:1.12,sx:.13,sy:1.05,sz:.18});
  instanced('Opera20_Balustrade',new T.BoxGeometry(1,1,1),trim,railItems,shell);
  box('Opera20_BalustradeTop',40.3,.24,.48,0,17.95,1.12,trim);
  const crest=mesh(new T.TorusGeometry(.72,.16,10,28),trim,'Opera20_Crest');crest.position.set(0,25.05,1.42);
  const crestCore=mesh(new T.CircleGeometry(.47,20),stuccoShade,'Opera20_CrestCore');crestCore.position.set(0,25.05,1.43);
  [-1,1].forEach((side,i)=>{const wing=mesh(new T.ConeGeometry(.45,2.1,4),trim,'Opera20_CrestWing_'+i);wing.position.set(side*1.18,24.7,1.34);wing.rotation.z=side*.62;});
  const stepWidths=[12.8,15.5,18.4];stepWidths.forEach((w,i)=>box('Opera20_Step_'+i,w,.28,1.1+i*.65,0,.14+i*.28,2.2+i*.62,stone));

  // Forecourt proxy: small-scale cues only. Positions are illustrative and do not claim surveyed public-realm layout.
  const pavingCanvas=document.createElement('canvas');pavingCanvas.width=pavingCanvas.height=256;const pc=pavingCanvas.getContext('2d');pc.fillStyle='#aaa497';pc.fillRect(0,0,256,256);pc.strokeStyle='rgba(67,72,70,.16)';pc.lineWidth=2;for(let y=0;y<256;y+=32){pc.beginPath();pc.moveTo(0,y);pc.lineTo(256,y);pc.stroke();}for(let x=0;x<256;x+=64){pc.beginPath();pc.moveTo(x,0);pc.lineTo(x,256);pc.stroke();}
  const pavingTex=new T.CanvasTexture(pavingCanvas);pavingTex.wrapS=pavingTex.wrapT=T.RepeatWrapping;pavingTex.repeat.set(8,2);resources.textures.push(pavingTex);
  const pavingMat=material({map:pavingTex,color:'#bcb6a9',roughness:.96,metalness:0});box('Opera20_ForecourtProxy',58,.16,10,0,-.05,7.2,pavingMat,micro);
  const bollards=[];for(const x of [-25,-20,-15,-10,10,15,20,25])bollards.push({x,y:.58,z:12,sx:.22,sy:1.15,sz:.22});
  instanced('Opera20_Bollards',new T.CylinderGeometry(1,1,1,10),darkMetal,bollards);
  const lampPosts=[];for(const x of [-24,-12,12,24])lampPosts.push({x,y:3.1,z:10.7,sx:.10,sy:6.2,sz:.10});
  instanced('Opera20_LampPosts',new T.CylinderGeometry(1,1,1,10),darkMetal,lampPosts);
  const lampGlobes=[];for(const x of [-24,-12,12,24])lampGlobes.push({x,y:6.35,z:10.7,sx:.32,sy:.32,sz:.32});
  instanced('Opera20_LampGlobes',new T.SphereGeometry(1,10,8),warmMat,lampGlobes,lights);
  [-24,-12,12,24].forEach((x,i)=>{const p=new T.PointLight('#ffc279',0,25,2);p.name='Opera20_Practical_'+i;p.position.set(x,6.2,10.7);p.castShadow=false;lights.add(p);resources.lights.push(p);});

  const treePositions=[[-28,13,7.4],[-20,15,6.5],[20,15,6.7],[28,13,7.6]];
  const trunksData=treePositions.map(([x,z,h])=>({x,y:h*.36,z,sx:.36,sy:h*.72,sz:.36}));
  const canopyData=treePositions.map(([x,z,h],i)=>({x,y:h*.83,z,sx:2.5+i%2*.35,sy:3.1,sz:2.35}));
  instanced('Opera20_TreeTrunks',new T.CylinderGeometry(1,1,1,9),trunkMat,trunksData);
  instanced('Opera20_TreeCanopies',new T.IcosahedronGeometry(1,2),foliageMat,canopyData);
  const benches=[];for(const x of [-18,18])benches.push({x,y:.62,z:8.9,sx:3.5,sy:.22,sz:.72});
  instanced('Opera20_Benches',new T.BoxGeometry(1,1,1),wood,benches);
  const persons=[];for(let i=0;i<18;i++){const side=i%2?-1:1;persons.push({x:side*(3.2+(i%6)*3.1),y:1.05,z:4.5+(i%4)*1.65,sx:.27,sy:1.45+(i%3)*.12,sz:.27});}
  const peopleByMaterial=peopleMats.map(()=>[]);persons.forEach((p,i)=>peopleByMaterial[i%peopleMats.length].push(p));peopleByMaterial.forEach((items,i)=>{
    instanced('Opera20_PeopleBody_'+i,new T.CylinderGeometry(.34,.24,1.5,8),peopleMats[i],items.map(p=>({...p,y:p.y-.12})));
    instanced('Opera20_PeopleHead_'+i,new T.SphereGeometry(.32,8,6),stuccoShade,items.map(p=>({...p,y:p.y+1.02,sx:.32,sy:.32,sz:.32})));
  });

  const hud=document.createElement('aside');hud.id='hero20Hud';hud.hidden=true;hud.innerHTML=`
    <small>HERO ZONE · 20A</small><h2>Nhà hát Thành phố</h2>
    <p>Hình học nổi suy diễn từ ảnh, neo vào footprint và trục mặt đứng có nguồn.</p>
    <div class="hero20-moods" aria-label="Ánh sáng cảnh hero"><button data-hero-mood="day">Ngày</button><button data-hero-mood="golden" aria-pressed="true">Giờ vàng</button><button data-hero-mood="blue">Chạng vạng</button></div>
    <details><summary>Nguồn & giới hạn</summary><p>${heroPhoto.author} · ${heroPhoto.license} · ${heroPhoto.date}</p><p>Ảnh gốc ${heroPhoto.sourcePixels[0].toLocaleString('vi-VN')}×${heroPhoto.sourcePixels[1].toLocaleString('vi-VN')} px; texture hiệu chỉnh ${heroPhoto.texturePixels[0].toLocaleString('vi-VN')} px.</p><p>Chiều sâu kiến trúc và bố trí chi tiết là photo-derived approximation; sân, đèn, cây và người là minh họa tỷ lệ.</p><a href="${heroPhoto.sourceUrl}" target="_blank" rel="noreferrer">Mở ảnh nguồn ↗</a></details>`;
  q('#viewport').append(hud);
  function mood(name){state.mood=name;const v={day:.08,golden:.46,blue:.78}[name]??.46;if(typeof illumination==='function')illumination(v);hud.querySelectorAll('[data-hero-mood]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heroMood===name)));}
  hud.querySelectorAll('[data-hero-mood]').forEach(b=>b.onclick=()=>mood(b.dataset.heroMood));

  // The mapped Continental footprint blocks a distant perpendicular sightline; the camera stays in the street gap and uses a wide lens.
  const baseFov=camera.fov;
  presets.hero20={target:new T.Vector3(front.x,12,front.z),distance:17,az:angle,polar:1.45,label:'HERO ZONE · NHÀ HÁT THÀNH PHỐ'};
  const viewButton=document.createElement('button');viewButton.dataset.view='hero20';viewButton.innerHTML='<small>25</small> Hero Zone · Nhà hát';q('.views').append(viewButton);
  viewButton.onclick=()=>{if(typeof stopCinema==='function')stopCinema();if(typeof follow!=='undefined')follow=false;if(typeof tour!=='undefined')tour=false;view('hero20');document.body.classList.add('hero-view','hero20-active');document.querySelectorAll('.map-hud').forEach(h=>h.hidden=true);mood('golden');const url=new URL(location.href);url.searchParams.set('v','20a');url.searchParams.set('view','hero20');url.searchParams.delete('facade');history.replaceState(null,'',url);};

  const statusOut=document.createElement('output');statusOut.id='hero20Status';statusOut.hidden=true;hud.append(statusOut);
  function countTriangles(object){let total=0;object.traverse(o=>{const p=o.geometry?.attributes?.position?.count||0;total+=o.geometry?.index?o.geometry.index.count/3:p/3;});return Math.round(total);}
  function countDrawables(object){let total=0;object.traverse(o=>{if(o.isMesh)total++;});return total;}
  function advance(){
    const exact=window.currentView==='hero20',cluster=['district20','continental20','caravelle20','lamson20','dongkhoi20'].includes(window.currentView),active=exact||cluster;state.active=active;root.visible=active&&distance<900;state.microVisible=root.visible&&distance<230;micro.visible=state.microVisible;lights.visible=state.microVisible;
    // Batch 20B owns the lens for its five cluster views. Avoid two modules
    // pulling the same camera FOV toward different values every frame.
    if(exact||!cluster){const wantedFov=exact?(camera.aspect<1?100:72):baseFov;if(Math.abs(camera.fov-wantedFov)>.05){camera.fov+=(wantedFov-camera.fov)*.16;camera.updateProjectionMatrix();}}
    const twilight=Math.max(0,(typeof lightValue==='number'?lightValue:.46)-.52)/.48;warmMat.emissiveIntensity=.35+twilight*2.2;resources.lights.forEach(l=>l.intensity=twilight*10);
    const oldOpera=window.photoFacadeResources15?.group?.getObjectByName('Facade15_opera');if(oldOpera){if(state.oldOperaVisible===null)state.oldOperaVisible=oldOpera.visible;oldOpera.visible=!active&&state.oldOperaVisible;}
    hud.hidden=!exact||document.body.classList.contains('executive-story-active');document.body.classList.toggle('hero20-active',active);
    window.heroZone20Status={version:'20a-hd1',active,ready:state.ready,anchor:'Nhà hát Thành phố',mappedBuildingId:opera.building_id,sourcePhoto:{url:heroPhoto.sourceUrl,author:heroPhoto.author,license:heroPhoto.license,date:heroPhoto.date,sourcePixels:heroPhoto.sourcePixels,texturePixels:heroPhoto.texturePixels,transform:heroPhoto.transform},envelopeHeightM:opera.height_m,envelopeWidthM:+width.toFixed(2),classification:{position:'open_data_mapped_facade',identityPatch:'sourced_site_photo',architecture:'photo_derived_approximation',publicRealm:'illustrative_proxy',lighting:'illustrative_cinematic'},planningGeometryEnabled:false,lod:{microVisible:state.microVisible,microCutoffM:230,heroCutoffM:900},camera:{distanceM:17,fovDegrees:+camera.fov.toFixed(1),reason:'camera placed inside mapped street gap before Continental footprint'},topLevelGroups:root.children.length,drawables:countDrawables(root),triangles:countTriangles(root),errors:state.errors};statusOut.dataset.json=JSON.stringify(window.heroZone20Status);
  }
  window.advanceHero20=advance;window.heroZone20={root,mood,focus:()=>viewButton.click(),metadata:()=>window.heroZone20Status};
})();
