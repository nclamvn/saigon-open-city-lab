/* City Lab spatial workbench. Shared GIS/source kernel owns all measurements. */
(() => {
  'use strict';
  const $=s=>document.querySelector(s), node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!=null)e.textContent=text;if(cls)e.className=cls;return e;};
  const CORE='../shared/digital-twin-core/';
  const state={ready:false,initializing:false,busy:false,error:null,mode:'corridor',drawing:false,points:[],geometry:null,result:null,scenario:0,overlay:true,request:0,origin:null,config:null,info:null};
  let client=null,initPromise=null,mounted=false,draftFrame=0,previewPoint=null,exportFiles={};
  const shell=node('div',null,'t17-panel');
  shell.innerHTML=`<p class="t17-intro">Khoanh vùng công trình hoặc thử các bề rộng quanh một tuyến.</p>
    <div class="t17-mode" role="group" aria-label="Phương pháp phân tích"><button id="t17Area" aria-pressed="false">Khoanh vùng</button><button id="t17Corridor" aria-pressed="true">Hành lang tuyến</button></div>
    <p id="t17Status" role="status" aria-live="polite">Đang chuẩn bị bộ phân tích…</p>
    <div class="t17-actions"><button id="t17Sample" disabled>Mẫu hành lang Nguyễn Huệ</button><button id="t17Draw" disabled>Vẽ tuyến</button></div>
    <div id="t17Drawing" hidden><p>Chạm trên bản đồ để thêm điểm. Enter / chạm đôi để kết thúc; Escape để hủy.</p><div class="t17-actions"><button id="t17Undo">Lùi một điểm</button><button id="t17Finish">Kết thúc vẽ</button><button id="t17CancelDraw">Hủy vẽ</button></div></div>
    <fieldset id="t17Distances"><legend>Khoảng cách mỗi bên tuyến · mét</legend><div class="t17-distances"><label>A<input id="t17DistanceA" type="number" min="5" max="500" step="5" value="25" inputmode="decimal"></label><label>B<input id="t17DistanceB" type="number" min="5" max="500" step="5" value="50" inputmode="decimal"></label><label>C<input id="t17DistanceC" type="number" min="5" max="500" step="5" value="100" inputmode="decimal"></label></div></fieldset>
    <p class="t17-note">A/B/C là phép thử phân tích, không phải phương án quy hoạch được duyệt.</p>
    <div class="t17-actions"><button id="t17Run" disabled>Phân tích</button><button id="t17Cancel" hidden>Dừng yêu cầu</button><button id="t17Retry" hidden>Thử tải lại</button></div>
    <section id="t17Results" hidden aria-label="Kết quả phân tích"><div id="t17Scenarios" class="t17-scenarios" role="group" aria-label="Chọn phép thử"></div><div id="t17Summary"></div><div class="t17-actions"><button id="t17Overlay" aria-pressed="true">Hiện lớp chọn</button><button id="t17Zoom">Đến vùng</button><button id="t17Clear">Xóa kết quả</button></div><details><summary>Nguồn, thời điểm và giới hạn</summary><div id="t17Sources"></div></details><details><summary>Xuất kết quả &amp; lưu đối chiếu</summary><p>Gồm phạm vi, kết quả, nguồn, dấu vân tay dữ liệu và góc nhìn. Tệp HTML có thể mở và in.</p><div id="t17Exports" class="t17-exports"></div></details></section>
    <details class="t17-limits"><summary>Giới hạn mô hình hiện hành</summary><p>Phạm vi bạn vẽ là ví dụ phân tích, không phải ranh pháp lý. Hình học chọn trên mặt phẳng quy ước, không phải cao độ khảo sát.</p><p>“Nhóm ID nguồn” không có nghĩa số nhà, thửa đất hay chủ sở hữu đã xác minh. Mặt đứng và chiều cao có thể là mô phỏng.</p><div class="t17-unavailable"><button disabled>Đào / đắp</button><button disabled>Mô phỏng ngập</button><button disabled>Đường nhìn 3D</button></div><p>Cần địa hình, cao độ và mô hình vật cản đã kiểm định trước khi mở các phép tính này.</p></details>`;
  const setup=node('details',null,'t17-setup');setup.id='t17Setup';setup.open=true;setup.append(node('summary','Phạm vi & khoảng cách'));
  for(const e of [shell.querySelector('.t17-mode'),shell.querySelector('#t17Sample').parentElement,shell.querySelector('#t17Drawing'),shell.querySelector('#t17Distances'),shell.querySelector('#t17Distances').nextElementSibling,shell.querySelector('#t17Run').parentElement])setup.append(e);
  shell.replaceChildren(shell.querySelector('.t17-intro'),shell.querySelector('#t17Status'),shell.querySelector('#t17Results'),setup,shell.querySelector('.t17-limits'));
  const probe=node('output');probe.id='twin17Probe';probe.hidden=true;$('#viewport').append(probe);
  const badge=node('button','Phạm vi phân tích minh họa','t17-badge');badge.id='twin17Badge';badge.hidden=true;$('#leadership16').append(badge);
  const sceneHost=$('#scene'), canvas=sceneHost.querySelector('canvas');
  const overlays=new THREE.Group();overlays.name='RTRTwin17Analysis';window.cityScene.scene.add(overlays);
  const resultGroup=new THREE.Group(),draftGroup=new THREE.Group();overlays.add(resultGroup,draftGroup);
  const byId=id=>shell.querySelector('#'+id);
  const fmt=(v,d=0)=>Number.isFinite(v)?v.toLocaleString('vi-VN',{maximumFractionDigits:d}):'Chưa rõ';
  const text=(e,v)=>{if(e&&e.textContent!==v)e.textContent=v;};
  const attr=(e,k,v)=>{if(e&&e.getAttribute(k)!==String(v))e.setAttribute(k,String(v));};
  const selected=()=>state.result?.scenarios?.[state.scenario];
  const cameraSnapshot=()=>({position:window.cityScene.camera.position.toArray(),target:typeof target!=='undefined'?target.toArray():null,distance:typeof distance==='number'?distance:null,azimuth:typeof az==='number'?az:null,polar:typeof polar==='number'?polar:null});
  const limitationsVN=['Phạm vi phân tích do người dùng chọn; không phải ranh pháp lý hoặc phương án được duyệt.','Mặt đất là mặt phẳng quy ước, không phải địa hình khảo sát.','Số nhóm ID nguồn không phải số nhà hoặc thửa đất đã kiểm chứng.','Diện tích giao cộng dồn có thể trùng; diện tích hợp nhất loại trùng hình học. Tiếp xúc biên được tính với diện tích bằng0.','Phép đo cầu và vùng đệm là xấp xỉ GIS; không dùng xác định quyền sở hữu hoặc bồi thường.'];
  function status(){
    const count=state.points.length;
    text(byId('t17Status'),state.error|| (state.initializing?'Đang lập chỉ mục hình học trong Worker…':state.busy?'Đang đối chiếu hình học và hợp nhất diện tích…':state.drawing?`Đang vẽ · ${count} điểm` :state.result?'Đã phân tích · phạm vi minh họa':state.ready?'Sẵn sàng. Chọn mẫu hoặc vẽ trên bản đồ.':'Chưa sẵn sàng.'));
    attr(byId('t17Status'),'data-state',state.error?'error':state.busy||state.initializing?'loading':'ready');
    for(const id of ['t17Sample','t17Draw'])byId(id).disabled=!state.ready||state.busy||state.drawing;
    byId('t17Run').disabled=!state.ready||state.busy||state.drawing||!state.geometry;
    byId('t17Cancel').hidden=!state.busy;byId('t17Retry').hidden=!state.error||state.ready;
    byId('t17Drawing').hidden=!state.drawing;byId('t17Undo').disabled=!count;byId('t17Finish').disabled=count<(state.mode==='area'?3:2);
    byId('t17Distances').hidden=state.mode!=='corridor';byId('t17Results').hidden=!state.result;
    attr(byId('t17Area'),'aria-pressed',state.mode==='area');attr(byId('t17Corridor'),'aria-pressed',state.mode==='corridor');
    text(byId('t17Draw'),state.mode==='area'?'Vẽ vùng':'Vẽ tuyến');attr(byId('t17Overlay'),'aria-pressed',state.overlay);
    badge.hidden=!state.result||!state.overlay;
    const s=selected();text(badge,`Phân tích minh họa${state.result?.query.mode==='corridor'&&s?.distanceM!=null?' · '+s.distanceM+' m':''} · xem kết quả`);
    attr(probe,'data-json',JSON.stringify({version:'17a',ready:state.ready,initializing:state.initializing,busy:state.busy,error:state.error,request:state.request,mode:state.mode,drawing:state.drawing,pointCount:count,origin:state.origin,scenario:state.scenario,scenarioCount:state.result?.scenarios?.length||0,summary:s?.summary||null,overlay:state.overlay,overlayObjects:resultGroup.children.length,overlayVertices:resultGroup.children.reduce((n,x)=>n+(x.geometry?.attributes.position?.count||0),0),sourceVersion:state.result?.version||state.config?.version||null,executionMode:client?.executionMode||null,camera:cameraSnapshot()}));
    window.dispatchEvent(new CustomEvent('twin17:state',{detail:{ready:state.ready,busy:state.busy,request:state.request}}));
  }
  function errorMessage(error){
    if(error?.code==='SOURCE_HASH_MISMATCH')return 'Tệp hình học không khớp hash trong hồ sơ nguồn. Phân tích bị chặn; hãy kiểm tra phiên bản dữ liệu.';
    if(error?.code==='SOURCE_HASH_REQUIRED'||error?.code==='INTEGRITY_UNAVAILABLE')return 'Chưa đủ điều kiện xác minh byte dữ liệu đầu vào. Phân tích chưa được mở.';
    const codes={WORKER_REQUIRED:'Trình duyệt chưa chạy được Worker cho bộ dữ liệu lớn. Hãy mở bằng HTTP và kiểm tra quyền chạy Worker.',WORKER_FAILED:'Worker phân tích gặp lỗi. Bản đồ vẫn hoạt động; hãy thử tải lại.',WORKER_TIMEOUT:'Phân tích vượt thời gian cho phép. Hãy chọn phạm vi nhỏ hơn.',TOO_MANY_CANDIDATES:'Phạm vi quá rộng để phân tích tương tác. Hãy chọn vùng nhỏ hơn.',QUERY_TOO_BROAD:'Phạm vi quá rộng. Hãy chọn vùng nhỏ hơn.'};
    return codes[error?.code]||`Chưa thể phân tích: ${error?.message||String(error)}`;
  }
  async function initialize(){
    if(state.ready)return;if(initPromise)return initPromise;
    state.initializing=true;state.error=null;status();
    initPromise=(async()=>{
      try{
        if(location.protocol==='file:')throw new Error('Mở bằng máy chủ HTTP cục bộ; file:// không hỗ trợ Worker dữ liệu này.');
        if(!window.RTRTwin?.AnalysisClient||!window.RTRTwin?.SourceCore)throw new Error('Chưa nạp thư viện phân tích dùng chung.');
        const response=await fetch(CORE+'projects/hcmc.json',{cache:'no-cache'});if(!response.ok)throw new Error('Không tải được hồ sơ nguồn HTTP '+response.status);
        state.config=await response.json();client?.destroy();
        client=new window.RTRTwin.AnalysisClient({workerUrl:CORE+'analysis-worker.js',config:state.config});
        const dataUrl=new URL(state.config.input.url,location.href);if(dataUrl.origin!==location.origin)throw new Error('Tệp dữ liệu phải thuộc máy chủ hiện hành.');
        const input=await fetch(dataUrl.href);if(!input.ok)throw new Error('Không tải được tệp hình học HTTP '+input.status);
        state.info=await client.init({type:'rtr-raw-json/1.0',bytes:await input.arrayBuffer()});state.ready=true;
      }catch(e){state.error=errorMessage(e);state.ready=false;}finally{state.initializing=false;initPromise=null;status();}
    })();return initPromise;
  }
  function dispose(group){while(group.children.length){const o=group.children[0];group.remove(o);o.geometry?.dispose();(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m?.dispose());}}
  function lineSegments(group,points,color,y=1.9){
    if(points.length<2)return;const a=[];for(let i=1;i<points.length;i++)a.push(points[i-1][0],y,points[i-1][1],points[i][0],y,points[i][1]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.94,depthWrite:false,depthTest:false});const l=new THREE.LineSegments(g,m);l.renderOrder=950;group.add(l);
  }
  function pathTube(group,points,color,y=2.2){
    if(points.length<2)return;const curve=new THREE.CurvePath();for(let i=1;i<points.length;i++){if(Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1])<.01)continue;curve.add(new THREE.LineCurve3(new THREE.Vector3(points[i-1][0],y,points[i-1][1]),new THREE.Vector3(points[i][0],y,points[i][1])));}
    if(!curve.curves.length)return;const g=new THREE.TubeGeometry(curve,Math.min(384,points.length*4),1.5,5,false),m=new THREE.MeshBasicMaterial({color,depthTest:false,depthWrite:false});const mesh=new THREE.Mesh(g,m);mesh.renderOrder=953;group.add(mesh);
  }
  const local=p=>window.RTRTwin.SourceCore.forwardLocal(p,state.config.frame);
  const geo=p=>window.RTRTwin.SourceCore.inverseLocal(p,state.config.frame);
  const polygons=geometry=>geometry?.type==='Polygon'?[geometry.coordinates]:geometry?.type==='MultiPolygon'?geometry.coordinates:[];
  function resultOverlay(){
    dispose(resultGroup);if(!state.result||!state.overlay){status();return;}
    const s=selected(),verts=[],indices=[],edges=[];
    for(const poly of polygons(s.geometry)){
      const flat=[],holes=[],start=verts.length/3;let count=0;
      poly.forEach((ring,ri)=>{if(ri)holes.push(count);const pts=ring.map(local);for(const p of pts){flat.push(...p);verts.push(p[0],1.55,p[1]);count++;}for(let i=1;i<pts.length;i++)edges.push(pts[i-1][0],1.9,pts[i-1][1],pts[i][0],1.9,pts[i][1]);});
      indices.push(...window.earcut(flat,holes,2).map(i=>i+start));
    }
    if(verts.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);const m=new THREE.MeshBasicMaterial({color:0x43cec0,side:THREE.DoubleSide,transparent:true,opacity:.18,depthWrite:false});const mesh=new THREE.Mesh(g,m);mesh.renderOrder=940;resultGroup.add(mesh);}
    const highlight=[];
    for(const f of s.features?.features||[]){
      const native=window.CITY_DATA.buildings[f.properties?.modelIndex];const y=Math.max(3,(native?.h||f.properties?.height?.value||10)+2);
      for(const poly of polygons(f.geometry))for(const ring of poly){const pts=ring.map(local);for(let i=1;i<pts.length;i++)highlight.push(pts[i-1][0],y,pts[i-1][1],pts[i][0],y,pts[i][1]);}
    }
    for(const [a,color] of [[edges,0x7ff8e7],[highlight,0xffd59c]])if(a.length){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.9,depthWrite:false,depthTest:false});const l=new THREE.LineSegments(g,m);l.renderOrder=951;resultGroup.add(l);}
    if(state.geometry.type==='LineString')pathTube(resultGroup,state.geometry.coordinates.map(local),0xf4f7ed,2.2);
    status();
  }
  function drawPreview(){
    dispose(draftGroup);const pts=state.points.slice();if(previewPoint)pts.push(previewPoint);if(state.mode==='area'&&pts.length>2)pts.push(pts[0]);pathTube(draftGroup,pts,0xffd18b,2.2);
    if(state.points.length){const a=state.points.flatMap(p=>[p[0],2.4,p[1]]),g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(a,3));const m=new THREE.PointsMaterial({color:0xffffff,size:7,sizeAttenuation:false,depthTest:false});const p=new THREE.Points(g,m);p.renderOrder=952;draftGroup.add(p);}
  }
  function pointAt(event){
    const r=canvas.getBoundingClientRect(),p=new THREE.Vector2((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,window.cityScene.camera);
    const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-1.5),new THREE.Vector3());return hit&&Math.abs(hit.x)<100000&&Math.abs(hit.z)<100000?[hit.x,hit.z]:null;
  }
  function onPointer(event){
    if(!state.drawing||!sceneHost.contains(event.target))return;event.preventDefault();event.stopImmediatePropagation();
    if(event.type==='pointerdown'&&event.button===0){const p=pointAt(event),last=state.points.at(-1);if(!p){state.error='Điểm chọn chưa giao mặt phẳng bản đồ. Hãy chọn thấp hơn đường chân trời.';status();return;}if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>.3){if(state.points.length>=128){state.error='Tối đa128điểm; hãy kết thúc vùng hoặc lùi điểm.';status();return;}state.error=null;state.points.push(p);previewPoint=null;drawPreview();status();}}
    if(event.type==='pointermove'){previewPoint=pointAt(event);if(!draftFrame)draftFrame=requestAnimationFrame(()=>{draftFrame=0;drawPreview();});}
    if(event.type==='dblclick')finishDrawing();
  }
  function drawingKey(event){
    if(!state.drawing||event.ctrlKey||event.metaKey||event.altKey||event.target.closest?.('input,textarea,select,[contenteditable=true]'))return;
    const key=event.key.toLowerCase();if(['escape','enter','backspace','delete','arrowup','arrowdown','arrowleft','arrowright','w','a','s','d','q','e','+','-','=','_'].includes(key)){event.preventDefault();event.stopImmediatePropagation();if(key==='escape')stopDrawing();else if(key==='enter')finishDrawing();else if(['backspace','delete'].includes(key))undo();}
  }
  function bindDrawing(on){for(const kind of ['pointerdown','pointerup','pointermove','pointercancel','dblclick','wheel'])document[on?'addEventListener':'removeEventListener'](kind,onPointer,{capture:true,passive:false});window[on?'addEventListener':'removeEventListener']('keydown',drawingKey,true);canvas.style.cursor=on?'crosshair':'';}
  function startDrawing(){if(!state.ready||state.busy)return;window.CityLabPanels.stopMotion();if(typeof desired!=='undefined')desired=null;clearResult();state.geometry=null;state.origin='user-drawn-example';state.points=[];state.error=null;state.drawing=true;bindDrawing(true);canvas.focus({preventScroll:true});status();}
  function stopDrawing(){state.drawing=false;bindDrawing(false);cancelAnimationFrame(draftFrame);draftFrame=0;previewPoint=null;dispose(draftGroup);status();}
  function undo(){state.points.pop();drawPreview();status();}
  function finishDrawing(){
    if(state.points.length<(state.mode==='area'?3:2)){state.error='Chưa đủ điểm để kết thúc.';status();return;}
    try{const points=state.points.map(geo);state.geometry=state.mode==='area'?{type:'Polygon',coordinates:[[...points,points[0]]]}:{type:'LineString',coordinates:points};stopDrawing();runQuery();}catch(e){state.error='Tọa độ vùng vẽ không hợp lệ. Hãy lùi điểm hoặc vẽ lại.';status();}
  }
  function setMode(mode){if(state.busy)cancelQuery();stopDrawing();clearResult();state.mode=mode;state.geometry=null;state.points=[];state.error=null;status();}
  function distances(){const values=['A','B','C'].map(k=>Number(byId('t17Distance'+k).value));if(values.some(v=>!Number.isFinite(v)||v<5||v>500)||new Set(values).size!==3)throw new Error('A/B/C phải khác nhau và trong khoảng5–500m.');return values;}
  async function runQuery(){
    if(!state.ready||!state.geometry||state.drawing)return;
    let ds;try{ds=state.mode==='corridor'?distances():[];}catch(e){state.error=errorMessage(e);status();return;}
    const request=++state.request;state.busy=true;state.error=null;status();
    try{const queryBytes=new TextEncoder().encode(JSON.stringify({geometry:state.geometry,mode:state.mode,distances:ds}));const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',queryBytes)),b=>b.toString(16).padStart(2,'0')).join('');if(request!==state.request)return;const result=await client.query({geometry:state.geometry,mode:state.mode,distances:ds});if(request!==state.request)return;state.queryHash=hash;state.result=result;state.scenario=0;state.overlay=true;state.busy=false;renderResult();resultOverlay();}
    catch(e){if(request!==state.request)return;if(e.name!=='AbortError')state.error=errorMessage(e);if(!client.ready)state.ready=false;}
    finally{if(request===state.request){state.busy=false;status();}}
  }
  function cancelQuery(){state.request++;client?.cancel();state.busy=false;state.error=null;status();}
  function clearResult(){cancelQuery();state.result=null;exportFiles={};setup.open=true;dispose(resultGroup);status();}
  function sample(){
    if(!state.ready)return;setMode('corridor');
    const length=r=>r.c.slice(1).reduce((n,p,i)=>n+Math.hypot(p[0]-r.c[i][0],p[1]-r.c[i][1]),0);
    const road=window.CITY_DATA.roads.filter(r=>r.name?.normalize('NFC').toLocaleLowerCase('vi')==='nguyễn huệ'&&r.c?.length>1&&!r.tunnel).sort((a,b)=>length(b)-length(a))[0];
    if(!road){state.error='Không tìm thấy tuyến Nguyễn Huệ trong dữ liệu hiện có.';status();return;}
    state.origin={kind:'existing-road-example',name:road.name,sourceRoadId:road.id,notApprovedPlan:true};state.geometry={type:'LineString',coordinates:road.c.map(geo)};runQuery();zoomToGeometry();
  }
  function zoomToGeometry(){
    if(!state.geometry)return;const points=state.geometry.type==='LineString'?state.geometry.coordinates:polygons(state.geometry).flat(2);const coords=points.map(local);if(!coords.length)return;
    const xs=coords.map(p=>p[0]),zs=coords.map(p=>p[1]),cx=(Math.min(...xs)+Math.max(...xs))/2,cz=(Math.min(...zs)+Math.max(...zs))/2,span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs));
    window.CityLabPanels.stopMotion();
    if(typeof desired!=='undefined')desired=null;if(typeof target!=='undefined')target.set(cx,25,cz);if(typeof distance!=='undefined')distance=Math.max(450,Math.min(5000,span*1.75));if(typeof polar!=='undefined')polar=.78;
    status();
  }
  const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safeCell=v=>{let s=String(v??'');if(typeof v!=='number'&&/^[\s]*[=+\-@]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
  function reportPayload(){return {schema:'rtr-twin-analysis-report-17a',createdAt:new Date().toISOString(),querySHA256:state.queryHash,project:state.config?.project||state.result?.project,origin:state.origin,flatReferenceY:1.5,officialBoundary:false,surveyed:false,camera:cameraSnapshot(),selectedScenario:state.scenario,sourceConfig:state.config,result:state.result,limitations:limitationsVN};}
  function exportsFor(payload){
    const rows=[['record_type','metadata_key','metadata_value','scenario','distance_m','representation_id','source_id','source_key','name','height_value','height_kind','source_epoch','geometry_geojson']];
    const metadata={schema:payload.schema,created_at:payload.createdAt,query_sha256:payload.querySHA256,query_geometry:JSON.stringify(payload.result.query.geometry),query_mode:payload.result.query.mode,measurement_method:payload.result.query.measurementMethod,not_surveyed:true,official_boundary:false,flat_reference_y:1.5,camera:JSON.stringify(payload.camera),input_sha256:payload.sourceConfig.input?.sha256,input_integrity:JSON.stringify(payload.result.provenance.inputIntegrity||null),source_config_version:payload.sourceConfig.schema,source_config:JSON.stringify(payload.sourceConfig),provenance:JSON.stringify(payload.result.provenance),limitations:JSON.stringify([...payload.limitations,...payload.result.limitations]),scenario_summaries:JSON.stringify(payload.result.scenarios.map(s=>({key:s.key,distanceM:s.distanceM,geometry:s.geometry,summary:s.summary})))};
    for(const [key,value] of Object.entries(metadata))rows.push(['metadata',key,value,...Array(10).fill('')]);
    for(const s of payload.result.scenarios)for(const f of s.features.features){const p=f.properties||{};rows.push(['feature','','',s.key,s.distanceM,p.id,p.sourceId,p.sourceKey,p.name,p.height?.value,p.height?.kind,p.sourceEpoch,JSON.stringify(f.geometry)]);}
    const summary=payload.result.scenarios.map(s=>`<tr><td>${escapeHtml(s.label||s.key)}</td><td>${fmt(s.summary.representationCount)}</td><td>${fmt(s.summary.identityCount)}</td><td>${fmt(s.summary.unionAreaM2,1)}</td></tr>`).join('');
    return {JSON:JSON.stringify(payload,null,2),CSV:'\uFEFF'+rows.map(r=>r.map(safeCell).join(',')).join('\r\n'),HTML:`<!doctype html><html lang="vi"><meta charset="utf-8"><title>City Lab — báo cáo phân tích</title><style>body{max-width:950px;margin:40px auto;padding:0 24px;font:15px/1.6 system-ui;color:#193832}table{border-collapse:collapse;width:100%}td,th{padding:10px;border-bottom:1px solid #ccc;text-align:left}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px}@media print{button{display:none}}</style><h1>Phạm vi phân tích minh họa</h1><p>${escapeHtml(payload.createdAt)} · không phải phương án quy hoạch được duyệt.</p><button onclick="window.print()">In báo cáo</button><table><thead><tr><th>Phép thử</th><th>Biểu diễn</th><th>Nhóm ID nguồn</th><th>Diện tích hợp nhất m²</th></tr></thead><tbody>${summary}</tbody></table><h2>Giới hạn</h2><ul>${limitationsVN.map(x=>'<li>'+escapeHtml(x)+'</li>').join('')}</ul><h2>Nguồn và dấu vân tay</h2><pre>${escapeHtml(JSON.stringify({provenance:payload.result.provenance,sourceConfig:payload.sourceConfig},null,2))}</pre><h2>Phạm vi và góc nhìn</h2><pre>${escapeHtml(JSON.stringify({query:payload.result.query,camera:payload.camera,origin:payload.origin},null,2))}</pre></html>`};
  }
  function download(kind){if(!state.result)return;const contents=exportsFor(reportPayload())[kind],mime={JSON:'application/json',CSV:'text/csv;charset=utf-8',HTML:'text/html;charset=utf-8'}[kind],blob=new Blob([contents],{type:mime}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='city-lab-analysis-'+new Date().toISOString().slice(0,10)+'.'+kind.toLowerCase();a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
  function renderResult(){
    setup.open=false;$('#l16Content').scrollTop=0;
    const tabs=byId('t17Scenarios');tabs.replaceChildren();state.result.scenarios.forEach((s,i)=>{const b=node('button',(state.result.query.mode==='corridor'&&s.distanceM!=null?String.fromCharCode(65+i)+' · '+fmt(s.distanceM)+' m':'Vùng chọn'));attr(b,'aria-pressed',i===state.scenario);b.onclick=()=>{state.scenario=i;renderResult();resultOverlay();};tabs.append(b);});
    const s=selected(),summary=byId('t17Summary');summary.replaceChildren();
    const dl=node('dl');for(const [label,value] of [['Nhóm ID nguồn',fmt(s.summary.identityCount)],['Diện tích hợp nhất',fmt(s.summary.unionAreaM2,1)+' m²'],['Biểu diễn hình học',fmt(s.summary.representationCount)],['Diện tích giao cộng dồn',fmt(s.summary.intersectionAreaM2,1)+' m²']]){const row=node('div');row.append(node('dt',label),node('dd',value));dl.append(row);}summary.append(dl,node('p','Viền đối tượng chọn là ký hiệu phân tích, không phải ảnh cảm biến. Số ID không đồng nhất với số nhà/thửa đất đã kiểm chứng.','t17-note'));
    if(s.coverage)summary.append(node('p',({within:'Phạm vi nằm trong vùng dữ liệu; mức đầy đủ chưa kiểm chứng.',partial:'Phạm vi vượt một phần vùng dữ liệu; kết quả có thể thiếu.',outside:'Phạm vi ở ngoài vùng dữ liệu hiện có.'})[s.coverage.status]||'Phạm vi dữ liệu chưa xác định.','t17-note'));
    const sources=byId('t17Sources');sources.replaceChildren();sources.append(node('p','Phương pháp: chọn hình học giao hoặc tiếp xúc biên; hợp nhất phần footprint giao để loại diện tích trùng.'));
    const provenance=state.result.provenance||{};
    const used=new Set(Object.keys(s.summary.sourceCounts||{}));
    for(const source of provenance.sources||[]){const d=node('details'),label=source.title||source.name||source.id||source.key||'Nguồn',isUsed=used.has(source.id)||used.has(source.key);d.append(node('summary',(isUsed?'Đã dùng · ':'Tham chiếu / đầu mối · ')+label));d.append(node('p',isUsed?'Nguồn footprint có đối tượng trong kết quả này.':'Không dùng làm footprint trong phép tính hiện hành; có thể là tài liệu hoặc đầu mối chưa thu nhận.'));const pre=node('pre',JSON.stringify(source,null,2));d.append(pre);sources.append(d);}
    sources.append(node('p',provenance.inputIntegrity?.verified?'Hash tệp đầu vào đã được tính và khớp với danh mục. Hash xác nhận byte dữ liệu, không xác nhận đúng hiện trạng.':'Hash nguồn trong danh mục là thông tin khai báo; chưa có xác nhận byte đầu vào cho kết quả này.'));
    const methods=node('details');methods.append(node('summary','Nhóm nguồn & cách có chiều cao'),node('pre',JSON.stringify({sourceCounts:s.summary.sourceCounts,heightKinds:s.summary.heightKinds},null,2)));sources.append(methods);
    sources.append(node('p','Ngày chụp/cao độ không rõ được giữ null. Chiều cao có nguồn vẫn chưa phải đo kiểm; ảnh cũ và chi tiết mô phỏng không chứng minh hiện trạng.'));
    const raw=node('details');raw.append(node('summary','Phương pháp đo và giới hạn kỹ thuật'),node('pre',JSON.stringify({measurementMethod:state.result.query.measurementMethod,limitations:state.result.limitations},null,2)));sources.append(raw);
    exportFiles=exportsFor(reportPayload());const exports=byId('t17Exports');exports.replaceChildren();for(const kind of ['JSON','CSV','HTML']){const b=node('button',kind+' · '+fmt(new Blob([exportFiles[kind]]).size/1024,1)+' KB');b.onclick=()=>download(kind);exports.append(b);}status();
  }
  byId('t17Area').onclick=()=>setMode('area');byId('t17Corridor').onclick=()=>setMode('corridor');byId('t17Draw').onclick=startDrawing;byId('t17Sample').onclick=sample;byId('t17Undo').onclick=undo;byId('t17Finish').onclick=finishDrawing;byId('t17CancelDraw').onclick=stopDrawing;byId('t17Run').onclick=runQuery;byId('t17Cancel').onclick=cancelQuery;byId('t17Retry').onclick=initialize;byId('t17Overlay').onclick=()=>{state.overlay=!state.overlay;resultOverlay();};byId('t17Zoom').onclick=zoomToGeometry;byId('t17Clear').onclick=()=>{clearResult();state.geometry=null;status();};
  const panelButton=window.CityLabPanels.registerPanel('analysis','Phân tích',container=>{mounted=true;container.append(shell);status();initialize();},()=>{mounted=false;stopDrawing();if(state.busy)cancelQuery();});panelButton.id='twin17Open';
  badge.onclick=()=>window.CityLabPanels.openPanel('analysis');
  window.RTRTwin.UI17=Object.freeze({version:'17a',open:()=>window.CityLabPanels.openPanel('analysis'),getStatus:()=>JSON.parse(probe.dataset.json),cancel:()=>{stopDrawing();cancelQuery();},safeCSVCell:safeCell,escapeHtml,exportSnapshot:()=>state.result?reportPayload():null});
  status();
})();
