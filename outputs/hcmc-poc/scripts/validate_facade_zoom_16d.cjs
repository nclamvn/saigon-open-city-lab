const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
// Execute the actual handler expressions, not a separately rewritten zoom formula.
const wheel=source.match(/distance=Math\.max\(window\.currentView==='facades'\?35:250,Math\.min\(13000,distance\*Math\.exp\(e\.deltaY\*\.001\)\)\)/)[0];
const keyboard=source.match(/distance=Math\.max\(window\.currentView==='facades'\?35:250,distance\*\.88\)/)[0];
const rows=[];
for(const [name,code]of[['wheel',wheel],['keyboard_plus',keyboard]]){
 for(const [view,start,expected]of[['facades',150,'closer'],['facades',35,'floor'],['overview',250,'floor']]){
  const c={distance:start,e:{deltaY:-100},window:{currentView:view},Math};vm.createContext(c);vm.runInContext(code,c);
  assert(expected==='closer'?c.distance<start:c.distance===start);rows.push({handler:name,view,start,result:+c.distance.toFixed(3),pass:true});
 }
}
console.log(JSON.stringify({status:'PASS',tests:rows.length,results:rows},null,2));
