(function (global) {
  "use strict";
  const VERSION = "s07-importer.1";
  const REQUIRED = ["kind", "units", "crs", "vertical_datum", "date", "resolution", "bounds", "nodata", "rights", "sourcehash", "quality", "coverage"];
  function fail(message) { throw new Error(`S07 importer: ${message}`); }
  function finite(n) { return (typeof n === "number" && Number.isFinite(n)) || (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))); }
  function asObject(input) {
    if (typeof input === "string") return JSON.parse(input);
    if (input instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(new Uint8Array(input)));
    if (ArrayBuffer.isView(input)) return JSON.parse(new TextDecoder().decode(input));
    if (input && typeof input === "object") return input;
    fail("input must be object, JSON string, or UTF-8 bytes");
  }
  function validHash(value) { return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value); }
  async function sha256Hex(input) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
    if (!bytes) fail("bytes required for sha256");
    const cryptoObj = global.crypto || globalThis.crypto;
    if (!cryptoObj?.subtle) fail("WebCrypto SHA-256 unavailable");
    const digest = await cryptoObj.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function verifyBytesHash(input, sourceRecord) {
    const expected = String(sourceRecord?.sourcehash || "").toLowerCase();
    if (!validHash(expected)) fail("sourcehash must be sha256 hex before byte verification");
    const actual = await sha256Hex(input);
    if (actual !== expected) fail("raw byte sha256 mismatch");
    return actual;
  }
  function requireSource(record, opts = {}) {
    const missing = REQUIRED.filter(k => !(k in (record || {})));
    if (missing.length) fail(`source record missing ${missing.join(",")}`);
    if (record.available === true && opts.allowAvailable !== true) fail("future source cannot be marked available by importer fixture");
    for (const key of ["kind", "units", "crs", "vertical_datum", "date", "resolution", "rights", "quality", "coverage"]) {
      if (typeof record[key] !== "string" || !record[key].trim()) fail(`${key} must be a meaningful string`);
    }
    if (!validHash(record.sourcehash)) fail("sourcehash must be sha256 hex");
    if (!Array.isArray(record.bounds) || record.bounds.length !== 4 || !record.bounds.every(finite)) fail("bounds must be numeric [west,south,east,north]");
    const bounds = record.bounds.map(Number);
    if (!(bounds[0] < bounds[2] && bounds[1] < bounds[3])) fail("bounds order invalid");
    return Object.freeze({ ...record, bounds, sourcehash: record.sourcehash.toLowerCase() });
  }
  function parseRasterMetadata(input, opts = {}) {
    const o = asObject(input);
    const source = requireSource(o.source || o.provenance || o, opts);
    const width = Number(o.width ?? o.cols ?? o.columns);
    const height = Number(o.height ?? o.rows);
    const bands = Number(o.bands ?? (Array.isArray(o.band_names) ? o.band_names.length : 1));
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) fail("raster width/height invalid");
    if (!Number.isInteger(bands) || bands <= 0 || bands > 32) fail("band count invalid");
    const transform = o.transform || o.geo_transform || o.affine;
    if (!Array.isArray(transform) || transform.length !== 6 || !transform.every(finite)) fail("affine transform[6] required; full GeoTIFF decoding is not implemented here");
    const affine = transform.map(Number);
    const det = affine[1] * affine[5] - affine[2] * affine[4];
    if (Math.abs(det) < 1e-12) fail("affine transform singular");
    if (source.nodata === undefined || source.nodata === "") fail("nodata policy required");
    const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([c, r]) => [affine[0] + affine[1] * c + affine[2] * r, affine[3] + affine[4] * c + affine[5] * r]);
    const actualBounds = [Math.min(...corners.map(v => v[0])), Math.min(...corners.map(v => v[1])), Math.max(...corners.map(v => v[0])), Math.max(...corners.map(v => v[1]))];
    if (actualBounds.some((v, i) => Math.abs(v - source.bounds[i]) > 1e-6)) fail("affine-derived raster bounds do not match source bounds");
    return { schema: "s07-raster-metadata/v1", kind: "raster_metadata", decoder: "metadata_json_only", width, height, bands, dataType: o.data_type || o.dtype || "unknown", transform: affine, determinant: det, actualBounds, source };
  }
  function lonLatToScene(lon, lat, origin) {
    if (!origin || !finite(origin[0]) || !finite(origin[1])) fail("origin_wgs84 required for EPSG:4326 GeoJSON");
    const r = 6378137, lon0 = Number(origin[0]), lat0 = Number(origin[1]);
    return { x: (lon - lon0) * Math.PI / 180 * r * Math.cos(lat0 * Math.PI / 180), z: (lat - lat0) * Math.PI / 180 * r };
  }
  function signedArea(points) { let a = 0; for (let i = 0; i < points.length; i++) { const p = points[i], q = points[(i + 1) % points.length]; a += p.x * q.z - q.x * p.z; } return a / 2; }
  function orient(a, b, c) { return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x); }
  function segmentsCross(a, b, c, d) {
    const ab1 = orient(a, b, c), ab2 = orient(a, b, d), cd1 = orient(c, d, a), cd2 = orient(c, d, b);
    return Math.sign(ab1) !== Math.sign(ab2) && Math.sign(cd1) !== Math.sign(cd2);
  }
  function selfIntersects(points) {
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
      if (segmentsCross(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) return true;
    }
    return false;
  }
  function ringToScene(ring, mode, origin) {
    if (!Array.isArray(ring) || ring.length < 4) fail("polygon ring must have >=4 coordinates");
    const closed = Array.isArray(ring[0]) && Array.isArray(ring[ring.length - 1]) && Number(ring[0][0]) === Number(ring[ring.length - 1][0]) && Number(ring[0][1]) === Number(ring[ring.length - 1][1]);
    if (!closed) fail("polygon ring must be explicitly closed");
    const pts = ring.map(p => {
      if (!Array.isArray(p) || p.length < 2 || !finite(p[0]) || !finite(p[1])) fail("coordinate pair invalid");
      return mode === "scene" ? { x: Number(p[0]), z: Number(p[1]) } : lonLatToScene(Number(p[0]), Number(p[1]), origin);
    });
    pts.pop();
    if (Math.abs(signedArea(pts)) < 1e-6) fail("polygon ring area is degenerate");
    if (selfIntersects(pts)) fail("polygon ring self-intersects");
    return pts;
  }
  function bbox(points) {
    return points.reduce((a, p) => ({ west: Math.min(a.west, p.x), east: Math.max(a.east, p.x), south: Math.min(a.south, p.z), north: Math.max(a.north, p.z) }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity });
  }
  function centroid(points) {
    const n = Math.max(1, points.length);
    return points.reduce((a, p) => ({ x: a.x + p.x / n, z: a.z + p.z / n }), { x: 0, z: 0 });
  }
  function parseGeoJSONFootprints(input, opts = {}) {
    const geojson = asObject(input);
    if (geojson.type !== "FeatureCollection" || !Array.isArray(geojson.features)) fail("GeoJSON FeatureCollection required");
    const source = requireSource(opts.source || geojson.source || geojson.provenance || geojson.properties || {}, opts);
    const crsName = opts.crs || geojson.crs?.properties?.name || source.crs;
    let mode;
    if (/scene|canonical/i.test(crsName)) mode = "scene";
    else if (/EPSG:4326|WGS84|CRS84/i.test(crsName)) mode = "wgs84";
    else fail(`unsupported GeoJSON CRS ${crsName}`);
    const seenIds = new Set();
    const features = geojson.features.map((feature, index) => {
      const id = feature.id || feature.properties?.stable_id || feature.properties?.id || `feature_${index + 1}`;
      if (seenIds.has(String(id))) fail(`duplicate GeoJSON feature id ${id}`);
      seenIds.add(String(id));
      const geom = feature.geometry;
      if (!geom || geom.type !== "Polygon") fail(`unsupported geometry for ${id}; only single Polygon is admitted by this importer`);
      if (!Array.isArray(geom.coordinates) || geom.coordinates.length !== 1) fail(`holes are not admitted for ${id}; preserve them upstream or provide triangulated mesh`);
      const points = ringToScene(geom.coordinates[0], mode, opts.origin_wgs84 || geojson.origin_wgs84);
      return { id: String(id), properties: { ...(feature.properties || {}) }, parts: 1, holes: 0, points, bbox: bbox(points), centroid: centroid(points) };
    });
    return { schema: "s07-geojson-footprints/v1", kind: "geojson_footprints", coordinateMode: mode, count: features.length, source, features };
  }
  function componentReader(componentType) {
    if (componentType === 5126) return { size: 4, read: (v, o) => v.getFloat32(o, true) };
    if (componentType === 5125) return { size: 4, read: (v, o) => v.getUint32(o, true) };
    if (componentType === 5123) return { size: 2, read: (v, o) => v.getUint16(o, true) };
    if (componentType === 5121) return { size: 1, read: (v, o) => v.getUint8(o) };
    return null;
  }
  function readAccessor(json, bin, accessorIndex, expectedType, allowedComponents) {
    if (!Number.isInteger(accessorIndex) || accessorIndex < 0) fail("accessor index invalid");
    const accessor = json.accessors?.[accessorIndex];
    if (!accessor || accessor.sparse) fail("unsupported or sparse accessor");
    if (accessor.normalized) fail("normalized accessors are not admitted");
    if (accessor.type !== expectedType) fail(`${expectedType} accessor required`);
    if (!allowedComponents.includes(accessor.componentType)) fail("accessor componentType unsupported");
    const viewDef = json.bufferViews?.[accessor.bufferView];
    if (!viewDef || viewDef.buffer !== 0) fail("accessor bufferView invalid");
    const reader = componentReader(accessor.componentType);
    const components = expectedType === "VEC3" ? 3 : 1;
    const stride = viewDef.byteStride || reader.size * components;
    const viewOffset = viewDef.byteOffset || 0, viewLength = viewDef.byteLength, accessorOffset = accessor.byteOffset || 0;
    const base = viewOffset + accessorOffset;
    const neededRelative = accessorOffset + stride * (accessor.count - 1) + reader.size * components;
    const neededAbsolute = viewOffset + neededRelative;
    if (!Number.isInteger(viewOffset) || !Number.isInteger(viewLength) || viewOffset < 0 || viewLength <= 0 || viewOffset + viewLength > bin.byteLength) fail("bufferView outside BIN chunk");
    if (!Number.isInteger(stride) || stride < reader.size * components) fail("accessor byteStride invalid");
    if (stride % reader.size !== 0 || base % reader.size !== 0) fail("accessor alignment invalid");
    if (!Number.isInteger(accessor.count) || accessor.count <= 0 || neededRelative > viewLength || neededAbsolute > bin.byteLength || base < 0) fail("accessor reads outside bufferView");
    const dv = new DataView(bin.buffer, bin.byteOffset, bin.byteLength);
    const out = [];
    for (let i = 0; i < accessor.count; i++) {
      const off = base + i * stride;
      if (components === 1) out.push(reader.read(dv, off));
      else out.push([reader.read(dv, off), reader.read(dv, off + reader.size), reader.read(dv, off + reader.size * 2)]);
    }
    return out;
  }
  function triArea(a, b, c) { const ux = b[0]-a[0], uy = b[1]-a[1], uz = b[2]-a[2], vx = c[0]-a[0], vy = c[1]-a[1], vz = c[2]-a[2]; const cx = uy*vz-uz*vy, cy = uz*vx-ux*vz, cz = ux*vy-uy*vx; return Math.hypot(cx, cy, cz) / 2; }
  function rejectGlbRuntimeSemantics(json) {
    const forbiddenTop = ["nodes", "scenes", "scene", "skins", "animations", "cameras", "textures", "images", "samplers", "materials"];
    for (const key of forbiddenTop) if (json[key] !== undefined) fail(`${key} are not admitted by the metadata mesh subset`);
    if (Array.isArray(json.extensionsUsed) && json.extensionsUsed.length) fail("GLB extensionsUsed are not admitted");
    if (Array.isArray(json.extensionsRequired) && json.extensionsRequired.length) fail("GLB extensionsRequired are not admitted");
    if (json.extensions) fail("GLB extensions object is not admitted");
    for (const mesh of json.meshes || []) {
      if (mesh.weights || mesh.extras?.targetNames) fail("morph targets are not admitted");
      for (const prim of mesh.primitives || []) {
        if (prim.extensions) fail("primitive extensions such as Draco are not admitted");
        if (prim.targets) fail("morph targets are not admitted");
        if (prim.material !== undefined) fail("materials are not admitted by the metadata mesh subset");
        const attrs = Object.keys(prim.attributes || {});
        if (!attrs.includes("POSITION")) fail("POSITION attribute required");
        const unsupportedAttrs = attrs.filter(k => k !== "POSITION" && !["NORMAL", "TEXCOORD_0"].includes(k));
        if (unsupportedAttrs.length) fail(`unsupported primitive attributes ${unsupportedAttrs.join(",")}`);
      }
    }
  }
  function parseGlbHeader(input, sourceRecord, opts = {}) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
    if (!bytes || bytes.byteLength < 20) fail("GLB bytes required");
    const source = requireSource(sourceRecord || {}, opts);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);
    if (magic !== "glTF") fail("GLB magic invalid");
    if (version !== 2) fail("only GLB v2 accepted");
    if (length !== bytes.byteLength) fail("GLB declared length mismatch");
    let offset = 12, json = null, bin = null, seenJson = false, seenBin = false;
    while (offset + 8 <= bytes.byteLength) {
      const chunkLength = view.getUint32(offset, true), chunkType = view.getUint32(offset + 4, true); offset += 8;
      if (chunkLength % 4 !== 0 || offset % 4 !== 0) fail("GLB chunks must be 4-byte aligned");
      if (offset + chunkLength > bytes.byteLength) fail("GLB chunk exceeds file length");
      const chunk = bytes.slice(offset, offset + chunkLength); offset += chunkLength;
      if (chunkType === 0x4E4F534A) {
        if (seenJson || seenBin) fail("GLB must contain exactly one JSON chunk before BIN");
        seenJson = true; json = JSON.parse(new TextDecoder().decode(chunk).trim());
      } else if (chunkType === 0x004E4942) {
        if (!seenJson || seenBin) fail("GLB BIN chunk order/duplicate invalid");
        seenBin = true; bin = chunk;
      } else fail("unknown GLB chunk type is not admitted");
    }
    if (offset !== bytes.byteLength) fail("GLB contains trailing bytes");
    if (!json || json.asset?.version !== "2.0") fail("GLB JSON asset v2.0 required");
    if (!bin) fail("GLB BIN chunk required");
    rejectGlbRuntimeSemantics(json);
    if ((json.buffers || []).length !== 1 || json.buffers[0].uri) fail("external or multiple GLB buffers are not admitted");
    if (!Number.isInteger(json.buffers[0].byteLength) || json.buffers[0].byteLength < 0 || json.buffers[0].byteLength > bin.byteLength) fail("GLB BIN shorter than declared buffer");
    if (!Array.isArray(json.meshes) || !json.meshes.length) fail("GLB contains no meshes");
    let primitiveCount = 0, triangleEstimate = 0;
    for (const mesh of json.meshes) for (const prim of mesh.primitives || []) {
      if (prim.mode !== undefined && prim.mode !== 4) fail("only TRIANGLES primitives are admitted");
      const positions = readAccessor(json, bin, prim.attributes?.POSITION, "VEC3", [5126]);
      if (positions.some(p => !p.every(Number.isFinite))) fail("POSITION contains nonfinite values");
      const indices = prim.indices !== undefined ? readAccessor(json, bin, prim.indices, "SCALAR", [5121, 5123, 5125]) : positions.map((_, i) => i);
      if (indices.length < 3 || indices.length % 3 !== 0) fail("triangle index count invalid");
      for (let i = 0; i < indices.length; i += 3) {
        const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];
        if (![ia, ib, ic].every(n => Number.isInteger(n) && n >= 0 && n < positions.length)) fail("index out of POSITION range");
        if (triArea(positions[ia], positions[ib], positions[ic]) <= 1e-12) fail("degenerate triangle");
      }
      triangleEstimate += indices.length / 3;
      primitiveCount += 1;
    }
    if (!primitiveCount || !triangleEstimate) fail("GLB has no admitted triangle primitives");
    return { schema: "s07-glb-descriptor/v1", kind: "glb_mesh_descriptor", decoder: "glb_json_bin_validated_mesh_descriptor", version, byteLength: length, meshCount: json.meshes.length, primitiveCount, triangleEstimate, source };
  }
  async function parseGlbModel(input, sourceRecord, opts = {}) {
    const sha256 = await verifyBytesHash(input, sourceRecord);
    const descriptor = parseGlbHeader(input, sourceRecord, opts);
    return { ...descriptor, integrityVerified: true, sha256 };
  }
  function runFixtures() {
    const hash = "a".repeat(64);
    const source = { kind: "modelled", units: "metres", crs: "canonical_scene_m", vertical_datum: "none", date: "2026-09-14", resolution: "fixture", bounds: [0, -2, 2, 0], nodata: null, rights: "synthetic fixture", sourcehash: hash, quality: "fixture", coverage: "fixture", available: false };
    const raster = parseRasterMetadata({ ...source, width: 2, height: 2, bands: 1, transform: [0, 1, 0, 0, 0, -1] }, { allowAvailable: false });
    const geo = parseGeoJSONFootprints({ type: "FeatureCollection", source, features: [{ type: "Feature", properties: { stable_id: "fx1" }, geometry: { type: "Polygon", coordinates: [[[0,0],[1,0],[1,1],[0,1],[0,0]]] } }] });
    const gltf = { asset: { version: "2.0" }, buffers: [{ byteLength: 42 }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 6 }], accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: "VEC3" }, { bufferView: 1, componentType: 5123, count: 3, type: "SCALAR" }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }] };
    const jsonBytesRaw = new TextEncoder().encode(JSON.stringify(gltf));
    const jsonPad = (4 - jsonBytesRaw.length % 4) % 4;
    const bin = new Uint8Array(44); const bdv = new DataView(bin.buffer);
    [[0,0,0],[1,0,0],[0,1,0]].flat().forEach((v,i)=>bdv.setFloat32(i*4,v,true));
    [0,1,2].forEach((v,i)=>bdv.setUint16(36+i*2,v,true));
    const total = 12 + 8 + jsonBytesRaw.length + jsonPad + 8 + bin.length;
    const glb = new Uint8Array(total), dv = new DataView(glb.buffer);
    glb.set([103,108,84,70]); dv.setUint32(4, 2, true); dv.setUint32(8, total, true); dv.setUint32(12, jsonBytesRaw.length + jsonPad, true); dv.setUint32(16, 0x4E4F534A, true); glb.set(jsonBytesRaw, 20); glb.fill(32, 20 + jsonBytesRaw.length, 20 + jsonBytesRaw.length + jsonPad); const binOffset = 20 + jsonBytesRaw.length + jsonPad; dv.setUint32(binOffset, bin.length, true); dv.setUint32(binOffset + 4, 0x004E4942, true); glb.set(bin, binOffset + 8);
    const header = parseGlbHeader(glb, source);
    let rejected = 0;
    for (const bad of [() => parseRasterMetadata({ width: 2 }), () => parseGeoJSONFootprints({ type: "FeatureCollection", source: { ...source, sourcehash: "bad" }, features: [] }), () => parseGlbHeader(new Uint8Array([1,2,3]), source)]) {
      try { bad(); } catch { rejected++; }
    }
    return { raster: raster.width === 2, geojson: geo.count === 1, glb: header.triangleEstimate === 1, rejected };
  }
  global.B04S07Importer = { VERSION, REQUIRED, requireSource, sha256Hex, verifyBytesHash, parseRasterMetadata, parseGeoJSONFootprints, parseGlbHeader, parseGlbModel, runFixtures };
}(typeof self !== "undefined" ? self : globalThis));
