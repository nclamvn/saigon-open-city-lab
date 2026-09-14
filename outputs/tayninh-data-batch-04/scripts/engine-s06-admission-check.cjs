/* Pure admission bites: copied fixtures, no product/payload mutation. */
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=path.resolve(__dirname,'..');global.window=global;
require(path.join(base,'static/solution-layer.js'));const layers=global.B04SolutionLayers;
const original=JSON.parse(fs.readFileSync(path.join(base,'derived/solution/solution-data.json'))),baseline=JSON.parse(fs.readFileSync(path.join(base,'derived/fusion/scene-data.json')));
const copy=()=>JSON.parse(JSON.stringify(original)),admission=layers.admitSolution(original,baseline),bites=[];
assert.deepEqual(admission.available,{gedtm:true,google:true});assert.equal(admission.acceptedGoogleCount,482);
const fixtures={
 unsupported_schema:d=>{d.schema='unknown/v9';},
 empty_frame_center:d=>{d.frame.aoi_center_wgs84=[];},
 wrong_positive_transform:d=>{d.coordinate_transform.legacy_to_canonical.x_scale=1.001;},
 wrong_transform_offset:d=>{d.coordinate_transform.legacy_to_canonical.z_offset=1;},
 missing_support:d=>{delete d.buildings[1].height_support;},
 rejected_positive_height:d=>{d.buildings[1].height_support.accepted=false;d.buildings[1].qualified=false;d.buildings[1].height_qualified=false;},
 accepted_low_support:d=>{d.buildings[1].height_support.polygon_sample_pixels=100;d.buildings[1].height_support.support_ratio=.03;},
 support_ratio_mismatch:d=>{d.buildings[1].height_support.support_ratio=.9;},
 wrong_presence_threshold:d=>{d.buildings[1].height_support.threshold_presence=.1;},
 out_of_range_model_height:d=>{d.buildings[1].model_height_m=40;d.buildings[1].google_model_height_m=40;d.buildings[1].display_height_m=40;},
 out_of_range_proxy:d=>{d.buildings[0].fallback_height_m=60;d.buildings[0].display_height_m=60;},
 measured_claim:d=>{d.buildings[1].measured_height=true;},
 source_height_claim:d=>{d.buildings[1].source_height_m=4;},
 duplicate_stable_id:d=>{d.buildings[1].id=d.buildings[0].id;},
 nonfinite_polygon:d=>{d.buildings[1].footprint_scene_m[0].x=Infinity;},
 malformed_hash:d=>{d.source_fingerprints[Object.keys(d.source_fingerprints)[0]]='bad';},
 missing_fingerprint:d=>{delete d.source_fingerprints[Object.keys(d.source_fingerprints)[0]];},
 false_complete:d=>{d.terrain_profiles.gedtm.coverage.complete=false;},
 truncated_validity:d=>{d.terrain_profiles.gedtm.validity.pop();},
 missing_height_node:d=>{d.terrain_profiles.gedtm.heights_m[0][0]=null;},
 summary_false:d=>{d.qa_summary.source_height_m_all_null=false;},
 future_adapter_available:d=>{d.future_data_adapter.available=true;},
 missing_future_template_metadata:d=>{delete d.future_data_adapter.templates[0].rights;},
};
for(const [name,mutate]of Object.entries(fixtures)){const d=copy();mutate(d);let caught=null;try{layers.admitSolution(d,baseline);}catch(e){caught=e.message;}assert(caught,name+' must reject');bites.push({name,rejected:true,reason:caught});}
const incomplete=copy();incomplete.terrain_profiles.gedtm.heights_m[0][0]=null;incomplete.terrain_profiles.gedtm.validity[0][0]=false;incomplete.terrain_profiles.gedtm.coverage={complete:false,missing_nodes:1,valid_nodes:11880};
assert.equal(layers.admitSolution(incomplete,baseline).available.gedtm,false,'Honest incomplete GEDTM disabled');
assert.equal(layers.acceptedGoogle({model_height_m:4,google_model_height_m:4}),false,'Positive height alone cannot enable model');
assert.equal(JSON.stringify(original),JSON.stringify(JSON.parse(fs.readFileSync(path.join(base,'derived/solution/solution-data.json')))),'Pure checks leave payload unchanged');
const output=path.join(base,'scripts/engine-s06-qa/admission.json');fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify({schema:'s06.engine.admission-check.v1',status:'PASS',acceptedGoogleCount:admission.acceptedGoogleCount,fingerprints:9,bites,honestIncompleteGedtmDisabled:true,positiveHeightAloneRejected:true,payloadMutated:false,browserHashCheck:false},null,2)+'\n');
console.log(JSON.stringify({status:'PASS',negativeFixtures:bites.length,output}));
