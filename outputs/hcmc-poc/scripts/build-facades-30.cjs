const fs=require('fs');
const path=require('path');
const vm=require('vm');
const crypto=require('crypto');

const root=path.resolve(__dirname,'..');
const source=path.join(root,'data/facades-15.js');
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(source,'utf8'),context,{filename:source});
const legacy=context.window.FACADES_15;
if(!legacy?.manifest?.entries)throw new Error('FACADES_15 manifest is unavailable');

const keep=['key','name','building_id','strips','normal','reverse_u','width_m','height_m','vertical','horizontal','atlas_rect','surface_fit','render_mode','source_url','author','photo_date','license','license_url','source_sha256','rectified_sha256'];
const entries=legacy.manifest.entries.map(entry=>Object.fromEntries(keep.filter(key=>entry[key]!==undefined).map(key=>[key,entry[key]])));
const fileReceipt=file=>{
  const absolute=path.join(root,file),bytes=fs.readFileSync(absolute);
  return{file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};
};
const output={
  schema:'rtr.city-lab.facade-atlas.v1',
  version:'30b',
  derived_from:'data/facades-15.js manifest 15b',
  classification:legacy.manifest.classification,
  atlas:fileReceipt('assets/facades15/facade-atlas.jpg'),
  alpha_mask:fileReceipt('assets/facades15/facade-mask.png'),
  entries
};
fs.writeFileSync(path.join(root,'data/facades-30.json'),JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({entries:entries.length,accepted:entries.filter(entry=>entry.surface_fit?.eligible&&entry.render_mode!=='sampled_envelope').length,output:'data/facades-30.json'}));
