/* Batch 19: leadership-first visual narrative built from the existing sourced scene. */
(() => {
  'use strict';
  const q=(s)=>document.querySelector(s), params=new URLSearchParams(location.search);
  if(!q('#viewport')||!window.CityLabPanels)return;
  const entries=window.FACADES_15?.manifest?.entries||[];
  const scenes=[
    {key:'city',view:'overview',duration:7,light:.06,drift:true,context:'TP.HCM · bối cảnh vùng',title:'Thành phố, nhìn như một hệ thống.',detail:'Một mặt bản đồ liên kết hình thái đô thị, sông và các điểm nhận diện của khu trung tâm.',proof:['38,57 km² vùng kỹ thuật','OpenStreetMap + Overture','Hình khối gần đúng']},
    {key:'river',view:'showcase',duration:8,light:.50,drift:true,context:'Bến Bạch Đằng · hành lang ven sông',title:'Sông Sài Gòn mở ra cấu trúc của đô thị.',detail:'Camera đi từ toàn cảnh xuống bờ sông, nơi cảnh quan, giao thông và đường chân trời gặp nhau.',proof:['Đường và footprint có nguồn','Nước và chuyển động minh họa','Ánh sáng giờ vàng']},
    {key:'cluster',view:'district20',duration:10,light:.38,drift:false,context:'Nhà hát–Lam Sơn · hero cluster 20B',title:'Một cụm đô thị, đọc được trong cùng một cảnh.',detail:'Nhà hát, Continental, Caravelle và hai trục phố được nối bằng vị trí có nguồn, hình học nhận diện và tỷ lệ con người.',proof:['Ba công trình nhận diện','Hai không gian phố','Nguồn đi cùng đối tượng']},
    {key:'continental',view:'continental20',duration:8,light:.18,drift:false,context:'Hotel Continental · ảnh và kiến trúc',title:'Di sản mặt phố được làm giàu bằng ảnh đúng địa điểm.',detail:'Ảnh gốc 5.472×3.648 pixel nằm trong bao hình có nguồn; phào và lan can được tách thành hình học nổi.',proof:['Ảnh Commons độ phân giải cao','Bao cao 24 m trong manifest','Chi tiết photo-derived'],photo:true,sourceKey:'continental'},
    {key:'caravelle',view:'caravelle20',duration:9,light:.62,drift:false,context:'Caravelle Saigon · cánh thấp và tháp',title:'Dữ liệu chính thức kiểm soát phần suy diễn.',detail:'Cánh thấp bám mặt đứng đã lưu. Tháp dùng thông tin 24 tầng từ lịch sử chính thức; chiều cao hiển thị vẫn được ghi là gần đúng.',proof:['Nguồn chính thức: 24 tầng','Ảnh Commons 3.385×5.000','Không tuyên bố khảo sát'],photo:true,sourceKey:'caravelle'},
    {key:'dongkhoi',view:'dongkhoi20',duration:9,light:.34,drift:false,context:'Đồng Khởi–Lam Sơn · hành lang chuyển động',title:'Mô hình bắt đầu vận hành như một không gian sống.',detail:'Phương tiện bám đúng polyline đường đã lưu, trong khi cây, đèn và bề rộng phố được phân loại là lớp minh họa.',proof:['Tuyến OSM lưu trữ','Chuyển động theo đường','Public realm minh họa']},
    {key:'night',view:'cinematicnight',duration:11,drift:true,context:'Đường chân trời · lớp trình diễn',title:'Một thành phố có thể kể chuyện bằng dữ liệu.',detail:'Cảnh đêm khép lại hành trình từ quy mô vùng đến từng công trình và mở ra nền tảng cho các lớp quy hoạch có kiểm chứng.',proof:['Ánh sáng minh họa','Không phải ảnh chụp đồng thời','Sẵn sàng nhận dữ liệu chính thức']}
  ];
  const launch=document.createElement('button');launch.id='x19Launch';launch.type='button';launch.textContent='Trình diễn thành phố';launch.setAttribute('aria-label','Bắt đầu trình diễn thành phố trong 62 giây');q('#leadership16').append(launch);
  const root=document.createElement('section');root.id='x19Story';root.hidden=true;root.setAttribute('aria-label','Trình diễn trực quan Thành phố Hồ Chí Minh');root.innerHTML=`
    <div class="x19-letterbox"></div>
    <div class="x19-top"><div class="x19-brand">CITY LAB<span>HỒ CHÍ MINH</span></div><div class="x19-count"><span id="x19Index">01</span><span>/ 07</span></div></div>
    <nav id="x19SceneNav" aria-label="Các cảnh trình diễn"></nav>
    <div class="x19-copy"><p id="x19Context"></p><h1 id="x19Title"></h1><p id="x19Detail"></p><div id="x19Proof" class="x19-proof"></div></div>
    <figure id="x19Reference" class="x19-reference" hidden><img id="x19Photo" alt=""><figcaption id="x19Caption"></figcaption></figure>
    <div class="x19-controls"><button id="x19Prev" aria-label="Cảnh trước">←</button><button id="x19Play">Tạm dừng</button><button id="x19Next" aria-label="Cảnh tiếp">→</button><div class="x19-track" aria-hidden="true"><i id="x19Progress"></i></div><button id="x19Exit">Khám phá tự do</button></div>
    <output id="x19Status" hidden></output>`;
  q('#viewport').append(root);
  const nav=q('#x19SceneNav');
  scenes.forEach((scene,i)=>{const b=document.createElement('button');b.type='button';b.dataset.scene=scene.key;b.setAttribute('aria-label',`Cảnh ${i+1}: ${scene.context}`);b.onclick=()=>setScene(i,true);nav.append(b);});
  const state={active:false,playing:false,index:0,elapsed:0,last:0,lastUi:0,lastEmit:0,ended:false,reason:'idle'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let pendingDeepLink=params.get('view')==='executive19'?scenes.findIndex(scene=>scene.key===params.get('scene')):-1;
  const facadeEntry=scene=>entries.find(e=>e.key===(scene.sourceKey||'opera'));
  function setText(id,value){const el=q(id);if(el&&el.textContent!==value)el.textContent=value;}
  function stopOtherMotion(){window.CityLabPanels.stopMotion();if(typeof tour!=='undefined')tour=false;}
  function selectView(scene){
    stopOtherMotion();
    if(scene.facade){const select=q('#facade15Select');if(select){select.value=scene.facade;select.dispatchEvent(new Event('change',{bubbles:true}));const ab=q('#facade15AB');if(ab?.getAttribute('aria-pressed')==='false')ab.click();}}
    else q(`.views [data-view="${scene.view}"]`)?.click();
    if(scene.view!=='cinematicnight'&&typeof illumination==='function')illumination(scene.light);
    if(typeof tour!=='undefined')tour=!!scene.drift&&!reduced;
  }
  function renderPhoto(show,scene){
    const figure=q('#x19Reference'),img=q('#x19Photo'),caption=q('#x19Caption'),e=facadeEntry(scene);
    figure.hidden=!show||!e;if(figure.hidden)return;
    img.src=window.FACADES_15.references[e.key];img.alt='Ảnh nguồn: '+e.name;
    caption.textContent=[e.name,e.photo_date,e.author,e.license,'Ảnh khác thời điểm'].filter(Boolean).join(' · ');
  }
  function emit(){
    const scene=scenes[state.index],snapshot={version:'19a+20b',active:state.active,playing:state.playing,scene:scene.key,index:state.index,sceneCount:scenes.length,elapsedSeconds:+state.elapsed.toFixed(2),durationSeconds:scene.duration,reducedMotion:reduced,classification:scene.key==='night'?'illustrative_cinematic_not_observed_conditions':scene.photo?'sourced_photo_on_approximate_geometry':scene.view.includes('20')?'open_data_anchors_with_photo_derived_geometry':'open_data_and_procedural_visualization',planningGeometryEnabled:false,reason:state.reason};
    q('#x19Status').dataset.json=JSON.stringify(snapshot);window.executiveStory19Status=snapshot;state.lastEmit=performance.now();
  }
  function setScene(index,manual=false){
    state.index=(index+scenes.length)%scenes.length;state.elapsed=0;state.ended=false;state.reason=manual?'manual-navigation':'auto-sequence';
    const scene=scenes[state.index];selectView(scene);setText('#x19Index',String(state.index+1).padStart(2,'0'));setText('#x19Context',scene.context);setText('#x19Title',scene.title);setText('#x19Detail',scene.detail);
    const proof=q('#x19Proof');proof.replaceChildren(...scene.proof.map(text=>{const s=document.createElement('span');s.textContent=text;return s;}));renderPhoto(scene.photo,scene);
    nav.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',String(i===state.index)));q('#x19Prev').disabled=state.index===0;q('#x19Next').disabled=state.index===scenes.length-1;
    root.classList.remove('x19-enter');requestAnimationFrame(()=>{root.classList.add('x19-enter');const url=new URL(location.href);url.searchParams.set('v','20b');url.searchParams.set('view','executive19');url.searchParams.set('scene',scene.key);history.replaceState(null,'',url);});updatePlay();emit();
  }
  function updatePlay(){setText('#x19Play',state.ended?'Xem lại':state.playing?'Tạm dừng':'Tiếp tục');q('#x19Play').setAttribute('aria-pressed',String(state.playing));}
  function start(){
    if(state.active)return;state.active=true;state.playing=!reduced;state.last=performance.now();state.reason='launched';root.hidden=false;document.body.classList.add('executive-story-active');window.CityLabPanels.closePanel(false);const requested=pendingDeepLink;pendingDeepLink=-1;setScene(requested>=0?requested:0);updatePlay();emit();
  }
  function exit(){
    if(!state.active)return;state.active=false;state.playing=false;state.reason='exit';root.hidden=true;document.body.classList.remove('executive-story-active');if(typeof tour!=='undefined')tour=false;const url=new URL(location.href);url.searchParams.set('v','20b');url.searchParams.delete('scene');url.searchParams.set('view',window.currentView||'overview');history.replaceState(null,'',url);updatePlay();emit();q('#x19Launch')?.focus({preventScroll:true});
  }
  function toggle(){if(state.ended){state.playing=!reduced;setScene(0,true);}else state.playing=!state.playing;state.last=performance.now();state.reason=state.playing?'resumed':'paused';updatePlay();emit();}
  function tick(now){
    requestAnimationFrame(tick);if(!state.active){state.last=now;return;}const dt=Math.min(.2,(now-state.last)/1000);state.last=now;if(state.playing){state.elapsed+=dt;const scene=scenes[state.index];if(state.elapsed>=scene.duration){if(state.index<scenes.length-1)setScene(state.index+1);else{state.elapsed=scene.duration;state.playing=false;state.ended=true;state.reason='completed';updatePlay();}}}
    const scene=scenes[state.index];if(now-state.lastUi>=50){q('#x19Progress').style.transform=`scaleX(${Math.min(1,state.elapsed/scene.duration).toFixed(4)})`;state.lastUi=now;}if(now-state.lastEmit>=200)emit();
  }
  launch.onclick=start;q('#x19Exit').onclick=exit;q('#x19Prev').onclick=()=>setScene(Math.max(0,state.index-1),true);q('#x19Next').onclick=()=>setScene(Math.min(scenes.length-1,state.index+1),true);q('#x19Play').onclick=toggle;
  q('#scene canvas')?.addEventListener('pointerdown',()=>{if(state.active&&state.playing){state.playing=false;state.reason='camera-interaction';updatePlay();emit();}},{passive:true});
  window.addEventListener('keydown',event=>{if(!state.active||event.metaKey||event.ctrlKey||event.altKey||/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName))return;const key=event.key.toLowerCase();if(key==='escape'){event.preventDefault();event.stopImmediatePropagation();exit();}else if(key===' '){event.preventDefault();event.stopImmediatePropagation();toggle();}else if(key==='arrowright'){event.preventDefault();event.stopImmediatePropagation();setScene(Math.min(scenes.length-1,state.index+1),true);}else if(key==='arrowleft'){event.preventDefault();event.stopImmediatePropagation();setScene(Math.max(0,state.index-1),true);}},true);
  window.executiveStory19={start,exit,setScene,scenes:Object.freeze(scenes.map(s=>({...s}))),getState:()=>({...state})};requestAnimationFrame(tick);
  if(params.get('view')==='executive19')setTimeout(start,Math.max(650,q('#loading')?.classList.contains('gone')?650:2100));
  emit();
})();
