const fs=require('fs');
const path=require('path');
const cp=require('child_process');
const assert=require('assert');

const project=path.resolve(__dirname,'../../..');
const demo=path.join(project,'outputs/hcmc-poc');
const run=command=>cp.execFileSync('git',command,{cwd:project,encoding:'utf8'}).trim();
const checks=[];
const check=(name,fn)=>{fn();checks.push(name);};

check('No duplicate Finder-style tile is tracked',()=>{
  const tracked=run(['ls-files','outputs/hcmc-poc/data/tiles-18']);
  assert(!/(^|\n).* 2\.(glb|json)$/m.test(tracked));
});

check('Accidental tile copies are ignored',()=>{
  const ignore=fs.readFileSync(path.join(project,'.gitignore'),'utf8');
  assert(ignore.includes('outputs/hcmc-poc/data/tiles-18/**/* 2.glb'));
  assert(ignore.includes('outputs/hcmc-poc/data/tiles-18/**/* 2.json'));
});

check('Renderer assets are version-aligned at 25e',()=>{
  const html=fs.readFileSync(path.join(demo,'webgpu-materials-24.html'),'utf8');
  const entry=fs.readFileSync(path.join(demo,'webgpu-entry-24.js'),'utf8');
  const manifest=JSON.parse(fs.readFileSync(path.join(demo,'data/webgpu-materials-24.json'),'utf8'));
  const evidence=JSON.parse(fs.readFileSync(path.join(demo,'data/ba-son-marina-24.json'),'utf8'));
  assert(!html.includes('?v=24d'));
  assert(html.includes('webgpu-materials-24.js?v=25e'));
  assert(entry.includes("version:'25e'"));
  assert.equal(manifest.version,'25e');
  assert.equal(evidence.version,'24e');
});

check('Unified map-first shell keeps one canonical UI and aligned collapsible panels',()=>{
  const index=fs.readFileSync(path.join(demo,'index.html'),'utf8');
  const html=fs.readFileSync(path.join(demo,'webgpu-materials-24.html'),'utf8');
  const css=fs.readFileSync(path.join(demo,'webgpu-materials-24.css'),'utf8');
  const renderer=fs.readFileSync(path.join(demo,'webgpu-materials-24.js'),'utf8');
  const flood=fs.readFileSync(path.join(demo,'flood-ui-25.js'),'utf8');
  for(const id of ['collapseStory','collapse','collapseSelection','collapseFloodLab'])assert(html.includes(`id="${id}"`));
  assert(html.includes('aria-controls="floodContent"'));
  assert(index.includes("location.replace(`webgpu-materials-24.html?v=25e"));
  assert(index.includes("q.get('legacy')==='1'"));
  assert(css.includes('Unified map shell · 25E'));
  assert(css.includes('--rail:44px'));
  assert(css.includes('.collapsed>.panel-body'));
  assert(css.includes('body.flood-open .story,body.flood-open .controls'));
  assert(!html.includes('THREE.JS r186'));
  assert(renderer.includes("citylab.panel.story.collapsed"));
  assert(renderer.includes("citylab.panel.controls.collapsed"));
  assert(flood.includes("citylab.panel.flood.collapsed"));
});

check('Flood model contract has evidence tiers and calibration gates',()=>{
  const contract=JSON.parse(fs.readFileSync(path.join(demo,'data/flood-model-contract-25.json'),'utf8'));
  assert.equal(contract.version,'25a');
  assert.equal(contract.pilotArea.id,'thao-dien-compound-flood');
  assert.equal(contract.excludedPilotArea.name,'Nguyen Hue - Bach Dang - Ba Son');
  assert.equal(contract.citywideScope.coverage,'Entire official Ho Chi Minh City administrative extent');
  assert.equal(contract.scenarioPolicy.controlsAreBounded,true);
  assert.equal(contract.scenarioPolicy.unboundedSlidersForbidden,true);
  assert.equal(contract.warningPolicy.levels,3);
  assert(contract.sources.length>=8);
  assert(contract.qualityGates.some(gate=>gate.id==='engineering-calibration'));
  assert(contract.outputs.includes('maximum_depth_m'));
});

console.log(JSON.stringify({suite:'project-hygiene',passed:checks.length,checks},null,2));
