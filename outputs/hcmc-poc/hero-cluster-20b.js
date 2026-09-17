/* Batch 20B: sourced architectural cluster around Opera House, Lam Son and Dong Khoi. */
(() => {
  'use strict';
  const q=s=>document.querySelector(s), D=window.CITY_DATA, bundle=window.FACADES_15;
  if(!D||!bundle||!window.cityScene)return;
  const entries=Object.fromEntries(bundle.manifest.entries.filter(e=>['opera','continental','caravelle'].includes(e.key)).map(e=>[e.key,e]));
  if(!entries.continental||!entries.caravelle)return;

  const sources={
    continental:{url:'https://commons.wikimedia.org/wiki/File:Hotel_Continental_Saigon_(53668610570).jpg',author:'Hans Brian Brandsberg Berg',license:'CC BY 2.0',date:'2018-12-30',sourcePixels:[5472,3648],texturePixels:[2048,2048],asset:'assets/hero20b/continental-facade-rectified-hd.jpg',reference:'assets/hero20b/continental-reference.jpg'},
    caravelle:{url:'https://commons.wikimedia.org/wiki/File:Caravelle_Hotel_Saigon_2013-02.jpg',author:'BaonguyenCaravelas',license:'CC BY-SA 4.0',date:'2014-02-18',sourcePixels:[3385,5000],texturePixels:[1600,1600],asset:'assets/hero20b/caravelle-wing-rectified-hd.jpg',reference:'assets/hero20b/caravelle-reference.jpg'},
    corridor:{url:'https://commons.wikimedia.org/wiki/File:Streetview_of_Dong_Khoi_Street_and_Lam_Son_Square_in_Ho_Chi_Minh_City.jpg',author:'HĐ',license:'CC BY-SA 4.0',date:'2016-11-19',sourcePixels:[3920,2208],reference:'assets/hero20b/lamson-dongkhoi-reference.jpg'}
  };
  const roadIds={lamson:[35112941,35114970,287132223],dongkhoi:[1278461438,1278461439,1343964589]};
  const official={caravelleStoreys:24,url:'https://www.caravellehotel.com/memoirs-of-the-caravelle/',derivation:'24 storeys × 3.2 m display rule = 76.8 m; not surveyed'};
  const activeViews=new Set(['district20','continental20','caravelle20','lamson20','dongkhoi20']);
  const root=new T.Group();root.name='HeroCluster20B';root.visible=false;scene.add(root);
  const architecture=new T.Group();architecture.name='Hero20B_Architecture';root.add(architecture);
  const publicRealm=new T.Group();publicRealm.name='Hero20B_PublicRealm';root.add(publicRealm);
  const motion=new T.Group();motion.name='Hero20B_RoadMotion';root.add(motion);
  const resources={textures:[],materials:[],geometries:[]},state={active:false,ready:false,loaded:0,errors:[],tour:false,tourElapsed:0,tourIndex:0,mood:'golden',oldVisibility:{}};
  const mat=o=>{const m=new T.MeshStandardMaterial(o);resources.materials.push(m);return m;};
  const cream=mat({color:'#d9c8ab',roughness:.75,metalness:.02,envMapIntensity:.5}),white=mat({color:'#eee7da',roughness:.65,metalness:.02}),dark=mat({color:'#29383c',roughness:.28,metalness:.55,envMapIntensity:1.2}),glass=mat({color:'#243b40',roughness:.16,metalness:.38,envMapIntensity:1.35}),stone=mat({color:'#9b9588',roughness:.92}),asphalt=mat({color:'#3f484a',roughness:.92}),paving=mat({color:'#a49c8e',roughness:.9}),foliage=mat({color:'#3c6642',roughness:.95}),trunk=mat({color:'#655243',roughness:1}),warm=mat({color:'#ffd49a',emissive:'#ff9b45',emissiveIntensity:.2,roughness:.35}),carMats=['#7e2822','#1f5964','#d9d3c2','#273035','#b5903d'].map(color=>mat({color,metalness:.48,roughness:.35}));
  function mesh(g,m,name,parent=architecture){resources.geometries.push(g);const x=new T.Mesh(g,m);x.name=name;x.castShadow=true;x.receiveShadow=true;parent.add(x);return x;}
  function box(name,w,h,d,x,y,z,m=cream,parent=architecture){const o=mesh(new T.BoxGeometry(w,h,d),m,name,parent);o.position.set(x,y,z);return o;}
  function instance(name,g,m,items,parent=architecture){resources.geometries.push(g);const im=new T.InstancedMesh(g,m,items.length),o=new T.Object3D();im.name=name;items.forEach((v,i)=>{o.position.set(v.x,v.y,v.z);o.rotation.set(v.rx||0,v.ry||0,v.rz||0);o.scale.set(v.sx||1,v.sy||1,v.sz||1);o.updateMatrix();im.setMatrixAt(i,o.matrix);});im.instanceMatrix.needsUpdate=true;im.castShadow=true;im.receiveShadow=true;parent.add(im);return im;}
  function facadeFrame(entry,name){const a=entry.strips[0].a,b=entry.strips[entry.strips.length-1].b,n=new T.Vector2(entry.normal[0],entry.normal[1]).normalize();return {name,entry,x:(a[0]+b[0])*.5,z:(a[1]+b[1])*.5,width:Math.hypot(b[0]-a[0],b[1]-a[1]),normal:n,angle:Math.atan2(n.x,n.y)};}
  const continental=facadeFrame(entries.continental,'continental'),caravelle=facadeFrame(entries.caravelle,'caravelle');
  function localRoot(frame,name){const group=new T.Group();group.name=name;group.position.set(frame.x,1.45,frame.z);group.rotation.y=frame.angle;architecture.add(group);return group;}
  function loadTexture(source,onload){new T.TextureLoader().load(source.asset,tex=>{tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(12,renderer.capabilities.getMaxAnisotropy());tex.wrapS=tex.wrapT=T.ClampToEdgeWrapping;resources.textures.push(tex);state.loaded++;onload(tex);if(state.loaded===2)state.ready=true;},undefined,()=>{state.errors.push('Không nạp được '+source.asset);state.ready=true;});}
  function signTexture(text){const c=document.createElement('canvas');c.width=1024;c.height=128;const x=c.getContext('2d');x.clearRect(0,0,c.width,c.height);x.font='600 68px Arial';x.textAlign='center';x.textBaseline='middle';x.fillStyle='#f2d29e';x.shadowColor='rgba(238,156,61,.8)';x.shadowBlur=18;x.fillText(text,c.width/2,c.height/2);const tex=new T.CanvasTexture(c);tex.encoding=T.sRGBEncoding;resources.textures.push(tex);return tex;}

  // Continental: mapped 24 m envelope, source photo bounded by projecting facade relief.
  const conRoot=localRoot(continental,'Continental20B');
  box('Continental_Main',continental.width,22.6,15,0,11.3,-6.8,cream,conRoot);
  box('Continental_Plinth',continental.width+.5,1.1,15.6,0,.55,-6.8,stone,conRoot);
  box('Continental_Cornice',continental.width+.7,.55,15.7,0,21.6,-6.8,white,conRoot);
  box('Continental_Canopy',continental.width*.82,.4,3.2,0,5.0,1.0,dark,conRoot);
  const conPhotoMat=mat({color:'#f8f1e6',roughness:.66,polygonOffset:true,polygonOffsetFactor:-2});
  const conPhoto=mesh(new T.PlaneGeometry(continental.width*.93,20.2),conPhotoMat,'Continental_SourcedFacade',conRoot);conPhoto.position.set(0,11.2,1.05);
  loadTexture(sources.continental,tex=>{conPhotoMat.map=tex;conPhotoMat.needsUpdate=true;});
  const conPilasters=[];for(let x=-continental.width*.44;x<=continental.width*.44;x+=continental.width/10)conPilasters.push({x,y:12.3,z:1.25,sx:.38,sy:18.4,sz:.42});
  instance('Continental_Pilasters',new T.BoxGeometry(1,1,1),white,conPilasters,conRoot);
  const conRails=[];for(const y of [8.3,15.4,21.0])conRails.push({x:0,y,z:1.3,sx:continental.width*.94,sy:.26,sz:.35});
  instance('Continental_HorizontalRelief',new T.BoxGeometry(1,1,1),white,conRails,conRoot);
  const conBal=[];for(let x=-continental.width*.43;x<=continental.width*.43;x+=1.6)conBal.push({x,y:20.4,z:1.4,sx:.11,sy:1.25,sz:.18});
  instance('Continental_RoofBalustrade',new T.BoxGeometry(1,1,1),white,conBal,conRoot);
  const conSign=mesh(new T.PlaneGeometry(32,4),mat({map:signTexture('HOTEL CONTINENTAL SAIGON'),transparent:true,roughness:.35,emissive:'#5a391d',emissiveIntensity:.5}), 'Continental_Sign',conRoot);conSign.position.set(0,5.5,1.64);

  // Caravelle: mapped low wing plus a separately classified tower derived from the official 24-storey statement.
  const carRoot=localRoot(caravelle,'Caravelle20B');
  box('Caravelle_LowWing',caravelle.width,28.4,18,0,14.2,-7.8,cream,carRoot);
  const carPhotoMat=mat({color:'#d8b99e',roughness:.6,polygonOffset:true,polygonOffsetFactor:-2});
  const carPhoto=mesh(new T.PlaneGeometry(caravelle.width*.95,26.3),carPhotoMat,'Caravelle_SourcedLowWing',carRoot);carPhoto.position.set(0,14.2,1.25);loadTexture(sources.caravelle,tex=>{carPhotoMat.map=tex;carPhotoMat.needsUpdate=true;});
  const towerHeight=76.8,tower=box('Caravelle_Tower_24StoreyDerived',29,towerHeight,20,2,towerHeight/2,-17,cream,carRoot);
  tower.userData={classification:'official_storey_count_with_display_height_rule',storeys:24,surveyed:false};
  const bays=[];for(let floor=1;floor<23;floor++)for(let col=-4;col<=4;col++)bays.push({x:2+col*2.65,y:4.1+floor*3.05,z:-6.88,sx:1.85,sy:1.65,sz:.16});
  instance('Caravelle_TowerWindows',new T.BoxGeometry(1,1,1),glass,bays,carRoot);
  const balconyBands=[];for(let floor=3;floor<23;floor+=3)balconyBands.push({x:2,y:3.5+floor*3.05,z:-6.5,sx:29.5,sy:.25,sz:.7});
  instance('Caravelle_BalconyBands',new T.BoxGeometry(1,1,1),white,balconyBands,carRoot);
  const bay=mesh(new T.CylinderGeometry(4.4,4.4,62,24),glass,'Caravelle_CurvedBay',carRoot);bay.position.set(-3.5,34,-6.0);
  const bayBands=[];for(let floor=1;floor<20;floor++)bayBands.push({x:-3.5,y:4.1+floor*3.05,z:-1.68,sx:8.7,sy:.18,sz:.34});
  instance('Caravelle_CurvedBayBands',new T.BoxGeometry(1,1,1),white,bayBands,carRoot);
  box('Caravelle_Crown',31,5.8,21.5,2,74,-17,cream,carRoot);
  const carSign=mesh(new T.PlaneGeometry(20,3),mat({map:signTexture('CARAVELLE'),transparent:true,emissive:'#d99a46',emissiveIntensity:1,roughness:.3}),'Caravelle_Sign',carRoot);carSign.position.set(2,74,-6.1);

  // Public realm follows archived OSM centerlines; widths and furniture remain illustrative.
  function ribbon(points,width,y){const p=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz);if(l<.01)continue;const ox=-dz/l*width/2,oz=dx/l*width/2,v=[[a[0]+ox,y,a[1]+oz],[b[0]+ox,y,b[1]+oz],[a[0]-ox,y,a[1]-oz],[b[0]-ox,y,b[1]-oz]];for(const k of [0,2,1,1,2,3])p.push(...v[k]);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.computeVertexNormals();return g;}
  const roadLookup=new Map(D.roads.map(r=>[r.id,r]));
  const lamRoads=roadIds.lamson.map(id=>roadLookup.get(id)).filter(Boolean),dongRoads=roadIds.dongkhoi.map(id=>roadLookup.get(id)).filter(Boolean);
  [...lamRoads,...dongRoads].forEach((road,i)=>{const width=roadIds.lamson.includes(road.id)?9.5:11;mesh(ribbon(road.c,width+3,1.34),paving,'Hero20B_Curb_'+road.id,publicRealm);mesh(ribbon(road.c,width,1.42),asphalt,'Hero20B_Road_'+road.id,publicRealm);mesh(ribbon(road.c,.16,1.5),white,'Hero20B_Centerline_'+road.id,publicRealm);});
  function samplePath(points,spacing){const out=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],l=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.floor(l/spacing));for(let j=0;j<n;j++){const t=j/n;out.push({x:a[0]+(b[0]-a[0])*t,z:a[1]+(b[1]-a[1])*t,angle:Math.atan2(b[0]-a[0],b[1]-a[1])});}}return out;}
  const dongPath=dongRoads.flatMap(r=>samplePath(r.c,18)),lamPath=lamRoads.flatMap(r=>samplePath(r.c,20));
  const streetPoints=[...samplePath(dongRoads[1]?.c||[],24),...samplePath(lamRoads[1]?.c||[],28)];
  const lampPosts=streetPoints.filter((_,i)=>i%2===0).map((p,i)=>({x:p.x+(i%2?5:-5)*Math.cos(p.angle),y:3.4,z:p.z-(i%2?5:-5)*Math.sin(p.angle),sx:.09,sy:6.8,sz:.09}));
  instance('Hero20B_StreetLights',new T.CylinderGeometry(1,1,1,8),dark,lampPosts,publicRealm);
  const treePoints=streetPoints.filter((_,i)=>i%3===0).map((p,i)=>({x:p.x+(i%2?8:-8)*Math.cos(p.angle),z:p.z-(i%2?8:-8)*Math.sin(p.angle),h:7+(i%4)}));
  instance('Hero20B_TreeTrunks',new T.CylinderGeometry(1,1,1,8),trunk,treePoints.map(p=>({x:p.x,y:p.h*.35,z:p.z,sx:.34,sy:p.h*.7,sz:.34})),publicRealm);
  instance('Hero20B_TreeCanopies',new T.IcosahedronGeometry(1,2),foliage,treePoints.map((p,i)=>({x:p.x,y:p.h*.82,z:p.z,sx:2.2+(i%3)*.3,sy:2.8,sz:2.2})),publicRealm);
  function car(index,path){const g=new T.Group();g.name='Hero20B_Car_'+index;const body=box('CarBody',4.1,.85,1.8,0,.75,0,carMats[index%carMats.length],g),roof=box('CarRoof',2.25,.7,1.52,-.2,1.5,0,glass,g);body.castShadow=roof.castShadow=true;motion.add(g);return {group:g,path,index,offset:(index*.173)%1,speed:.000024+(index%3)*.000004};}
  const cars=[];for(let i=0;i<8;i++)cars.push(car(i,i%2?lamPath:dongPath));
  function updateCars(now){cars.forEach(c=>{if(!c.path.length)return;const u=(c.offset+now*c.speed)%1,index=Math.min(c.path.length-1,Math.floor(u*c.path.length)),p=c.path[index];c.group.position.set(p.x,1.48,p.z);c.group.rotation.y=p.angle+(c.index%2?Math.PI:0);});}

  // Camera presets form one executive circuit through the cluster.
  presets.district20={target:new T.Vector3(-908,23,270),distance:220,az:-1.18,polar:1.08,label:'CỤM NHÀ HÁT · LAM SƠN'};
  // Continental's opposite frontage is occupied by the Opera footprint. The
  // oblique camera stays on the sourced street corridor instead of clipping
  // through either mapped envelope.
  presets.continental20={target:new T.Vector3(continental.x,12,continental.z),distance:70,az:-.48,polar:1.35,label:'HOTEL CONTINENTAL'};
  presets.caravelle20={target:new T.Vector3(caravelle.x,36,caravelle.z-10),distance:118,az:caravelle.angle,polar:1.27,label:'CARAVELLE SAIGON'};
  presets.lamson20={target:new T.Vector3(-906,7,258),distance:96,az:-1.35,polar:1.25,label:'CÔNG TRƯỜNG LAM SƠN'};
  // Look southwest from the northern end of the archived Đồng Khởi centerline.
  // This preserves a street-axis view and avoids the foreground building that
  // blocks the previous east-side orbit.
  presets.dongkhoi20={target:new T.Vector3(-990,8,260),distance:118,az:.82,polar:1.40,label:'TRỤC ĐỒNG KHỞI'};
  const viewFov={district20:52,continental20:70,caravelle20:52,lamson20:58,dongkhoi20:60};
  const viewNames={district20:'Cụm Nhà hát–Lam Sơn',continental20:'Hotel Continental',caravelle20:'Caravelle Saigon',lamson20:'Công trường Lam Sơn',dongkhoi20:'Trục Đồng Khởi'};
  const viewsNav=q('.views');
  const districtButton=document.createElement('button');districtButton.dataset.view='district20';districtButton.innerHTML='<small>26</small> Cụm Nhà hát · Lam Sơn';viewsNav.append(districtButton);districtButton.onclick=()=>activateView('district20');

  const hud=document.createElement('aside');hud.id='hero20bHud';hud.hidden=true;hud.innerHTML=`
    <header><small>HERO CLUSTER · 20B</small><h2 id="hero20bTitle">Cụm Nhà hát–Lam Sơn</h2><button id="hero20bClose" aria-label="Về cảnh Nhà hát">×</button></header>
    <p id="hero20bCopy">Ba công trình và hai không gian phố được nối thành một cảnh đô thị có thể kiểm tra nguồn.</p>
    <nav class="hero20b-places" aria-label="Điểm nhìn cụm Nhà hát"><button data-cluster-view="district20">Cụm cảnh</button><button data-cluster-view="continental20">Continental</button><button data-cluster-view="caravelle20">Caravelle</button><button data-cluster-view="lamson20">Lam Sơn</button><button data-cluster-view="dongkhoi20">Đồng Khởi</button></nav>
    <div class="hero20b-actions"><button id="hero20bTour">▶ Hành trình 38 giây</button><button id="hero20bSources">ⓘ Bằng chứng</button></div>
    <section id="hero20bEvidence" hidden><figure><img id="hero20bReference" alt="Ảnh tham chiếu đúng địa điểm"><figcaption id="hero20bCredit"></figcaption></figure><p id="hero20bLimit"></p><a id="hero20bSourceLink" target="_blank" rel="noreferrer">Mở nguồn và giấy phép ↗</a></section>`;
  q('#viewport').append(hud);
  const copy={
    district20:['Cụm Nhà hát–Lam Sơn','Nhà hát, Continental và Caravelle cùng hiện diện trong một không gian đọc được ở cấp lãnh đạo.'],
    continental20:['Hotel Continental','Ảnh mặt đứng 5.472×3.648 px được giới hạn trong vỏ 24 m có nguồn; phào và lan can là hình học suy diễn.'],
    caravelle20:['Caravelle Saigon','Cánh thấp bám mặt đứng đã lưu; tháp 24 tầng theo lịch sử chính thức, kích thước hiển thị chưa khảo sát.'],
    lamson20:['Công trường Lam Sơn','Hình tuyến bám các đoạn đường OSM lưu trữ; bề rộng, lát nền, cây và đèn là proxy trình diễn.'],
    dongkhoi20:['Trục Đồng Khởi','Camera đi dọc tuyến có nguồn cùng phương tiện bám polyline, cho thấy khả năng mở rộng sang dòng giao thông.']
  };
  function evidenceFor(id){if(id==='continental20')return {source:sources.continental,limit:'Vỏ 24 m theo manifest; chiều sâu, phào và lan can chưa đo.'};if(id==='caravelle20')return {source:sources.caravelle,limit:'24 tầng theo nguồn chính thức; quy tắc 3,2 m/tầng và vị trí tháp là gần đúng.'};return {source:sources.corridor,limit:'Hình tuyến từ OSM; cảnh quan và đồ đường phố là minh họa tỷ lệ.'};}
  function renderHud(id){const [title,detail]=copy[id]||copy.district20;q('#hero20bTitle').textContent=title;q('#hero20bCopy').textContent=detail;hud.querySelectorAll('[data-cluster-view]').forEach(b=>b.setAttribute('aria-current',String(b.dataset.clusterView===id)));const e=evidenceFor(id),s=e.source;q('#hero20bReference').src=s.reference;q('#hero20bReference').alt='Ảnh nguồn '+title;q('#hero20bCredit').textContent=[s.author,s.license,s.date,s.sourcePixels.join('×')+' px'].join(' · ');q('#hero20bLimit').textContent=e.limit;q('#hero20bSourceLink').href=s.url;}
  function activateView(id){if(typeof stopCinema==='function')stopCinema();if(typeof tour!=='undefined')tour=false;window.setCityView?.(id);renderHud(id);const url=new URL(location.href);url.searchParams.set('v','20b');url.searchParams.set('view',id);url.searchParams.delete('facade');history.replaceState(null,'',url);}
  hud.querySelectorAll('[data-cluster-view]').forEach(b=>b.onclick=()=>activateView(b.dataset.clusterView));
  q('#hero20bClose').onclick=()=>window.heroZone20?.focus();q('#hero20bSources').onclick=()=>{const e=q('#hero20bEvidence');e.hidden=!e.hidden;q('#hero20bSources').setAttribute('aria-expanded',String(!e.hidden));};
  const tourViews=['district20','continental20','caravelle20','lamson20','dongkhoi20','district20'];
  q('#hero20bTour').onclick=()=>{state.tour=!state.tour;state.tourElapsed=0;state.tourIndex=0;q('#hero20bTour').textContent=state.tour?'■ Dừng hành trình':'▶ Hành trình 38 giây';if(state.tour)activateView(tourViews[0]);};
  function count(rootObject,kind){let n=0;rootObject.traverse(o=>{if(kind==='draw'&&o.isMesh)n++;if(kind==='tri'&&o.geometry){const p=o.geometry.attributes?.position?.count||0;n+=o.geometry.index?o.geometry.index.count/3:p/3;}});return Math.round(n);}
  function advance(dt,now){
    const active=activeViews.has(window.currentView);state.active=active;root.visible=active;
    if(active){const wanted=viewFov[window.currentView]||52;if(Math.abs(camera.fov-wanted)>.05){camera.fov+=(wanted-camera.fov)*.16;camera.updateProjectionMatrix();}}
    if(active){updateCars(now);if(state.tour){state.tourElapsed+=dt;if(state.tourElapsed>=7.6){state.tourElapsed=0;state.tourIndex++;if(state.tourIndex>=tourViews.length){state.tour=false;q('#hero20bTour').textContent='▶ Hành trình 38 giây';}else activateView(tourViews[state.tourIndex]);}}}
    for(const key of ['continental','caravelle']){const old=window.photoFacadeResources15?.group?.getObjectByName('Facade15_'+key);if(old){if(!(key in state.oldVisibility))state.oldVisibility[key]=old.visible;old.visible=active?false:state.oldVisibility[key];}}
    hud.hidden=!active||document.body.classList.contains('executive-story-active');document.body.classList.toggle('hero20b-active',active);if(active&&hud.dataset.view!==window.currentView){hud.dataset.view=window.currentView;renderHud(window.currentView);}
    warm.emissiveIntensity=.2+Math.max(0,(typeof lightValue==='number'?lightValue:.45)-.45)*2.2;
    window.heroCluster20BStatus={version:'20b-2',active,ready:state.ready,view:window.currentView,anchorBuildingIds:{opera:entries.opera?.building_id,continental:entries.continental.building_id,caravelle:entries.caravelle.building_id},roadSourceIds:[...roadIds.lamson,...roadIds.dongkhoi],sourcePhotos:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,{url:v.url,author:v.author,license:v.license,date:v.date,sourcePixels:v.sourcePixels,texturePixels:v.texturePixels||null}])),geometry:{continental:'mapped_24m_envelope_with_photo_derived_relief',caravelleLowWing:'mapped_30m_envelope',caravelleTower:'official_24_storeys_with_3.2m_display_rule_not_surveyed',lamsonDongkhoi:'osm_centerlines_with_illustrative_widths_and_furniture'},officialClaim:{caravelleStoreys:official.caravelleStoreys,url:official.url},planningGeometryEnabled:false,camera:{fovDegrees:+camera.fov.toFixed(1),occlusionPolicy:'street_axis_or_oblique_corridor_no_envelope_clipping'},motion:{vehicles:cars.length,path:'archived_osm_centerlines',classification:'illustrative'},tour:{active:state.tour,index:state.tourIndex},drawables:count(root,'draw'),triangles:count(root,'tri'),errors:state.errors};
    status.dataset.json=JSON.stringify(window.heroCluster20BStatus);
  }
  const status=document.createElement('output');status.id='hero20bStatus';status.hidden=true;document.body.append(status);
  window.advanceHero20B=advance;window.heroCluster20B={root,focus:()=>activateView('district20'),activateView,startTour:()=>q('#hero20bTour').click(),metadata:()=>window.heroCluster20BStatus};
  const params=new URLSearchParams(location.search),requested=params.get('view');if(activeViews.has(requested))setTimeout(()=>activateView(requested),240);
})();
