#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Core=require('../source-core.js');
const coreDir=path.resolve(__dirname,'..'), outputs=path.resolve(coreDir,'../..');
function read(p){return JSON.parse(fs.readFileSync(p,'utf8'));}
function hash(p){return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
function json(p,obj){fs.writeFileSync(p,JSON.stringify(obj,null,2)+'\n',{flag:'wx'});}
function ensureOutput(out,base){
 fs.mkdirSync(base,{recursive:true});const resolvedBase=fs.realpathSync(base), resolvedParent=fs.realpathSync(path.dirname(out));
 if(!resolvedBase.startsWith(fs.realpathSync(coreDir)+path.sep))throw new Error('artifact_base_outside_core');
 if(!out.startsWith(base+path.sep)||!(resolvedParent===resolvedBase||resolvedParent.startsWith(resolvedBase+path.sep)))throw new Error('output_outside_contained_artifact_directory');
 fs.mkdirSync(out,{recursive:false});
}
function configPath(id){if(typeof id!=='string'||!/^[a-z0-9][a-z0-9-]*$/.test(id))throw new Error('Project must be a safe lowercase slug.');return path.join(coreDir,'projects',id+'.json');}
function verify(project){
 const p=typeof project==='string'?read(configPath(project)):project, check=Core.validateProject(p),assets=[];
 for(const a of [p.input,...p.sources.flatMap(s=>s.assets||[])]){
  const candidate=path.resolve(outputs,a.path||'');
  if(!candidate.startsWith(outputs+path.sep))assets.push({path:a.path,valid:false,error:'asset_path_outside_outputs'});
  else if(!fs.existsSync(candidate))assets.push({path:a.path,valid:false,error:'asset_missing'});
  else if(!fs.realpathSync(candidate).startsWith(fs.realpathSync(outputs)+path.sep))assets.push({path:a.path,valid:false,error:'asset_realpath_outside_outputs'});
  else {const actual=hash(candidate);assets.push({path:a.path,valid:actual===a.sha256,expectedSha256:a.sha256,actualSha256:actual});}
 }
 const byteIntegrityValid=assets.every(a=>a.valid),gates={spatialAnalysis:Core.capabilityGate(p,'spatial_query')},admissionReady=check.valid&&gates.spatialAnalysis.allowed;
 const valid=byteIntegrityValid&&admissionReady;
 return {schema:'rtr-twin-local-verification/1.0',project:p.id,valid,byteIntegrityValid,admissionReady,gates,projectValidation:check,assets,sourceGates:p.sources.map(s=>({sourceId:s.id,ingestion:Core.inspectSource(s,'ingestion')})),limitations:['A matching hash verifies byte identity, not data correctness or reality. Metadata gates are not independent survey certification.']};
}
function prepare(project,out){
 const report=verify(project);if(!report.valid)throw new Error('Project fingerprints or contract fail; no output written.');
 const p=read(configPath(project)),data=read(path.resolve(outputs,p.input.path)),n=Core.normalizeScene(data,p);
 if(!n.gates.spatialAnalysis.allowed||!n.features.some(f=>f.properties.classification==='building'))throw new Error('No admitted valid building geometry; no output written.');
 // An explicit new output directory prevents accidental replacement of a reviewed artifact.
 ensureOutput(out,path.join(coreDir,'prepared'));json(path.join(out,'normalized.geojson'),{type:'FeatureCollection',features:n.features});
 json(path.join(out,'project.json'),p);json(path.join(out,'qc.json'),{...report,normalizedSha256:hash(path.join(out,'normalized.geojson')),sourceCoreVersion:Core.VERSION,sourceCoreSha256:hash(path.join(coreDir,'source-core.js')),normalization:n.normalization,gates:n.gates,partial:n.normalization.excludedCount>0,published:false});
 return {valid:true,partial:n.normalization.excludedCount>0,project,accepted:n.features.length,excluded:n.normalization.excludedCount,published:false,output:out};
}
function importGeoJSON(project,input,manifest,out){
 const p=read(configPath(project)),s=read(manifest),raw=read(input),inputHash=hash(input),errors=[];
 const admission=Core.inspectSource(s,'ingestion');errors.push(...admission.errors);
 if(s.horizontalCRS!=='EPSG:4326')errors.push('geojson_import_requires_explicit_epsg4326');
 if(!Object.hasOwn(s,'captureDate'))errors.push('capture_date_must_be_explicit_null_or_value');
 if(s.role!=='footprints')errors.push('only_footprint_geojson_import_supported');
 if(raw.type!=='FeatureCollection'||!Array.isArray(raw.features))errors.push('feature_collection_required');
 if(Array.isArray(raw.features)&&!raw.features.length)errors.push('empty_footprint_collection');
 if(raw.crs)errors.push('geojson_legacy_crs_member_forbidden');
 if(s.assets?.length!==1)errors.push('single_asset_manifest_required_for_this_importer');
 if(!s.assets?.some(a=>a.sha256===inputHash))errors.push('manifest_hash_does_not_match_input');
 const candidate={...p,defaultBuildingSource:s.id,sources:[s]},geo={...raw,features:(raw.features||[]).map((f,i)=>({...f,properties:{...(f.properties||{}),id:f.properties?.id??f.id??`import-${i}`,sourceKey:s.id}}))};
 let normalized=null;
 if(!errors.length){try{normalized=Core.normalizeScene(geo,candidate);if(normalized.normalization.excludedCount)errors.push('invalid_feature_geometry_or_semantics');if(!normalized.gates.spatialAnalysis.allowed)errors.push('no_admitted_building_geometry');}catch(e){errors.push(e.message);}}
 const report={schema:'rtr-twin-quarantine-admission/1.0',project,sourceId:s.id,inputSha256:inputHash,sourceManifestSha256:hash(manifest),projectConfigSha256:hash(configPath(project)),sourceCoreVersion:Core.VERSION,sourceCoreSha256:hash(path.join(coreDir,'source-core.js')),valid:!errors.length,errors:[...new Set(errors)],admission,normalization:normalized?.normalization||null,published:false,registrationVerified:false,limitations:['Quarantine only: this tool never updates published project catalogs or render scenes.','Coordinates must already be GeoJSON WGS84; this importer does not transform raster, LAS, BIM, other CRSs or mesh formats.','Capture date may remain explicit null for screening; it cannot satisfy survey or real-capture gates.','Registration and independent physical accuracy are not established by JSON validation.']};
 ensureOutput(out,path.join(coreDir,'quarantine'));fs.copyFileSync(input,path.join(out,'input.geojson'),fs.constants.COPYFILE_EXCL);json(path.join(out,'source.json'),s);
 if(report.valid){json(path.join(out,'normalized.geojson'),{type:'FeatureCollection',features:normalized.features});report.normalizedSha256=hash(path.join(out,'normalized.geojson'));}
 json(path.join(out,'qc.json'),report);
 return {...report,output:out};
}
function main(){
 const [command,project,...args]=process.argv.slice(2);let result;
 configPath(project);
 if(command==='verify')result=verify(project);
 else if(command==='prepare' && args.length===1)result=prepare(project,path.resolve(args[0]));
 else if(command==='import-geojson' && args.length===3)result=importGeoJSON(project,...args.map(p=>path.resolve(p)));
 else throw new Error('Usage: node project-data.cjs verify PROJECT | prepare PROJECT NEW_OUTPUT_DIR | import-geojson PROJECT INPUT_GEOJSON SOURCE_MANIFEST NEW_QUARANTINE_DIR');
 console.log(JSON.stringify(result,null,2));if(!result.valid)process.exitCode=2;
}
if(require.main===module){try{main();}catch(e){console.error(e.message);process.exitCode=2;}}
module.exports={verify,prepare,importGeoJSON};
