/* Executive shell: source-led navigation, no future geometry without reviewed drawings. */
(() => {
  'use strict';
  const q = (s) => document.querySelector(s);
  // Synchronize observable state without repeatedly invalidating unchanged DOM.
  const textIfChanged=(el,value)=>{if(el&&el.textContent!==value)el.textContent=value;};
  const attrIfChanged=(el,key,value)=>{const next=String(value);if(el&&el.getAttribute(key)!==next)el.setAttribute(key,next);};
  const propIfChanged=(el,key,value)=>{if(el&&el[key]!==value)el[key]=value;};
  const params = new URLSearchParams(location.search);
  const entries = window.FACADES_15?.manifest.entries || [];
  const titles = {explore:'Khám phá thành phố', planning:'Tầm nhìn quy hoạch', compare:'Đối chiếu hình ảnh', tour:'Tham quan có hướng dẫn', sources:'Nguồn & giới hạn'};
  const panelPlugins = new Map();
  const state = {mode:'leadership', panel:null, tourIndex:-1, fullscreenOutcome:'idle'};
  let fullscreenWatch=0, noticeTimer=0;
  let returnFocus = null;
  const root = document.createElement('section');
  root.id = 'leadership16';
  root.setAttribute('aria-label', 'Trải nghiệm thành phố');
  root.innerHTML = `
    <div class="l16-top"><div class="l16-brand">CITY LAB <span>HỒ CHÍ MINH</span></div><button id="l16Research">Nghiên cứu ↗</button></div>
    <nav class="l16-nav" aria-label="Tác vụ bản đồ">
      <button data-l16-panel="explore" aria-expanded="false" aria-controls="l16Drawer">Khám phá</button>
      <button data-l16-panel="planning" aria-expanded="false" aria-controls="l16Drawer">Quy hoạch</button>
      <button data-l16-panel="compare" aria-expanded="false" aria-controls="l16Drawer">So sánh</button>
      <button data-l16-panel="tour" aria-expanded="false" aria-controls="l16Drawer">Tham quan</button>
    </nav>
    <aside id="l16Drawer" aria-labelledby="l16Title" hidden>
      <div class="l16-drawer-head"><h2 id="l16Title"></h2><button id="l16Close" aria-label="Thu gọn bảng thông tin">×</button></div>
      <div id="l16Content"></div>
    </aside>
    <div class="l16-bottom"><div><button id="l16Sources" aria-controls="l16Drawer" aria-expanded="false"><i></i> Hiện trạng gần đúng <span>ⓘ</span></button><p id="l16Place">Toàn khu vực</p></div>
      <div class="l16-utilities"><button id="l16Reset" aria-label="Về toàn cảnh" title="Về toàn cảnh">⌂</button><button id="l16Full" aria-label="Toàn màn hình" title="Toàn màn hình · F">⛶</button><button id="l16Hide" aria-label="Ẩn giao diện" title="Ẩn giao diện · H">◧</button></div>
    </div>
    <div class="l16-attribution"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a> · <a href="https://docs.overturemaps.org/attribution/" target="_blank" rel="noreferrer">Overture</a> · <a href="https://cloudless.eox.at" target="_blank" rel="noreferrer">EOX / Sentinel</a><span> · Nguồn ảnh trong ⓘ</span></div>
    <div id="l16Notice" role="status" aria-live="polite" hidden></div>
    <output id="leadership16Status" hidden></output>`;
  q('#viewport').append(root);
  const returnButton = document.createElement('button');
  returnButton.id = 'l16Return';
  returnButton.textContent = '← Trình lãnh đạo';
  q('#viewport').append(returnButton);
  const node = (tag, text, cls) => {const el = document.createElement(tag); if(text) el.textContent=text; if(cls) el.className=cls; return el;};
  const content = q('#l16Content');
  const mapCanvas=q('#scene canvas');
  if(mapCanvas){mapCanvas.tabIndex=0;mapCanvas.setAttribute('aria-label','Bản đồ 3D. Mũi tên để di chuyển, Q và E để xoay, cộng trừ để thu phóng.');}
  const paragraph = (text, cls) => content.append(node('p', text, cls));
  const action = (text, fn, parent=content) => {const b=node('button',text,'l16-action'); b.onclick=fn; parent.append(b); return b;};
  const link = (text, url, parent=content) => {if(typeof url!=='string'||!url)return;const a=node('a',text); try {const u=new URL(url,location.href);if(!['http:','https:','file:'].includes(u.protocol))return;a.href=u.href;}catch{return;}a.target='_blank';a.rel='noreferrer';parent.append(a);return a;};
  const entry = () => entries.find(e=>e.key===q('#facade15Select')?.value);
  const compatible = () => window.currentView==='facades' && window.facade15Status?.ready && window.facade15Status?.selectedEligible && entry()?.surface_fit?.eligible === true && window.facade15Status?.selected === entry()?.key && !audit;
  function stopMotion(){
    if(window.cinematic12Status?.director) q('#p12Director')?.click();
    if(typeof stopCinema==='function') stopCinema();
    if(q('#tour')?.getAttribute('aria-pressed')==='true') q('#tour').click();
    if(q('#followMission')?.getAttribute('aria-pressed')==='true') q('#followMission').click();
  }
  function navigate(id, keepPanel=false){
    window.dispatchEvent(new CustomEvent('citylab:before-navigate',{detail:{view:id}}));
    stopMotion();
    q('.views [data-view="'+id+'"]')?.click();
    if(id!=='cinematicnight' && typeof illumination==='function') illumination(.18);
    if(!keepPanel){closePanel(false);mapCanvas?.focus({preventScroll:true});}
    updateStatus();
  }
  function chooseFacade(key){
    window.dispatchEvent(new CustomEvent('citylab:before-navigate',{detail:{view:'facades'}}));
    stopMotion();
    const select=q('#facade15Select');if(!select)return;
    select.value=key;select.dispatchEvent(new Event('change',{bubbles:true}));
    updateStatus();
  }
  function photoSelector(parent=content){
    const label=node('label','Công trình'); label.htmlFor='l16FacadeSelect';
    const select=node('select');select.id='l16FacadeSelect';
    entries.forEach(e=>{const o=node('option',e.name);o.value=e.key;select.append(o);});
    select.value=entry()?.key||entries[0]?.key||'';
    select.onchange=()=>{chooseFacade(select.value); if(state.panel==='explore')renderPhotoCard();};
    parent.append(label,select);
    return select;
  }
  function renderPhotoCard(){
    q('#l16PhotoCard')?.remove();
    const e=entry();if(!e)return;
    const card=node('div',null,'l16-photo');card.id='l16PhotoCard';
    const img=node('img');img.src=window.FACADES_15.references[e.key];img.alt='Ảnh nguồn: '+e.name;card.append(img);
    card.append(node('p',e.photo_date+' · '+e.author+' · '+e.license,'l16-caption'));
    card.append(node('p',e.surface_fit?.eligible!==true?'Ảnh tham khảo; công trình đang chờ đối chiếu mặt đứng.':'Ảnh đúng địa điểm; mô hình hình học vẫn gần đúng.'));
    if(e.render_mode==='sampled_envelope')card.append(node('p','Vỏ tháp dùng vật liệu lấy mẫu và lặp từ ảnh; không khớp từng ô cửa.'));
    link('Ảnh gốc & giấy phép ↗',e.source_url,card);content.append(card);
  }
  function explore(){
    if(panelPlugins.has('surface18'))action('Ảnh & địa hình',()=>openPanel('surface18')).id='surface18Explore';
    if(panelPlugins.has('changes23'))action('Biến động xây dựng',()=>openPanel('changes23')).id='changes23Explore';
    paragraph('Chọn một điểm đến, rồi kéo để xoay và cuộn để tiến gần. Mũi tên / WASD để di chuyển.','l16-lead');
    if(q('.views [data-view="district20"]'))action('Mở cụm Nhà hát · Lam Sơn',()=>navigate('district20')).id='hero20bExplore';
    if(q('.views [data-view="hero20"]'))action('Cận cảnh · Nhà hát',()=>navigate('hero20')).id='hero20Explore';
    const grid=node('div',null,'l16-grid');content.append(grid);
    [['overview','Toàn khu vực'],['river','Bến Bạch Đằng'],['boulevard','Nguyễn Huệ'],['landmark','Landmark 81']].forEach(([id,name])=>action(name,()=>navigate(id),grid));
    content.append(node('h3','20 công trình · ảnh đối chiếu'));
    photoSelector();
    action('Đến công trình',()=>{chooseFacade(q('#l16FacadeSelect').value);renderPhotoCard();});
    renderPhotoCard();
  }
  function planning(){
    content.append(node('span','Đang chuẩn bị hồ sơ','l16-tag'));
    paragraph('Tầm nhìn 100 năm','l16-heading');
    paragraph('Chưa có bản vẽ quy hoạch đã đối chiếu để dựng lớp 3D. Bản đồ hiện giữ mô hình hiện trạng gần đúng.','l16-lead');
    paragraph('Các tài liệu dưới đây xác nhận định hướng hoặc công tác lập quy hoạch. Không tự suy ra hình dáng công trình hay năm hoàn thành.');
    const sources=window.PLANNING_16?.sources||[];
    if(!sources.length)paragraph('Danh mục nguồn chưa nạp được. Chưa mở lớp quy hoạch.','l16-empty');
    sources.forEach(s=>{
      const card=node('article',null,'l16-source');
      card.append(node('h3',s.title||'Tài liệu nguồn'));
      const val=v=>Array.isArray(v)?v.join(' · '):typeof v==='object'?JSON.stringify(v):String(v||'');
      card.append(node('p',val(s.status),'l16-tag'),node('p',val(s.scope)),node('p',val(s.allowedUse)));
      link('Mở trang nguồn ↗',s.url,card);
      const detail=node('details');detail.append(node('summary','Nguồn & phạm vi sử dụng'));
      detail.append(node('p',[s.publisher,s.publishedAt].filter(Boolean).join(' · ')));
      if(s.originalPublisher && s.originalPublisher!==s.publisher)detail.append(node('p','Nguồn gốc nội dung: '+s.originalPublisher));
      if(s.limitations)detail.append(node('p',val(s.limitations)));
      if(s.rights)detail.append(node('p',val(s.rights)));
      card.append(detail);content.append(card);
    });
    paragraph('Bước tiếp: nhận bản vẽ, xác minh phiên bản và phạm vi áp dụng, rồi mới dựng và đối chiếu từng lớp.','l16-note');
  }
  function compare(){
    paragraph('Đổi lớp ảnh tại cùng góc nhìn. Đây là đối chiếu hình ảnh, không phải quy hoạch tương lai.','l16-lead');
    photoSelector();
    action('Đến công trình',()=>chooseFacade(q('#l16FacadeSelect').value));
    const group=node('div',null,'l16-grid');content.append(group);
    const base=action('Mô hình nền',()=>setPhoto(false),group);base.id='l16Base';
    const photo=action('Ảnh tham chiếu',()=>setPhoto(true),group);photo.id='l16Photo';
    const status=node('p',null,'l16-note');status.id='l16CompareNote';status.setAttribute('role','status');content.append(status);
    const details=node('details',null,'l16-detail');details.id='l16CompareDetails';
    details.append(node('summary','Cách đối chiếu & nguồn ảnh'));
    details.append(node('p','Camera giữ nguyên khi đổi lớp. Chiều cao hiệu chỉnh từ ảnh được bật hoặc khôi phục cùng lớp ảnh; hình học chưa được khảo sát.'));
    const source=node('p');source.id='l16CompareSource';details.append(source);
    const geometry=node('p');geometry.id='l16CompareGeometry';details.append(geometry);
    const original=link('Ảnh gốc & giấy phép',entry()?.source_url,details);if(original)original.id='l16CompareOriginal';
    details.append(node('p','Ảnh khác thời điểm, không thể hiện hiện trạng đồng bộ của thành phố.'));
    content.append(details);updateComparison();
  }
  function setPhoto(on){
    if(!compatible())return;
    const ab=q('#facade15AB');if((ab.getAttribute('aria-pressed')==='true')!==on) ab.click();
    updateComparison();
  }
  function updateComparison(){
    if(state.panel!=='compare')return;
    const e=entry(),ok=!!compatible(),on=q('#facade15AB')?.getAttribute('aria-pressed')==='true';
    propIfChanged(q('#l16Base'),'disabled',!ok);propIfChanged(q('#l16Photo'),'disabled',!ok);
    attrIfChanged(q('#l16Base'),'aria-pressed',!on);attrIfChanged(q('#l16Photo'),'aria-pressed',on);
    const note=e?.surface_fit?.eligible!==true?'Chưa đủ đối chiếu mặt đứng. Giữ mô hình nền.':!ok?'Đến công trình để đối chiếu khi ảnh nạp đủ.':e?.render_mode==='sampled_envelope'?'Vật liệu lấy mẫu từ ảnh và lặp; chưa khớp từng ô cửa.':on?'Đang xem lớp ảnh mặt đứng.':'Đang xem mô hình nền.';
    textIfChanged(q('#l16CompareNote'),note);
    textIfChanged(q('#l16CompareSource'),e?[e.name,e.photo_date,e.author,e.license].filter(Boolean).join(' · '):'Chưa có nguồn ảnh.');
    textIfChanged(q('#l16CompareGeometry'),e?.surface_fit?.reason||'Hình học đang được đối chiếu.');
    if(e?.source_url)attrIfChanged(q('#l16CompareOriginal'),'href',e.source_url);
  }
  const stops=[['overview','Toàn khu vực','Đọc cấu trúc đô thị và sông Sài Gòn. Chiều cao và địa hình chưa được đo kiểm.'],['river','Bến Bạch Đằng','Quan sát không gian ven sông. Cây, tàu và ánh sáng là thành phần minh họa.'],['boulevard','Nguyễn Huệ','Tiến gần trục phố đi bộ và các công trình. Ảnh tham chiếu có nguồn riêng và khác thời điểm.'],['landmark','Landmark 81','Đọc đường chân trời và hình khối biểu tượng. Chi tiết công trình cần tiếp tục đối chiếu.']];
  function tourPanel(){
    paragraph('Bốn điểm nhìn, theo nhịp trình bày của bạn. Có thể xoay và tiến gần ở mỗi điểm.','l16-lead');
    const title=node('h3');title.id='l16TourTitle';content.append(title);
    const detail=node('p');detail.id='l16TourDetail';content.append(detail);
    const group=node('div',null,'l16-grid');content.append(group);
    action('← Trước',()=>tourStep(state.tourIndex-1),group).id='l16TourPrev';
    action('Tiếp →',()=>tourStep(state.tourIndex+1),group).id='l16TourNext';
    action('Bắt đầu tham quan',()=>tourStep(0)).id='l16TourStart';
    action('Kết thúc tham quan',()=>{state.tourIndex=-1;stopMotion();closePanel();}).id='l16TourStop';
    updateTour();
  }
  function tourStep(i){state.tourIndex=Math.max(0,Math.min(stops.length-1,i));navigate(stops[state.tourIndex][0],true);updateTour();}
  function updateTour(){
    const i=state.tourIndex,stop=stops[Math.max(i,0)];
    q('#l16TourTitle').textContent=i<0?'Sẵn sàng khám phá':`${i+1} / ${stops.length} · ${stop[1]}`;
    q('#l16TourDetail').textContent=i<0?'Bắt đầu từ toàn cảnh thành phố, rồi đến từng không gian.':stop[2];
    q('#l16TourPrev').disabled=i<=0;q('#l16TourNext').disabled=i<0||i>=stops.length-1;
    q('#l16TourStart').hidden=i>=0;q('#l16TourStop').hidden=i<0;
  }
  function sources(){
    paragraph('Mô hình hiện trạng gần đúng','l16-heading');
    paragraph('Mặt bằng và đường từ dữ liệu mở; phần lớn chiều cao, vật liệu, cây và tàu là mô phỏng. Ảnh địa điểm được dùng có khai báo, chưa thay thế dữ liệu khảo sát.','l16-lead');
    paragraph('Nguồn khác thời điểm: không coi cảnh này là ảnh chụp đồng bộ của thành phố hôm nay.');
    const credits=q('footer .credits')?.cloneNode(true);if(credits){credits.className='l16-credit-list';content.append(credits);const last=credits.querySelector('span');if(last)last.textContent='Nền phẳng quy ước; vị trí và chiều cao chưa đo kiểm.';}
    link('20 ảnh công trình & giấy phép ↗','research/facades-15/index.html');
    paragraph('Phím: mũi tên / WASD di chuyển · Q/E xoay · +/− zoom · F toàn màn hình · H ẩn giao diện · Escape đóng bảng.');
    action('Xem hồ sơ quy hoạch',()=>openPanel('planning'));
  }
  function openPanel(name){
    if(state.panel===name){closePanel();return;}
    const renderPanel=({explore,planning,compare,tour:tourPanel,sources})[name] || panelPlugins.get(name)?.render;
    if(typeof renderPanel!=='function')return;
    window.dispatchEvent(new CustomEvent('citylab:before-panel',{detail:{name}}));
    panelPlugins.get(state.panel)?.onClose?.();
    returnFocus=document.activeElement;
    window.cityUi?.closePanels();q('#selection').hidden=true;
    state.panel=name;content.replaceChildren();q('#l16Title').textContent=titles[name];
    renderPanel(content);
    q('#l16Drawer').hidden=false;syncExpanded();q('#l16Close').focus();updateStatus();
  }
  function closePanel(restore=true){panelPlugins.get(state.panel)?.onClose?.();state.panel=null;q('#l16Drawer').hidden=true;syncExpanded();if(restore&&returnFocus?.isConnected)returnFocus.focus();else if(!restore&&q('#l16Drawer').contains(document.activeElement))mapCanvas?.focus({preventScroll:true});updateStatus();}
  function syncExpanded(){root.querySelectorAll('[data-l16-panel]').forEach(b=>attrIfChanged(b,'aria-expanded',b.dataset.l16Panel===state.panel));attrIfChanged(q('#l16Sources'),'aria-expanded',state.panel==='sources');}
  function setMode(mode){
    state.mode=mode;closePanel(false);window.cityUi?.closePanels();q('#research')?.close();
    document.body.classList.toggle('leadership-mode',mode==='leadership');
    if(mode==='leadership'){
      stopMotion();
      ['#mission','#audit','#pilotHeight'].forEach(id=>{if(q(id)?.getAttribute('aria-pressed')==='true')q(id).click();});
      q('#selection').hidden=true;
    }
    const url=new URL(location.href);if(mode==='research')url.searchParams.set('mode','research');else url.searchParams.delete('mode');history.replaceState(null,'',url);
    updateStatus();
  }
  function notifyFullscreenUnavailable(){
    state.fullscreenOutcome='unavailable';
    const notice=q('#l16Notice');
    notice.textContent='Toàn màn hình chưa khả dụng trong trình duyệt này. Dùng H để dành thêm không gian cho bản đồ.';
    notice.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{notice.hidden=true;},6500);
    updateStatus();
  }
  async function toggleFullscreen(){
    clearTimeout(fullscreenWatch);
    if(!document.fullscreenElement && (document.fullscreenEnabled===false || typeof document.documentElement.requestFullscreen!=='function')){notifyFullscreenUnavailable();return;}
    const entering=!document.fullscreenElement;
    state.fullscreenOutcome='requesting';
    // Some embedded browser surfaces neither reject nor enter fullscreen. Verify the outcome.
    fullscreenWatch=setTimeout(()=>{
      if(entering&&!document.fullscreenElement)notifyFullscreenUnavailable();
      else {state.fullscreenOutcome=document.fullscreenElement?'active':'exited';updateStatus();}
    },1500);
    try {
      if(entering)await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
      if(entering&&!document.fullscreenElement)return;
      clearTimeout(fullscreenWatch);state.fullscreenOutcome=document.fullscreenElement?'active':'exited';
      q('#l16Notice').hidden=true;updateStatus();
    } catch (_) {clearTimeout(fullscreenWatch);notifyFullscreenUnavailable();}
  }
  document.addEventListener('fullscreenchange',()=>{
    clearTimeout(fullscreenWatch);state.fullscreenOutcome=document.fullscreenElement?'active':'exited';
    q('#l16Full').setAttribute('aria-pressed',String(!!document.fullscreenElement));
    q('#l16Full').setAttribute('aria-label',document.fullscreenElement?'Thoát toàn màn hình':'Toàn màn hình');
    q('#l16Notice').hidden=true;updateStatus();
  });
  function updateStatus(){
    if(q('#loading')?.classList.contains('gone'))attrIfChanged(q('#loading'),'aria-hidden','true');
    const labels={changes23:'Biến động xây dựng · snapshot',surface18:'Ảnh & địa hình · gần đúng',overview:'Toàn khu vực',river:'Bến Bạch Đằng',boulevard:'Nguyễn Huệ',landmark:'Landmark 81',facades:entry()?.name||'Mặt đứng công trình',cinematicnight:'Cảnh đêm · ánh sáng minh họa'};
    textIfChanged(q('#l16Place'),labels[window.currentView]||'Khám phá thành phố');
    const status={version:'16b',fullscreen:{supported:document.fullscreenEnabled===true,active:!!document.fullscreenElement,outcome:state.fullscreenOutcome},mode:state.mode,panel:state.panel,view:window.currentView,daylight:typeof lightValue==='number'?lightValue:null,tourIndex:state.tourIndex,planningGeometryEnabled:false,sourceCount:window.PLANNING_16?.sources?.length||0,facade:entry()?.key||null,comparisonEligible:!!compatible(),photoEnabled:q('#facade15AB')?.getAttribute('aria-pressed')==='true',cameraSettled:q('#facade15Hud')?.dataset.cameraSettled==='true',camera:{position:camera.position.toArray().map(v=>+v.toFixed(4)),target:target.toArray().map(v=>+v.toFixed(4))}};
    attrIfChanged(q('#leadership16Status'),'data-json',JSON.stringify(status));
  }
  root.querySelectorAll('[data-l16-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.l16Panel));
  // Small extension point: the shell owns a single drawer and closes active tools.
  window.CityLabPanels = Object.freeze({
    registerPanel(name,title,render,onClose,options={}){
      if(!/^[a-z][a-z0-9-]*$/.test(name)||titles[name]||typeof render!=='function')throw new Error('Invalid or duplicate City Lab panel');
      titles[name]=title;panelPlugins.set(name,{render,onClose});
      const button=node('button',title);button.dataset.l16Panel=name;button.setAttribute('aria-controls','l16Drawer');button.setAttribute('aria-expanded','false');button.onclick=()=>openPanel(name);
      if(!options.hidden)q('.l16-nav').append(button);return button;
    },openPanel,closePanel,stopMotion
  });
  q('#l16Close').onclick=()=>closePanel();q('#l16Sources').onclick=()=>openPanel('sources');
  q('#l16Research').onclick=()=>setMode('research');returnButton.onclick=()=>setMode('leadership');
  q('#l16Reset').onclick=()=>{state.tourIndex=-1;navigate('overview');};
  q('#l16Full').onclick=toggleFullscreen;q('#l16Hide').onclick=()=>q('#demoHideUi')?.click();
  window.addEventListener('keydown',e=>{if(state.mode==='leadership'&&e.key.toLowerCase()==='f'&&!e.metaKey&&!e.ctrlKey&&!e.altKey&&!/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){e.preventDefault();e.stopImmediatePropagation();toggleFullscreen();}},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&state.mode==='leadership')closePanel();});
  q('#scene').addEventListener('pointerdown',()=>{if(state.mode==='leadership'){closePanel(false);mapCanvas?.focus({preventScroll:true});}});
  setMode(params.get('mode')==='research'?'research':'leadership');
  if(!params.has('view'))setTimeout(()=>navigate('overview'),120);
  else setTimeout(()=>{const requested=params.get('view');if([...document.querySelectorAll('.views [data-view]')].some(b=>b.dataset.view===requested)&&window.currentView!==requested)navigate(requested);},120);
  setInterval(()=>{updateComparison();updateStatus();},400);
})();
