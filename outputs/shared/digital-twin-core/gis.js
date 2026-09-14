/* RtR Digital Twin spatial kernel. Turf 7.4.0 is vendored under MIT. */
(function (root, factory) {
  'use strict';
  var turfLib = root.turf;
  if (typeof module === 'object' && module.exports) turfLib = require('./vendor/turf-7.4.0.min.js');
  var api = factory(turfLib);
  root.RTRTwin = root.RTRTwin || {};
  root.RTRTwin.Gis = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
}(typeof self !== 'undefined' ? self : globalThis, function (turf) {
  'use strict';
  var VERSION = 'rtr-dt-spatial/1.0.0';
  var METHOD = 'Turf 7.4.0 spherical WGS84 area/length; local azimuthal-equidistant projected buffer with 16 arc steps. Screening estimates, not cadastral or survey measurements.';
  function failure(code, message) { var error = new Error(message); error.code = code; return error; }
  function now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }
  function fc(features) { return { type: 'FeatureCollection', features: features }; }
  function feature(geometry, properties) { return { type: 'Feature', geometry: geometry, properties: properties || {} }; }
  function equal(a, b) { return a[0] === b[0] && a[1] === b[1]; }
  function validateGeometry(value, allowedTypes, maxVertices) {
    var geometry = value && value.type === 'Feature' ? value.geometry : value;
    if (!geometry || allowedTypes.indexOf(geometry.type) === -1) throw failure('INVALID_GEOMETRY', 'Expected ' + allowedTypes.join(' or ') + ' in WGS84.');
    var count = 0;
    function point(c) {
      if (!Array.isArray(c) || c.length !== 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || Math.abs(c[0]) > 180 || Math.abs(c[1]) >= 85) throw failure('INVALID_COORDINATE', 'Coordinates must be finite WGS84 longitude/latitude pairs within supported latitude ±85°.');
      if (++count > maxVertices) throw failure('GEOMETRY_TOO_COMPLEX', 'Geometry has too many vertices.');
    }
    function ring(c) {
      if (!Array.isArray(c) || c.length < 4) throw failure('INVALID_RING', 'Polygon rings need at least three vertices and explicit closure.');
      c.forEach(point);
      if (!equal(c[0], c[c.length - 1])) throw failure('INVALID_RING', 'Polygon ring is not closed.');
      if (new Set(c.slice(0, -1).map(function (p) { return p.join(','); })).size < 3) throw failure('INVALID_RING', 'Polygon ring has fewer than three distinct vertices.');
      for (var i = 1; i < c.length; i++) if (equal(c[i - 1], c[i])) throw failure('INVALID_RING', 'Consecutive duplicate vertices are not accepted.');
    }
    if (geometry.type === 'LineString') {
      if (!Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) throw failure('INVALID_LINE', 'LineString requires at least two vertices.');
      geometry.coordinates.forEach(point);
      if (!geometry.coordinates.some(function (p) { return !equal(p, geometry.coordinates[0]); })) throw failure('INVALID_LINE', 'LineString has zero length.');
    } else {
      var polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      if (!Array.isArray(polygons) || !polygons.length) throw failure('INVALID_POLYGON', 'Polygon collection is empty.');
      polygons.forEach(function (p) {
        if (!Array.isArray(p) || !p.length) throw failure('INVALID_POLYGON', 'Polygon has no outer ring.');
        p.forEach(ring);
      });
      var valueFeature = feature(geometry);
      if (!turf.booleanValid(valueFeature) || turf.kinks(valueFeature).features.length || turf.area(valueFeature) <= 0) throw failure('INVALID_TOPOLOGY', 'Polygon topology is invalid, self-crossing, or has zero area.');
      // booleanValid alone does not guarantee every hole is inside its outer ring.
      polygons.forEach(function (p) {
        var outer = turf.polygon([p[0]]);
        for (var i = 1; i < p.length; i++) {
          var hole = turf.polygon([p[i]]);
          if (!turf.booleanWithin(hole, outer)) throw failure('INVALID_HOLE', 'A polygon hole lies outside or crosses its outer ring.');
          for (var j = 1; j < i; j++) if (turf.booleanIntersects(hole, turf.polygon([p[j]]))) throw failure('INVALID_HOLE', 'Polygon holes intersect.');
        }
      });
    }
    var bounds = turf.bbox(feature(geometry));
    if (bounds[2] - bounds[0] > 2 || bounds[3] - bounds[1] > 2) throw failure('UNSUPPORTED_EXTENT', 'This local analysis kernel supports footprints and queries up to 2 degrees in each axis.');
    return geometry;
  }
  function boundsIntersect(a, b) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; }
  function inside(a, b) { return a[0] >= b[0] && a[1] >= b[1] && a[2] <= b[2] && a[3] <= b[3]; }
  function validBounds(bounds) { return Array.isArray(bounds) && bounds.length === 4 && bounds.every(Number.isFinite) && bounds[0] <= bounds[2] && bounds[1] <= bounds[3]; }
  function createEngine(normalized, options) {
    if (!turf || typeof turf.geojsonRbush !== 'function') throw failure('DEPENDENCY_MISSING', 'Turf 7.4.0 was not loaded.');
    if (!normalized || !Array.isArray(normalized.features)) throw failure('INVALID_DATASET', 'Normalized footprint features are required.');
    var sourceGate = normalized.gates && normalized.gates.spatialAnalysis;
    if (!sourceGate || sourceGate.allowed !== true) throw failure('SOURCE_GATE_BLOCKED', 'Spatial source quality/rights gate did not pass: ' + (sourceGate && sourceGate.reasons || ['missing_source_gate']).join(', '));
    options = options || {};
    var initStarted = now(), rejected = [], excluded = 0, usable = [];
    normalized.features.forEach(function (f, index) {
      if (!f || !f.properties || f.properties.classification !== 'building') { excluded++; return; }
      try {
        validateGeometry(f.geometry, ['Polygon', 'MultiPolygon'], 5000);
        usable.push(f);
      } catch (error) { rejected.push({ modelIndex: f.properties.modelIndex == null ? index : f.properties.modelIndex, id: f.id || f.properties.id || null, code: error.code || 'INVALID_GEOMETRY' }); }
    });
    if (!usable.length) throw failure('NO_ELIGIBLE_FOOTPRINTS', 'No valid non-illustrative building footprints are available.');
    var index = turf.geojsonRbush(); index.load(fc(usable));
    var supplied = options.bbox || (normalized.project && normalized.project.bbox) || (normalized.normalization && normalized.normalization.bbox);
    var coverageBounds = validBounds(supplied) ? supplied.slice() : turf.bbox(fc(usable));
    var maxCandidates = Number.isInteger(options.maxCandidates) ? options.maxCandidates : 20000;
    var initTiming = now() - initStarted;
    function query(request) {
      request = request || {};
      var started = now();
      var mode = request.mode || (request.geometry && request.geometry.type === 'LineString' ? 'corridor' : 'area');
      if (mode !== 'area' && mode !== 'corridor') throw failure('INVALID_MODE', 'Mode must be area or corridor.');
      var geometry = validateGeometry(request.geometry, mode === 'area' ? ['Polygon', 'MultiPolygon'] : ['LineString'], 1000);
      var queryFeature = feature(geometry), distances = mode === 'corridor' ? (request.distances || [25, 50, 100]) : [0];
      if (!Array.isArray(distances) || !distances.length || distances.length > 3 || distances.some(function (d) { return !Number.isFinite(d) || d <= 0 || d > 1000; }) && mode === 'corridor') throw failure('INVALID_DISTANCES', 'Use one to three positive corridor distances up to 1000 meters.');
      if (mode === 'corridor' && new Set(distances).size !== distances.length) throw failure('INVALID_DISTANCES', 'Scenario distances must be distinct.');
      var scenarios = [], cumulativeCandidates = 0;
      distances.forEach(function (distance, position) {
        var scenarioFeature = mode === 'area' ? queryFeature : turf.buffer(queryFeature, distance, { units: 'meters', steps: 16 });
        if (!scenarioFeature) throw failure('BUFFER_FAILED', 'The corridor buffer could not be constructed.');
        var bounds = turf.bbox(scenarioFeature), candidates = boundsIntersect(bounds, coverageBounds) ? index.search(bounds).features : [];
        if (candidates.length > maxCandidates) throw failure('QUERY_TOO_BROAD', 'The query exceeds the ' + maxCandidates + ' candidate processing bound. Select a smaller area; no results were truncated.');
        cumulativeCandidates += candidates.length;
        var hits = [], clips = [], intersectionSum = 0, identitySet = new Set(), sourceCounts = Object.create(null), heightKinds = Object.create(null);
        candidates.forEach(function (f) {
          if (!turf.booleanIntersects(f, scenarioFeature)) return;
          var clipped = turf.intersect(fc([f, scenarioFeature]));
          var clippedArea = clipped ? turf.area(clipped) : 0;
          if (clipped && clippedArea > 0) clips.push(clipped);
          intersectionSum += clippedArea;
          var p = f.properties, sourceKey = String(p.sourceKey || 'unknown');
          // Unknown identities remain separate. Cross-provider identities are never inferred.
          var identity = p.sourceId == null || p.sourceId === '' ? 'representation:' + (p.id || f.id || p.modelIndex) : sourceKey + ':' + String(p.sourceId);
          identitySet.add(identity);
          sourceCounts[sourceKey] = (sourceCounts[sourceKey] || 0) + 1;
          var heightKind = p.height && p.height.kind || 'unknown';
          heightKinds[heightKind] = (heightKinds[heightKind] || 0) + 1;
          hits.push({ type: 'Feature', id: f.id, geometry: f.geometry, properties: Object.assign({}, p, { analysis: { clippedAreaM2: clippedArea, edgeContactOnly: clippedArea === 0, identityKey: identity } }) });
        });
        var unionGeometry = clips.length === 1 ? clips[0] : clips.length > 1 ? turf.union(fc(clips)) : null;
        var unionArea = unionGeometry ? turf.area(unionGeometry) : 0;
        scenarios.push({
          key: mode === 'area' ? 'A' : ['A', 'B', 'C'][position],
          label: mode === 'area' ? 'Vùng phân tích' : 'Phương án ' + ['A', 'B', 'C'][position] + ' · vùng đệm ' + distance + ' m',
          distanceM: distance,
          geometry: scenarioFeature.geometry,
          coverage: { status: !boundsIntersect(bounds, coverageBounds) ? 'outside' : inside(bounds, coverageBounds) ? 'within' : 'partial', bbox: coverageBounds.slice(), definition: 'Coverage describes source extent, not verified completeness.' },
          summary: { representationCount: hits.length, identityCount: identitySet.size, intersectionAreaM2: intersectionSum, unionAreaM2: unionArea, overlapAreaM2: Math.max(0, intersectionSum - unionArea), sourceCounts: sourceCounts, heightKinds: heightKinds, queryAreaM2: turf.area(scenarioFeature) },
          features: fc(hits)
        });
      });
      return {
        version: VERSION,
        project: normalized.project || null,
        query: { geometry: geometry, mode: mode, distances: mode === 'corridor' ? distances.slice() : [], areaM2: mode === 'area' ? turf.area(queryFeature) : null, lengthM: mode === 'corridor' ? turf.length(queryFeature, { units: 'meters' }) : null, measurementMethod: METHOD },
        scenarios: scenarios,
        provenance: { sources: normalized.sources || [], frame: normalized.frame || null, normalization: normalized.normalization || null, sourceGate: sourceGate, inputIntegrity: normalized.inputIntegrity || { verified: false, sha256: null, bytes: null, method: 'Parsed input; original file bytes were not independently verified.' }, inputRepresentations: normalized.features.length, eligibleRepresentations: usable.length, excludedIllustrativeOrUnclassified: excluded, invalidRepresentations: rejected, identityRule: 'Count distinct sourceKey+sourceId only within provider; unknown IDs stay separate. Counts are source identities, not verified houses.' },
        limitations: [METHOD, 'Source footprints and heights may be modeled or incomplete. Geometry inclusion does not establish ownership, legal status, structural safety, or compensation eligibility.', 'A/B/C are analytical test scenarios; they are not approved planning proposals.', 'intersectionAreaM2 sums clipped representations and may overlap; unionAreaM2 removes overlap and is the unique clipped footprint area.', 'Edge-only contacts are counted with zero clipped area.'],
        timing: { initMs: initTiming, queryMs: now() - started, candidateChecks: cumulativeCandidates }
      };
    }
    return { version: VERSION, query: query, info: function () { return { eligibleRepresentations: usable.length, excludedRepresentations: excluded, invalidRepresentations: rejected.length, invalidDetails: rejected, coverageBbox: coverageBounds.slice(), initMs: initTiming }; } };
  }
  return { version: VERSION, measurementMethod: METHOD, createEngine: createEngine, validateGeometry: validateGeometry, error: failure };
}));
