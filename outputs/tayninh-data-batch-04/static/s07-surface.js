/* S07 surface boundary: source maps may be photographed materials; architecture/foliage are modeled. */
(function (global) {
  "use strict";
  const VERSION = "s07.surface.1", EPS = 1e-7;
  const libraries = new Map();
  const foliageTextures = new WeakMap();
  const finite = Number.isFinite;
  function point(a, b, t) { return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t }; }
  function writer(THREE) {
    const positions = [], colors = [], uvs = [], features = [];
    return {
      triangle(a, b, c, color, payload) {
        const col = color instanceof THREE.Color ? color : new THREE.Color(color);
        for (const v of [a, b, c]) { positions.push(v.x, v.y, v.z); colors.push(col.r, col.g, col.b); uvs.push(v.x, v.z); }
        features.push(payload);
      },
      quad(a, b, c, d, color, payload) { this.triangle(a, b, c, color, payload); this.triangle(a, c, d, color, payload); },
      mesh(material, name) {
        const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
        g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
        g.computeVertexNormals(); g.computeBoundingSphere(); g.userData.triangleToFeature = features;
        const m = new THREE.Mesh(g, material); m.name = name; return m;
      },
      get triangles() { return positions.length / 9; },
    };
  }
  function interior(p, x, z) {
    return global.B04SolutionLayers.contains(p, x, z) || p.some((a, i) => global.B04SolutionLayers.segmentDistance(x, z, a, p[(i + 1) % p.length]) < .0005);
  }
  function windowOpenings(b) {
    const result = [], p = b.polygon, floors = Math.max(1, Math.min(8, Math.floor(b.wallHeight / 3.1)));
    let doorDone = false;
    for (let edgeIndex = 0; edgeIndex < p.length; edgeIndex++) {
      const a = p[edgeIndex], q = p[(edgeIndex + 1) % p.length], length = Math.hypot(q.x - a.x, q.z - a.z);
      if (length < 4) continue;
      const ux = (q.x - a.x) / length, uz = (q.z - a.z) / length, count = Math.min(20, Math.max(1, Math.floor(length / 3.4)));
      const depth = .12, back = distance => ({ x: a.x + ux * distance + uz * depth, z: a.z + uz * distance - ux * depth });
      for (let floor = 0; floor < floors; floor++) for (let j = 0; j < count; j++) {
        const door = !doorDone && floor === 0 && j === Math.floor(count / 2), width = door ? 1.05 : Math.min(1.4, length / count * .48);
        const center = (j + .5) / count * length, start = center - width / 2, end = center + width / 2;
        const y0 = b.groundReference + (door ? .03 : .95 + floor * 3.1), y1 = Math.min(b.wallTop - .3, y0 + (door ? 2.05 : 1.4));
        if (y1 - y0 < (door ? 1.1 : .6) || start < .25 || end > length - .25) continue;
        if (![back(start), back(end)].every(v => interior(p, v.x, v.z))) continue;
        result.push({ edgeIndex, start, end, y0, y1, depth, door }); if (door) doorDone = true;
      }
    }
    return result;
  }
  function writeWallSegment(output, s) {
    const edgeIndex = s.a.edgeIndex, e = s.polygon[edgeIndex], q = s.polygon[(edgeIndex + 1) % s.polygon.length];
    const length = Math.hypot(q.x - e.x, q.z - e.z), along = v => ((v.x - e.x) * (q.x - e.x) + (v.z - e.z) * (q.z - e.z)) / length;
    const start = along(s.a), end = along(s.b), holes = s.openings.filter(o => o.edgeIndex === edgeIndex && o.end > start + EPS && o.start < end - EPS);
    const cuts = [0, 1];
    for (const h of holes) for (const distance of [h.start, h.end]) { const t = (distance - start) / (end - start); if (t > EPS && t < 1 - EPS) cuts.push(t); }
    // Cut ground/vertical-region crossings too; retain the valid triangular part on steep slopes.
    if (Math.abs(s.gb - s.ga) > EPS) for (const y of [...holes.flatMap(h => [h.y0, h.y1]), s.top]) { const t = (y - s.ga) / (s.gb - s.ga); if (t > EPS && t < 1 - EPS) cuts.push(t); }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i < cuts.length - 1; i++) {
      const t0 = cuts[i], t1 = cuts[i + 1]; if (t1 - t0 < EPS) continue;
      const a = point(s.a, s.b, t0), b = point(s.a, s.b, t1), ga = s.ga + (s.gb - s.ga) * t0, gb = s.ga + (s.gb - s.ga) * t1;
      const middle = start + (end - start) * (t0 + t1) / 2, local = holes.filter(h => middle >= h.start - EPS && middle <= h.end + EPS).sort((a, b) => a.y0 - b.y0);
      const regions = []; let bottom = null;
      for (const hole of local) { regions.push([bottom, hole.y0]); bottom = hole.y1; } regions.push([bottom, s.top]);
      for (const [low, high] of regions) {
        const ya = low === null ? ga : Math.max(ga, low), yb = low === null ? gb : Math.max(gb, low);
        if (high <= Math.min(ya, yb) + EPS) continue;
        const u0 = s.u0 + (s.u1 - s.u0) * t0, u1 = s.u0 + (s.u1 - s.u0) * t1;
        if (Math.abs(high - ya) < EPS) output.triangle({ ...a, y: high }, { ...b, y: yb }, { ...b, y: high }, s.color, s.payload, [[u0, high], [u1, yb], [u1, high]]);
        else if (Math.abs(high - yb) < EPS) output.triangle({ ...a, y: ya }, { ...b, y: high }, { ...a, y: high }, s.color, s.payload, [[u0, ya], [u1, high], [u0, high]]);
        else output.quad({ ...a, y: ya }, { ...b, y: yb }, { ...b, y: high }, { ...a, y: high }, s.color, s.payload, [[u0, ya], [u1, yb], [u1, high], [u0, high]]);
      }
    }
  }
  function clip(p, dot, mid, positive) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length], da = dot(a) - mid, db = dot(b) - mid;
      const ai = positive ? da >= -EPS : da <= EPS, bi = positive ? db >= -EPS : db <= EPS;
      if (ai) out.push(a); if (ai !== bi) out.push(point(a, b, da / (da - db)));
    }
    return out;
  }
  function roofPlanes(b) {
    if (b.roofTopTriangles?.length) return b.roofTopTriangles.map(t => {
      const [a, q, c] = t, area = (q.x - a.x) * (c.z - a.z) - (q.z - a.z) * (c.x - a.x);
      return { p: t.map(v => ({ x: v.x, z: v.z })), y: v => a.y + ((v.x - a.x) * (c.z - a.z) - (v.z - a.z) * (c.x - a.x)) / area * (q.y - a.y) + ((q.x - a.x) * (v.z - a.z) - (q.z - a.z) * (v.x - a.x)) / area * (c.y - a.y) };
    });
    // Standalone caller without actual base roof triangles cannot reconstruct a concave hip fan.
    const polygon = b.polygon;
    let sign = 0; for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], q = polygon[(i + 1) % polygon.length], c = polygon[(i + 2) % polygon.length], cross = (q.x - a.x) * (c.z - q.z) - (q.z - a.z) * (c.x - q.x);
      if (Math.abs(cross) > EPS) { if (sign && Math.sign(cross) !== sign) return []; sign = Math.sign(cross); }
    }
    const p = b.polygon, { axis, lo, hi, mid } = b.roofParameters;
    if (b.roofType === "flat") return [{ p, y: () => b.topY }];
    const transverse = v => -axis.z * v.x + axis.x * v.z;
    if (b.roofType === "gable") return [true, false].map(side => ({ p: clip(p, transverse, mid, side), y: v => b.wallTop + b.roofRise * Math.max(0, 1 - Math.abs(transverse(v) - mid) / Math.max(.1, (hi - lo) / 2)) }));
    const c = { x: p.reduce((n, v) => n + v.x, 0) / p.length, z: p.reduce((n, v) => n + v.z, 0) / p.length };
    return p.map((a, i) => { const q = p[(i + 1) % p.length], area = (q.x - a.x) * (c.z - a.z) - (q.z - a.z) * (c.x - a.x);
      return { p: [a, q, c], y: v => b.wallTop + b.roofRise * ((q.x - a.x) * (v.z - a.z) - (q.z - a.z) * (v.x - a.x)) / area }; });
  }
  function fineBuildingDetails(ctx, buildings) {
    const { THREE } = ctx, trim = writer(THREE), glass = writer(THREE), seams = writer(THREE);
    const sample = ctx.sampleBounds;
    buildings = ctx.detailLevel === "coarse" ? [] : buildings.filter(b => !sample || b.bounds.west < sample.east && b.bounds.east > sample.west && b.bounds.south < sample.north && b.bounds.north > sample.south);
    let windows = 0, doors = 0, fasciaSegments = 0, seamStrips = 0, roofDetailSkipped = 0;
    for (const b of buildings) {
      const payload = { ...b.payload, method: b.payload.method + "; hốc cửa/khung/bậu/nẹp mái mô phỏng", detailModeled: true };
      for (const o of b.openings || []) {
        const a = b.polygon[o.edgeIndex], q = b.polygon[(o.edgeIndex + 1) % b.polygon.length], length = Math.hypot(q.x - a.x, q.z - a.z), ux = (q.x - a.x) / length, uz = (q.z - a.z) / length;
        const at = (u, y, depth) => ({ x: a.x + ux * u + uz * depth, z: a.z + uz * u - ux * depth, y });
        const rect = (out, left, right, low, high, depth, color) => out.quad(at(left, low, depth), at(right, low, depth), at(right, high, depth), at(left, high, depth), color, payload);
        // Panes are behind a real wall opening, rather than on an opaque outer wall.
        rect(glass, o.start + .045, o.end - .045, o.y0 + .045, o.y1 - .045, o.depth - .008, o.door ? "#655c4c" : "#45636b");
        const front = .008, back = o.depth, frame = .065;
        for (const [left, right] of [[o.start, o.start + frame], [o.end - frame, o.end]]) rect(trim, left, right, o.y0, o.y1, front, "#ded7c7");
        for (const [low, high] of [[o.y0, o.y0 + frame], [o.y1 - frame, o.y1]]) rect(trim, o.start + frame, o.end - frame, low, high, front, "#ded7c7");
        if (!o.door) rect(trim, (o.start + o.end) / 2 - .023, (o.start + o.end) / 2 + .023, o.y0 + frame, o.y1 - frame, front + .002, "#bcbbae");
        trim.quad(at(o.start, o.y0, front), at(o.start, o.y0, back), at(o.start, o.y1, back), at(o.start, o.y1, front), "#ada796", payload);
        trim.quad(at(o.end, o.y0, back), at(o.end, o.y0, front), at(o.end, o.y1, front), at(o.end, o.y1, back), "#ada796", payload);
        trim.quad(at(o.start, o.y1, front), at(o.end, o.y1, front), at(o.end, o.y1, back), at(o.start, o.y1, back), "#bdb6a6", payload);
        trim.quad(at(o.start, o.y0 - .015, front), at(o.start, o.y0 - .015, back), at(o.end, o.y0 - .015, back), at(o.end, o.y0 - .015, front), "#cbc4b4", payload);
        if (o.door) doors++; else windows++;
      }
      const planes = roofPlanes(b), axis = b.roofParameters.axis, transverse = v => -axis.z * v.x + axis.x * v.z;
      if (!planes.length) roofDetailSkipped++;
      if (b.roofType !== "flat") for (const plane of planes) {
        const min = Math.min(...plane.p.map(transverse)), max = Math.max(...plane.p.map(transverse));
        for (let offset = Math.ceil(min / 1.2) * 1.2; offset < max; offset += 1.2) {
          let band = clip(plane.p, transverse, offset - .021, true); band = clip(band, transverse, offset + .021, false); if (band.length < 3) continue;
          let area = 0; for (let i = 0; i < band.length; i++) area += band[i].x * band[(i + 1) % band.length].z - band[(i + 1) % band.length].x * band[i].z;
          if (Math.abs(area) < 1e-6) continue; if (area > 0) band.reverse();
          const at = v => ({ ...v, y: Math.min(b.topY - .001, plane.y(v) + .014) });
          const tris = THREE.ShapeUtils.triangulateShape(band.map(v => new THREE.Vector2(v.x, v.z)), []);
          for (const t of tris) seams.triangle(at(band[t[0]]), at(band[t[2]]), at(band[t[1]]), "#778076", payload);
          seamStrips++;
        }
      }
      for (let i = 0; i < b.polygon.length; i++) {
        const a = b.polygon[i], q = b.polygon[(i + 1) % b.polygon.length];
        // Fascia follows source boundary and stays inside the total envelope.
        const ys = v => Math.min(...planes.filter(plane => interior(plane.p, v.x, v.z)).map(plane => plane.y(v)));
        const ya = ys(a), yq = ys(q); if (![ya, yq].every(finite)) continue;
        trim.quad({ ...a, y: ya - .12 }, { ...q, y: yq - .12 }, { ...q, y: yq }, { ...a, y: ya }, "#8f9485", payload); fasciaSegments++;
      }
    }
    const group = new THREE.Group(); group.name = `S07 fine building surfaces ${ctx.chunkId || "sample"}`;
    const material = (roughness, metalness) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const trimMesh = trim.mesh(material(.81, .04), "S07 inset window frames/recess/sills/fascia"), paneMesh = glass.mesh(material(.37, .14), "S07 generic recessed panes/doors"), seamMesh = seams.mesh(material(.71, .12), "S07 modeled roof panel seams");
    group.add(trimMesh, paneMesh, seamMesh);
    return { group, pickables: [trimMesh, paneMesh, seamMesh], qa: { buildings: buildings.length, triangles: trim.triangles + glass.triangles + seams.triangles, windows, doors, fasciaSegments, seamStrips, roofDetailSkipped, roofProjection: "actual base roof triangles; concave standalone fan skipped", recessedDepthM: .12, modeled: true, observedFacade: false, footprintProjection: "all details within source footprint; no external eaves", envelope: "total input height including roof preserved", constructionScope: "passed near chunk features only", chunkId: ctx.chunkId || null } };
  }
  function foliageTexture(THREE) {
    if (foliageTextures.has(THREE)) return foliageTextures.get(THREE);
    const size = 128, bytes = new Uint8Array(size * size * 4), leaves = [];
    // A small modeled cluster of pointed leaves, with holes between leaves and transparent corners.
    for (let i = 0; i < 23; i++) {
      const angle = i * 2.39996, radius = Math.sqrt((i + 1) / 24) * 40;
      leaves.push({ x: 64 + Math.cos(angle) * radius, y: 64 + Math.sin(angle) * radius, angle: angle + .6, length: 7 + i % 5, width: 3.6 + i % 3, shade: i % 4 });
    }
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) for (const leaf of leaves) {
      const dx = x - leaf.x, dy = y - leaf.y, u = (dx * Math.cos(leaf.angle) + dy * Math.sin(leaf.angle)) / leaf.length, v = (-dx * Math.sin(leaf.angle) + dy * Math.cos(leaf.angle)) / leaf.width;
      if (Math.abs(u) < 1 && Math.abs(v) < (1 - u * u) * .75) {
        const i = (y * size + x) * 4, vein = Math.abs(v) < .10 ? 8 : 0;
        bytes.set([90 + leaf.shade * 5 + vein, 115 + leaf.shade * 5 + vein, 70 + leaf.shade * 3, 255], i);
      }
    }
    const texture = new THREE.DataTexture(bytes, size, size, THREE.RGBAFormat); texture.name = "S07 modeled pointed-leaf silhouette atlas";
    texture.colorSpace = THREE.SRGBColorSpace; texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.needsUpdate = true;
    foliageTextures.set(THREE, texture); return texture;
  }
  function enrichVegetation(ctx, baseLayer, options = {}) {
    const { THREE } = ctx, budget = Math.min(160, Math.max(1, options.budget || 96)), sample = options.sampleBounds || ctx.sampleBounds;
    const candidates = (baseLayer.candidates || []).filter(v => !sample || v.x >= sample.west && v.x <= sample.east && v.z >= sample.south && v.z <= sample.north);
    const branchGeo = new THREE.CylinderGeometry(.7, 1, 1, 6), leafGeo = new THREE.PlaneGeometry(1, 1);
    const branches = new THREE.InstancedMesh(branchGeo, new THREE.MeshStandardMaterial({ color: "#786c51", roughness: .98 }), budget * 7);
    const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ map: foliageTexture(THREE), color: "#c3d7a9", roughness: .94, side: THREE.DoubleSide, alphaTest: .45, transparent: false, depthWrite: true }), budget * 18);
    branches.name = "S07 modeled branching / source-mask placement"; leaves.name = "S07 alpha-cut modeled foliage cluster cards";
    branches.count = leaves.count = 0; branches.frustumCulled = leaves.frustumCulled = false;
    const group = new THREE.Group(); group.name = `S07 near vegetation ${ctx.chunkId || "sample"}`; group.add(branches, leaves);
    const dummy = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3(), color = new THREE.Color(); let previous = "", visibleCandidates = [];
    const qa = { modeled: true, detectedIndividuals: false, speciesObserved: false, candidates: candidates.length, budgetTrees: budget, branchesPerTree: 7, cardsPerTree: 18, lodTrees: 0, branches: 0, leafCards: 0, alphaSilhouette: true, litterAssetUsedAsCanopy: false, allocatedTriangles: budget * (7 * branchGeo.index.count / 3 + 18 * 2), sourcePlacementChanged: false };
    function updateLOD(target, radius, force = false) {
      const signature = `${Math.round(target.x / 25)},${Math.round(target.z / 25)},${Math.round(radius / 35)}`;
      if (!force && signature === previous) return; previous = signature;
      const selected = radius < 650 ? candidates.map(v => ({ v, distance: Math.hypot(v.x - target.x, v.z - target.z) })).filter(v => v.distance < Math.max(160, radius * .95)).sort((a, b) => a.distance - b.distance).slice(0, budget) : [];
      visibleCandidates = selected.map(entry => entry.v);
      let branchCount = 0, leafCount = 0;
      for (const { v } of selected) {
        for (let i = 0; i < 7; i++) {
          const angle = i * 2.4 + v.variation * 6, start = new THREE.Vector3(v.x, v.y + v.height * (.42 + (i % 3) * .07), v.z);
          const end = new THREE.Vector3(v.x + Math.cos(angle) * v.radius * .70, v.y + v.height * (.70 + (i % 3) * .045), v.z + Math.sin(angle) * v.radius * .70);
          direction.copy(end).sub(start); dummy.position.copy(start).add(end).multiplyScalar(.5); dummy.quaternion.setFromUnitVectors(up, direction.clone().normalize());
          dummy.scale.set(v.radius * (.024 + .008 * (i % 2)), direction.length(), v.radius * (.024 + .008 * (i % 2))); dummy.updateMatrix(); branches.setMatrixAt(branchCount++, dummy.matrix);
        }
        for (let i = 0; i < 18; i++) {
          const angle = i * 2.4 + v.variation * 6, width = Math.min(v.radius * .88, v.sourceRasterHeight * .28), height = width * .83;
          const y = Math.min(v.y + v.sourceRasterHeight - Math.hypot(width, height) / 2 - .04, v.y + v.height * (.71 + (i % 4) * .055));
          dummy.position.set(v.x + Math.cos(angle) * v.radius * .67, y, v.z + Math.sin(angle) * v.radius * .67);
          dummy.rotation.set((i % 3 - 1) * .36, angle, v.variation * .32); dummy.scale.set(width, height, 1); dummy.updateMatrix(); leaves.setMatrixAt(leafCount, dummy.matrix);
          color.setHSL(.24 + v.variation * .06, .24, .49 + (i % 3) * .045); leaves.setColorAt(leafCount++, color);
        }
      }
      branches.count = branchCount; leaves.count = leafCount; branches.instanceMatrix.needsUpdate = leaves.instanceMatrix.needsUpdate = true;
      if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
      branches.computeBoundingSphere(); leaves.computeBoundingSphere();
      qa.lodTrees = selected.length; qa.branches = branchCount; qa.leafCards = leafCount;
    }
    return { group, branches, leaves, qa, candidates, get visibleCandidates() { return visibleCandidates; }, updateLOD };
  }
  function sharedTextures(THREE) {
    const textures = [], foliage = foliageTextures.get(THREE); if (foliage) textures.push(foliage);
    for (const entry of libraries.values()) if (entry.THREE === THREE && entry.library) textures.push(...entry.library.textures);
    return [...new Set(textures)];
  }
  function mipBytes(width, height) {
    let total = 0; for (;;) { total += width * height * 4; if (width === 1 && height === 1) return total; width = Math.max(1, Math.floor(width / 2)); height = Math.max(1, Math.floor(height / 2)); }
  }
  function prepareMaterialDescriptors(manifest, options = {}) {
    if (!manifest || manifest.schema !== "tayninh-s07-materials/v1" || !Array.isArray(manifest.assets)) throw new Error("S07 material manifest missing/unsupported");
    const limit = Math.min(1024, Math.max(128, Math.floor(options.maxTextureSize || 1024))), maxMaps = Math.min(12, options.maxTextures || 12), maxBytes = options.maxEstimatedBytes || 64 * 1024 * 1024;
    const selectedIds = options.materialIds || manifest.runtime_selection?.active_asset_ids;
    const selected = manifest.assets.filter(m => selectedIds?.includes(m.asset_id) && m.active_runtime === true);
    if (!selected.length) throw new Error("S07 no admitted material roles");
    const records = []; let maps = 0, estimatedBytes = 0;
    for (const m of selected) {
      const id = m.asset_id;
      if (!["wall", "roof", "road", "asphalt"].includes(m.role)) throw new Error(`S07 inactive/non-building material role ${id}`);
      if (!["CC0-1.0", "CC0", "CC0 1.0"].includes(m.license)) throw new Error(`S07 rights missing ${id}`);
      const albedo = m.maps?.find(map => map.type === "albedo"), displayWidth = m.subtype.includes("brick") ? 1.6 : 4;
      const physical = m.physical_size_m || (String(m.scale_basis).includes("modeled_display_tiling") && albedo ? [displayWidth, displayWidth * albedo.height / albedo.width] : null);
      if (!Array.isArray(physical) || physical.length !== 2 || !physical.every(v => finite(v) && v > 0)) throw new Error(`S07 metre tiling missing ${id}`);
      const descriptors = [];
      for (const type of ["albedo", "normal", "roughness"]) {
        const candidates = m.maps?.filter(map => map.type === type) || [], map = candidates[0];
        if (candidates.length !== 1 || !map || typeof map.path !== "string" || !/^[a-f0-9]{64}$/.test(map.sha256) || !Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width <= 0 || map.height <= 0 || map.color_space !== (type === "albedo" ? "srgb" : "linear") || type === "normal" && !String(map.source_member).includes("NormalGL")) throw new Error(`S07 ${type} descriptor invalid ${id}`);
        const ratio = Math.min(1, limit / Math.max(map.width, map.height)), width = Math.max(1, Math.round(map.width * ratio)), height = Math.max(1, Math.round(map.height * ratio));
        const bytes = mipBytes(width, height); estimatedBytes += bytes; maps++;
        descriptors.push({ ...map, type, sourceWidth: map.width, sourceHeight: map.height, runtimeWidth: width, runtimeHeight: height, estimatedRgbaMipBytes: bytes });
      }
      records.push({ ...m, id, role: m.role === "road" ? "asphalt" : m.role, descriptors, physical });
    }
    if (maps > maxMaps || estimatedBytes > maxBytes) throw new Error(`S07 material budget exceeded (${maps} maps, ${estimatedBytes} estimated bytes)`);
    return { records, maxTextureSize: limit, maps, estimatedBytes, sourcePixels: records.reduce((n, r) => n + r.descriptors.reduce((a, d) => a + d.sourceWidth * d.sourceHeight, 0), 0), runtimePixels: records.reduce((n, r) => n + r.descriptors.reduce((a, d) => a + d.runtimeWidth * d.runtimeHeight, 0), 0) };
  }
  function loadMaterialLibrary(THREE, options = {}) {
    const prepared = prepareMaterialDescriptors(options.manifest, options), baseUrl = options.baseUrl || (typeof document !== "undefined" ? document.baseURI : "");
    const key = JSON.stringify(prepared.records.map(r => [r.id, r.role, r.physical, r.descriptors.map(d => [d.path, d.sha256, d.runtimeWidth, d.runtimeHeight])]));
    const cached = libraries.get(key); if (cached?.THREE === THREE) return cached.promise;
    if ([...libraries.values()].some(entry => entry.THREE === THREE)) throw new Error("S07 dispose previous map library before admitting another manifest");
    const entry = { THREE, library: null, promise: null, disposeRequested: false, pendingTextures: new Set(), disposedTextures: new WeakSet(), release(texture) { if (this.disposedTextures.has(texture)) return; this.disposedTextures.add(texture); this.pendingTextures.delete(texture); texture.dispose(); } }; libraries.set(key, entry);
    entry.promise = (async () => {
      const loader = new THREE.TextureLoader(), textures = [], materials = {}, failures = [], used = [];
      for (const record of prepared.records) {
        if (entry.disposeRequested || options.signal?.aborted) { failures.push({ id: record.id, role: record.role, errors: ["S07 material request cancelled"] }); break; }
        const settled = await Promise.allSettled(record.descriptors.map(async descriptor => {
          const sourceBase = new URL(baseUrl), relative = /^tayninh-[^/]+\//.test(descriptor.path);
          const outputsBase = sourceBase.pathname.includes("/tayninh-data-batch-04/") ? new URL("../", sourceBase) : sourceBase;
          const texture = await loader.loadAsync(new URL(descriptor.path, relative ? outputsBase : sourceBase).href);
          entry.pendingTextures.add(texture);
          try {
          const image = texture.image;
          if (image.width !== descriptor.sourceWidth || image.height !== descriptor.sourceHeight) { entry.release(texture); throw new Error(`S07 decoded dimensions mismatch ${record.id}/${descriptor.type}`); }
          if (entry.disposeRequested || options.signal?.aborted) { entry.release(texture); throw new Error("S07 material request cancelled"); }
          if (image.width !== descriptor.runtimeWidth || image.height !== descriptor.runtimeHeight) {
            const canvas = document.createElement("canvas"); canvas.width = descriptor.runtimeWidth; canvas.height = descriptor.runtimeHeight;
            const context = canvas.getContext("2d"); if (!context) { entry.release(texture); throw new Error("S07 runtime resize unavailable"); }
            context.drawImage(image, 0, 0, canvas.width, canvas.height); texture.image = canvas;
          }
          texture.colorSpace = descriptor.type === "albedo" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(1 / record.physical[0], 1 / record.physical[1]);
          texture.generateMipmaps = true; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.max(1, Math.min(8, options.anisotropy || 4)); texture.name = `S07 source ${record.id}/${descriptor.type}`;
          texture.userData.s07Shared = true; texture.userData.source = { path: descriptor.path, sha256: descriptor.sha256, license: record.license, sourceDimensions: [descriptor.sourceWidth, descriptor.sourceHeight], runtimeDimensions: [descriptor.runtimeWidth, descriptor.runtimeHeight], physicalScaleM: record.physical, scaleBasis: record.scale_basis || "manifest display tiling", modeledApplication: true };
          texture.needsUpdate = true; return { descriptor, texture };
          } catch (error) { entry.release(texture); throw error; }
        }));
        if (settled.some(r => r.status === "rejected")) {
          settled.filter(r => r.status === "fulfilled").forEach(r => entry.release(r.value.texture));
          failures.push({ id: record.id, role: record.role, errors: settled.filter(r => r.status === "rejected").map(r => String(r.reason?.message || r.reason)) }); continue;
        }
        const properties = { normalScale: new THREE.Vector2(record.role === "roof" ? .35 : .55, record.role === "roof" ? .35 : .55) };
        for (const item of settled) { const { descriptor, texture } = item.value; properties[({ albedo: "map", normal: "normalMap", roughness: "roughnessMap" })[descriptor.type]] = texture; textures.push(texture); }
        if (record.role === "wall" && !record.subtype.includes("primary") && materials.wall) materials.wallBrick = properties;
        else if (!materials[record.role] || record.subtype.includes("primary")) materials[record.role] = properties;
        materials[record.id] = properties;
        used.push({ id: record.id, role: record.role, license: record.license, physicalSizeM: record.physical, scaleBasis: record.scale_basis || "manifest display tiling", maps: record.descriptors });
      }
      let disposed = false;
      const library = { materials, textures, qa: { ready: used.length > 0, complete: failures.length === 0, sourceMaterialCount: used.length, cachedTextures: textures.length, maxTextureSize: prepared.maxTextureSize, estimatedRgbaMipBytes: textures.length ? used.reduce((n, r) => n + r.maps.reduce((a, d) => a + d.estimatedRgbaMipBytes, 0), 0) : 0, sourcePixels: used.reduce((n, r) => n + r.maps.reduce((a, d) => a + d.sourceWidth * d.sourceHeight, 0), 0), runtimePixels: used.reduce((n, r) => n + r.maps.reduce((a, d) => a + d.runtimeWidth * d.runtimeHeight, 0), 0), plannedSourcePixels: prepared.sourcePixels, plannedRuntimePixels: prepared.runtimePixels, used, failures, albedoColorSpace: "sRGB", normalRoughnessColorSpace: "linear/no color space", uvUnits: "metres", nativeRgbChanged: false, applicationModeled: true, photographedRoofAndAsphaltTint: "neutral white; no repeated dark procedural palette", roofNormalStrength: .35 }, dispose() { if (disposed) return; disposed = true; textures.forEach(t => entry.release(t)); if (libraries.get(key) === entry) libraries.delete(key); } };
      entry.library = library;
      if (entry.disposeRequested || options.signal?.aborted) { library.dispose(); throw new Error("S07 material library request cancelled"); }
      return library;
    })().catch(error => { if (libraries.get(key) === entry) libraries.delete(key); throw error; });
    return entry.promise;
  }
  function disposeSharedTextures(THREE) {
    const foliage = foliageTextures.get(THREE); if (foliage) { foliage.dispose(); foliageTextures.delete(THREE); }
    for (const [key, entry] of [...libraries]) if (entry.THREE === THREE) {
      entry.disposeRequested = true; [...entry.pendingTextures].forEach(t => entry.release(t));
      if (entry.library) entry.library.dispose(); else libraries.delete(key);
    }
  }
  global.B04S07Surface = { VERSION, windowOpenings, writeWallSegment, fineBuildingDetails, roofPlanes, enrichVegetation, foliageTexture, prepareMaterialDescriptors, loadMaterialLibrary, sharedTextures, disposeSharedTextures };
}(typeof window !== "undefined" ? window : globalThis));
