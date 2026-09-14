/* S06 geometry boundary. Native observations stay upstream; every decorative detail is modeled. */
(function (global) {
  "use strict";
  const VERSION = "s07.1";
  const EPS = 1e-7;
  const textureLibraries = new WeakMap();
  function textureLibrary(THREE) {
    if (textureLibraries.has(THREE)) return textureLibraries.get(THREE);
    const library = {}, size = 64;
    for (const [kind, amplitude] of [["plaster", .035], ["roof", .10], ["asphalt", .045]]) {
      const rnd = random(seed(`S06 procedural material ${kind}`)), heights = new Float32Array(size * size), rgb = new Uint8Array(size * size * 4), normal = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) heights[y * size + x] = rnd() * .65 + (kind === "roof" ? Math.sin(x / size * Math.PI * 16) * .55 : 0);
      const at = (x, y) => heights[(y + size) % size * size + (x + size) % size];
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4, grain = heights[y * size + x];
        const value = Math.round(249 + Math.max(-1, Math.min(1, grain - .3)) * (kind === "roof" ? 3 : 5));
        rgb.set([value, value, value, 255], i);
        const nx = (at(x - 1, y) - at(x + 1, y)) * amplitude, ny = (at(x, y - 1) - at(x, y + 1)) * amplitude, length = Math.hypot(nx, ny, 1);
        normal.set([Math.round((nx / length * .5 + .5) * 255), Math.round((ny / length * .5 + .5) * 255), Math.round((1 / length * .5 + .5) * 255), 255], i);
      }
      const texture = (bytes, colorSpace) => {
        const t = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat); t.name = `S06 modeled ${kind} ${colorSpace ? "grain" : "normal"}`;
        t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4;
        t.repeat.set(.25, .25); // Geometry UVs are metres; fallback tile spans 4 m.
        if (colorSpace) t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; return t;
      };
      library[kind] = { map: texture(rgb, true), normalMap: texture(normal, false) };
    }
    textureLibraries.set(THREE, library); return library;
  }
  function disposeTextureLibrary(THREE) {
    const library = textureLibraries.get(THREE); if (!library) return;
    Object.values(library).forEach(pair => Object.values(pair).forEach(t => t.dispose())); textureLibraries.delete(THREE);
  }
  function sharedTextures(THREE) { return Object.values(textureLibraries.get(THREE) || {}).flatMap(pair => Object.values(pair)); }
  function finite(n, fallback = 0) { return Number.isFinite(Number(n)) ? Number(n) : fallback; }
  function seed(s) { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function random(s) { let h = s >>> 0; return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function polygon(feature) {
    const raw = feature.footprint_local_m || feature.points || [];
    const p = raw.map(v => ({ x: finite(v.x ?? v[0]), z: finite(v.z ?? v[1]) }));
    if (p.length > 2 && Math.hypot(p[0].x - p[p.length - 1].x, p[0].z - p[p.length - 1].z) < EPS) p.pop();
    let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i].x * q.z - q.x * p[i].z; }
    return a > 0 ? p.reverse() : p;
  }
  function bounds(p) { return { west: Math.min(...p.map(v => v.x)), east: Math.max(...p.map(v => v.x)), south: Math.min(...p.map(v => v.z)), north: Math.max(...p.map(v => v.z)) }; }
  function contains(p, x, z) {
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i], b = p[j];
      if ((a.z > z) !== (b.z > z) && x < (b.x - a.x) * (z - a.z) / (b.z - a.z) + a.x) inside = !inside;
    }
    return inside;
  }
  function convex(p) {
    let sign = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], c = p[(i + 2) % p.length];
      const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
      if (Math.abs(cross) > EPS) { if (sign && Math.sign(cross) !== sign) return false; sign = Math.sign(cross); }
    }
    return true;
  }
  function gridCuts(a, b, frame, maxLength = 4) {
    const ts = [0, 1], distance = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.max(1, Math.ceil(distance / maxLength)); for (let i = 1; i < n; i++) ts.push(i / n);
    const dx = (frame.xMax - frame.xMin) / (frame.cols - 1), dz = (frame.zMax - frame.zMin) / (frame.rows - 1);
    const gx = (a.x - frame.xMin) / dx, gy = (frame.zMax - a.z) / dz;
    const hx = (b.x - frame.xMin) / dx, hy = (frame.zMax - b.z) / dz;
    // Triangle boundaries: both grid edges and tx+ty=1; split at every integer gx+gy.
    for (const [v, w] of [[gx, hx], [gy, hy], [gx + gy, hx + hy]]) {
      if (Math.abs(w - v) < EPS) continue;
      for (let k = Math.ceil(Math.min(v, w)); k <= Math.floor(Math.max(v, w)); k++) {
        const t = (k - v) / (w - v); if (t > EPS && t < 1 - EPS) ts.push(t);
      }
    }
    ts.sort((x, y) => x - y);
    return ts.filter((t, i) => !i || Math.abs(t - ts[i - 1]) > EPS).map(t => ({ x: a.x + t * (b.x - a.x), z: a.z + t * (b.z - a.z) }));
  }
  function stream(THREE) {
    const positions = [], colors = [], uvs = [], features = [];
    return {
      triangle(a, b, c, color, feature, uv) {
        const col = color instanceof THREE.Color ? color : new THREE.Color(color);
        for (const [i, p] of [a, b, c].entries()) { positions.push(p.x, p.y, p.z); colors.push(col.r, col.g, col.b); uvs.push(...(uv?.[i] || [p.x, p.z])); }
        features.push(feature);
      },
      quad(a, b, c, d, color, feature, uv) {
        this.triangle(a, b, c, color, feature, uv ? [uv[0], uv[1], uv[2]] : null);
        this.triangle(a, c, d, color, feature, uv ? [uv[0], uv[2], uv[3]] : null);
      },
      mesh(material, name, materialKey = "wallMaterialVariant") {
        const geometry = new THREE.BufferGeometry();
        let outputPositions = positions, outputColors = colors, outputUvs = uvs, outputFeatures = features;
        if (Array.isArray(material)) {
          outputPositions = []; outputColors = []; outputUvs = []; outputFeatures = [];
          for (let slot = 0; slot < material.length; slot++) {
            const start = outputPositions.length / 3;
            for (let i = 0; i < features.length; i++) if ((features[i]?.[materialKey] || 0) === slot) {
              outputPositions.push(...positions.slice(i * 9, i * 9 + 9)); outputColors.push(...colors.slice(i * 9, i * 9 + 9)); outputUvs.push(...uvs.slice(i * 6, i * 6 + 6)); outputFeatures.push(features[i]);
            }
            geometry.addGroup(start, outputPositions.length / 3 - start, slot);
          }
        }
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(outputPositions, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(outputColors, 3));
        geometry.setAttribute("uv", new THREE.Float32BufferAttribute(outputUvs, 2)); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
        geometry.userData.triangleToFeature = outputFeatures;
        const mesh = new THREE.Mesh(geometry, material); mesh.name = name; return mesh;
      },
      get triangles() { return positions.length / 9; }
    };
  }
  function clip(p, dot, mid, positive) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], da = dot(a) - mid, db = dot(b) - mid;
      const ai = positive ? da >= -EPS : da <= EPS, bi = positive ? db >= -EPS : db <= EPS;
      if (ai) out.push(a);
      if (ai !== bi) { const t = da / (da - db); out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }); }
    }
    return out;
  }
  function buildingLayer(ctx, features, heightFor) {
    const { THREE, ground, frame } = ctx;
    const wall = stream(THREE), roof = stream(THREE), detail = stream(THREE), foundations = [], buildings = [];
    const roofTypes = { flat: 0, gable: 0, hipped: 0 };
    let windows = 0, edgeSamples = 0, clippedCount = 0, excludedCount = 0;
    for (const feature of features) {
      const sourcePolygon = polygon(feature); if (sourcePolygon.length < 3) { excludedCount++; continue; }
      const sb = bounds(sourcePolygon), margin = .002;
      const isClipped = sb.west < frame.xMin + margin || sb.east > frame.xMax - margin || sb.south < frame.zMin + margin || sb.north > frame.zMax - margin;
      let p = sourcePolygon;
      if (isClipped) {
        p = clip(p, v => v.x, frame.xMin + margin, true); p = clip(p, v => v.x, frame.xMax - margin, false);
        p = clip(p, v => v.z, frame.zMin + margin, true); p = clip(p, v => v.z, frame.zMax - margin, false);
        clippedCount++;
      }
      if (p.length < 3) { excludedCount++; continue; }
      const id = feature.id, rnd = random(seed(id)), b = bounds(p);
      const dense = [];
      for (let i = 0; i < p.length; i++) dense.push(...gridCuts(p[i], p[(i + 1) % p.length], frame).slice(0, -1).map(v => ({ ...v, edgeIndex: i })));
      const grounds = dense.map(v => ground(v.x, v.z));
      const heightInfo = heightFor(feature), h = heightInfo.height;
      const groundReference = Math.max(...grounds), envelopeTop = groundReference + h;
      const wallColor = new THREE.Color(["#e2ddce", "#d6d9d0", "#d5c7b0", "#d4d9df", "#ebe4d6"][Math.floor(rnd() * 5)]);
      const fallbackRoofColor = ["#8b5545", "#5c6d78", "#8e7b69", "#596962", "#a2674a"][Math.floor(rnd() * 5)];
      let longest = 0, axis = { x: 1, z: 0 };
      for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length], d = Math.hypot(q.x - p[i].x, q.z - p[i].z); if (d > longest) { longest = d; axis = { x: (q.x - p[i].x) / d, z: (q.z - p[i].z) / d }; } }
      const transverse = v => -axis.z * v.x + axis.x * v.z, ts = p.map(transverse), lo = Math.min(...ts), hi = Math.max(...ts), mid = (lo + hi) / 2;
      const type = !convex(p) || p.length > 8 ? "flat" : p.length === 4 && longest < (hi - lo) * 1.35 ? "hipped" : "gable";
      // Stable generic styling is not a classification of observed local roof material.
      const roofMaterialVariant = ctx.materialLibrary?.materials?.roof?.map && type !== "flat" && seed(id) % 100 < 45 ? 1 : 0;
      // Photographed albedo already carries its dark tile color; avoid a second dark tint.
      const roofColor = new THREE.Color(roofMaterialVariant ? "#ffffff" : fallbackRoofColor);
      roofTypes[type]++;
      // Above-ground input is the complete envelope, including the generic roof.
      const rise = type === "flat" ? 0 : Math.min(3.5, h * .35, Math.max(.7, (hi - lo) * .21));
      const wallHeight = h - rise, wallTop = envelopeTop - rise;
      const payload = {
        type: "Công trình · kiến trúc mô phỏng", title: id, featureId: id,
        method: `${heightInfo.method}; mái ${({ flat: "phẳng", gable: "dốc hai phía", hipped: "bốn phía" })[type]}, cửa và vật liệu mô phỏng`, date: heightInfo.date,
        resolution: `${finite(feature.area_m2).toFixed(1)} m² mặt bằng · tổng cao gồm mái ${h.toFixed(2)} m · ${heightInfo.support || "xấp xỉ"}`,
        limitation: `Chưa có chiều cao đo thực; mái/cửa/màu chưa quan sát; ảnh Sentinel 10 m không cung cấp mặt đứng. Chiều cao đặt từ điểm terrain cao nhất trên chu vi móng.${isClipped ? " Phần gần rìa chỉ hiện trong vùng terrain; polygon nguồn được giữ nguyên." : ""}`,
        sourceHeightM: null, measuredHeight: false, modelHeightM: heightInfo.modeled ? h : null, proxyHeightM: finite(feature.display_height_m), roofType: type,
        envelopeHeightM: h, groundReferenceM: groundReference, heightReference: "maximum_terrain_perimeter", roofRiseM: rise, wallHeightM: wallHeight,
        roofMaterialVariant, roofMaterialAsset: roofMaterialVariant ? "RoofingTiles013A modeled application" : "S06 varied procedural roof; modeled, not observed",
      };
      const sample = ctx.sampleBounds;
      const inSample = !sample || b.west < sample.east && b.east > sample.west && b.south < sample.north && b.north > sample.south;
      const fineRequested = ctx.detailLevel === "fine" && inSample && !!global.B04S07Surface;
      payload.wallMaterialVariant = fineRequested && ctx.materialLibrary?.materials?.wallBrick && seed(id) % 13 === 0 ? 1 : 0;
      payload.wallMaterialAsset = payload.wallMaterialVariant ? "Bricks104 modeled variant" : ctx.materialLibrary?.materials?.wall ? "Plaster001 modeled application" : "procedural fallback";
      const descriptor = { id, polygon: p, sourcePolygon, bounds: b, topY: envelopeTop, groundReference, wallTop, wallHeight, roofRise: rise, height: h, roofType: type, roofParameters: { axis, lo, hi, mid }, payload, fineRequested };
      descriptor.openings = fineRequested ? global.B04S07Surface.windowOpenings(descriptor) : [];
      let perimeterU = 0;
      for (let i = 0; i < dense.length; i++) {
        const a = dense[i], q = dense[(i + 1) % dense.length], ga = grounds[i], gq = grounds[(i + 1) % dense.length];
        const nextU = perimeterU + Math.hypot(q.x - a.x, q.z - a.z);
        if (fineRequested) global.B04S07Surface.writeWallSegment(wall, { a, b: q, ga: ga + .02, gb: gq + .02, top: wallTop, u0: perimeterU, u1: nextU, polygon: p, openings: descriptor.openings, color: wallColor, payload });
        else wall.quad({ ...a, y: ga + .02 }, { ...q, y: gq + .02 }, { ...q, y: wallTop }, { ...a, y: wallTop }, wallColor, payload,
          [[perimeterU, ga + .02], [nextU, gq + .02], [nextU, wallTop], [perimeterU, wallTop]]);
        perimeterU = nextU;
        foundations.push({ id, x: a.x, z: a.z, y: ga + .02, kind: "vertex_or_grid_cut" });
        foundations.push({ id, x: (a.x + q.x) / 2, z: (a.z + q.z) / 2, y: (ga + gq) / 2 + .02, kind: "edge_midpoint" });
      }
      edgeSamples += dense.length;
      const at = (v, y = wallTop) => ({ ...v, y });
      if (type === "hipped") {
        const c = { x: p.reduce((n, v) => n + v.x, 0) / p.length, z: p.reduce((n, v) => n + v.z, 0) / p.length };
        for (let i = 0; i < p.length; i++) roof.triangle(at(p[i]), at(p[(i + 1) % p.length]), at(c, envelopeTop), roofColor, payload);
      } else {
        const halves = type === "gable" ? [clip(p, transverse, mid, true), clip(p, transverse, mid, false)] : [p];
        const roofY = v => wallTop + (type === "gable" ? rise * Math.max(0, 1 - Math.abs(transverse(v) - mid) / Math.max(.1, (hi - lo) / 2)) : 0);
        for (const half of halves) {
          const tris = THREE.ShapeUtils.triangulateShape(half.map(v => new THREE.Vector2(v.x, v.z)), []);
          for (const t of tris) roof.triangle(at(half[t[0]], roofY(half[t[0]])), at(half[t[2]], roofY(half[t[2]])), at(half[t[1]], roofY(half[t[1]])), roofColor, payload);
        }
        // Gable end-fill and edge fascia stay on the source polygon boundary.
        for (let i = 0; i < p.length; i++) {
          const a = p[i], q = p[(i + 1) % p.length];
          const edge = [a, q]; if ((transverse(a) - mid) * (transverse(q) - mid) < 0 && type === "gable") {
            const t = (mid - transverse(a)) / (transverse(q) - transverse(a)); edge.splice(1, 0, { x: a.x + (q.x - a.x) * t, z: a.z + (q.z - a.z) * t });
          }
          for (let j = 0; j < edge.length - 1; j++) roof.quad(at(edge[j], wallTop), at(edge[j + 1], wallTop), at(edge[j + 1], roofY(edge[j + 1])), at(edge[j], roofY(edge[j])), roofColor, payload);
        }
      }
      // Generic facade modules, muted panes and pale frames; never recorded as observed floors/windows.
      const floors = Math.max(1, Math.min(8, Math.floor(wallHeight / 3.1)));
      if (ctx.detailLevel !== "coarse" && !fineRequested && (ctx.detailLevel !== "fine" || inSample && !global.B04S07Surface)) for (let i = 0; i < p.length; i++) {
        const a = p[i], q = p[(i + 1) % p.length], d = Math.hypot(q.x - a.x, q.z - a.z);
        if (d < 3) continue;
        const ux = (q.x - a.x) / d, uz = (q.z - a.z) / d, nx = -uz * .045, nz = ux * .045;
        const count = Math.min(22, Math.max(1, Math.floor(d / 3.4)));
        for (let floor = 0; floor < floors; floor++) for (let j = 0; j < count; j++) {
          const t = (j + .5) / count, x = a.x + t * (q.x - a.x) + nx, z = a.z + t * (q.z - a.z) + nz;
          const y0 = groundReference + .95 + floor * 3.1, y1 = Math.min(wallTop - .35, y0 + 1.35);
          if (y1 <= y0 || y0 < ground(x, z) + .5) continue;
          const w = Math.min(1.35, d / count * .48);
          detail.quad({ x: x - ux * w / 2, z: z - uz * w / 2, y: y0 }, { x: x + ux * w / 2, z: z + uz * w / 2, y: y0 }, { x: x + ux * w / 2, z: z + uz * w / 2, y: y1 }, { x: x - ux * w / 2, z: z - uz * w / 2, y: y1 }, "#536a70", payload);
          const by = y0 - .10;
          detail.quad({ x: x - ux * (w / 2 + .1), z: z - uz * (w / 2 + .1), y: by }, { x: x + ux * (w / 2 + .1), z: z + uz * (w / 2 + .1), y: by }, { x: x + ux * (w / 2 + .1), z: z + uz * (w / 2 + .1), y: y0 }, { x: x - ux * (w / 2 + .1), z: z - uz * (w / 2 + .1), y: y0 }, "#e7e4d6", payload);
          windows++;
        }
      }
      const clipTriangles = THREE.ShapeUtils.triangulateShape(p.map(v => new THREE.Vector2(v.x, v.z)), []).map(t => t.map(i => p[i]));
      buildings.push({ ...descriptor, clipTriangles, clippedToTerrainDomain: isClipped });
    }
    const fallback = textureLibrary(THREE), supplied = ctx.materialLibrary?.materials || {};
    const textures = { plaster: supplied.wall || fallback.plaster, brick: supplied.wallBrick, roof: supplied.roof || fallback.roof, roofFallback: fallback.roof };
    const material = (roughness, metalness, kind) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, side: THREE.DoubleSide, ...(kind ? textures[kind] : {}) });
    const group = new THREE.Group(); group.name = "Source-footprint buildings with modeled architectural detail";
    const wallMaterials = textures.brick && ctx.detailLevel === "fine" ? [material(.91, .01, "plaster"), material(.94, .01, "brick")] : material(.91, .01, "plaster");
    const roofMaterials = supplied.roof?.map ? [material(.82, .12, "roofFallback"), material(.85, .01, "roof")] : material(.72, .08, "roofFallback");
    const wallMesh = wall.mesh(wallMaterials, "S06 walls / terrain-following foundations"), roofMesh = roof.mesh(roofMaterials, "S07 varied modeled roof materials / unchanged geometry", "roofMaterialVariant"), detailMesh = detail.mesh(material(.58, .08), "S06 modeled facade panes / sills");
    if (ctx.detailLevel === "fine") {
      const byId = new Map(buildings.filter(v => v.fineRequested).map(v => { v.roofTopTriangles = []; return [v.id, v]; }));
      const p = roofMesh.geometry.attributes.position, n = roofMesh.geometry.attributes.normal;
      for (let i = 0; i < p.count; i += 3) {
        const b = byId.get(roofMesh.geometry.userData.triangleToFeature[i / 3]?.featureId); if (!b || n.getY(i) < .001) continue;
        b.roofTopTriangles.push([0, 1, 2].map(j => ({ x: p.getX(i + j), y: p.getY(i + j), z: p.getZ(i + j) })));
      }
    }
    group.add(wallMesh, roofMesh, detailMesh); group.userData.kind = "buildings";
    const fineLayer = ctx.detailLevel === "fine" && global.B04S07Surface ? global.B04S07Surface.fineBuildingDetails(ctx, buildings.filter(v => v.fineRequested)) : null;
    if (fineLayer) group.add(fineLayer.group);
    return { group, pickables: [wallMesh, roofMesh, detailMesh, ...(fineLayer?.pickables || [])], detailMesh, fineLayer, foundations, buildings,
      qa: { buildingCount: buildings.length, sourceCount: features.length, modeledHeightCount: buildings.filter(v => v.payload.modelHeightM !== null).length, proxyHeightCount: buildings.filter(v => v.payload.modelHeightM === null).length, completeSourcePolygonCoverageCount: buildings.filter(v => !v.clippedToTerrainDomain).length, clippedToTerrainDomainCount: buildings.filter(v => v.clippedToTerrainDomain).length, domainAffectedSourceCount: clippedCount, excludedCount, excludedIds: features.filter(f => !buildings.some(b => b.id === f.id)).map(f => f.id), terrainDomain: "Raster node-centre mesh domain; differs from AOI outer pixel edges. Original source polygons/support preserved.", sourceHeightNullCount: features.filter(v => v.source_height_m == null).length, roofTypes, roofMaterialStyles: { photographedTileBuildings: buildings.filter(v => v.payload.roofMaterialVariant === 1).length, proceduralBuildings: buildings.filter(v => v.payload.roofMaterialVariant === 0).length, flatPhotographedBuildings: buildings.filter(v => v.roofType === "flat" && v.payload.roofMaterialVariant === 1).length, slots: Array.isArray(roofMaterials) ? roofMaterials.length : 1, modeled: true, selection: "stable ID seed; not observed site material" }, genericWindowCount: windows, denseBoundaryVertices: edgeSamples, maxEdgeStepM: 4, gridTriangleCuts: true, wallsTriangles: wall.triangles, roofTriangles: roof.triangles, detailTriangles: detail.triangles, detailLevel: ctx.detailLevel || "standard", uvUnits: "metres; cumulative wall perimeter U / absolute height V; roof world XZ", materialLibraryReady: !!ctx.materialLibrary?.qa?.ready, observedRoofOrFacade: false } };
  }
  function groundQA(THREE, terrain, foundations, stride = 1, nominalLiftM = .02, role = "building") {
    terrain.updateMatrixWorld(true);
    const ray = new THREE.Raycaster(), direction = new THREE.Vector3(0, -1, 0), origin = new THREE.Vector3();
    // Partition the ACTUAL rendered index, sharing its original Float32 vertex buffer.
    // Temporarily test only triangles whose XZ bounds meet the vertical ray's tile, then restore.
    // No height sampler or regenerated terrain geometry enters verification.
    const originalIndex = terrain.geometry.index, position = terrain.geometry.attributes.position, tiles = new Map(), size = 64;
    for (let i = 0; i < originalIndex.count; i += 3) {
      const ids = [originalIndex.getX(i), originalIndex.getX(i + 1), originalIndex.getX(i + 2)];
      const xs = ids.map(v => position.getX(v)), zs = ids.map(v => position.getZ(v));
      for (let x = Math.floor((Math.min(...xs) - .001) / size); x <= Math.floor((Math.max(...xs) + .001) / size); x++) for (let z = Math.floor((Math.min(...zs) - .001) / size); z <= Math.floor((Math.max(...zs) + .001) / size); z++) {
        const key = `${x},${z}`; if (!tiles.has(key)) tiles.set(key, []); tiles.get(key).push(...ids);
      }
    }
    const indexes = new Map([...tiles].map(([key, ids]) => [key, new THREE.Uint32BufferAttribute(ids, 1)]));
    let min = Infinity, max = -Infinity, hits = 0, misses = 0, overTolerance = 0; const missExamples = [];
    const ids = new Set(), examples = [];
    try { for (let i = 0; i < foundations.length; i += stride) {
      const p = foundations[i]; origin.set(p.x, p.y + 1000, p.z); ray.set(origin, direction);
      const index = indexes.get(`${Math.floor(p.x / size)},${Math.floor(p.z / size)}`);
      if (!index) { misses++; if (missExamples.length < 5) missExamples.push(p); continue; }
      terrain.geometry.setIndex(index);
      const h = ray.intersectObject(terrain, false)[0]; if (!h) { misses++; if (missExamples.length < 5) missExamples.push(p); continue; }
      const clearance = p.y - h.point.y; min = Math.min(min, clearance); max = Math.max(max, clearance); hits++; ids.add(p.id);
      if (Math.abs(clearance - nominalLiftM) > .025) overTolerance++;
      if (examples.length < 10) examples.push({ featureId: p.id, kind: p.kind, clearanceM: Number(clearance.toFixed(5)) });
    } } finally { terrain.geometry.setIndex(originalIndex); }
    return { method: "independent_THREE_Raycaster_actual_terrain_mesh", acceleration: "XZ partitions of actual rendered index; original vertex buffer unchanged; full index restored", independent: true, sourceAccuracyValidated: false, role, sampledFeatures: ids.size, totalFeatures: new Set(foundations.map(v => v.id)).size, totalBuildings: role === "building" ? new Set(foundations.map(v => v.id)).size : null, samples: hits + misses, rayHits: hits, rayMisses: misses, minClearanceM: Number(min.toFixed(6)), maxClearanceM: Number(max.toFixed(6)), nominalLiftM, overTolerance, examples, missExamples, note: "Verifies constructed geometry against actual rendered terrain triangles, not source field accuracy." };
  }

  function clipDomain(p, frame) {
    p = clip(p, v => v.x, frame.xMin + .002, true); p = clip(p, v => v.x, frame.xMax - .002, false);
    p = clip(p, v => v.z, frame.zMin + .002, true); return clip(p, v => v.z, frame.zMax - .002, false);
  }
  function subtractTriangle(p, triangle) {
    let sign = 0; for (let i = 0; i < 3; i++) { const a = triangle[i], b = triangle[(i + 1) % 3]; sign += a.x * b.z - b.x * a.z; }
    let inside = p; const outside = [];
    for (let i = 0; i < 3 && inside.length >= 3; i++) {
      const a = triangle[i], b = triangle[(i + 1) % 3], dot = v => (b.x - a.x) * (v.z - a.z) - (b.z - a.z) * (v.x - a.x);
      const discarded = clip(inside, dot, 0, sign < 0); if (discarded.length >= 3) outside.push(discarded);
      inside = clip(inside, dot, 0, sign >= 0);
    }
    return outside;
  }
  function drapePolygon(ctx, source, lift, color, payload, output, avoidBuildings) {
    const { frame, ground } = ctx, p = clipDomain(source, frame); if (p.length < 3) return 0;
    const b = bounds(p), dx = frame.width / (frame.cols - 1), dz = frame.depth / (frame.rows - 1);
    const c0 = Math.max(0, Math.floor((b.west - frame.xMin) / dx)), c1 = Math.min(frame.cols - 2, Math.floor((b.east - frame.xMin) / dx));
    const r0 = Math.max(0, Math.floor((frame.zMax - b.north) / dz)), r1 = Math.min(frame.rows - 2, Math.floor((frame.zMax - b.south) / dz));
    const blockers = avoidBuildings ? (ctx.buildings || []).filter(v => v.bounds.west < b.east && v.bounds.east > b.west && v.bounds.south < b.north && v.bounds.north > b.south) : [];
    let removed = 0;
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const x0 = frame.xMin + c * dx, x1 = x0 + dx, z1 = frame.zMax - r * dz, z0 = z1 - dz;
      let cp = clip(p, v => v.x, x0, true); cp = clip(cp, v => v.x, x1, false); cp = clip(cp, v => v.z, z0, true); cp = clip(cp, v => v.z, z1, false); if (cp.length < 3) continue;
      const diagonal = v => (v.x - x0) / dx + (z1 - v.z) / dz;
      for (const positive of [false, true]) {
        const half = clip(cp, diagonal, 1, positive); if (half.length < 3) continue;
        let pieces = [half];
        for (const blocker of blockers) for (const triangle of blocker.clipTriangles) {
          const before = pieces; pieces = pieces.flatMap(poly => subtractTriangle(poly, triangle));
          if (before.length !== pieces.length) removed++;
        }
        for (const piece of pieces) {
          let signed = 0; for (let i = 0; i < piece.length; i++) { const v = piece[i], q = piece[(i + 1) % piece.length]; signed += v.x * q.z - q.x * v.z; }
          if (Math.abs(signed) < 1e-6) continue;
          if (signed > 0) piece.reverse();
          const at = v => ({ ...v, y: ground(v.x, v.z) + lift });
          for (let i = 1; i < piece.length - 1; i++) output.triangle(at(piece[0]), at(piece[i]), at(piece[i + 1]), color, payload);
        }
      }
    }
    return removed;
  }
  function geometryGroundSamples(mesh, perFeature = 12) {
    const p = mesh.geometry.attributes.position, table = mesh.geometry.userData.triangleToFeature, groups = new Map(), out = [];
    for (let i = 0; i < p.count; i += 3) {
      const id = table[i / 3].featureId || table[i / 3].title;
      if (!groups.has(id)) groups.set(id, []); groups.get(id).push(i);
    }
    for (const [id, triangles] of groups) {
      const step = perFeature === Infinity ? 1 : Math.max(1, Math.ceil(triangles.length / perFeature));
      for (let j = 0; j < triangles.length; j += step) {
        const i = triangles[j];
        for (let k = 0; k < 3; k++) out.push({ id, x: p.getX(i + k), y: p.getY(i + k), z: p.getZ(i + k), kind: "actual_surface_vertex" });
        out.push({ id, x: (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, y: (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, z: (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, kind: "actual_triangle_centroid" });
      }
    }
    return out;
  }
  function rasterEvidenceLayer(ctx, cells, metric, kind) {
    const { THREE } = ctx, out = stream(THREE); let rendered = 0, clipped = 0, excluded = 0;
    for (const c of cells) {
      const id = `jrc_${c.row}_${c.col}`, x = finite(c.x), z = finite(c.z), value = finite(c[metric]);
      const p = [{ x: x - 6, z: z - 6 }, { x: x + 6, z: z - 6 }, { x: x + 6, z: z + 6 }, { x: x - 6, z: z + 6 }];
      const affected = p.some(v => v.x < ctx.frame.xMin || v.x > ctx.frame.xMax || v.z < ctx.frame.zMin || v.z > ctx.frame.zMax);
      const valueLabel = kind === "water-change" ? "Thay đổi chuẩn hóa (%)" : kind === "water-seasonality" ? "Số tháng có nước năm 2024" : "Tần suất mặt nước (%)";
      const payload = { featureId: id, type: "Ô bằng chứng JRC", title: id, method: "Ô raster được biểu diễn bằng ký hiệu bám terrain; chưa có độ sâu ngập", date: kind === "water-seasonality" ? "2024" : kind === "water-change" ? "1984–1999 / 2000–2024" : "1984–2024", resolution: `${valueLabel}: ${value.toFixed(1)}`, limitation: `Nguồn danh nghĩa 30 m; ký hiệu 12 m chỉ để đọc bản đồ.${affected ? " Ký hiệu gần rìa được cắt theo vùng terrain." : ""}` };
      const color = new THREE.Color(kind === "water-change" ? value >= 0 ? "#359d83" : "#bf8952" : kind === "water-seasonality" ? "#5aafba" : "#4c9bb6");
      const before = out.triangles; drapePolygon(ctx, p, .16, color, payload, out, false);
      if (out.triangles > before) { rendered++; if (affected) clipped++; } else excluded++;
    }
    const mesh = out.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .65, side: THREE.DoubleSide, depthWrite: false }), kind);
    mesh.userData.kind = kind;
    return { mesh, qa: { sourceCells: cells.length, renderedCells: rendered, domainClippedCells: clipped, excludedCells: excluded, glyphSizeM: 12, sourceNominalResolutionM: 30, surfaceDrape: "actual_TIN_clipped", triangles: out.triangles } };
  }
  function roadLayer(ctx, features, options = {}) {
    const { THREE, ground } = ctx, road = stream(THREE), markings = stream(THREE), water = options.water === true;
    let count = 0, domainClipped = 0, excluded = 0, buildingClipOperations = 0;
    const segments = [], centerlineConflictIds = new Set();
    for (const f of features) {
      const p = (f.path_local_m || []).map(v => ({ x: finite(v.x ?? v[0]), z: finite(v.z ?? v[1]) })); if (p.length < 2) { excluded++; continue; }
      const width = Math.min(water ? 25 : 16, Math.max(water ? 2 : 2.4, finite(f.width_proxy_m, water ? 8 : 4)));
      const payload = { featureId: f.id, type: water ? "Thủy hệ OSM" : "Đường OSM", title: f.name || f.id, method: "Đường gốc OSM; bề rộng và vật liệu mô phỏng, bám tam giác terrain và cắt theo footprint", date: f.data_date || "Trích xuất OSM", resolution: `${f.class || "vector"} · bề rộng xấp xỉ ${width.toFixed(1)} m`, limitation: water ? "Thủy hệ mô tả; chưa có mô hình dòng chảy hay ngập." : "Vật liệu/vạch đường là mô phỏng; xung đột đường gốc với footprint được lưu trong QA, chưa được sửa bằng đo thực." };
      const before = road.triangles; let clipped = false;
      for (let i = 0; i < p.length - 1; i++) {
        const a = p[i], b = p[i + 1], dx = b.x - a.x, dz = b.z - a.z, distance = Math.hypot(dx, dz); if (distance < EPS) continue;
        const nx = -dz / distance, nz = dx / distance;
        const v = (q, side) => ({ x: q.x + nx * side, z: q.z + nz * side });
        const quad = (left, right) => [v(a, left), v(b, left), v(b, right), v(a, right)];
        if (quad(-width / 2, width / 2).some(q => q.x < ctx.frame.xMin || q.x > ctx.frame.xMax || q.z < ctx.frame.zMin || q.z > ctx.frame.zMax)) clipped = true;
        buildingClipOperations += drapePolygon(ctx, quad(-width / 2, width / 2), .07, water ? "#4c8f9c" : ctx.materialLibrary?.materials?.asphalt?.map ? "#ffffff" : "#535a56", payload, road, !water);
        if (!water && width >= 5) for (const edge of [-1, 1]) drapePolygon(ctx, quad(edge * (width / 2 - .28) - .05, edge * (width / 2 - .28) + .05), .10, "#c3c7b6", payload, markings, true);
        if (!water && width >= 7 && i % 3 === 0) drapePolygon(ctx, quad(-.075, .075), .11, "#c8c2a5", payload, markings, true);
        if (!water) for (const house of (ctx.buildings || [])) {
          if (Math.max(a.x, b.x) < house.bounds.west || Math.min(a.x, b.x) > house.bounds.east || Math.max(a.z, b.z) < house.bounds.south || Math.min(a.z, b.z) > house.bounds.north) continue;
          if (contains(house.polygon, a.x, a.z) || contains(house.polygon, b.x, b.z) || house.polygon.some((q, j) => {
            const r = house.polygon[(j + 1) % house.polygon.length], det = dx * (r.z - q.z) - dz * (r.x - q.x);
            if (Math.abs(det) < EPS) return false;
            const t = ((q.x - a.x) * (r.z - q.z) - (q.z - a.z) * (r.x - q.x)) / det;
            const u = ((q.x - a.x) * dz - (q.z - a.z) * dx) / det;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
          })) centerlineConflictIds.add(f.id);
        }
        segments.push({ a, b, width });
      }
      if (road.triangles > before) count++; else excluded++;
      if (clipped) domainClipped++;
    }
    const group = new THREE.Group();
    const asphalt = road.mesh(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: water ? .55 : .96, metalness: water ? .06 : 0, side: THREE.DoubleSide, ...(!water ? ctx.materialLibrary?.materials?.asphalt || textureLibrary(THREE).asphalt : {}) }), water ? "S06 draped OSM water ribbons" : "S06 draped asphalt ribbons");
    const lines = markings.mesh(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }), "S06 generic edge/center markings"); group.add(asphalt, lines);
    group.userData.renderedFeatures = count; group.userData.kind = water ? "osm_water" : "roads";
    return { group, surfaceMesh: asphalt, pickables: [asphalt, lines], segments, qa: { sourceFeatures: features.length, features: count, domainClippedFeatures: domainClipped, excludedFeatures: excluded, triangles: road.triangles + markings.triangles, pathInterpolation: "piecewise_original_segments", surfaceDrape: "exact intersection with each terrain grid cell/diagonal, then triangle-plane sampling", widthObserved: false, materialModeled: true, buildingPolygonSubtraction: !water, buildingClipOperations, sourceCenterlineConflictCount: centerlineConflictIds.size, sourceCenterlineConflictIds: [...centerlineConflictIds] } };
  }
  function segmentDistance(x, z, a, b) { const dx = b.x - a.x, dz = b.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / Math.max(EPS, dx * dx + dz * dz))); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); }
  function vegetationLayer(ctx, buildings, segments, field, water) {
    const { THREE, ground, frame } = ctx, candidates = [], maxTrees = 1200, rnd = random(6172026);
    const grid = new Map(), cell = 18, key = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
    const exclusions = new Map(), add = (k, obj) => { if (!exclusions.has(k)) exclusions.set(k, []); exclusions.get(k).push(obj); };
    const exclusionCell = 60, ek = (x, z) => `${Math.floor(x / exclusionCell)},${Math.floor(z / exclusionCell)}`;
    for (const b of buildings) for (let x = Math.floor((b.bounds.west - 7) / exclusionCell); x <= Math.floor((b.bounds.east + 7) / exclusionCell); x++) for (let z = Math.floor((b.bounds.south - 7) / exclusionCell); z <= Math.floor((b.bounds.north + 7) / exclusionCell); z++) add(`${x},${z}`, { kind: "building", value: b });
    for (const s of segments) { const b = bounds([s.a, s.b]), pad = s.width / 2 + 7; for (let x = Math.floor((b.west - pad) / exclusionCell); x <= Math.floor((b.east + pad) / exclusionCell); x++) for (let z = Math.floor((b.south - pad) / exclusionCell); z <= Math.floor((b.north + pad) / exclusionCell); z++) add(`${x},${z}`, { kind: "road", value: s }); }
    const hrows = field?.height_grid_u8_rows, srows = field?.uncertainty_grid_u8_rows, dims = field?.dimensions || [], fb = field?.edge_bounds_scene_m?.bounds_m;
    if (!hrows || !fb) return { group: new THREE.Group(), qa: { candidates: 0, reason: "missing canopy mask", detectedIndividuals: false }, updateLOD() {} };
    const sampled = (x, z) => { const c = Math.floor((x - fb[0]) / (fb[2] - fb[0]) * dims[0]), r = Math.floor((fb[3] - z) / (fb[3] - fb[1]) * dims[1]); return [hrows[r]?.[c], srows?.[r]?.[c]]; };
    const waterCells = water || [];
    for (let attempt = 0; attempt < 28000 && candidates.length < maxTrees; attempt++) {
      const x = frame.xMin + 8 + rnd() * (frame.width - 16), z = frame.zMin + 8 + rnd() * (frame.depth - 16), [height, sd] = sampled(x, z);
      if (!Number.isFinite(height) || height === 255 || height < 5 || height > 35 || !Number.isFinite(sd) || sd === 255 || sd > 12) continue;
      if ((exclusions.get(ek(x, z)) || []).some(o => o.kind === "building" ? x >= o.value.bounds.west - 7 && x <= o.value.bounds.east + 7 && z >= o.value.bounds.south - 7 && z <= o.value.bounds.north + 7 : segmentDistance(x, z, o.value.a, o.value.b) < o.value.width / 2 + 7)) continue;
      if ((ctx.waterSegments || []).some(s => segmentDistance(x, z, s.a, s.b) < s.width / 2 + 7)) continue;
      if (waterCells.some(v => finite(v.occurrence_percent) > 10 && Math.hypot(x - finite(v.x ?? v.center_local_m?.[0]), z - finite(v.z ?? v.center_local_m?.[1])) < 22)) continue;
      const cx = Math.floor(x / cell), cz = Math.floor(z / cell); let near = false;
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if ((grid.get(`${cx + i},${cz + j}`) || []).some(v => Math.hypot(v.x - x, v.z - z) < 11)) near = true;
      if (near) continue;
      const tree = { x, z, y: ground(x, z), height: Math.min(15, height * (.65 + rnd() * .24)), radius: 2.0 + rnd() * 2.4, variation: rnd(), sourceRasterHeight: height, sourceUncertainty: sd };
      candidates.push(tree); const k = key(x, z); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(tree);
    }
    const crownGeo = new THREE.IcosahedronGeometry(1, 1), trunkGeo = new THREE.CylinderGeometry(.10, .18, 1, 5);
    const far = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: "#456a3d", roughness: .96 }), maxTrees);
    const near = new THREE.InstancedMesh(crownGeo, new THREE.MeshStandardMaterial({ color: "#547343", roughness: .93 }), 500 * 4);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: "#78634b", roughness: 1 }), 500);
    const group = new THREE.Group(); group.name = "Graphic vegetation / ETH constrained / not detected individuals"; group.add(far, near, trunks);
    const dummy = new THREE.Object3D(), color = new THREE.Color(); let previous = "", visibleNear = 0, visibleFar = 0;
    const qa = { candidates: candidates.length, budgetTrees: maxTrees, nearTreeBudget: 500, crownLobesPerNearTree: 4, detectedIndividuals: false, representation: "deterministic_irregular_graphic_instancing", canopyMaskHeightMinM: 5, uncertaintyMaxM: 12, exclusions: "building bbox buffer7m, road/OSM water half-width+7m, JRC water buffer22m", lodNearTrees: 0, lodFarTrees: 0 };
    function updateLOD(target, radius, force) {
      const signature = `${Math.round(target.x / 45)},${Math.round(target.z / 45)},${Math.round(radius / 70)}`;
      if (!force && signature === previous) return; previous = signature; visibleNear = visibleFar = 0;
      const limit = radius < 650 ? Math.max(250, radius * 1.4) : 5500;
      const sorted = candidates.map(v => ({ v, distance: Math.hypot(v.x - target.x, v.z - target.z) })).filter(v => v.distance < limit).sort((a, b) => a.distance - b.distance);
      for (const { v, distance } of sorted) {
        const detailed = radius < 650 && distance < Math.max(180, radius * .9) && visibleNear < 500;
        if (detailed) {
          for (let l = 0; l < 4; l++) {
            const angle = l * 2.4 + v.variation * 3, offset = l ? v.radius * .4 : 0;
            dummy.position.set(v.x + Math.cos(angle) * offset, v.y + v.height * (.68 + l * .045), v.z + Math.sin(angle) * offset);
            dummy.rotation.set(v.variation, angle, v.variation * .6); dummy.scale.set(v.radius * (l ? .74 : .94), v.radius * (1.06 + v.variation * .3), v.radius * .85); dummy.updateMatrix(); near.setMatrixAt(visibleNear * 4 + l, dummy.matrix);
            color.setHSL(.25 + v.variation * .055, .29, .21 + .025 * l + v.variation * .07); near.setColorAt(visibleNear * 4 + l, color);
          }
          dummy.position.set(v.x, v.y + v.height * .30, v.z); dummy.rotation.set(0, 0, 0); dummy.scale.set(v.radius * .6, v.height * .6, v.radius * .6); dummy.updateMatrix(); trunks.setMatrixAt(visibleNear, dummy.matrix); visibleNear++;
        } else {
          dummy.position.set(v.x, v.y + v.height * .7, v.z); dummy.rotation.set(v.variation, v.variation * 6, 0); dummy.scale.set(v.radius, v.radius * 1.16, v.radius * .87); dummy.updateMatrix(); far.setMatrixAt(visibleFar, dummy.matrix); visibleFar++;
        }
      }
      near.count = visibleNear * 4; trunks.count = visibleNear; far.count = visibleFar;
      for (const m of [far, near, trunks]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; m.computeBoundingSphere(); }
      qa.lodNearTrees = visibleNear; qa.lodFarTrees = visibleFar;
    }
    return { group, qa, candidates, updateLOD };
  }
  function acceptedGoogle(model) {
    const s = model?.height_support;
    return s?.accepted === true && s.threshold_presence === .5 && Number.isInteger(s.polygon_sample_pixels) && s.polygon_sample_pixels > 0 && Number.isInteger(s.presence_gt_threshold_pixels) && s.presence_gt_threshold_pixels > 0 && Number.isInteger(s.height_valid_pixels) && s.height_valid_pixels > 0 && s.height_valid_pixels <= s.presence_gt_threshold_pixels && s.presence_gt_threshold_pixels <= s.polygon_sample_pixels && s.support_ratio >= .25 && Math.abs(s.support_ratio - s.presence_gt_threshold_pixels / s.polygon_sample_pixels) <= 1e-6 && model.qualified === true && model.height_qualified === true && model.source_height_m === null && model.measured_height === false && model.height_kind === "modelled" && Number.isFinite(model.model_height_m) && model.model_height_m >= 1 && model.model_height_m <= 30 && model.google_model_height_m === model.model_height_m;
  }
  // Admission is pure and finishes before any runtime descriptor is committed.
  // This verifies structure/semantics only. Build-time validation verifies the bytes/hashes.
  function admitSolution(s, baseline) {
    const require = (ok, reason) => { if (!ok) throw new Error(`S06 contract: ${reason}`); };
    const keys = ["schema", "generated_at", "frame", "source_fingerprints", "coordinate_transform", "terrain_profiles", "buildings", "building_supplements", "building_height_by_id", "representative_focus", "future_data_adapter", "qa_summary"];
    require(s && keys.every(k => Object.prototype.hasOwnProperty.call(s, k)), "required fields missing");
    require(s.schema === "tayninh-s06-solution-data/v1", "unsupported payload schema");
    const fingerprints = Object.entries(s.source_fingerprints || {});
    require(fingerprints.length === 9 && fingerprints.every(([p, h]) => p.length > 0 && !p.split("/").includes("..") && /^[a-f0-9]{64}$/.test(h)), "source fingerprints malformed");
    const rows = baseline.terrain.rows, cols = baseline.terrain.cols;
    require(s.frame?.terrain_rows === rows && s.frame?.terrain_cols === cols && Array.isArray(s.frame.aoi_center_wgs84) && s.frame.aoi_center_wgs84.length === 2 && s.frame.aoi_center_wgs84.every((n, i) => Number.isFinite(n) && Math.abs(n - baseline.aoi.center_wgs84[i]) < 1e-8), "frame incompatible");
    const transform = s.coordinate_transform?.legacy_to_canonical;
    require(transform && [transform.x_scale, transform.z_scale, transform.x_offset, transform.z_offset].every(Number.isFinite) && transform.x_scale > 0 && transform.z_scale > 0, "canonical transform invalid");
    const latitude = baseline.aoi.center_wgs84[1] * Math.PI / 180, canonical = 6378137 * Math.PI / 180;
    const expectedX = canonical * Math.cos(latitude) / (111412.84 * Math.cos(latitude) - 93.5 * Math.cos(3 * latitude));
    const expectedZ = canonical / (111132.92 - 559.82 * Math.cos(2 * latitude) + 1.175 * Math.cos(4 * latitude));
    require(Math.abs(transform.x_scale - expectedX) < 1e-10 && Math.abs(transform.z_scale - expectedZ) < 1e-10 && transform.x_offset === 0 && transform.z_offset === 0, "canonical transform differs from source frame");
    const profiles = s.terrain_profiles;
    for (const name of ["copdem", "gedtm"]) {
      const p = profiles?.[name];
      require(p && p.rows === rows && p.cols === cols && p.units === "metres", `${name} dimensions/units invalid`);
      require([p.heights_m, p.validity].every(grid => Array.isArray(grid) && grid.length === rows && grid.every(row => Array.isArray(row) && row.length === cols)), `${name} grid shape invalid`);
      let valid = 0;
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        require(typeof p.validity[r][c] === "boolean", `${name} validity flag missing`);
        require(p.validity[r][c] ? Number.isFinite(p.heights_m[r][c]) : p.heights_m[r][c] === null, `${name} nodata/value inconsistent`);
        if (p.validity[r][c]) valid++;
      }
      const coverage = p.coverage;
      require(coverage && coverage.valid_nodes === valid && coverage.missing_nodes === rows * cols - valid && coverage.complete === (valid === rows * cols), `${name} coverage inconsistent`);
      require(name !== "copdem" || coverage.complete === true, "COPDEM fallback incomplete");
      require(p.statistics && [p.statistics.min, p.statistics.max, p.statistics.mean].every(Number.isFinite) && typeof p.vertical_datum === "string" && typeof p.epoch === "string" && typeof p.source_metadata?.crs === "string", `${name} metadata invalid`);
    }
    require(Array.isArray(s.buildings) && s.buildings.length === baseline.buildings.length && s.buildings.length === 657, "stable building count mismatch");
    const byId = new Map(s.buildings.map(v => [v.id, v]));
    require(byId.size === s.buildings.length && baseline.buildings.every(v => byId.has(v.id)), "stable building IDs mismatch");
    for (const b of s.buildings) {
      require(b.id === b.stable_id && b.source_height_m === null && b.measured_height === false, `observed/modelled flags ${b.id}`);
      require(Array.isArray(b.footprint_scene_m) && b.footprint_scene_m.length >= 3 && b.footprint_scene_m.every(p => Number.isFinite(p.x) && Number.isFinite(p.z)) && Array.isArray(b.centroid_scene_m) && b.centroid_scene_m.length === 2 && b.centroid_scene_m.every(Number.isFinite), `canonical polygon invalid ${b.id}`);
      const support = b.height_support;
      require(support && typeof support.accepted === "boolean" && b.qualified === support.accepted && b.height_qualified === support.accepted, `explicit height support invalid ${b.id}`);
      require([support.polygon_sample_pixels, support.presence_gt_threshold_pixels, support.height_valid_pixels].every(n => Number.isInteger(n) && n >= 0) && support.height_valid_pixels <= support.presence_gt_threshold_pixels && support.presence_gt_threshold_pixels <= support.polygon_sample_pixels && support.threshold_presence === .5 && Number.isFinite(support.support_ratio) && support.support_ratio >= 0 && support.support_ratio <= 1 && Math.abs(support.support_ratio - (support.polygon_sample_pixels > 0 ? support.presence_gt_threshold_pixels / support.polygon_sample_pixels : 0)) <= 1e-6, `height support counts invalid ${b.id}`);
      require(Number.isFinite(b.fallback_height_m) && b.fallback_height_m > 0 && b.fallback_height_m < 60 && Number.isFinite(b.display_height_m) && b.display_height_m > 0 && b.display_height_m < 60, `fallback height invalid ${b.id}`);
      require(support.accepted ? acceptedGoogle(b) && support.height_valid_pixels > 0 && b.display_height_m === b.model_height_m : b.height_kind === "proxy" && b.model_height_m === null && b.google_model_height_m === null && b.display_height_m === b.fallback_height_m, `height admission inconsistent ${b.id}`);
    }
    const accepted = s.buildings.filter(acceptedGoogle).length;
    require(s.qa_summary.source_height_m_all_null === true && s.qa_summary.measured_height_all_false === true && s.qa_summary.buildings_total === 657 && s.qa_summary.google_model_heights_accepted === accepted && s.qa_summary.google_model_heights_proxy === 657 - accepted, "summary flags/counts inconsistent");
    const adapter = s.future_data_adapter, fields = ["kind", "units", "crs", "vertical_datum", "date", "resolution", "bounds", "nodata", "rights", "sourcehash", "quality", "coverage"];
    require(adapter?.schema === "s06-future-source-adapter/v1" && adapter.available === false && adapter.contract_only === true && Array.isArray(adapter.templates) && adapter.templates.length >= 5 && adapter.templates.every(t => fields.every(k => Object.prototype.hasOwnProperty.call(t, k)) && t.available === false && t.contract_only === true), "future adapter must remain contract-only");
    return { byId, transform, available: { gedtm: profiles.gedtm.coverage.complete === true, google: accepted > 0 }, acceptedGoogleCount: accepted };
  }
  function dispose(object, keepTextures) {
    if (!object) return;
    const geos = new Set(), mats = new Set(), textures = new Set();
    object.traverse(v => { if (v.geometry) geos.add(v.geometry); for (const m of (Array.isArray(v.material) ? v.material : v.material ? [v.material] : [])) { mats.add(m); if (m.map) textures.add(m.map); } });
    geos.forEach(v => v.dispose()); mats.forEach(v => v.dispose()); if (!keepTextures) textures.forEach(v => v.dispose()); object.removeFromParent();
  }
  global.B04SolutionLayers = { VERSION, buildingLayer, roadLayer, vegetationLayer, rasterEvidenceLayer, groundQA, geometryGroundSamples, drapePolygon, admitSolution, acceptedGoogle, textureLibrary, sharedTextures, disposeTextureLibrary, dispose, polygon, contains, segmentDistance, gridCuts };
}(typeof window !== "undefined" ? window : globalThis));
