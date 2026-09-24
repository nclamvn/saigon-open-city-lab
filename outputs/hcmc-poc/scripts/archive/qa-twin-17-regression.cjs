// Run from repository root; requires the local outputs server on port 8768.
const {chromium}=require('/Users/os/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const out=path.resolve('research/vibecode-17/qa');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chromium',args:['--use-angle=metal']});const page=await browser.newPage({viewport:{width:1280,height:720},acceptDownloads:true});page.setDefaultTimeout(20000);
 const errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));const check=(name,pass,detail)=>{checks.push({name,pass,detail});console.log(name+': '+(pass?'PASS':'FAIL'));if(!pass)throw Error(name+JSON.stringify(detail));};
 const probe=()=>page.locator('#twin17Probe').getAttribute('data-json').then(JSON.parse);
 const ready=()=>page.waitForFunction(()=>window.cityReady&&window.RTRTwin?.UI17,{},{timeout:60000});
 const loaded=()=>page.waitForFunction(()=>{const p=JSON.parse(document.querySelector('#twin17Probe').dataset.json);return p.ready||p.error},{},{timeout:45000});
 const result=()=>page.waitForFunction(()=>{const p=JSON.parse(document.querySelector('#twin17Probe').dataset.json);return !p.busy&&(p.scenarioCount||p.error)},{},{timeout:45000});
 try{
  await page.goto('http://127.0.0.1:8768/hcmc-poc/?v=17-regression&view=facades&facade=vietcombank',{waitUntil:'domcontentloaded',timeout:60000});await ready();
  await page.waitForFunction(()=>window.currentView==='facades'&&document.querySelector('#facade15Select')?.value==='vietcombank',{},{timeout:20000});
  check('explicit_facade_preserved',await page.evaluate(()=>window.currentView==='facades'&&document.querySelector('#facade15Select').value==='vietcombank'));
  await page.locator('#twin17Open').click();await loaded();check('verified_worker_init',(await probe()).ready);
  await page.locator('#t17Sample').click();await result();
  const payload=await page.evaluate(()=>window.RTRTwin.UI17.exportSnapshot());
  check('raw_input_byte_integrity',payload.result.provenance.inputIntegrity.verified===true,payload.result.provenance.inputIntegrity);
  const query={geometry:payload.result.query.geometry,mode:payload.result.query.mode,distances:payload.result.query.distances};
  check('query_sha256_matches',payload.querySHA256===crypto.createHash('sha256').update(JSON.stringify(query)).digest('hex'));
  await page.getByText('Xuất kết quả & lưu đối chiếu',{exact:true}).click();
  for(const kind of ['JSON','CSV','HTML']){const pending=page.waitForEvent('download');await page.locator('#t17Exports button').filter({hasText:kind}).click();const download=await pending;const p=path.join(out,'export.'+kind.toLowerCase());await download.saveAs(p);const contents=fs.readFileSync(p,'utf8');check('download_'+kind,contents.length>100&&contents.includes(payload.sourceConfig.input.sha256),{bytes:fs.statSync(p).size});if(kind==='CSV')check('csv_self_contained_metadata',['query_sha256','query_geometry','source_config','input_integrity','limitations','source_epoch'].every(k=>contents.includes(k)));}
  await page.locator('#t17Setup>summary').click();await page.locator('#t17DistanceA').fill('0');await page.locator('#t17Run').click();check('invalid_width_blocked',!!(await probe()).error&&!((await probe()).busy));
  await page.locator('#t17DistanceA').fill('25');await page.locator('#t17Area').click();await page.locator('#t17Draw').click();
  const before=await page.evaluate(()=>window.keyboardNavStatus.moves);await page.keyboard.press('Shift+W');await page.keyboard.press('Q');
  check('uppercase_navigation_blocked_during_draw',await page.evaluate(v=>window.keyboardNavStatus.moves===v,before));
  await page.locator('[data-l16-panel="explore"]').click();check('switch_panel_cleans_drawing',!(await probe()).drawing);
  await page.locator('#l16Close').click();await page.locator('#scene canvas').press('ArrowRight');check('keyboard_restored_after_draw',await page.evaluate(v=>window.keyboardNavStatus.moves>v,before));
  await page.goto('http://127.0.0.1:8768/hcmc-poc/?v=17-regression-night&view=cinematicnight',{waitUntil:'domcontentloaded',timeout:60000});await ready();
  await page.waitForFunction(()=>window.currentView==='cinematicnight',{},{timeout:20000});check('explicit_night_preserved',await page.evaluate(()=>window.currentView==='cinematicnight'));
  await page.locator('#twin17Open').click();await loaded();await page.locator('#t17Draw').click();
  check('draw_stops_cinematic_director',await page.evaluate(()=>!window.cinematic12Status?.director));await page.keyboard.press('Escape');await page.screenshot({path:path.join(out,'night-regression.png')});
  await page.route('**/shared/digital-twin-core/projects/hcmc.json',async route=>{const original=await route.fetch();const json=await original.json();json.input.sha256='0'.repeat(64);await route.fulfill({json});});
  await page.reload({waitUntil:'domcontentloaded',timeout:60000});await ready();await page.locator('#twin17Open').click();await loaded();
  let p=await probe();check('tampered_input_hash_blocks',!p.ready&&p.error.includes('hash'),p.error);check('hash_error_keeps_map',await page.locator('#scene canvas').isVisible()&&await page.locator('#t17Retry').isVisible());
  await page.unroute('**/shared/digital-twin-core/projects/hcmc.json');await page.locator('#t17Retry').click();await loaded();check('hash_retry_recovers',(await probe()).ready);
  check('no_js_errors',errors.length===0,errors);fs.writeFileSync(path.join(out,'regression-results.json'),JSON.stringify({passed:checks.length,failed:0,checks},null,2));console.log(JSON.stringify({passed:checks.length,failed:0}));
 }catch(e){fs.writeFileSync(path.join(out,'regression-results.json'),JSON.stringify({checks,errors,failure:e.stack},null,2));throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
