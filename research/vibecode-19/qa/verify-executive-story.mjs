import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const repo=path.resolve(import.meta.dirname,'../../..');
const read=(file)=>fs.readFileSync(path.join(repo,file),'utf8');
const index=read('outputs/hcmc-poc/index.html');
const js=read('outputs/hcmc-poc/executive-story-19.js');
const css=read('outputs/hcmc-poc/executive-story-19.css');
const facades=read('outputs/hcmc-poc/data/facades-15.js');
const checks=[];
const check=(name,fn)=>{fn();checks.push({name,pass:true});};

check('CSS được nạp',()=>assert.match(index,/executive-story-19\.css\?v=20b/));
check('JS được nạp sau lõi 18',()=>assert.ok(index.indexOf('twin-surface-18.js')<index.indexOf('executive-story-19.js')));
check('Có điểm vào một thao tác',()=>assert.match(js,/Trình diễn thành phố/));
check('Đủ bảy cảnh có thứ tự',()=>['city','river','cluster','continental','caravelle','dongkhoi','night'].forEach(key=>assert.match(js,new RegExp(`key:'${key}'`))));
check('Ban ngày là cảnh mở đầu',()=>assert.ok(js.indexOf("key:'city'")<js.indexOf("key:'night'")));
check('Cảnh ảnh dùng hồ sơ Continental và Caravelle hiện có',()=>{assert.match(js,/sourceKey:'continental'/);assert.match(js,/sourceKey:'caravelle'/);assert.ok(facades.includes('"key":"continental"'),'Thiếu hồ sơ facade continental');assert.ok(facades.includes('"key":"caravelle"'),'Thiếu hồ sơ facade caravelle');});
check('Cảnh đêm được phân loại minh họa',()=>assert.match(js,/illustrative_cinematic_not_observed_conditions/));
check('Không bật hình học quy hoạch',()=>assert.match(js,/planningGeometryEnabled:false/));
check('Có điều khiển tiến lùi dừng thoát',()=>['x19Prev','x19Play','x19Next','x19Exit'].forEach(id=>assert.match(js,new RegExp(`id=\\"${id}\\"`))));
check('Có bàn phím và reduced motion',()=>{assert.match(js,/arrowright/);assert.match(js,/arrowleft/);assert.match(css,/prefers-reduced-motion/);});
check('Có bố cục màn hình nhỏ',()=>assert.match(css,/@media\(max-width:760px\)/));
check('JavaScript hợp lệ',()=>{const result=spawnSync(process.execPath,['--check',path.join(repo,'outputs/hcmc-poc/executive-story-19.js')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);});

console.log(JSON.stringify({suite:'executive-story-19-plus-20b',passed:checks.length,total:12,checks},null,2));
