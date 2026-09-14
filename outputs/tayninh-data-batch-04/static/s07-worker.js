/* S07 worker: pure descriptor normalization/partitioning. No THREE/WebGL here. */
importScripts("s07-importer.js");
(function () {
  "use strict";
  const VERSION = "s07-worker.1";
  function finite(n) { return Number.isFinite(Number(n)); }
  function pointsOf(feature) { return (feature.points || feature.footprint_local_m || []).map(p => ({ x: Number(p.x ?? p[0]), z: Number(p.z ?? p[1]) })).filter(p => finite(p.x) && finite(p.z)); }
  function bbox(points) { return points.reduce((a, p) => ({ west: Math.min(a.west, p.x), east: Math.max(a.east, p.x), south: Math.min(a.south, p.z), north: Math.max(a.north, p.z) }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity }); }
  function centroid(points) { const n = Math.max(1, points.length); return points.reduce((a, p) => ({ x: a.x + p.x / n, z: a.z + p.z / n }), { x: 0, z: 0 }); }
  function intersects(a, b) { return !!a && !!b && a.west <= b.east && a.east >= b.west && a.south <= b.north && a.north >= b.south; }
  function normFeature(feature) { const points = pointsOf(feature); if (points.length < 3) return null; const box = bbox(points), c = centroid(points); return { id: String(feature.id || feature.stable_id), bbox: box, centroid: c, pointCount: points.length }; }
  function cellFor(point, origin, size) { const col = Math.floor((point.x - origin.west) / size); const row = Math.floor((point.z - origin.south) / size); return { col, row, id: `c${col}_${row}`, bounds: { west: origin.west + col * size, east: origin.west + (col + 1) * size, south: origin.south + row * size, north: origin.south + (row + 1) * size } }; }
  function partition(payload) {
    const size = Number(payload.cellSizeM || 250);
    if (!Number.isFinite(size) || size <= 0) throw new Error("cellSizeM invalid");
    const sampleBounds = payload.sampleBounds;
    const all = (payload.features || []).map(normFeature).filter(Boolean);
    const centroidSet = Array.isArray(payload.centroidMemberIds) ? new Set(payload.centroidMemberIds.map(String)) : null;
    const querySet = Array.isArray(payload.footprintIntersectionIds) ? new Set(payload.footprintIntersectionIds.map(String)) : null;
    const features = all.filter(f => centroidSet ? centroidSet.has(f.id) : (!sampleBounds || intersects(f.bbox, sampleBounds)));
    const queryFeatures = all.filter(f => querySet ? querySet.has(f.id) : (!sampleBounds || intersects(f.bbox, sampleBounds)));
    const origin = sampleBounds || features.reduce((a, f) => ({ west: Math.min(a.west, f.bbox.west), east: Math.max(a.east, f.bbox.east), south: Math.min(a.south, f.bbox.south), north: Math.max(a.north, f.bbox.north) }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity });
    if (!features.length || !Number.isFinite(origin.west)) return { cells: [], features: [], stats: { featureCount: 0, cellCount: 0 } };
    const byId = new Map();
    for (const feature of features) {
      const cell = cellFor(feature.centroid, origin, size);
      if (!byId.has(cell.id)) byId.set(cell.id, { id: cell.id, col: cell.col, row: cell.row, bounds: cell.bounds, featureIds: [], queryFeatureIds: [] });
      byId.get(cell.id).featureIds.push(feature.id);
    }
    const cells = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
    for (const cell of cells) cell.queryFeatureIds = queryFeatures.filter(f => intersects(f.bbox, cell.bounds)).map(f => f.id).sort();
    return { cells, features, stats: { featureCount: features.length, queryFeatureCount: queryFeatures.length, cellCount: cells.length, cellSizeM: size, sampleBounds: origin } };
  }
  self.onmessage = event => {
    const { requestId, generation, type, payload } = event.data || {};
    const started = performance.now();
    try {
      let result;
      if (type === "partition") result = partition(payload || {});
      else if (type === "importer-fixtures") result = self.B04S07Importer.runFixtures();
      else if (type === "import-raster") result = self.B04S07Importer.parseRasterMetadata(payload?.record, payload?.options || {});
      else if (type === "import-geojson") result = self.B04S07Importer.parseGeoJSONFootprints(payload?.geojson, payload?.options || {});
      else throw new Error(`unknown worker job ${type}`);
      self.postMessage({ ok: true, requestId, generation, type, version: VERSION, ms: Number((performance.now() - started).toFixed(3)), result });
    } catch (error) {
      self.postMessage({ ok: false, requestId, generation, type, version: VERSION, ms: Number((performance.now() - started).toFixed(3)), error: error.message });
    }
  };
}());
