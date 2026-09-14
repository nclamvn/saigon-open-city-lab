(function (root) {
  'use strict';
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function unit(v) { var n = Math.hypot.apply(null, v); if (!n) throw new Error('Invalid camera direction.'); return v.map(function (x) { return x / n; }); }
  function cross(a, b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function create(options) {
    options = options || {}; var maxTiles = options.maxTiles || 32, maxBytes = options.maxBytes || 33554432, threshold = options.sseThreshold || 16;
    return { select: function (catalog, camera) {
      if (!catalog || !Array.isArray(catalog.tiles)) throw new Error('LOD catalog tiles are required.');
      if (!camera || !Array.isArray(camera.position) || camera.position.length !== 3 || !camera.position.every(Number.isFinite)) throw new Error('Finite local camera position is required.');
      var forward = unit(camera.direction || [0,0,-1]), up0 = unit(camera.up || [0,1,0]), right = cross(forward, up0);
      if (Math.hypot.apply(null,right)<1e-9) right=[1,0,0]; else right=unit(right);
      var up=unit(cross(right,forward)), fov=camera.fov || 50, viewport=camera.viewportHeight || 800, aspect=camera.aspect || 1.5;
      if (!Number.isFinite(fov) || fov <= 1 || fov >= 175 || !Number.isFinite(viewport) || viewport<=0 || !Number.isFinite(aspect) || aspect<=0) throw new Error('Camera FOV and viewport must be valid.');
      var tanV=Math.tan(fov*Math.PI/360),tanH=tanV*aspect,near=camera.near || .1,far=camera.far || 30000,candidates=[],culled=0;
      catalog.tiles.forEach(function(tile){
        var center=tile.centerLocal, radius=tile.radius;
        if(!Array.isArray(center)||center.length!==3||!center.every(Number.isFinite)||!Number.isFinite(radius)||radius<=0)return;
        var v=center.map(function(x,i){return x-camera.position[i];}),depth=dot(v,forward),distance=Math.max(1,Math.hypot.apply(null,v)-radius);
        if(depth+radius<near||depth-radius>far||Math.abs(dot(v,up))>depth*tanV+radius*Math.sqrt(1+tanV*tanV)||Math.abs(dot(v,right))>depth*tanH+radius*Math.sqrt(1+tanH*tanH)){culled++;return;}
        var sse=(tile.coarse.geometricError || 0)*viewport/(2*tanV*distance),lod=sse>threshold?'fine':'coarse',content=tile[lod];
        candidates.push(Object.assign({},tile,content,{lod:lod,sse:sse,distance:distance}));
      });
      candidates.sort(function(a,b){return a.distance-b.distance||a.id.localeCompare(b.id);});
      var selected=[],bytes=0,budgetDropped=0;
      candidates.forEach(function(tile){if(selected.length>=maxTiles||bytes+tile.byteLength>maxBytes){budgetDropped++;return;}selected.push(tile);bytes+=tile.byteLength;});
      return {tiles:selected,stats:{considered:catalog.tiles.length,frustumCulled:culled,budgetDropped:budgetDropped,selected:selected.length,bytes:bytes,maxTiles:maxTiles,maxBytes:maxBytes,fine:selected.filter(function(t){return t.lod==='fine';}).length,coarse:selected.filter(function(t){return t.lod==='coarse';}).length,sseThreshold:threshold,coordinateConvention:'local East-Up-South; adapter bypasses standard glTF Y-up to tile Z-up conversion'}};
    } };
  }
  root.RTRTwin=root.RTRTwin||{};root.RTRTwin.Lod18={create:create};
  if(typeof module==='object'&&module.exports)module.exports=root.RTRTwin.Lod18;
}(typeof self!=='undefined'?self:globalThis));
