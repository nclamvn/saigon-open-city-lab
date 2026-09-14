/* RtR Twin source contracts v1: geographic truth stays distinct from render models. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.RTRTwin = root.RTRTwin || {}; root.RTRTwin.SourceCore = api; }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = '1.0.0', EPS = 1e-12;
  function validPoint(p) { return Array.isArray(p) && p.length === 2 && p.every(Number.isFinite); }
  function validLonLat(p) { return validPoint(p) && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90; }
  function safeUrl(value) {
    if (typeof value !== 'string' || /[\u0000-\u0020\\]/.test(value)) return null;
    try { const u = new URL(value); return /^https?:$/.test(u.protocol) && !u.username && !u.password ? u.href : null; } catch (_) { return null; }
  }
  function frameErrors(frame) {
    const errors = [];
    if (!frame || frame.kind !== 'local-linear' || frame.geographicCRS !== 'EPSG:4326') errors.push('unsupported_render_frame');
    if (!frame || !validLonLat(frame.origin)) errors.push('missing_frame_origin');
    if (!frame || frame.units !== 'm' || frame.xAxis !== 'east' || !['north','south'].includes(frame.zAxis)) errors.push('invalid_frame_axes_or_units');
    if (!frame || !Number.isFinite(frame.metresPerDegreeLon) || frame.metresPerDegreeLon <= 0 || !Number.isFinite(frame.metresPerDegreeLat) || frame.metresPerDegreeLat <= 0) errors.push('invalid_frame_coefficients');
    if (frame && frame.surveyCRS !== false) errors.push('local_frame_must_not_claim_survey_crs');
    return errors;
  }
  function assertFrame(frame) { const errors = frameErrors(frame); if (errors.length) throw new Error(errors.join(', ')); }
  function inverseLocal(p, frame) {
    assertFrame(frame); if (!validPoint(p)) throw new Error('invalid_local_coordinate');
    const ll = [frame.origin[0] + p[0] / frame.metresPerDegreeLon, frame.origin[1] + (frame.zAxis === 'south' ? -p[1] : p[1]) / frame.metresPerDegreeLat];
    if (!validLonLat(ll)) throw new Error('local_coordinate_outside_geographic_range'); return ll;
  }
  function forwardLocal(p, frame) {
    assertFrame(frame); if (!validLonLat(p)) throw new Error('invalid_geographic_coordinate');
    return [(p[0] - frame.origin[0]) * frame.metresPerDegreeLon, (p[1] - frame.origin[1]) * frame.metresPerDegreeLat * (frame.zAxis === 'south' ? -1 : 1)];
  }
  function cross(a,b,c) { return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]); }
  function onSegment(a,b,p) { return Math.abs(cross(a,b,p)) < EPS && p[0] >= Math.min(a[0],b[0])-EPS && p[0] <= Math.max(a[0],b[0])+EPS && p[1] >= Math.min(a[1],b[1])-EPS && p[1] <= Math.max(a[1],b[1])+EPS; }
  function intersects(a,b,c,d) {
    const u=cross(a,b,c),v=cross(a,b,d),w=cross(c,d,a),x=cross(c,d,b);
    return (u*v < 0 && w*x < 0) || (Math.abs(u)<EPS && onSegment(a,b,c)) || (Math.abs(v)<EPS && onSegment(a,b,d)) || (Math.abs(w)<EPS && onSegment(c,d,a)) || (Math.abs(x)<EPS && onSegment(c,d,b));
  }
  function ringArea(ring) { let area=0; const o=ring[0]; for(let i=1;i<ring.length-1;i++) area+=cross(o,ring[i],ring[i+1]); return area/2; }
  function ringContains(ring,p) {
    let inside=false; for(let i=0,j=ring.length-2;i<ring.length-1;j=i++) { const a=ring[i],b=ring[j]; if(onSegment(a,b,p))return true; if((a[1]>p[1])!==(b[1]>p[1]) && p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0]) inside=!inside; } return inside;
  }
  function ringsIntersect(a,b) { for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length-1;j++)if(intersects(a[i],a[i+1],b[j],b[j+1]))return true;return false; }
  function properCross(a,b,c,d) { return cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0; }
  function strictlyInPolygon(rings,p) { if(rings.some(r=>r.slice(0,-1).some((a,i)=>onSegment(a,r[i+1],p))))return false;return ringContains(rings[0],p)&&!rings.slice(1).some(r=>ringContains(r,p)); }
  function componentsOverlap(a,b) {
    for(const ar of a)for(const br of b)for(let i=0;i<ar.length-1;i++)for(let j=0;j<br.length-1;j++)if(properCross(ar[i],ar[i+1],br[j],br[j+1]))return true;
    for(const [one,two] of [[a,b],[b,a]])for(const r of one)for(let i=0;i<r.length-1;i++) { const p=r[i],q=r[i+1];if(strictlyInPolygon(two,p)||strictlyInPolygon(two,[(p[0]+q[0])/2,(p[1]+q[1])/2]))return true; }
    // Identical coincident components have no strictly interior boundary vertices.
    const sameVertices=a[0].length===b[0].length&&a[0].every(p=>b[0].some(q=>p[0]===q[0]&&p[1]===q[1]));return sameVertices;
  }
  function polygonErrors(rings) {
    const errors=[];
    if(!Array.isArray(rings)||!rings.length)return ['missing_polygon_rings'];
    for(let r=0;r<rings.length;r++) {
      const ring=rings[r];
      if(!Array.isArray(ring)||ring.length<4||ring.some(p=>!validLonLat(p))) { errors.push(`invalid_ring:${r}`);continue; }
      if(ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1]) errors.push(`unclosed_ring:${r}`);
      if(Math.abs(ringArea(ring))<1e-16)errors.push(`degenerate_ring:${r}`);
      let self=false; for(let i=0;i<ring.length-1&&!self;i++)for(let j=i+2;j<ring.length-1;j++) { if(i===0&&j===ring.length-2)continue; if(intersects(ring[i],ring[i+1],ring[j],ring[j+1])) {self=true;break;} }
      if(self)errors.push(`self_intersection:${r}`);
      if(r>0 && Array.isArray(rings[0]) && rings[0].every(validLonLat) && !ringContains(rings[0],ring[0])) errors.push(`hole_outside_outer:${r}`);
    }
    if(!errors.length)for(let r=1;r<rings.length;r++) {
      if(ringsIntersect(rings[0],rings[r])||rings[r].some(p=>!ringContains(rings[0],p)))errors.push(`hole_crosses_outer:${r}`);
      for(let h=1;h<r;h++)if(ringsIntersect(rings[h],rings[r])||ringContains(rings[h],rings[r][0])||ringContains(rings[r],rings[h][0]))errors.push(`overlapping_holes:${h}:${r}`);
    }
    return errors;
  }
  function validateGeoJSONGeometry(geometry) {
    let errors=[];
    if(!geometry||!['Polygon','MultiPolygon','LineString','Point'].includes(geometry.type))errors=['unsupported_geometry'];
    else if(geometry.type==='Polygon')errors=polygonErrors(geometry.coordinates);
    else if(geometry.type==='MultiPolygon') { if(!Array.isArray(geometry.coordinates)||!geometry.coordinates.length)errors=['missing_multipolygon'];else {geometry.coordinates.forEach((p,i)=>errors.push(...polygonErrors(p).map(e=>`${i}:${e}`)));if(!errors.length)for(let i=0;i<geometry.coordinates.length;i++)for(let j=i+1;j<geometry.coordinates.length;j++)if(componentsOverlap(geometry.coordinates[i],geometry.coordinates[j]))errors.push(`overlapping_components:${i}:${j}`);} }
    else if(geometry.type==='LineString' && (!Array.isArray(geometry.coordinates)||geometry.coordinates.length<2||geometry.coordinates.some(p=>!validLonLat(p))))errors=['invalid_linestring'];
    else if(geometry.type==='Point' && !validLonLat(geometry.coordinates))errors=['invalid_point'];
    return {valid:!errors.length,errors};
  }
  function inspectSource(source, context) {
    const purpose = typeof context === 'string' ? context : context?.purpose || 'ingestion', errors=[], warnings=[];
    if(!source || typeof source.id!=='string' || !source.id) errors.push('missing_source_id');
    if(!source || !['acquired','lead','unavailable'].includes(source.acquisition?.status))errors.push('missing_acquisition_status');
    if(!source || !safeUrl(source.url))errors.push('unsafe_or_missing_source_url');
    if(purpose !== 'citation') {
      if(source?.acquisition?.status!=='acquired')errors.push('source_not_acquired');
      if(!Array.isArray(source?.assets)||!source.assets.length)errors.push('missing_asset');
      if(Array.isArray(source?.assets) && source.assets.some(a=>!a||!a.path||!/^[a-f0-9]{64}$/.test(a.sha256||'')))errors.push('missing_asset_hash');
      if(!source?.rights?.ingestionAllowed || !source?.rights?.license)errors.push('rights_not_verified');
      if(source?.rights?.commercialAllowed!==true)errors.push('commercial_use_not_verified');
      if(!source?.horizontalCRS)errors.push('missing_horizontal_crs');
      if(!source?.units)errors.push('missing_units');
      if(source?.horizontalCRS==='EPSG:4326'&&source.coordinateUnits!=='degree')errors.push('geographic_coordinate_units_mismatch');
      if(['EPSG:32648','EPSG:3857'].includes(source?.horizontalCRS)&&source.coordinateUnits!=='m')errors.push('projected_coordinate_units_mismatch');
      if(!Object.hasOwn(source||{},'captureDate') || (source.captureDate!==null && typeof source.captureDate!=='string'))errors.push('capture_date_must_be_explicit_null_or_string');
      if(source?.role==='footprints' && source.units!=='m')errors.push('unsupported_footprint_value_units');
      if(!['metadata_verified','geometry_validated','survey_validated'].includes(source?.validation?.stage))errors.push('source_not_validated');
    }
    if(['survey','hydrology','clearance','volume'].includes(purpose)) {
      if(source?.representation!=='surveyed' || source?.validation?.stage!=='survey_validated' || source?.quality?.independentCheckpointsVerified!==true)errors.push('survey_quality_not_verified');
      if(!source?.verticalDatum)errors.push('missing_vertical_datum');
      if(!source?.captureDate)errors.push('missing_capture_date');
      if(!Number.isFinite(source?.quality?.horizontalAccuracyM) || source.quality.horizontalAccuracyM<=0 || !Number.isFinite(source?.quality?.verticalAccuracyM) || source.quality.verticalAccuracyM<=0)errors.push('missing_accuracy_evidence');
    }
    if(purpose==='planning' && (source?.approval?.verified!==true || !source?.approval?.decisionId || !source?.approval?.version))errors.push('planning_approval_not_verified');
    if(!source?.captureDate)warnings.push('capture_date_unknown');
    if(source?.representation==='modeled')warnings.push('modeled_not_surveyed');
    return {allowed:!errors.length, valid:!errors.length,purpose,sourceId:source?.id||null,errors:[...new Set(errors)],warnings};
  }
  function validateProject(config) {
    const errors=[];
    if(!config || config.schema!=='rtr-twin-project/1.0')errors.push('unsupported_project_schema');
    if(!config?.id || !config?.name)errors.push('missing_project_identity');
    const bbox=config?.bbox;
    if(!Array.isArray(bbox)||bbox.length!==4||!validLonLat(bbox.slice(0,2))||!validLonLat(bbox.slice(2,4))||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])errors.push('invalid_project_bbox');
    errors.push(...frameErrors(config?.frame));
    if(!Array.isArray(config?.sources)||!config.sources.length)errors.push('missing_project_sources');
    else { const ids=new Set();config.sources.forEach(s=>{if(!s||typeof s!=='object'||!s.id){errors.push('invalid_source_entry');return;}if(ids.has(s.id))errors.push(`duplicate_source:${s.id}`);ids.add(s.id); if(!safeUrl(s.url))errors.push(`unsafe_source_url:${s.id}`);}); }
    return {valid:!errors.length,errors};
  }
  function capabilityGate(project, capability) {
    const supported=['spatial_query','scenario_comparison','survey_measurement','hydrology','approved_planning','photoreal_capture'];
    if(!supported.includes(capability))return {allowed:false,capability,reasons:['unknown_capability'],sources:[]};
    const check=validateProject(project);if(!check.valid)return {allowed:false,capability,reasons:check.errors,sources:[]};
    const roles={spatial_query:['footprints'],scenario_comparison:['footprints'],survey_measurement:['terrain','point_cloud'],hydrology:['terrain'],approved_planning:['planning_geometry'],photoreal_capture:['photogrammetry_mesh','gaussian_splat','orthomosaic']};
    const purpose={spatial_query:'ingestion',scenario_comparison:'ingestion',survey_measurement:'survey',hydrology:'hydrology',approved_planning:'planning',photoreal_capture:'ingestion'}[capability];
    const selected=project.sources.filter(s=>roles[capability].includes(s.role));
    const checks=selected.map(s=>inspectSource(s,purpose));
    let allowed=checks.some(c=>c.allowed);
    const extraReasons=[];
    if(capability==='hydrology') {
      const hydro=project.hydrology;
      for(const field of ['drainageVerified','rainfallVerified','tideOrBoundaryConditionsVerified','calibrationVerified'])if(hydro?.[field]!==true)extraReasons.push(`hydrology_${field}_missing`);
      if(extraReasons.length)allowed=false;
    }
    if(capability==='photoreal_capture' && !selected.some(s=>['observed','surveyed'].includes(s.representation)&&s.captureDate&&s.validation?.spatialRegistrationVerified===true&&inspectSource(s,'ingestion').allowed)) {allowed=false;extraReasons.push('registered_real_capture_required');}
    return {allowed,capability,reasons:allowed?[]:[...new Set([...(selected.length?checks.flatMap(c=>c.errors):['no_matching_source']),...extraReasons])],sources:checks,mode:allowed&&['spatial_query','scenario_comparison'].includes(capability)?'screening_with_source_limits':allowed?'validated_source':'disabled'};
  }
  function closedRing(raw, frame, geographic) {
    if(!Array.isArray(raw))throw new Error('missing_ring');
    const ring=raw.map(p=> { const v=Array.isArray(p)?p:[p.x,p.z];return geographic?v.slice():inverseLocal(v,frame); });
    if(ring.length && (ring[0][0]!==ring[ring.length-1][0]||ring[0][1]!==ring[ring.length-1][1]))ring.push(ring[0].slice());return ring;
  }
  function normalizeScene(data, config) {
    const check=validateProject(config);if(!check.valid)throw new Error(check.errors.join(', '));
    if(data?.meta?.center && (Math.abs(data.meta.center[0]-config.frame.origin[0])>1e-10||Math.abs(data.meta.center[1]-config.frame.origin[1])>1e-10))throw new Error('scene_origin_mismatches_project_frame');
    const features=[], excluded=[], sourceIds=new Set(), counters={building:0,illustrative:0}, sourceMap=new Map(config.sources.map(s=>[s.id,s])), admissions=new Map(config.sources.map(s=>[s.id,inspectSource(s,'ingestion')]));
    const raw=data?.type==='FeatureCollection'?data.features:data?.buildings;
    if(!Array.isArray(raw))throw new Error('unsupported_scene_adapter');
    raw.forEach((item,modelIndex)=> {
      try {
        const geojson=data.type==='FeatureCollection', original=geojson?(item.properties||{}):item;
        const illustrative=original.classification==='illustrative'||String(original.type||'').startsWith('illustrative');
        const overture=String(original.origin||'').toLowerCase()==='overture'||!!original.gers;
        const sourceKey=illustrative?'illustrative':original.sourceKey||(overture?'overture':config.defaultBuildingSource||'osm');
        if(!sourceMap.has(sourceKey))throw new Error('unknown_source_key');
        if(!illustrative) {const admission=admissions.get(sourceKey);if(!admission.allowed)throw new Error(admission.errors.join('|'));}
        const sourceId=String(original.sourceId??original.gers??original.id??item.id??`unknown-${modelIndex}`);
        let geometry;
        if(geojson) {if(sourceMap.get(sourceKey).horizontalCRS!=='EPSG:4326')throw new Error('geojson_source_must_be_wgs84');geometry=JSON.parse(JSON.stringify(item.geometry));}
        else if(original.raw_polygon_wgs84)geometry={type:'Polygon',coordinates:[closedRing(original.raw_polygon_wgs84,config.frame,true)]};
        else {const rings=original.r||[original.footprint_scene_m||original.footprint_local_m];geometry={type:'Polygon',coordinates:rings.map(r=>closedRing(r,config.frame,false))};}
        if(!['Polygon','MultiPolygon'].includes(geometry?.type))throw new Error('building_requires_polygon_geometry');
        const gc=validateGeoJSONGeometry(geometry);if(!gc.valid)throw new Error(gc.errors.join('|'));
        const kind=illustrative?'illustrative':original.height?.kind||(original.height_kind==='modelled'?'model_derived':original.height_kind==='proxy'?'area_proxy':original.q==='height'?'source_attribute':original.q==='levels'?'levels_estimate':original.q==='podium'?'modeled_podium':'area_proxy');
        const value=original.height?.value??original.h??original.display_height_m??null;
        if(value!==null && (!Number.isFinite(value)||value<0))throw new Error('invalid_height');
        // Reject incompatible measurement claims instead of silently relabeling them.
        if((original.height?.surveyed===true||original.measured_height===true)&&!inspectSource(sourceMap.get(sourceKey),'survey').allowed)throw new Error('unverified_survey_height_claim');
        const surveyed=!!original.height?.surveyed && inspectSource(sourceMap.get(sourceKey),'survey').allowed;
        const heightSourceKey=kind==='model_derived'&&sourceMap.has('google-height')?'google-height':sourceKey;
        const properties={
          id:`${config.id}:${sourceKey}:${sourceId}:representation:${modelIndex}`,sourceId,name:String(original.name||''),classification:illustrative?'illustrative':'building',sourceKey,
          height:{value,kind,surveyed,sourceKey:heightSourceKey,modelEpoch:sourceMap.get(heightSourceKey).sourceEpoch||null},modelIndex,sourceEpoch:sourceMap.get(sourceKey).captureDate||null,datasetRelease:sourceMap.get(sourceKey).release||null,sourceSnapshotTimestamp:sourceMap.get(sourceKey).snapshotTimestamp||null,
          rawHeight:original.rawHeight??original.source_height_m??null,levels:original.levels??null,minHeight:original.min??null,
          originalType:original.type||null,partIndex:original.partIndex??null,parentSourceId:original.parentSourceId??null,
          sourceRecords:original.sourceRecords||null,geometryProvenance:geojson?'source_geojson':original.raw_polygon_wgs84?'source_wgs84_polygon':'inverse_of_existing_render_frame',
          heightSupport:original.height_support||original.google_support||null
        };
        features.push({type:'Feature',id:properties.id,geometry,properties});counters[properties.classification]++;if(!illustrative)sourceIds.add(`${sourceKey}:${sourceId}`);
      }catch(err){excluded.push({modelIndex,id:item?.id??null,reason:err.message});}
    });
    const sourceGate=capabilityGate(config,'spatial_query');
    return {features,sources:config.sources,frame:config.frame,project:config,gates:{spatialAnalysis:{allowed:sourceGate.allowed&&counters.building>0,reasons:[...sourceGate.reasons,...(counters.building>0?[]:['no_admitted_building_geometry'])]}},normalization:{version:VERSION,inputRepresentations:raw.length,acceptedRepresentations:features.length,counts:counters,sourceIdentityCount:sourceIds.size,excludedCount:excluded.length,excluded,bbox:config.bbox,identityMeaning:'unique source identities, not verified physical buildings; distinct part way IDs may belong to the same building',geometryMeaning:'existing source/model polygons; not surveyed geometry',heightMeaning:'existing model/source attributes; not independent surveyed heights'}};
  }
  return Object.freeze({VERSION,safeUrl,inverseLocal,forwardLocal,validateGeoJSONGeometry,validateProject,inspectSource,capabilityGate,normalizeScene});
});
