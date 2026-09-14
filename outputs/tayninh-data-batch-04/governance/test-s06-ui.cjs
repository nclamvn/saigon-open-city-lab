/* UI state-contract tests: no renderer, no network, no browser automation. */
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
class Target {
  constructor() { this.handlers = {}; this.attrs = {}; this.hidden = false; this.open = false; this.textContent = ''; this.dataset = {}; this.disabled = true; this.classList = {contains:()=>true,toggle:()=>{}}; }
  addEventListener(name, fn) { (this.handlers[name] ||= []).push(fn); }
  dispatchEvent(e) { for(const fn of this.handlers[e.type] || []) fn(e); }
  getAttribute(key) { return this.attrs[key] ?? null; }
  setAttribute(key, val) { this.attrs[key] = String(val); }
  querySelector() { return new Target(); }
  focus() {}
}
const ids = Object.fromEntries([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>[m[1],new Target()]));
const buttons = [...html.matchAll(/<button\b[^>]*data-solution-command="([^"]+)"[^>]*data-solution-value="([^"]+)"[^>]*>/g)].map(m=>{
  const b = new Target(); b.dataset={solutionCommand:m[1],solutionValue:m[2]};return b;
});
const doc = new Target(), win = new Target();
doc.body = new Target(); doc.getElementById = id=>ids[id]; doc.querySelectorAll=()=>buttons; doc.querySelector=()=>null;
class Event { constructor(type, options={}) { this.type=type;Object.assign(this,options); } }
vm.runInNewContext(fs.readFileSync(path.join(root,'static/solution-ui.js'),'utf8'), {document:doc, window:win, CustomEvent:Event, MutationObserver:class{observe(){}}, queueMicrotask:fn=>fn()});
const update = detail => win.dispatchEvent(new Event('b04:solution-state',{detail}));
const normal = {ready:true,busy:false,terrain:'gedtm',scale:1,heights:'google',detail:'detailed',available:{gedtm:true,google:true},error:null};
let tests=0;
assert.equal(buttons.length,9); assert.ok(buttons.every(b=>b.disabled));tests++;
update(normal); assert.ok(buttons.every(b=>!b.disabled)); assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,4);tests++;
update({...normal,busy:true}); assert.ok(buttons.every(b=>b.disabled));assert.match(ids.solutionStatus.textContent,/Đang cập nhật/);tests++;
update({...normal,terrain:'copdem',heights:'proxy',available:{gedtm:false,google:false}});
assert.equal(buttons.filter(b=>b.disabled).length,2);assert.match(ids.solutionModelTag.textContent,/ước theo diện tích/);assert.equal(buttons.find(b=>b.dataset.solutionValue==='copdem').attrs['aria-pressed'],'true');tests++;
update({...normal,scale:1.35,detail:'data'});assert.match(ids.solutionStatus.textContent,/Lớp dữ liệu.*1,35×/);tests++;
update({...normal,error:'<img src=x onerror=bad()> missing supplement'});assert.equal(ids.solutionErrorDetails.hidden,false);assert.match(ids.solutionErrorText.textContent,/<img/);assert.match(ids.solutionStatus.textContent,/lớp dự phòng/);tests++;
update(normal);assert.equal(ids.solutionErrorDetails.hidden,true);assert.equal(ids.solutionErrorText.textContent,'');tests++;
update({...normal,ready:false});assert.ok(buttons.every(b=>b.disabled));assert.equal(buttons.filter(b=>b.attrs['aria-pressed']==='true').length,0);tests++;
update(null);tests++;
const legacy=fs.readFileSync(path.join(root,'governance/baseline-s06/index.html'),'utf8');
const baselineIDs=[...legacy.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.ok(baselineIDs.every(id=>ids[id]));assert.equal(Object.keys(ids).length,[...html.matchAll(/\bid="([^"]+)"/g)].length);tests++;
assert.equal([...html.matchAll(/data-mode="/g)].length,6);assert.ok(html.indexOf('static/solution-ui.js')<html.indexOf('static/app.js'));tests++;
console.log(JSON.stringify({passed:tests,failed:0,commandButtons:buttons.length,baselineIDsRetained:baselineIDs.length,modeCount:6}));
