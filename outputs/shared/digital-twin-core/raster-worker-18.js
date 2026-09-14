/* GeoTIFF 3.0.5 MIT. COG window decoding and network caches stay off render thread. */
'use strict';
importScripts('vendor/geotiff-3.0.5.js','source-core.js');
var manifest18 = null, generation18 = 0, assets18 = new Map(), patchCache18 = new Map(), patchBytes18 = 0, active18 = new Map();
var CACHE_BUDGET18 = 16777216, CACHE_ENTRIES18 = 8, MAX_DIM18 = 512, MAX_FETCH18 = 4194304;
function fail18(code, message) { var error = new Error(message); error.code = code; return error; }
function validateBounds18(b) { return Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[0] < b[2] && b[1] < b[3] && Math.abs(b[0]) <= 180 && Math.abs(b[2]) <= 180 && Math.abs(b[1]) < 85 && Math.abs(b[3]) < 85; }
function listAssets18(manifest) { return Array.isArray(manifest.assets) ? manifest.assets : Object.keys(manifest.assets || {}).map(function (id) { return Object.assign({ id: id }, manifest.assets[id]); }); }
function prepareManifest18(value) {
  if (!value || !value.assets) throw fail18('INVALID_MANIFEST', 'Raster manifest assets are required.');
  var list = listAssets18(value), ids = new Set();
  if (!list.length || list.length > 8) throw fail18('INVALID_MANIFEST', 'Raster manifest must contain one to eight assets.');
  list.forEach(function (asset) {
    if (!asset.id || ids.has(asset.id)) throw fail18('INVALID_MANIFEST', 'Raster asset IDs must be unique.'); ids.add(asset.id);
    var crs = asset.crs || asset.horizontalCRS;
    if (crs !== 'EPSG:4326' && crs !== 4326) throw fail18('UNSUPPORTED_CRS', 'This raster reader supports north-up EPSG:4326 COGs only.');
    if (!validateBounds18(asset.bbox) || !Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1) throw fail18('INVALID_MANIFEST', 'Raster dimensions and WGS84 bounds are required.');
    if (!/^[a-f0-9]{64}$/.test(asset.sha256 || '') || !Number.isInteger(asset.bytes) || asset.bytes <= 0) throw fail18('SOURCE_FINGERPRINT_REQUIRED', 'Source SHA-256 and byte length are required.');
    var source=(value.sources||[]).find(function(s){return s.id===(asset.sourceKey||asset.sourceId);});
    var admission=self.RTRTwin.SourceCore.inspectSource(source,'ingestion');
    if (asset.ingestionAllowed !== true || asset.hashVerified !== true || !admission.allowed) throw fail18('SOURCE_GATE_BLOCKED', 'Shared source rights/quality contract did not pass: '+admission.errors.join(', '));
    var url;
    try { url = new URL(asset.url, self.location && self.location.href || 'http://localhost/'); } catch (_) { throw fail18('UNSAFE_ASSET_URL', 'Raster asset URL is invalid.'); }
    if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw fail18('UNSAFE_ASSET_URL', 'Raster asset URL must be HTTP(S) without credentials.');
    var assetPath=(asset.path||decodeURIComponent(url.pathname)).replace(/^\/+/, '');
    if(!source.assets.some(function(a){return a.sha256===asset.sha256&&String(a.path||'').replace(/^\/+/, '')===assetPath;}))throw fail18('SOURCE_ASSET_MISMATCH','Streamed COG path/hash is not registered in its admitted source record.');
    if (!['rgb', 'ground', 'dsm', 'uncertainty'].includes(asset.kind)) throw fail18('UNSUPPORTED_ASSET_KIND', 'Only RGB or single-band height/uncertainty COGs are supported.');
    if ((asset.scale != null && !Number.isFinite(asset.scale)) || (asset.offset != null && !Number.isFinite(asset.offset))) throw fail18('INVALID_MANIFEST', 'Raster physical scale and offset must be finite.');
  });
  return list;
}
function touchPatch18(key, item) {
  if (patchCache18.has(key)) { patchBytes18 -= patchCache18.get(key).byteLength; patchCache18.delete(key); }
  patchCache18.set(key, item); patchBytes18 += item.byteLength;
  while (patchCache18.size > CACHE_ENTRIES18 || patchBytes18 > CACHE_BUDGET18) { var oldest = patchCache18.keys().next().value; patchBytes18 -= patchCache18.get(oldest).byteLength; patchCache18.delete(oldest); }
}
function cacheInfo18(hit) { return { hit: hit, entries: patchCache18.size, bytes: patchBytes18, budgetBytes: CACHE_BUDGET18, maxEntries: CACHE_ENTRIES18, blockCachePerAssetBytes: 2097152 }; }
function checkedClient18(asset, network) {
  var signalBudgets=new WeakMap();
  return { request: async function (options) {
    var range = options.headers && (options.headers.Range || options.headers.range), match = /^bytes=(\d+)-(\d+)$/.exec(range || '');
    if (!match) throw fail18('INVALID_BYTE_RANGE', 'Only one explicit byte range is supported.');
    var start = Number(match[1]), end = Math.min(Number(match[2]), asset.bytes - 1);
    if (start < 0 || end < start || end - start + 1 > MAX_FETCH18) throw fail18('BYTE_RANGE_BUDGET', 'COG request exceeds the byte-range budget.');
    if(options.signal){var reserved=signalBudgets.get(options.signal)||0;if(reserved+end-start+1>8388608)throw fail18('READ_BYTE_BUDGET','COG read exceeds the8MiB streamed-byte budget.');signalBudgets.set(options.signal,reserved+end-start+1);}
    var response = await fetch(asset.url, { headers: { Range: 'bytes=' + start + '-' + end, 'If-Match': asset.etag || '"' + asset.sha256 + '"' }, signal: options.signal, cache: 'no-store' });
    if (response.status !== 206) { if (response.body && response.body.cancel) response.body.cancel(); throw fail18('RANGE_REQUIRED', 'COG transport must return HTTP206; whole-file fallback is disabled.'); }
    var contentRange = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(response.headers.get('Content-Range') || '');
    if (!contentRange || Number(contentRange[1]) !== start || Number(contentRange[2]) !== end || Number(contentRange[3]) !== asset.bytes) throw fail18('SOURCE_LENGTH_MISMATCH', 'COG Content-Range does not match the source byte length or requested window.');
    if (response.headers.get('ETag') !== (asset.etag || '"' + asset.sha256 + '"')) throw fail18('SOURCE_ETAG_MISMATCH', 'COG response version does not match the offline-verified source fingerprint.');
    var data = await response.arrayBuffer();
    if (data.byteLength !== end - start + 1) throw fail18('SOURCE_LENGTH_MISMATCH', 'COG range body is incomplete.');
    network.requests++; network.bytes += data.byteLength; network.ranges.push([start, end]);if(network.ranges.length>256)network.ranges.shift();
    return { ok: true, status: 206, getHeader: function (name) { return response.headers.get(name); }, getData: async function () { return data; } };
  } };
}
async function openAsset18(asset, signal) {
  var openedGeneration=generation18;
  if (assets18.has(asset.id)) return assets18.get(asset.id);
  var network = { requests: 0, bytes: 0, ranges: [], wholeFileFallback: false }, client = checkedClient18(asset, network);
  var tiff = await GeoTIFF.fromCustomClient(client, { allowFullFile: false, blockSize: 65536, cacheSize: 32, cache: false }, signal);
  var image = await tiff.getImage(), keys = await image.getGeoKeys();
  if (keys.GeographicTypeGeoKey !== 4326 || keys.ProjectedCSTypeGeoKey) throw fail18('UNSUPPORTED_CRS', 'COG GeoKeys must be unprojected EPSG:4326.');
  if(keys.GTRasterTypeGeoKey===2)throw fail18('UNSUPPORTED_PIXEL_CONVENTION','PixelIsPoint COGs are not supported by the pixel-area window contract.');
  var transform=image.getFileDirectory().getValue('ModelTransformation');if(transform&&(transform[1]!==0||transform[4]!==0))throw fail18('UNSUPPORTED_RASTER_ROTATION','Rotated or skewed COG grids require reprojection before ingestion.');
  if (image.getWidth() !== asset.width || image.getHeight() !== asset.height) throw fail18('SOURCE_DIMENSION_MISMATCH', 'COG dimensions differ from the source manifest.');
  var realBounds=image.getBoundingBox();
  if(realBounds.some(function(v,i){return Math.abs(v-asset.bbox[i])>1e-8;}))throw fail18('SOURCE_BOUNDS_MISMATCH','COG georeferenced bounds differ from the source manifest.');
  var origin=image.getOrigin(),resolution=image.getResolution();
  if(Math.abs(origin[0]-asset.bbox[0])>1e-8||Math.abs(origin[1]-asset.bbox[3])>1e-8||resolution[0]<=0||resolution[1]>=0||Math.abs(resolution[0]-(asset.bbox[2]-asset.bbox[0])/asset.width)>1e-8||Math.abs(resolution[1]+(asset.bbox[3]-asset.bbox[1])/asset.height)>1e-8)throw fail18('UNSUPPORTED_PIXEL_CONVENTION','COG must match the declared north-up pixel-area origin/resolution.');
  var actualNoData=image.getGDALNoData();if(!(actualNoData==null&&asset.nodata==null)&&!Object.is(actualNoData,asset.nodata))throw fail18('SOURCE_NODATA_MISMATCH','COG NoData differs from its declared raw sample contract.');
  if(asset.kind==='rgb'&&(image.getSampleByteSize(0)!==1||image.getSampleFormat(0)!==1))throw fail18('UNSUPPORTED_RGB_TYPE','RGB visualization requires already calibrated UInt8 source bands.');
  if(image.getTileWidth()*image.getTileHeight()*image.getBytesPerPixel()>8388608)throw fail18('DECODE_BLOCK_BUDGET','COG decoded block exceeds the8MiB memory budget.');
  var entry = { asset: asset, tiff: tiff, network: network, imageCount: await tiff.getImageCount(), images:[image] };
  for(var level=1;level<entry.imageCount;level++)entry.images.push(await tiff.getImage(level));
  if(openedGeneration!==generation18||signal&&signal.aborted)throw fail18('CANCELLED','Raster initialization/read generation was replaced.');
  assets18.set(asset.id, entry); return entry;
}
async function read18(request, signal) {
  var readGeneration=generation18;
  var asset = listAssets18(manifest18).find(function (a) { return a.id === request.assetId; });
  if (!asset) throw fail18('UNKNOWN_ASSET', 'Raster asset does not exist.');
  if (!validateBounds18(request.bbox)) throw fail18('INVALID_BBOX', 'A valid WGS84 patch bbox is required.');
  if (!Number.isInteger(request.width) || !Number.isInteger(request.height) || request.width < 1 || request.height < 1 || request.width > MAX_DIM18 || request.height > MAX_DIM18) throw fail18('PATCH_BUDGET', 'Patch dimensions must be integer values from1 to512.');
  var bbox = [Math.max(request.bbox[0], asset.bbox[0]), Math.max(request.bbox[1], asset.bbox[1]), Math.min(request.bbox[2], asset.bbox[2]), Math.min(request.bbox[3], asset.bbox[3])];
  if (!validateBounds18(bbox)) throw fail18('OUTSIDE_COVERAGE', 'Patch does not intersect the source coverage.');
  var width = Math.min(request.width, Math.max(1, Math.ceil((bbox[2] - bbox[0]) / (asset.bbox[2] - asset.bbox[0]) * asset.width)));
  var height = Math.min(request.height, Math.max(1, Math.ceil((bbox[3] - bbox[1]) / (asset.bbox[3] - asset.bbox[1]) * asset.height)));
  var key = JSON.stringify([asset.id, asset.sha256, bbox, width, height]);
  if (patchCache18.has(key)) {
    var cached = patchCache18.get(key); touchPatch18(key, cached);
    var telemetry=assets18.get(asset.id).network;
    return Object.assign({}, cached.result, { values: cached.result.values.slice(0), validMask: cached.result.validMask.slice(0), cache: cacheInfo18(true), network: Object.assign({},cached.result.network,{requests:0,bytes:0,ranges:[],cumulativeRequests:telemetry.requests,cumulativeBytes:telemetry.bytes,wholeFileFallback:false,fromPatchCache:true}) });
  }
  var oldEntry=assets18.get(asset.id),beforeBytes=oldEntry?oldEntry.network.bytes:0,beforeRequests=oldEntry?oldEntry.network.requests:0;
  var opened = await openAsset18(asset, signal),chosen=0,targetX=(bbox[2]-bbox[0])/width,targetY=(bbox[3]-bbox[1])/height;
  opened.images.forEach(function(image,level){if((asset.bbox[2]-asset.bbox[0])/image.getWidth()<=targetX*1.000001&&(asset.bbox[3]-asset.bbox[1])/image.getHeight()<=targetY*1.000001)chosen=level;});
  var selectedImage=opened.images[chosen],iw=selectedImage.getWidth(),ih=selectedImage.getHeight(),dx=(asset.bbox[2]-asset.bbox[0])/iw,dy=(asset.bbox[3]-asset.bbox[1])/ih;
  var window=[Math.max(0,Math.floor((bbox[0]-asset.bbox[0])/dx+1e-8)),Math.max(0,Math.floor((asset.bbox[3]-bbox[3])/dy+1e-8)),Math.min(iw,Math.ceil((bbox[2]-asset.bbox[0])/dx-1e-8)),Math.min(ih,Math.ceil((asset.bbox[3]-bbox[1])/dy-1e-8))];
  bbox=[asset.bbox[0]+window[0]*dx,asset.bbox[3]-window[3]*dy,asset.bbox[0]+window[2]*dx,asset.bbox[3]-window[1]*dy];
  var sourceWidth=window[2]-window[0],sourceHeight=window[3]-window[1],bands=asset.kind==='rgb'?3:1;
  if(sourceWidth*sourceHeight*selectedImage.getSampleByteSize(0)*bands>8388608)throw fail18('DECODE_WINDOW_BUDGET','Selected COG window exceeds8MiB; producer overviews or a smaller crop are required.');
  var raw = await selectedImage.readRasters({ window:window, samples: asset.kind === 'rgb' ? [0, 1, 2] : [0], interleave: true, signal: signal });
  if(raw.length!==sourceWidth*sourceHeight*bands)throw fail18('RASTER_SHAPE_MISMATCH','Decoded COG sample count does not match the selected source window.');
  var n = width * height, mask = new Uint8Array(n), values = asset.kind === 'rgb' ? new Uint8Array(n * 4) : new Float32Array(n), valid = 0, min = Infinity, max = -Infinity;
  for (var i = 0; i < n; i++) {
    // Uniform output pixel centers select the containing source pixel. GeoTIFF's
    // built-in nearest resize uses a different index origin, so do not use it here.
    var column=i%width,row=Math.floor(i/width),sourceColumn=Math.min(sourceWidth-1,Math.floor((column+.5)*sourceWidth/width)),sourceRow=Math.min(sourceHeight-1,Math.floor((row+.5)*sourceHeight/height)),sourceIndex=sourceRow*sourceWidth+sourceColumn;
    if (asset.kind === 'rgb') {
      var r = raw[sourceIndex * 3], g = raw[sourceIndex * 3 + 1], b = raw[sourceIndex * 3 + 2], okay = Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b) && !(asset.nodata != null && r === asset.nodata && g === asset.nodata && b === asset.nodata);
      values[i * 4] = r || 0; values[i * 4 + 1] = g || 0; values[i * 4 + 2] = b || 0; values[i * 4 + 3] = okay ? 255 : 0; mask[i] = okay ? 1 : 0;
    } else {
      var value = raw[sourceIndex], okay = Number.isFinite(value) && !(asset.nodata != null && value === asset.nodata);
      var physical=okay?Math.fround(value*(asset.scale==null?1:asset.scale)+(asset.offset||0)):NaN;okay=okay&&Number.isFinite(physical);if(!okay)physical=NaN;
      values[i] = physical; mask[i] = okay ? 1 : 0;
      if (okay) { min = Math.min(min, physical); max = Math.max(max, physical); }
    }
    if (okay) valid++;
  }
  var deltaRequests=opened.network.requests-beforeRequests;
  var result = { assetId: asset.id, width: width, height: height, values: values.buffer, validMask: mask.buffer, dtype: asset.kind === 'rgb' ? 'rgba8' : 'float32', source: asset, bbox: bbox, pixelConvention: 'north-up centers; column west→east, row north→south; bbox snapped to selected source pixel window',physicalScaleApplied:asset.kind!=='rgb', nodata: asset.nodata == null ? null : asset.nodata, stats: { validPixels: valid, nodataPixels: n - valid, min: min === Infinity ? null : min, max: max === -Infinity ? null : max, nativeResolutionCapApplied: width < request.width || height < request.height, overviewCount: opened.imageCount - 1,selectedOverview:chosen,sourceWindow:window }, executionMode: 'worker', cache: cacheInfo18(false), network: { requests: deltaRequests, bytes: opened.network.bytes - beforeBytes, ranges: deltaRequests?opened.network.ranges.slice(-Math.min(256,deltaRequests)):[], recentRangeLogLimit:256,cumulativeRequests: opened.network.requests, cumulativeBytes: opened.network.bytes, fileBytes: asset.bytes, wholeFileFallback: false, integrityMethod: 'Offline full SHA256 verified; strong HTTP ETag and range length bind streamed source version. Streamed client does not hash whole file.' } };
  if(readGeneration!==generation18||signal&&signal.aborted)throw fail18('CANCELLED','Raster read generation was replaced.');
  touchPatch18(key, { result: result, byteLength: result.values.byteLength + result.validMask.byteLength }); result.cache = cacheInfo18(false);
  return Object.assign({}, result, { values: result.values.slice(0), validMask: result.validMask.slice(0) });
}
self.onmessage = async function (event) {
  var message = event.data || {}, token = message.token, generation = generation18;
  if (message.type === 'cancel') { var running = active18.get(message.cancelToken); if (running) running.abort(); return; }
  try {
    if (message.type === 'init') {
      generation18++; generation = generation18;manifest18=null;
      active18.forEach(function (controller) { controller.abort(); }); active18.clear(); assets18.clear(); patchCache18.clear(); patchBytes18 = 0;
      prepareManifest18(message.manifest);
      manifest18 = message.manifest; self.postMessage({ type: 'ready', token: token, info: { assets: listAssets18(manifest18).map(function (a) { return a.id; }), maxPatchDimension: MAX_DIM18, cacheBudgetBytes: CACHE_BUDGET18, executionMode: 'worker' } });
    } else if (message.type === 'read') {
      if (!manifest18) throw fail18('NOT_READY', 'Initialize raster sources first.');
      var controller = new AbortController(); active18.set(token, controller);
      var result = await read18(message.request, controller.signal);
      if (generation !== generation18 || controller.signal.aborted) return;
      self.postMessage({ type: 'result', token: token, result: result }, [result.values, result.validMask]);
    }
  } catch (error) {
    if (generation !== generation18) return;
    self.postMessage({ type: 'error', token: token, error: { code: error.code || (error.name === 'AbortError' ? 'CANCELLED' : 'RASTER_READ_FAILED'), message: error.message || String(error) } });
  } finally { active18.delete(token); }
};
