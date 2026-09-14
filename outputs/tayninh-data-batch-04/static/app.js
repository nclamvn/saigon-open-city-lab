(function () {
  "use strict";

  window.__B04_PROBE__ = window.__B04_PROBE__ || function () {
    return { rendererReady: false, sceneReady: false, activeMode: "booting", objectCounts: { pickables: 0 } };
  };

  const DATA_URL = "derived/fusion/scene-data.json";
  const VISUAL_URL = "derived/visual/visual-data.json";
  const THREE_URL = "vendor/three.min.js";
  const SOLUTION_URL = "derived/solution/solution-data.json";
  const LAYERS_URL = "static/solution-layer.js?v=s07-final";
  const S07_CHUNKS_URL = "static/s07-chunks.js?v=s07-final";
  const S07_IMPORTER_URL = "static/s07-importer.js?v=s07-final";
  const S07_UI_URL = "static/s07-ui.js?v=s07-final";
  const S07_SURFACE_URL = "static/s07-surface.js?v=s07-final";
  const S07_SAMPLE_MANIFEST_URL = "derived/s07/sample-manifest.json";
  const S07_MATERIAL_MANIFEST_URL = "derived/s07/materials/manifest.json";
  const S07_PHOTO_REGISTRY_URL = "sources/s07/photo-registry.json";
  const DPR_CAP = 1.5;
  const MODES = {
    overview: {
      title: "Tổng quan 2.5D",
      copy: "Nền 1×, footprint nguồn mở và kiến trúc PBR mô phỏng. Ảnh Sentinel native 10 m giữ nguyên; chi tiết mái, cửa và cây đồ họa chưa được quan sát.",
      metrics: ["DEM công khai", "dấu chân công trình", "AOI mẫu OSM"],
    },
    elevation: {
      title: "Phân tích cao độ",
      copy: "Chọn nền GEDTM dự đoán hoặc COPDEM DSM và hệ số 1×/1,35×; không phải đất trần khảo sát.",
      metrics: ["min/max/trung bình DEM", "phóng đứng", "không phải LiDAR"],
    },
    buildings: {
      title: "Công trình",
      copy: "657 footprint Microsoft với móng theo terrain, mái và mặt đứng generic. Google height là mô hình có support gate; nguồn chiều cao đo vẫn null.",
      metrics: ["cao độ xấp xỉ", "bám địa hình", "không phải đo cao"],
    },
    canopy: {
      title: "Tán cây",
      copy: "Lớp tán cây là bề mặt raster ETH canopy 2020 liên tục; không phải kiểm kê từng cây.",
      metrics: ["mô hình tán cây 2020", "bất định", "mẫu raster"],
    },
    water: {
      title: "Thủy hệ",
      copy: "OSM water và JRC occurrence/seasonality là bằng chứng viễn thám mô tả, không phải mô hình ngập.",
      metrics: ["tần suất JRC", "mùa 2024", "danh nghĩa 30 m"],
    },
    change: {
      title: "Biến động ứng viên",
      copy: "Lớp change dùng để ưu tiên rà soát; không diễn đạt như kết luận thay đổi hay mô hình thủy văn.",
      metrics: ["bằng chứng ứng viên", "so sánh thời gian", "cần rà soát"],
    },
  };

  const state = {
    data: null,
    visualData: null,
    visualStatus: { status: "pending", error: null },
    threeReady: false,
    sceneReady: false,
    mode: "overview",
    hiddenUI: false,
    touring: false,
    tourStarted: 0,
    lastFrame: 0,
    frameCount: 0,
    fps: 0,
    needsRender: true,
    objectCounts: {},
    disclosureFlags: {},
    lastLitPixelRatio: null,
    diagnostics: {
      buildingTopNormalY: null,
      northMappingOk: false,
      jrcGainCells: 0,
      jrcLossCells: 0,
      imagery: {
        ready: false,
        status: "pending",
        method: "not_loaded",
        sourceWidth: null,
        sourceHeight: null,
        textureWidth: null,
        textureHeight: null,
        path: null,
        resolution: null,
        error: null,
      },
      canopy: {
        representation: "not_loaded",
        coneCount: 0,
        sourceSamples: 0,
        renderedVertices: 0,
        renderedTriangles: 0,
        renderedPrimitive: "none",
      },
      terrainFrame: null,
      grounding: {
        method: "construction_reference",
        independent: false,
        note: "Render bases use the terrain triangle sampler; clearance confirms construction consistency, not an independent terrain raycast.",
      },
    },
    anchorStats: {
      minClearanceM: Infinity,
      maxAbsClearanceM: 0,
      samples: 0,
    },
    pickables: [],
    activeSelection: null,
    solutionData: null,
    solution: { ready: false, terrain: "copdem", scale: 1, heights: "proxy", detail: "detailed", available: { gedtm: false, google: false }, error: null, busy: false, focus: null, lastCommandMs: 0 },
    s07: { status: "pending", enabled: false, generationKey: null, manifest: null, photoRegistry: null, materialManifest: null, sampleIds: new Set(), sampleBounds: null, chunks: null, importer: null, ui: null, surface: null, materialLibrary: null, materialStatus: "pending", errors: [], fixtures: null, importerResult: null },
    perf: { renders: 0, renderCpuMs: [], rebuildMs: 0, commandCount: 0, idle: false },
  };

  const dom = {};
  const world = {
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    raycaster: null,
    pointer: null,
    root: null,
    terrain: null,
    terrainMaterial: null,
    imageryOverlay: null,
    terrainAnalysis: null,
    buildings: null,
    roads: null,
    osmWater: null,
    canopy: null,
    jrcOccurrence: null,
    jrcSeasonality: null,
    jrcChange: null,
    selection: null,
    pickables: [],
    probeEl: null,
    diagnosticCanvas: null,
    diagnosticContext: null,
    lastLitSampleAt: 0,
    lastProbeMirrorAt: 0,
    controls: {
      target: null,
      theta: -0.65,
      phi: 0.92,
      radius: 920,
      dragging: false,
      panning: false,
      lastX: 0,
      lastY: 0,
      startX: 0,
      startY: 0,
    },
    terrainExtent: { width: 1000, depth: 1000, xMin: -500, xMax: 500, zMin: -500, zMax: 500, rows: 2, cols: 2, min: 0, max: 1 },
    heightSampler: function () { return 0; },
    groundSampler: function () { return 0; },
    layers: null,
    buildingLayer: null,
    roadLayer: null,
    vegetationLayer: null,
    textureCache: new Map(),
    s07FineGroup: null,
    s07CoarseGroup: null,
    s07CoarseChunks: new Map(),
    s07FinePickables: [],
    s07Vegetation: null,
    sun: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function initDom() {
    for (const id of [
      "scene", "tour", "resetView", "toggleUI", "sourceDrawer", "sourceToggle", "sourceClose",
      "inspector", "inspectorClose", "inspectorBody", "modeTitle", "modeCopy", "metricA",
      "metricB", "metricC", "metricLabelA", "metricLabelB", "metricLabelC", "fps", "loading", "loadingStatus", "disclosure", "northNeedle", "uiShell", "s07Panel"
    ]) {
      dom[id] = $(id);
    }
    if (!dom.scene) {
      dom.scene = document.createElement("main");
      dom.scene.id = "scene";
      dom.scene.style.cssText = "position:fixed;inset:0;background:#071611";
      document.body.appendChild(dom.scene);
    }
    world.probeEl = $("b04Probe");
    if (!world.probeEl) {
      world.probeEl = document.createElement("script");
      world.probeEl.type = "application/json";
      world.probeEl.id = "b04Probe";
      world.probeEl.hidden = true;
      document.body.appendChild(world.probeEl);
    }
  }

  function setLoading(text, done) {
    if (dom.loadingStatus) dom.loadingStatus.textContent = text;
    if (dom.loading && done) dom.loading.hidden = true;
  }

  function loadThree() {
    if (window.THREE) {
      state.threeReady = true;
      return Promise.resolve(window.THREE);
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(THREE_URL, document.baseURI).href;
      script.onload = () => {
        if (!window.THREE) reject(new Error("Local Three.js loaded but window.THREE is missing"));
        else {
          state.threeReady = true;
          resolve(window.THREE);
        }
      };
      script.onerror = () => reject(new Error("Cannot load local vendor/three.min.js"));
      document.head.appendChild(script);
    });
  }

  async function fetchJson(url) {
    const response = await fetch(new URL(url, document.baseURI).href, { cache: "no-store" });
    if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
    return response.json();
  }

  async function loadSolutionModule() {
    if (window.B04SolutionLayers) return window.B04SolutionLayers;
    await new Promise((resolve, reject) => {
      const script = document.createElement("script"); script.src = new URL(LAYERS_URL, document.baseURI).href;
      script.onload = resolve; script.onerror = () => reject(new Error("S06 renderer module unavailable")); document.head.appendChild(script);
    });
    if (!window.B04SolutionLayers) throw new Error("S06 module invalid");
    return window.B04SolutionLayers;
  }

  function loadScriptOnce(url, globalName, optional) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL(url, document.baseURI).href;
      script.onload = () => resolve(globalName ? window[globalName] || null : null);
      script.onerror = () => optional ? resolve(null) : reject(new Error(`${url} unavailable`));
      document.head.appendChild(script);
    });
  }

  async function fetchJsonOptional(url) {
    try {
      const response = await fetch(new URL(url, document.baseURI).href, { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
      return response.json();
    } catch (error) {
      state.s07.errors.push(error.message);
      return null;
    }
  }

  async function loadSolutionData() {
    const originalData = state.data;
    try {
      const supplement = await fetchJson(SOLUTION_URL);
      const admission = world.layers.admitSolution(supplement, originalData);
      const { transform, byId } = admission;
      const point = v => ({ ...v, x: v.x * transform.x_scale + transform.x_offset, z: v.z * transform.z_scale + transform.z_offset });
      const preparedData = { ...originalData,
        buildings: originalData.buildings.map(v => ({ ...v, footprint_local_m: byId.get(v.id).footprint_scene_m.map(p => ({ x: p.x, z: p.z })), centroid_local_m: [...byId.get(v.id).centroid_scene_m], coordinate_kind: "canonical_source_geojson" })),
        roads: originalData.roads.map(v => ({ ...v, path_local_m: v.path_local_m.map(point) })),
        osm_water: originalData.osm_water.map(v => ({ ...v, path_local_m: v.path_local_m.map(point) })),
        canopy_samples: originalData.canopy_samples.map(point), jrc_water_cells: originalData.jrc_water_cells.map(point),
      };
      state.solutionData = supplement;
      state.data = preparedData;
      state.diagnostics.coordinateTransform = { ...transform, canonicalFootprints: byId.size, featureFrame: supplement.coordinate_transform?.canonical_frame || "R6378137 x-east/z-north matching visual/UV", sourceFilesModified: false };
      state.diagnostics.adapter = { admitted: true, schema: supplement.schema, sourceFingerprintCount: Object.keys(supplement.source_fingerprints).length, acceptedGoogleCount: admission.acceptedGoogleCount, browserHashesVerified: false, buildTimeHashVerification: true };
      state.solution.available = admission.available;
      state.solution.terrain = state.solution.available.gedtm ? "gedtm" : "copdem";
      state.solution.heights = state.solution.available.google ? "google" : "proxy";
      const provenance = await Promise.allSettled([
        fetchJson(resolveAsset("tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-source-manifest.json")),
        fetchJson(resolveAsset("tayninh-imagery-campaign-05/evidence/optical/google-open-buildings-temporal-2023-aoi-qa.json")),
      ]);
      state.solutionProvenance = { googleManifest: provenance[0].status === "fulfilled" ? provenance[0].value : null, googleQa: provenance[1].status === "fulfilled" ? provenance[1].value : null };
    } catch (error) {
      state.solutionData = null;
      state.solution.available = { gedtm: false, google: false };
      state.solution.terrain = "copdem"; state.solution.heights = "proxy";
      state.diagnostics.adapter = { admitted: false, error: error.message, fallback: "copdem_proxy_canonical_once", browserHashesVerified: false };
      state.data = originalData;
      const latitude = originalData.aoi?.center_wgs84?.[1];
      if (Number.isFinite(latitude)) {
        const p = latitude * Math.PI / 180, canonical = 6378137 * Math.PI / 180;
        const xs = canonical * Math.cos(p) / (111412.84 * Math.cos(p) - 93.5 * Math.cos(3 * p));
        const zs = canonical / (111132.92 - 559.82 * Math.cos(2 * p) + 1.175 * Math.cos(4 * p));
        const point = v => ({ ...v, x: v.x * xs, z: v.z * zs });
        state.data = { ...state.data, buildings: state.data.buildings.map(v => ({ ...v, footprint_local_m: v.footprint_local_m.map(point) })), roads: state.data.roads.map(v => ({ ...v, path_local_m: v.path_local_m.map(point) })), osm_water: state.data.osm_water.map(v => ({ ...v, path_local_m: v.path_local_m.map(point) })), jrc_water_cells: state.data.jrc_water_cells.map(point), canopy_samples: state.data.canopy_samples.map(point) };
        state.diagnostics.coordinateTransform = { x_scale: xs, z_scale: zs, method: "Legacy compiler metres-per-degree to visual R6378137, fallback rounded scene geometry; direct raw polygons unavailable", sourceFilesModified: false };
      }
      state.solution.error = `Lớp bổ sung chưa sẵn sàng; dùng COPDEM và chiều cao xấp xỉ: ${error.message}`;
    }
  }

  function activeTerrain() {
    const base = state.data.terrain;
    const profile = state.solution.terrain === "gedtm" ? state.solutionData?.terrain_profiles?.gedtm : null;
    return profile ? { ...base, ...profile, min_m: profile.statistics?.min_m ?? profile.statistics?.min ?? profile.min_m, max_m: profile.statistics?.max_m ?? profile.statistics?.max ?? profile.max_m, mean_m: profile.statistics?.mean_m ?? profile.statistics?.mean ?? profile.mean_m, surface_rgb: base.surface_rgb, vertical_exaggeration: state.solution.scale } : { ...base, vertical_exaggeration: state.solution.scale };
  }

  function heightInfo(feature) {
    const model = state.solutionData?.buildings?.find(v => v.id === feature.id);
    const height = model?.google_model_height_m ?? model?.model_height_m;
    const supported = world.layers.acceptedGoogle(model);
    if (state.solution.heights === "google" && supported && Number.isFinite(height) && height > 0 && height < 100) return { height, modeled: true, method: "Chiều cao mô hình Google", date: "30/06/2023", support: `${model.height_support?.height_valid_pixels ?? "—"}/${model.height_support?.polygon_sample_pixels ?? "—"} mẫu raster hợp lệ · tỷ lệ hỗ trợ ${num(model.height_support?.support_ratio, 0).toFixed(2)}`, data: model };
    return { height: buildingHeight(feature, feature.area_m2), modeled: false, method: "Chiều cao xấp xỉ theo diện tích", date: feature.data_date || "Nguồn footprint Microsoft", support: state.solution.heights === "google" ? "Không đủ mẫu Google → dùng xấp xỉ" : "Xấp xỉ theo lớp diện tích", data: model };
  }

  function solutionState() { return { ...state.solution, available: { ...state.solution.available } }; }
  function publishSolutionState() { window.dispatchEvent(new CustomEvent("b04:solution-state", { detail: solutionState() })); }

  function disposeLayer(object) {
    if (!object) return;
    const cached = new Set([...world.textureCache.values(), ...world.layers.sharedTextures(world.THREE), ...s07ProtectedTextures()]), disposable = new Set();
    object.traverse(v => { for (const m of Array.isArray(v.material) ? v.material : v.material ? [v.material] : []) for (const key of ["map", "normalMap", "roughnessMap"]) if (m[key] && !cached.has(m[key])) disposable.add(m[key]); });
    world.layers.dispose(object, true); disposable.forEach(t => t.dispose());
  }

  async function rebuildSolution() {
    const started = performance.now();
    const old = [world.terrain, world.imageryOverlay, world.buildings, world.roads, world.osmWater, world.canopy, world.jrcOccurrence, world.jrcSeasonality, world.jrcChange, world.vegetationLayer?.group, world.s07Vegetation?.group, world.s07CoarseGroup, world.s07FineGroup];
    if (state.s07.chunks) state.s07.chunks.dispose(); state.s07.chunks = null; world.s07FineGroup = null; world.s07CoarseGroup = null; world.s07CoarseChunks = new Map(); world.s07FinePickables = []; world.s07Vegetation = null;
    world.pickables = []; world.imageryOverlay = null;
    state.anchorStats = { minClearanceM: Infinity, maxAbsClearanceM: 0, samples: 0 };
    await makeTerrain(); await prepareS07Chunks(); makeBuildings(); updateS07Chunks(false); makeLineLayers(); makeCanopy(); makeWaterCells();
    old.forEach(disposeLayer); updateFogForExtent(); updateCamera(); applyMode(state.mode);
    if (state.activeSelection?.featureId) {
      const replacement = renderedBuildingPayload(state.activeSelection.featureId);
      if (replacement) renderInspectorPayload(replacement);
    }
    state.perf.rebuildMs = performance.now() - started;
    state.needsRender = true;
  }

  function focusCluster() {
    const roi = state.s07.manifest?.roi_250m || null;
    if (roi?.center_scene_m && state.s07.sampleBounds) {
      const center = { x: Number(roi.center_scene_m[0]), z: Number(roi.center_scene_m[1]) };
      const ids = (roi.centroid_member_ids || [...state.s07.sampleIds]).map(String);
      const featureId = String(roi.center_target_id || "msft_0615");
      const raw = (state.data.buildings || []).find(v => String(v.id) === featureId);
      const rawPoints = raw ? featurePoints(raw) : [];
      const focusX = rawPoints.length ? rawPoints.reduce((a, p) => a + p.x, 0) / rawPoints.length : center.x;
      const focusZ = rawPoints.length ? rawPoints.reduce((a, p) => a + p.z, 0) / rawPoints.length : center.z;
      const focusHeight = raw ? buildingHeight(raw, areaOf(rawPoints)) : 40;
      world.controls.target.set(focusX, worldY(world.groundSampler(focusX, focusZ)) + focusHeight * .45, focusZ);
      world.controls.radius = 125; world.controls.theta = -.78; world.controls.phi = 1.11;
      state.solution.focus = { kind: "s07_manifest_sample_cluster", featureId, featureIds: ids, localCenterM: [center.x, center.z], radiusM: 125 };
      if (state.touring) toggleTour();
      applyMode("buildings"); updateCamera();
      const payload = renderedBuildingPayload(featureId);
      if (payload) renderInspectorPayload({ ...payload, method: `${payload.method || "Footprint nguồn mở"} · chi tiết S07 mô phỏng; ảnh địa điểm chưa có đối chiếu tự do.` });
      else if (raw) showInspector({ type: "Công trình trong ô mẫu S07", title: featureId, method: "Footprint nguồn mở; chi tiết S07 mô phỏng. Chưa có ảnh đúng công trình đã đối chiếu.", date: raw.data_date || "—", data: raw });
      publishSolutionState(); mirrorProbe(); state.needsRender = true; return;
    }
    const source = state.data?.buildings || [];
    const centers = source.map(f => { const pts = featurePoints(f); const x = pts.reduce((a, p) => a + p.x, 0) / Math.max(1, pts.length), z = pts.reduce((a, p) => a + p.z, 0) / Math.max(1, pts.length); return { f, x, z, height: buildingHeight(f, areaOf(pts)), bounds: featureBounds(f) }; }).filter(v => Number.isFinite(v.x) && Number.isFinite(v.z));
    if (!centers.length) return;
    let chosen = null, best = -Infinity;
    for (const c of centers) {
      if (c.height > 35 || (c.bounds.east - c.bounds.west) > 45 || (c.bounds.north - c.bounds.south) > 45) continue;
      const count = centers.filter(v => Math.hypot(v.x - c.x, v.z - c.z) < 70).length;
      if (count > best) { best = count; chosen = c; }
    }
    chosen = chosen || centers[0];
    const ids = centers.filter(v => Math.hypot(v.x - chosen.x, v.z - chosen.z) < 70).map(v => v.f.id);
    world.controls.target.set(chosen.x, worldY(world.groundSampler(chosen.x, chosen.z)) + chosen.height * .45, chosen.z);
    world.controls.radius = 125; world.controls.theta = -.78; world.controls.phi = 1.11;
    state.solution.focus = { kind: "actual_footprint_cluster", featureId: chosen.f.id, featureIds: ids, localCenterM: [chosen.x, chosen.z], radiusM: 125 };
    if (state.touring) toggleTour();
    applyMode("buildings"); updateCamera(); publishSolutionState(); mirrorProbe(); state.needsRender = true;
  }

  let commandQueue = Promise.resolve();
  function solutionCommand(detail) {
    commandQueue = commandQueue.then(async () => {
      if (!state.sceneReady) return;
      const { command, value } = detail || {}, start = performance.now(); let rebuild = false;
      state.solution.busy = true; publishSolutionState();
      try {
        if (command === "terrain" && ["copdem", "gedtm"].includes(value)) {
          if (value === "gedtm" && !state.solution.available.gedtm) throw new Error("GEDTM chưa đủ coverage; giữ COPDEM");
          if (state.solution.terrain !== value) { state.solution.terrain = value; rebuild = true; }
        } else if (command === "scale" && [1, 1.35].includes(Number(value))) {
          if (state.solution.scale !== Number(value)) { state.solution.scale = Number(value); rebuild = true; }
        } else if (command === "heights" && ["google", "proxy"].includes(value)) {
          if (value === "google" && !state.solution.available.google) throw new Error("Google model chưa sẵn sàng; giữ proxy");
          if (state.solution.heights !== value) { state.solution.heights = value; rebuild = true; }
        } else if (command === "detail" && ["detailed", "data"].includes(value)) { state.solution.detail = value; applyMode(state.mode); updateCamera(); }
        else if (command === "focus" && value === "cluster") focusCluster();
        if (rebuild) await rebuildSolution();
      } catch (error) { state.solution.error = error.message; }
      finally {
        state.solution.busy = false; state.solution.lastCommandMs = Number((performance.now() - start).toFixed(2));
        state.perf.commandCount++; publishSolutionState(); updateDisclosure(); mirrorProbe(); state.needsRender = true;
      }
    }).catch(error => { state.solution.busy = false; state.solution.error = error.message; publishSolutionState(); });
  }

  async function fetchOptionalJson(url) {
    try {
      const response = await fetch(new URL(url, document.baseURI).href, { cache: "no-store" });
      if (response.status === 404) {
        state.visualStatus = { status: "missing", error: `${url} chưa có` };
        return null;
      }
      if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
      const data = await response.json();
      state.visualStatus = { status: "loaded", error: null };
      return data;
    } catch (error) {
      state.visualStatus = { status: "error", error: error.message };
      return null;
    }
  }

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function flattenHeights(terrain) {
    const source = terrain.heights_m || terrain.heights || terrain.grid || [];
    if (!source.length) return [0, 0, 0, 0];
    if (Array.isArray(source[0])) return source.flat().map((value) => num(value, 0));
    return source.map((value) => num(value, 0));
  }

  function bboxToMetres(bbox) {
    if (!Array.isArray(bbox) || bbox.length !== 4) return { width: 1000, depth: 1000 };
    const midLat = (bbox[1] + bbox[3]) / 2;
    const width = Math.max(50, Math.abs(bbox[2] - bbox[0]) * 111320 * Math.cos(midLat * Math.PI / 180));
    const depth = Math.max(50, Math.abs(bbox[3] - bbox[1]) * 110574);
    return { width, depth };
  }

  function localPoint(value) {
    if (Array.isArray(value)) return { x: num(value[0], 0), z: value.length >= 3 ? num(value[2], 0) : num(value[1], 0) };
    if (value && typeof value === "object") return { x: num(value.x ?? value.lon_m ?? value.easting_m, 0), z: num(value.z ?? value.y ?? value.northing_m, 0) };
    return { x: 0, z: 0 };
  }

  function recordDisclosureFlags(data) {
    const text = JSON.stringify({ disclosure: data.disclosure, sources: data.sources, statistics: data.statistics }).toLowerCase();
    state.disclosureFlags = {
      aoiSample: /sample|bbox|osm|vùng mẫu|not official|không phải ranh/i.test(text),
      demContext: /dem|30 m|30m|copernicus|public/i.test(text),
      buildingProxy: /proxy|proxies|height.*unavailable|no source height|không có chiều cao|area_class/i.test(text),
      noLidar: /not.*lidar|không phải lidar|no lidar/i.test(text),
      noFloodModel: /not.*flood|flood-depth|không phải.*ngập|no flood/i.test(text),
    };
  }

  function modeMetrics(mode) {
    const stats = state.data?.statistics || {};
    const terrain = state.data ? activeTerrain() : {};
    const buildings = stats.buildings || {};
    const canopy = stats.canopy || {};
    const roads = stats.roads || {};
    const jrc = stats.jrc_water || {};
    const temporal = stats.temporal_change || {};
    const demRange = `${num(terrain.min_m, stats.terrain?.min_m || 0).toFixed(1)}–${num(terrain.max_m, stats.terrain?.max_m || 0).toFixed(1)} m`;
    const visualCanopy = state.visualData?.eth_canopy_field_10m || {};
    const visualImagery = state.visualData?.sentinel_rgb_10m_native || {};
    const canopyDims = visualCanopy.dimensions || [];
    const imageDims = visualImagery.dimensions || [];
    const values = {
      overview: [`${terrain.rows || "—"}×${terrain.cols || "—"}`, `${buildings.count ?? state.data?.buildings?.length ?? 0}`, imageDims.length >= 2 ? `${imageDims[0]}×${imageDims[1]}` : `${terrain.rows || "—"}×${terrain.cols || "—"}`],
      elevation: [demRange, `${num(terrain.vertical_exaggeration, 1).toFixed(1)}×`, `${num(terrain.mean_m, stats.terrain?.mean_m || 0).toFixed(1)} m`],
      buildings: [`${buildings.count ?? state.data?.buildings?.length ?? 0}`, `${buildings.source_height_null_count ?? 0} chưa đo`, state.solution.heights === "google" ? "Google model" : "proxy"],
      canopy: [canopyDims.length >= 2 ? `${canopyDims[0]}×${canopyDims[1]}` : `${canopy.samples ?? state.data?.canopy_samples?.length ?? 0}`, `${visualCanopy.height_stats?.valid_pixels ?? "—"} pixel`, "2020 · 10 m"],
      water: [`${jrc.nonzero_occurrence_cells ?? state.data?.jrc_water_cells?.length ?? 0}`, "2024", "30 m"],
      change: [`+${state.diagnostics.jrcGainCells}`, `-${state.diagnostics.jrcLossCells}`, `${temporal.strong_pixels ?? 0}`],
    };
    return values[mode] || MODES[mode]?.metrics || ["—", "—", "—"];
  }

  function modeMetricLabels(mode) {
    const values = {
      overview: ["DEM", "Công trình", "Ảnh RGB"],
      elevation: ["Cao độ", "Phóng đứng", "Trung bình"],
      buildings: ["Dấu chân", "Thiếu cao", "Phương pháp"],
      canopy: ["Trường raster", "Pixel có dữ liệu", "Nguồn"],
      water: ["Ô JRC", "Mùa", "Danh nghĩa"],
      change: ["Tăng", "Giảm", "S2 mạnh"],
    };
    return values[mode] || ["A", "B", "C"];
  }

  function updateDiagnosticsFromData(data) {
    const cells = data.jrc_water_cells || [];
    state.diagnostics.jrcGainCells = cells.filter((cell) => num(cell.normalized_change_percent, 0) > 0).length;
    state.diagnostics.jrcLossCells = cells.filter((cell) => num(cell.normalized_change_percent, 0) < 0).length;
    const rows = data.terrain?.rows || 0;
    const cols = data.terrain?.cols || 0;
    state.diagnostics.northMappingOk = rows > 1 && cols > 1;
  }

  function buildHeightSampler(frame, heights, rows, cols) {
    return function heightAt(x, z) {
      const u = Math.min(1, Math.max(0, (x - frame.xMin) / Math.max(0.001, frame.xMax - frame.xMin)));
      const v = Math.min(1, Math.max(0, (frame.zMax - z) / Math.max(0.001, frame.zMax - frame.zMin)));
      const gx = u * (cols - 1);
      const gy = v * (rows - 1);
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = Math.min(cols - 1, x0 + 1);
      const y1 = Math.min(rows - 1, y0 + 1);
      const tx = gx - x0;
      const ty = gy - y0;
      const h00 = heights[y0 * cols + x0] ?? 0;
      const h10 = heights[y0 * cols + x1] ?? h00;
      const h01 = heights[y1 * cols + x0] ?? h00;
      const h11 = heights[y1 * cols + x1] ?? h01;
      return (h00 * (1 - tx) + h10 * tx) * (1 - ty) + (h01 * (1 - tx) + h11 * tx) * ty;
    };
  }

  function buildTriangleGroundSampler(frame, heights, rows, cols) {
    return function groundAt(x, z) {
      const u = Math.min(1, Math.max(0, (x - frame.xMin) / Math.max(0.001, frame.xMax - frame.xMin)));
      const v = Math.min(1, Math.max(0, (frame.zMax - z) / Math.max(0.001, frame.zMax - frame.zMin)));
      const gx = u * (cols - 1);
      const gy = v * (rows - 1);
      const x0 = Math.min(cols - 2, Math.max(0, Math.floor(gx)));
      const y0 = Math.min(rows - 2, Math.max(0, Math.floor(gy)));
      const tx = gx - x0;
      const ty = gy - y0;
      const h00 = heights[y0 * cols + x0] ?? 0;
      const h10 = heights[y0 * cols + x0 + 1] ?? h00;
      const h01 = heights[(y0 + 1) * cols + x0] ?? h00;
      const h11 = heights[(y0 + 1) * cols + x0 + 1] ?? h01;
      if (tx + ty <= 1) return h00 + tx * (h10 - h00) + ty * (h01 - h00);
      const sx = 1 - tx;
      const sy = 1 - ty;
      return h11 + sx * (h01 - h11) + sy * (h10 - h11);
    };
  }

  function worldY(elevationM) {
    return num(elevationM, 0) * world.terrainExtent.exag;
  }

  function recordAnchorAt(x, z, renderedY) {
    const expected = worldY(world.groundSampler ? world.groundSampler(x, z) : world.heightSampler(x, z));
    const clearance = renderedY - expected;
    state.anchorStats.minClearanceM = Math.min(state.anchorStats.minClearanceM, clearance);
    state.anchorStats.maxAbsClearanceM = Math.max(state.anchorStats.maxAbsClearanceM, Math.abs(clearance));
    state.anchorStats.samples += 1;
  }

  function canvasTexture(label, min, max) {
    const THREE = world.THREE;
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
    gradient.addColorStop(0, "#14352f");
    gradient.addColorStop(0.45, "#5c7e47");
    gradient.addColorStop(1, "#cab875");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);
    ctx.fillStyle = "rgba(255,255,255,.22)";
    for (let i = -1024; i < 2048; i += 52) {
      ctx.fillRect(i, 0, 2, 1024);
      ctx.fillRect(0, i, 1024, 2);
    }
    ctx.fillStyle = "rgba(5,18,14,.72)";
    ctx.fillRect(28, 28, 470, 76);
    ctx.fillStyle = "#fff7dc";
    ctx.font = "700 28px system-ui";
    ctx.fillText(label || "Gia Lộc public-data terrain", 48, 62);
    ctx.font = "18px system-ui";
    ctx.fillText(`DEM ${min.toFixed(1)}–${max.toFixed(1)} m`, 48, 90);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace || undefined;
    texture.anisotropy = Math.min(8, world.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return texture;
  }

  function surfaceRgbTexture(surfaceRgb) {
    if (!Array.isArray(surfaceRgb) || !Array.isArray(surfaceRgb[0]) || !Array.isArray(surfaceRgb[0][0])) return null;
    const THREE = world.THREE;
    const rows = surfaceRgb.length;
    const cols = surfaceRgb[0].length;
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(cols, rows);
    let offset = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const pixel = surfaceRgb[r][c] || [0, 0, 0];
        image.data[offset] = num(pixel[0], 0);
        image.data[offset + 1] = num(pixel[1], 0);
        image.data[offset + 2] = num(pixel[2], 0);
        image.data[offset + 3] = 255;
        offset += 4;
      }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace || undefined;
    texture.anisotropy = Math.min(8, world.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    return texture;
  }

  function texturePath(data) {
    const terrain = data.terrain || {};
    const direct = terrain.texture_path || terrain.sentinel_texture || terrain.sentinel_image || terrain.image || data.display?.sentinel_texture || data.assets?.sentinel_texture || null;
    if (direct) return direct;
    const source = (data.sources || []).find((item) => item.role === "terrain_surface_color" && item.path);
    if (!source) return null;
    return source.path.replace(/\.tiff?$/i, ".png");
  }

  function resolveAsset(path) {
    if (!path) return null;
    if (/^(https?:|data:|\/)/.test(path)) return path;
    if (/^tayninh-(?:data-batch-\d+|imagery-campaign-\d+)\//.test(path)) return new URL(`../${path}`, document.baseURI).href;
    return new URL(path, document.baseURI).href;
  }

  function visualImageryDescriptor() {
    const imagery = state.visualData?.sentinel_rgb_10m_native || {};
    const asset = imagery.asset || {};
    const path = asset.path || null;
    const dims = imagery.dimensions || [];
    const width = num(asset.width ?? dims[0], null);
    const height = num(asset.height ?? dims[1], null);
    return {
      path,
      width,
      height,
      method: imagery.native_status || "Sentinel-2 native RGB texture",
      resolution: `${num(imagery.nominal_ground_sampling_distance_m, 10)} m Sentinel-2 RGB; ${width || "?"}×${height || "?"}`,
      date: imagery.source_item?.acquisition_datetime || "Sentinel-2 public visual",
      status: state.visualStatus.status,
      error: state.visualStatus.error,
    };
  }

  function recordImageryDiagnostics(info, texture, fallback) {
    const image = texture?.image || {};
    state.diagnostics.imagery = {
      ready: !fallback && !!texture,
      status: fallback ? (info?.status || "fallback") : "loaded",
      method: fallback ? "fallback_109x109_scene_surface_rgb" : info.method,
      sourceWidth: fallback ? world.terrainExtent.cols : (info.width || image.naturalWidth || image.width || null),
      sourceHeight: fallback ? world.terrainExtent.rows : (info.height || image.naturalHeight || image.height || null),
      textureWidth: image.naturalWidth || image.width || (fallback ? world.terrainExtent.cols : null),
      textureHeight: image.naturalHeight || image.height || (fallback ? world.terrainExtent.rows : null),
      path: fallback ? null : info.path,
      resolution: fallback ? "scene-data surface_rgb sampled to DEM grid; not native Sentinel" : info.resolution,
      error: fallback ? (info?.error || "derived/visual/visual-data.json chưa có hoặc chưa có imagery path") : null,
      uvStatus: state.diagnostics.imagery.uvStatus || null,
      overlayTriangles: 0,
    };
  }

  function loadTexture(path) {
    const THREE = world.THREE;
    if (world.textureCache.has(path)) return Promise.resolve(world.textureCache.get(path));
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(resolveAsset(path), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace || undefined;
        texture.anisotropy = Math.min(8, world.renderer.capabilities.getMaxAnisotropy());
        world.textureCache.set(path, texture); resolve(texture);
      }, undefined, (error) => reject(error instanceof Error ? error : new Error(`Không nạp được texture ${path}`)));
    });
  }

  function terrainFrameFromVisual(visualFrame, fallbackWidth, fallbackDepth, rows, cols, bbox) {
    const centers = visualFrame?.pixel_centers || {};
    const first = centers.first_pixel_center_scene_m;
    const last = centers.last_pixel_center_scene_m;
    if (Array.isArray(first) && Array.isArray(last) && first.length >= 2 && last.length >= 2) {
      const x0 = num(first[0], null);
      const z0 = num(first[1], null);
      const x1 = num(last[0], null);
      const z1 = num(last[1], null);
      if ([x0, z0, x1, z1].every(Number.isFinite)) {
        return {
          xMin: Math.min(x0, x1),
          xMax: Math.max(x0, x1),
          zMin: Math.min(z0, z1),
          zMax: Math.max(z0, z1),
          width: Math.abs(x1 - x0),
          depth: Math.abs(z0 - z1),
          source: "visual terrain_frame pixel centres",
          bbox,
          firstPixelCenter: [x0, z0],
          lastPixelCenter: [x1, z1],
        };
      }
    }
    return {
      xMin: -fallbackWidth / 2,
      xMax: fallbackWidth / 2,
      zMin: -fallbackDepth / 2,
      zMax: fallbackDepth / 2,
      width: fallbackWidth,
      depth: fallbackDepth,
      source: "fusion scene centred fallback",
      bbox,
      firstPixelCenter: [-fallbackWidth / 2, fallbackDepth / 2],
      lastPixelCenter: [fallbackWidth / 2, -fallbackDepth / 2],
    };
  }

  async function makeTerrain() {
    const THREE = world.THREE;
    const data = state.data;
    const terrain = activeTerrain();
    const rows = Math.max(2, num(terrain.rows, 2));
    const cols = Math.max(2, num(terrain.cols, 2));
    const heights = flattenHeights(terrain);
    while (heights.length < rows * cols) heights.push(heights[heights.length - 1] || 0);
    const visualFrame = state.visualData?.terrain_frame || state.visualData?.terrainFrame || null;
    const bbox = visualFrame?.bbox_wgs84 || terrain.bbox_wgs84 || data.aoi?.bbox_wgs84 || data.aoi?.bbox || data.map?.aoi_bbox;
    const metres = visualFrame?.local_extent_m || visualFrame?.extent_m || terrain.local_extent_m || bboxToMetres(bbox);
    const fallbackMetres = bboxToMetres(bbox);
    const fallbackWidth = num(metres.width ?? metres.x ?? metres[0], fallbackMetres.width);
    const fallbackDepth = num(metres.depth ?? metres.z ?? metres[1], fallbackMetres.depth);
    const frame = terrainFrameFromVisual(visualFrame, fallbackWidth, fallbackDepth, rows, cols, bbox);
    const width = frame.width;
    const depth = frame.depth;
    const min = num(terrain.min_m, Math.min.apply(null, heights));
    const max = num(terrain.max_m, Math.max.apply(null, heights));
    const mean = num(terrain.mean_m, heights.reduce((a, b) => a + b, 0) / heights.length);
    const exag = state.solution.scale;
    world.terrainExtent = { width, depth, xMin: frame.xMin, xMax: frame.xMax, zMin: frame.zMin, zMax: frame.zMax, rows, cols, min, max, mean, exag };
    state.diagnostics.terrainFrame = {
      origin: visualFrame?.origin || visualFrame?.origin_semantics || state.visualData?.scene_coordinate_frame?.origin_wgs84 || "local AOI centre",
      axis: visualFrame?.axis || "x east, z north; raster row 0 maps north",
      widthM: Number(width.toFixed(3)),
      depthM: Number(depth.toFixed(3)),
      xMin: Number(frame.xMin.toFixed(3)),
      xMax: Number(frame.xMax.toFixed(3)),
      zMin: Number(frame.zMin.toFixed(3)),
      zMax: Number(frame.zMax.toFixed(3)),
      rows,
      cols,
      bboxWgs84: bbox || null,
      firstPixelCenter: frame.firstPixelCenter,
      lastPixelCenter: frame.lastPixelCenter,
      visualFrameStatus: frame.source,
    };
    world.heightSampler = buildHeightSampler(frame, heights, rows, cols);
    world.groundSampler = buildTriangleGroundSampler(frame, heights, rows, cols);
    const uvRows = state.visualData?.sentinel_rgb_10m_native?.terrain_node_texture_uv_rows || null;
    const uvReady = Array.isArray(uvRows) && uvRows.length === rows && Array.isArray(uvRows[0]) && uvRows[0].length === cols;
    state.diagnostics.imagery.uvStatus = uvReady ? "terrain_node_texture_uv_rows" : "pending terrain_node_texture_uv_rows";

    const positions = [];
    const uvs = [];
    const uvValidity = [];
    const indices = [];
    const colors = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const u = c / (cols - 1);
        const v = r / (rows - 1);
        const h = heights[r * cols + c] || 0;
        const x = frame.xMin + u * (frame.xMax - frame.xMin);
        const z = frame.zMax - v * (frame.zMax - frame.zMin);
        positions.push(x, worldY(h), z);
        if (uvReady) {
          const uv = uvRows[r][c] || [u, 1 - v];
          uvs.push(num(uv[0], u), num(uv[1], 1 - v));
          uvValidity.push(uv.length < 3 ? true : !!uv[2]);
        } else {
          uvs.push(u, 1 - v);
          uvValidity.push(false);
        }
        const t = (h - min) / Math.max(0.1, max - min);
        colors.push(0.08 + 0.45 * t, 0.22 + 0.45 * t, 0.18 + 0.16 * t);
      }
    }
    for (let r = 0; r < rows - 1; r += 1) {
      for (let c = 0; c < cols - 1; c += 1) {
        const a = r * cols + c;
        indices.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const visualInfo = visualImageryDescriptor();
    let fallback = false;
    let texture = null;
    if (visualInfo.path && uvReady) {
      try {
        texture = await loadTexture(visualInfo.path);
      } catch (error) {
        state.visualStatus = { status: "texture_error", error: error.message };
      }
    }
    if (!texture && visualInfo.path && !uvReady) {
      state.visualStatus = { status: "uv_pending", error: "đang chờ terrain_node_texture_uv_rows để đặt texture Sentinel chính xác" };
      visualInfo.status = state.visualStatus.status;
      visualInfo.error = state.visualStatus.error;
    }
    if (!texture) {
      fallback = true;
      texture = surfaceRgbTexture(terrain.surface_rgb) || canvasTexture("Gia Lộc fused terrain", min, max);
    }
    recordImageryDiagnostics(visualInfo, texture, fallback);
    const material = new THREE.MeshBasicMaterial({
      map: fallback ? texture : null,
      vertexColors: !fallback,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = 0;
    mesh.name = "DEM terrain";
    mesh.userData.inspect = {
      type: "Địa hình",
      title: `${state.solution.terrain === "gedtm" ? "GEDTM30 DTM dự đoán · testing-only" : "COPDEM GLO30 DSM"} + Sentinel native`,
      method: fallback ? "Ảnh nền tạm thời 109×109 từ scene-data; đang chờ UV texture native" : "Ảnh Sentinel native đã đăng ký theo pixel terrain",
      date: state.solution.terrain === "gedtm" ? "2006–2015 · v1.2 2026" : terrain.data_date || terrain.source?.date || "nguồn công khai",
      resolution: fallback ? `${rows}×${cols} ảnh tạm theo DEM; DEM nguồn công khai` : `${state.diagnostics.imagery.textureWidth}×${state.diagnostics.imagery.textureHeight}; ${visualInfo.resolution}`,
      limitation: "Sentinel là ảnh công khai danh nghĩa 10 m; không phải orthophoto 1 cm, không nội suy làm sắc nét.",
    };
    world.terrainMaterial = material;
    world.terrain = mesh;
    world.pickables.push(mesh);
    world.root.add(mesh);
    if (!fallback && texture && uvReady) {
      const overlayPositions = [];
      const overlayUvs = [];
      function uvInside(index) {
        const u = uvs[index * 2];
        const v = uvs[index * 2 + 1];
        return uvValidity[index] && u >= 0 && u <= 1 && v >= 0 && v <= 1;
      }
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];
        if (!uvInside(a) || !uvInside(b) || !uvInside(c)) continue;
        for (const idx of [a, b, c]) {
          overlayPositions.push(positions[idx * 3], positions[idx * 3 + 1] + 0.012, positions[idx * 3 + 2]);
          overlayUvs.push(uvs[idx * 2], uvs[idx * 2 + 1]);
        }
      }
      if (overlayPositions.length) {
        const overlayGeometry = new THREE.BufferGeometry();
        overlayGeometry.setAttribute("position", new THREE.Float32BufferAttribute(overlayPositions, 3));
        overlayGeometry.setAttribute("uv", new THREE.Float32BufferAttribute(overlayUvs, 2));
        overlayGeometry.computeVertexNormals();
        const overlayMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -3,
          polygonOffsetUnits: -3,
        });
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.name = "Sentinel-2 native RGB overlay";
        overlay.renderOrder = 1;
        world.imageryOverlay = overlay;
        world.root.add(overlay);
        state.diagnostics.imagery.overlayTriangles = overlayPositions.length / 9;
      } else {
        state.diagnostics.imagery.ready = false;
        state.diagnostics.imagery.status = "no_uv_inside_crop";
        state.diagnostics.imagery.error = "terrain_node_texture_uv_rows không có tam giác nằm trong crop Sentinel";
      }
    }
  }

  function updateFogForExtent() {
    if (!world.scene) return;
    const THREE = world.THREE;
    const span = Math.max(world.terrainExtent.width, world.terrainExtent.depth, 1);
    const density = Math.max(0.000045, Math.min(0.00016, 0.24 / span));
      world.scene.fog = new THREE.FogExp2("#c2d1d0", density);
    state.diagnostics.fogDensity = density;
  }

  function colorForBuilding(height) {
    const THREE = world.THREE;
    if (height > 18) return new THREE.Color("#f0a54a");
    if (height > 10) return new THREE.Color("#d77a38");
    return new THREE.Color("#a94f37");
  }

  function mergeNonIndexed(entries) {
    const THREE = world.THREE;
    const positions = [];
    const normals = [];
    const colors = [];
    const triangleToFeature = [];
    for (const entry of entries) {
      const geometry = entry.geometry.index ? entry.geometry.toNonIndexed() : entry.geometry.clone();
      geometry.computeVertexNormals();
      const pos = geometry.getAttribute("position");
      const normal = geometry.getAttribute("normal");
      for (let i = 0; i < pos.count; i += 1) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(normal.getX(i), normal.getY(i), normal.getZ(i));
        colors.push(entry.color.r, entry.color.g, entry.color.b);
        if (i % 3 === 0) triangleToFeature.push(entry.feature);
      }
      geometry.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    merged.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    merged.userData.triangleToFeature = triangleToFeature;
    merged.computeBoundingSphere();
    return merged;
  }

  function centroid(points) {
    if (!points.length) return { x: 0, z: 0 };
    return points.reduce((acc, point) => ({ x: acc.x + point.x / points.length, z: acc.z + point.z / points.length }), { x: 0, z: 0 });
  }

  function areaOf(points) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      area += a.x * b.z - b.x * a.z;
    }
    return Math.abs(area) / 2;
  }

  function signedAreaOf(points) {
    let area = 0;
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      area += a.x * b.z - b.x * a.z;
    }
    return area / 2;
  }

  function buildingHeight(feature, area) {
    return num(feature.proxy_display_height_m ?? feature.display_height_m ?? feature.height_m, area > 850 ? 18 : area > 260 ? 11 : 6);
  }

  function renderContext(extra) {
    return { THREE: world.THREE, ground: (x, z) => worldY(world.groundSampler(x, z)), frame: world.terrainExtent, materialLibrary: state.s07.materialLibrary, ...(extra || {}) };
  }

  function s07ProtectedTextures() {
    const out = [];
    const libTextures = state.s07.materialLibrary?.textures;
    if (Array.isArray(libTextures)) out.push(...libTextures);
    else if (libTextures && typeof libTextures === "object") out.push(...Object.values(libTextures).flat());
    try { if (state.s07.surface?.sharedTextures) out.push(...(state.s07.surface.sharedTextures(world.THREE) || [])); } catch (_) {}
    return out.filter(Boolean);
  }

  function featurePoints(feature) {
    return (feature.footprint_local_m || []).map(p => ({ x: Number(p.x), z: Number(p.z) })).filter(p => Number.isFinite(p.x) && Number.isFinite(p.z));
  }

  function featureBounds(feature) {
    const pts = featurePoints(feature);
    return pts.reduce((a, p) => ({ west: Math.min(a.west, p.x), east: Math.max(a.east, p.x), south: Math.min(a.south, p.z), north: Math.max(a.north, p.z) }), { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity });
  }

  function createS07FineChunk(cell, features) {
    const sourceFeatures = features.filter(Boolean);
    if (!sourceFeatures.length) return { object: null, pickables: [], qa: { featureCount: 0 } };
    const ctx = renderContext({ detailLevel: "fine", sampleBounds: cell.bounds, chunkId: cell.id });
    const layer = world.layers.buildingLayer(ctx, sourceFeatures, heightInfo);
    layer.group.name = `S07 fine chunk ${cell.id}`;
    layer.group.userData.s07Chunk = { id: cell.id, featureIds: sourceFeatures.map(f => f.id), bounds: cell.bounds };
    layer.group.userData.s07Buildings = layer.buildings || [];
    world.s07FineGroup.add(layer.group);
    world.pickables.push(...(layer.pickables || []));
    world.s07FinePickables.push(...(layer.pickables || []));
    return { object: layer.group, pickables: layer.pickables || [], qa: { ...(layer.qa || {}), featureCount: sourceFeatures.length, chunkId: cell.id, fineDetail: layer.qa?.fineDetail || null } };
  }

  function disposeS07FineChunks() {
    if (state.s07.chunks) state.s07.chunks.dispose();
    state.s07.chunks = null;
    world.s07FinePickables = [];
    if (world.s07FineGroup) { disposeLayer(world.s07FineGroup); world.s07FineGroup = null; }
    state.s07.sampleIds = new Set();
    state.s07.sampleBounds = null;
  }

  function disposeS07ChunkObject(object) {
    if (!object) return;
    const members = new Set();
    object.traverse?.(v => members.add(v));
    world.pickables = world.pickables.filter(v => !members.has(v));
    world.s07FinePickables = world.s07FinePickables.filter(v => !members.has(v));
    disposeLayer(object);
  }

  function s07GenerationKey() {
    return [state.solution.terrain, state.solution.scale, state.solution.heights, state.s07.materialStatus].join(":");
  }

  async function loadS07Assets() {
    state.s07.importer = await loadScriptOnce(S07_IMPORTER_URL, "B04S07Importer", false);
    state.s07.ui = await loadScriptOnce(S07_UI_URL, "B04S07UI", false);
    state.s07.chunksApi = await loadScriptOnce(S07_CHUNKS_URL, "B04S07Chunks", false);
    state.s07.surface = await loadScriptOnce(S07_SURFACE_URL, "B04S07Surface", true);
    state.s07.manifest = await fetchJsonOptional(S07_SAMPLE_MANIFEST_URL);
    state.s07.photoRegistry = await fetchJsonOptional(S07_PHOTO_REGISTRY_URL);
    state.s07.materialManifest = await fetchJsonOptional(S07_MATERIAL_MANIFEST_URL);
    state.s07.fixtures = state.s07.importer?.runFixtures?.() || null;
    if (state.s07.surface?.loadMaterialLibrary && state.s07.materialManifest) {
      try {
        state.s07.materialLibrary = await state.s07.surface.loadMaterialLibrary(world.THREE, { manifest: state.s07.materialManifest, baseUrl: new URL(".", document.baseURI).href, anisotropy: Math.min(4, world.renderer?.capabilities?.getMaxAnisotropy?.() || 1), maxTextures: 12, maxEstimatedBytes: 64 * 1024 * 1024 });
        state.s07.materialStatus = "ready";
      } catch (error) {
        state.s07.materialStatus = "fallback";
        state.s07.errors.push(error.message);
      }
    } else {
      state.s07.materialStatus = state.s07.materialManifest ? "waiting_surface" : "missing_manifest";
    }
  }

  async function prepareS07Chunks() {
    const features = state.data?.buildings || [];
    if (!features.length) return;
    if (!state.s07.chunksApi) await loadS07Assets();
    disposeS07FineChunks();
    world.s07FineGroup = new world.THREE.Group();
    world.s07FineGroup.name = "S07 fine chunk root";
    world.root.add(world.s07FineGroup);
    const runtime = state.s07.chunksApi.createRuntime({
      workerUrl: new URL("static/s07-worker.js", document.baseURI).href,
      cellSizeM: state.s07.manifest?.cell_size_m || 250,
      maxFineChunks: 4,
      fallbackFocusId: state.s07.manifest?.focus_id || "msft_0615",
      createChunk: createS07FineChunk,
      disposeObject: disposeS07ChunkObject,
    });
    state.s07.chunks = runtime;
    const snapshot = await runtime.init(features, state.s07.manifest);
    state.s07.sampleIds = new Set(runtime.sampleIds);
    state.s07.sampleBounds = runtime.sampleBounds;
    state.s07.chunksCells = runtime.cells || [];
    state.s07.enabled = state.s07.sampleIds.size > 0;
    state.s07.status = snapshot.fallback ? "fallback" : "ready";
    state.s07.generationKey = s07GenerationKey();
    buildS07CoarseChunks();
    syncS07CoarseVisibility();
    renderS07Panel(true);
  }

  function updateS07Chunks(force) {
    if (!state.s07.chunks || !world.controls.target) return;
    const key = s07GenerationKey();
    if (key !== state.s07.generationKey) return;
    const fineEnabled = state.solution.detail === "detailed" && ["overview", "buildings"].includes(state.mode);
    state.s07.chunks.update({ target: { x: world.controls.target.x, z: world.controls.target.z }, radius: world.controls.radius, enabled: fineEnabled, forceSample: fineEnabled && (force || new URLSearchParams(location.search).get("s07") === "sample") });
    syncS07CoarseVisibility();
    renderS07Panel();
  }

  function s07Probe() {
    return {
      status: state.s07.status, enabled: state.s07.enabled, generationKey: state.s07.generationKey,
      materialStatus: state.s07.materialStatus, sharedTextureCount: s07ProtectedTextures().length, importerVersion: state.s07.importer?.VERSION || null, chunksVersion: state.s07.chunksApi?.VERSION || null, uiVersion: state.s07.ui?.VERSION || null, surfaceVersion: state.s07.surface?.VERSION || null,
      importerFixtures: state.s07.fixtures, importerResult: state.s07.importerResult, fileIntegrity: "format/schema validation only unless raw bytes are supplied to async hash gate; browser does not claim future source availability", chunks: state.s07.chunks?.snapshot?.() || null, sampleIds: state.s07.sampleIds.size, sampleBounds: state.s07.sampleBounds, errors: state.s07.errors.slice(-4),
    };
  }

  function renderS07Panel(force) {
    if (!dom.s07Panel || !state.s07.ui) return;
    const chunks = state.s07.chunks?.snapshot?.();
    const signature = JSON.stringify({ status: state.s07.status, material: state.s07.materialStatus, detail: state.solution.detail, active: chunks?.active, cache: chunks?.cacheSize, cells: chunks?.cells, sampleIds: chunks?.sampleIds, errors: chunks?.errors, importerResult: state.s07.importerResult?.message || null });
    if (!force && signature === state.s07.lastPanelSignature) return;
    const open = [...dom.s07Panel.querySelectorAll("details")].map((node, index) => [index, node.open]);
    const active = document.activeElement;
    const textarea = dom.s07Panel.querySelector("[data-s07-import-json]");
    const select = dom.s07Panel.querySelector("[data-s07-import-kind]");
    const fileInput = dom.s07Panel.querySelector("[data-s07-import-file]");
    const preserved = {
      focused: active === textarea ? "json" : active === select ? "kind" : active === fileInput ? "file" : null,
      json: textarea?.value || "",
      selectionStart: textarea?.selectionStart ?? null,
      selectionEnd: textarea?.selectionEnd ?? null,
      kind: select?.value || "raster",
      fileInput,
    };
    const photos = Array.isArray(state.s07.photoRegistry?.records) ? state.s07.photoRegistry.records : Array.isArray(state.s07.photoRegistry?.photos) ? state.s07.photoRegistry.photos : Array.isArray(state.s07.photoRegistry) ? state.s07.photoRegistry : [];
    const verifiedPhotos = photos.filter(photo => photo.status === "verified" || photo.point_match === true).length;
    const receiptPaths = [
      ...(Array.isArray(state.s07.photoRegistry?.global_search_receipts) ? state.s07.photoRegistry.global_search_receipts : []),
      ...(state.s07.photoRegistry?.schema ? [S07_PHOTO_REGISTRY_URL] : []),
      ...(state.s07.materialManifest?.schema ? [S07_MATERIAL_MANIFEST_URL] : []),
    ];
    state.s07.ui.mount(dom.s07Panel, {
      status: state.s07.status,
      chunks,
      materials: { status: state.s07.materialStatus, textureCount: state.s07.materialLibrary?.textures?.length || state.s07.materialLibrary?.qa?.textureCount || 0 },
      photos,
      photoSummary: { total: photos.length, verified: verifiedPhotos },
      receiptPaths,
      sampleCount: state.s07.sampleIds.size,
      importerResult: state.s07.importerResult,
      detail: state.solution.detail,
    });
    const nextTextarea = dom.s07Panel.querySelector("[data-s07-import-json]");
    const nextSelect = dom.s07Panel.querySelector("[data-s07-import-kind]");
    const nextFileInput = dom.s07Panel.querySelector("[data-s07-import-file]");
    if (nextTextarea && preserved.json) {
      nextTextarea.value = preserved.json;
      if (preserved.selectionStart !== null && preserved.selectionEnd !== null) {
        try { nextTextarea.setSelectionRange(preserved.selectionStart, preserved.selectionEnd); } catch (_) {}
      }
    }
    if (nextSelect) nextSelect.value = preserved.kind;
    if (preserved.fileInput && nextFileInput) {
      nextFileInput.replaceWith(preserved.fileInput);
    }
    for (const [index, wasOpen] of open) { const node = dom.s07Panel.querySelectorAll("details")[index]; if (node) node.open = wasOpen; }
    const focusTarget = preserved.focused === "json" ? dom.s07Panel.querySelector("[data-s07-import-json]") : preserved.focused === "kind" ? dom.s07Panel.querySelector("[data-s07-import-kind]") : preserved.focused === "file" ? dom.s07Panel.querySelector("[data-s07-import-file]") : null;
    focusTarget?.focus?.({ preventScroll: true });
    state.s07.lastPanelSignature = signature;
  }

  function renderedBuildingPayload(featureId) {
    const id = String(featureId);
    const base = world.buildingLayer?.buildings?.find(b => String(b.id) === id);
    if (base) return base.payload || base;
    for (const entry of world.s07CoarseChunks?.values?.() || []) {
      const found = entry.buildings?.find?.(b => String(b.id) === id);
      if (found) return found.payload || found;
    }
    const groups = [];
    world.s07FineGroup?.traverse?.(node => { if (node.userData?.s07Buildings) groups.push(node); });
    for (const node of groups) {
      const found = node.userData.s07Buildings.find(b => String(b.id) === id);
      if (found) return found.payload || found;
    }
    return null;
  }

  function setS07ImporterResult(result) {
    state.s07.importerResult = { at: new Date().toISOString(), ...(result || {}) };
    state.s07.lastPanelSignature = null;
    renderS07Panel(true);
    mirrorProbe();
    state.needsRender = true;
  }

  async function handleS07ImporterCommand(command) {
    if (!state.s07.importer) await loadS07Assets();
    const panel = dom.s07Panel;
    const text = panel?.querySelector("[data-s07-import-json]")?.value || "";
    const kind = panel?.querySelector("[data-s07-import-kind]")?.value || "raster";
    const resultKind = command === "validate-glb" ? "glb" : kind;
    try {
      if (command === "validate-glb") {
        const file = panel?.querySelector("[data-s07-import-file]")?.files?.[0];
        if (!file) throw new Error("Chưa chọn file GLB.");
        const source = JSON.parse(text || "{}");
        const descriptor = await state.s07.importer.parseGlbModel(await file.arrayBuffer(), source, { allowAvailable: true });
        setS07ImporterResult({ ok: true, kind: "glb", publish: false, integrityVerified: true, message: "GLB hợp lệ và SHA-256 khớp sourcehash.", summary: { triangles: descriptor.triangleEstimate, meshes: descriptor.meshCount, sha256: descriptor.sha256, publish: false, integrityVerified: true } });
        return;
      }
      const input = JSON.parse(text || "{}");
      const parsed = kind === "geojson" ? state.s07.importer.parseGeoJSONFootprints(input, { allowAvailable: true }) : state.s07.importer.parseRasterMetadata(input, { allowAvailable: true });
      setS07ImporterResult({ ok: true, kind, publish: false, integrityVerified: false, message: kind === "geojson" ? "GeoJSON được admit theo subset không lỗ/MultiPolygon." : "Raster metadata/georegistration hợp lệ; không giải mã GeoTIFF trong trình duyệt.", summary: { schema: parsed.schema, count: parsed.count, width: parsed.width, height: parsed.height, bounds: parsed.source?.bounds || parsed.actualBounds, publish: false, integrityVerified: false } });
    } catch (error) {
      setS07ImporterResult({ ok: false, kind: resultKind, publish: false, integrityVerified: false, message: error.message });
    }
  }

  function buildS07CoarseChunks() {
    if (!state.s07.chunks || !world.s07FineGroup) return;
    if (world.s07CoarseGroup) disposeLayer(world.s07CoarseGroup);
    world.s07CoarseGroup = new world.THREE.Group();
    world.s07CoarseGroup.name = "S07 coarse sample fallback root";
    world.s07CoarseChunks = new Map();
    world.root.add(world.s07CoarseGroup);
    const featureById = new Map((state.data.buildings || []).map(f => [String(f.id), f]));
    const cells = state.s07.chunks.snapshot?.().cells ? state.s07.chunks._cells || null : null;
    const runtimeCells = state.s07.chunksCells || [];
    for (const cell of runtimeCells) {
      const features = cell.featureIds.map(id => featureById.get(String(id))).filter(Boolean);
      if (!features.length) continue;
      const layer = world.layers.buildingLayer(renderContext({ detailLevel: "coarse", sampleBounds: cell.bounds, chunkId: `coarse-${cell.id}` }), features, heightInfo);
      layer.group.name = `S07 coarse sample ${cell.id}`;
      layer.group.userData.s07CoarseChunk = { id: cell.id, featureIds: cell.featureIds.slice() };
      world.s07CoarseGroup.add(layer.group);
      world.pickables.push(...(layer.pickables || []));
      world.s07CoarseChunks.set(cell.id, { group: layer.group, pickables: layer.pickables || [], buildings: layer.buildings || [], qa: layer.qa });
    }
  }

  function syncS07CoarseVisibility() {
    const fineVisible = state.solution.detail === "detailed" && ["overview", "buildings"].includes(state.mode);
    const active = fineVisible ? new Set(state.s07.chunks?.snapshot?.().active || []) : new Set();
    for (const [id, entry] of world.s07CoarseChunks) entry.group.visible = !active.has(id) && ["overview", "buildings", "elevation"].includes(state.mode);
  }

  function makeBuildings() {
    const sampleIds = state.s07.sampleIds || new Set();
    const source = state.data.buildings || [];
    const contextFeatures = state.s07.enabled ? source.filter(feature => !sampleIds.has(String(feature.id))) : source;
    world.buildingLayer = world.layers.buildingLayer(renderContext({ detailLevel: state.s07.enabled ? "coarse" : "standard", sampleBounds: state.s07.sampleBounds }), contextFeatures, heightInfo);
    world.buildings = world.buildingLayer.group;
    world.root.add(world.buildings);
    world.pickables.push(...world.buildingLayer.pickables);
    const sampleFeatures = source.filter(feature => sampleIds.has(String(feature.id)));
    const sampleModeledHeightCount = sampleFeatures.filter(feature => heightInfo(feature).modeled).length;
    const sampleProxyHeightCount = sampleFeatures.length - sampleModeledHeightCount;
    const renderedTotal = world.buildingLayer.qa.buildingCount + sampleIds.size;
    state.objectCounts.buildings = renderedTotal;
    state.diagnostics.buildingGeometry = {
      ...world.buildingLayer.qa,
      baseBuildingCount: world.buildingLayer.qa.buildingCount,
      renderedTotal,
      sourceCount: source.length,
      s07SampleExcludedFromBase: sampleIds.size,
      s07BaseContextCount: contextFeatures.length,
      s07SampleModeledHeightCount: sampleModeledHeightCount,
      s07SampleProxyHeightCount: sampleProxyHeightCount,
      modeledHeightCountTotal: world.buildingLayer.qa.modeledHeightCount + sampleModeledHeightCount,
      proxyHeightCountTotal: world.buildingLayer.qa.proxyHeightCount + sampleProxyHeightCount,
      sourceHeightNullCountTotal: source.filter(v => v.source_height_m == null).length,
    };
    const normalMesh = world.buildingLayer.pickables.find(v => v.geometry);
    state.diagnostics.buildingTopNormalY = normalMesh ? measureTopNormalY(normalMesh.geometry) : null;
    // Verification uses real THREE terrain ray intersections independently from construction sampler.
    state.diagnostics.grounding = world.layers.groundQA(world.THREE, world.terrain, world.buildingLayer.foundations);
  }

  function pathPoints(raw) {
    return (raw || []).map(localPoint).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z));
  }

  function simplifyPoints(points, limit) {
    if (!limit || points.length <= limit) return points;
    const step = Math.ceil(points.length / limit);
    const simplified = points.filter((_, index) => index % step === 0);
    const last = points[points.length - 1];
    if (simplified[simplified.length - 1] !== last) simplified.push(last);
    return simplified;
  }

  function makeTubeLayer(features, options) {
    const THREE = world.THREE;
    const entries = [];
    const limited = (features || []).slice(0, options.maxFeatures || (features || []).length);
    for (const feature of limited) {
      const pts = simplifyPoints(pathPoints(feature.path_local_m || feature.path_m || feature.path || feature.points || feature.local_path || feature.ring || feature.polygon), options.pointLimit || 32);
      if (pts.length < 2) continue;
      const vectors = pts.map((point) => {
        const baseElevation = world.groundSampler(point.x, point.z);
        const y = worldY(baseElevation) + options.lift;
        recordAnchorAt(point.x, point.z, y - options.lift);
        return new THREE.Vector3(point.x, y, point.z);
      });
      const curve = new THREE.CatmullRomCurve3(vectors, false, "centripetal", 0.25);
      const radius = Math.max(options.minRadius, num(feature.width_proxy_m, options.radius) * options.radiusScale);
      const geometry = new THREE.TubeGeometry(curve, Math.max(6, Math.min(48, vectors.length * 2)), radius, options.radialSegments || 4, false);
      entries.push({
        geometry,
        color: new THREE.Color(options.color),
        feature: {
          type: options.type,
          title: feature.name || feature.id || feature.osm_id || options.type,
          method: options.method,
          date: feature.data_date || options.date,
          resolution: feature.class || feature.type || options.resolution,
          limitation: options.limitation,
        },
      });
    }
    if (!entries.length) return null;
    const geometry = mergeNonIndexed(entries);
    const material = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: options.opacity, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = options.type;
    mesh.userData.kind = options.kind;
    mesh.userData.renderedFeatures = entries.length;
    world.pickables.push(mesh);
    world.root.add(mesh);
    return mesh;
  }

  function makeLineLayers() {
    const roadContext = renderContext(); roadContext.buildings = world.buildingLayer.buildings;
    world.roadLayer = world.layers.roadLayer(roadContext, state.data.roads || []);
    world.roads = world.roadLayer.group;
    world.root.add(world.roads); world.pickables.push(...world.roadLayer.pickables);
    state.diagnostics.roads = world.roadLayer.qa;
    state.diagnostics.roadGrounding = world.layers.groundQA(world.THREE, world.terrain, world.layers.geometryGroundSamples(world.roadLayer.surfaceMesh, 6), 1, .07, "road");
    const waterLayer = world.layers.roadLayer(renderContext(), state.data.osm_water || [], { water: true });
    world.osmWater = waterLayer.group; world.root.add(world.osmWater); world.pickables.push(...waterLayer.pickables);
    state.diagnostics.osmWater = waterLayer.qa;
    state.diagnostics.waterGrounding = world.layers.groundQA(world.THREE, world.terrain, world.layers.geometryGroundSamples(waterLayer.surfaceMesh, 6), 1, .07, "water");
    const ctx = renderContext();
    ctx.waterSegments = (state.data.osm_water || []).flatMap(f => {
      const p = pathPoints(f.path_local_m || []);
      return p.slice(1).map((v, i) => ({ a: p[i], b: v, width: num(f.width_proxy_m, 8) }));
    });
    world.vegetationLayer = world.layers.vegetationLayer(ctx, world.buildingLayer.buildings, world.roadLayer.segments, state.visualData?.eth_canopy_field_10m, state.data.jrc_water_cells);
    world.root.add(world.vegetationLayer.group);
    state.diagnostics.vegetation = world.vegetationLayer.qa;
    if (state.s07.surface?.enrichVegetation && state.s07.sampleBounds) {
      try {
        world.s07Vegetation = state.s07.surface.enrichVegetation(renderContext({ detailLevel: "fine", sampleBounds: state.s07.sampleBounds }), world.vegetationLayer, { budget: 96, sampleBounds: state.s07.sampleBounds });
        if (world.s07Vegetation?.group) world.root.add(world.s07Vegetation.group);
        state.diagnostics.s07Vegetation = world.s07Vegetation?.qa || null;
      } catch (error) {
        state.s07.errors.push(`vegetation: ${error.message}`);
      }
    }
  }

  function makeCanopy() {
    const THREE = world.THREE;
    const field = state.visualData?.eth_canopy_field_10m || null;
    const heightRows = field?.height_grid_u8_rows || null;
    const uncertaintyRows = field?.uncertainty_grid_u8_rows || null;
    const dims = field?.dimensions || [];
    const rows = num(dims[1], Array.isArray(heightRows) ? heightRows.length : 0);
    const cols = num(dims[0], Array.isArray(heightRows?.[0]) ? heightRows[0].length : 0);
    const nodata = num(field?.source_nodata, 255);
    state.diagnostics.canopy.sourceSamples = state.data.canopy_samples?.length || 0;
    state.diagnostics.canopy.coneCount = 0;
    if (!Array.isArray(heightRows) || rows < 2 || cols < 2 || !world.terrain?.geometry) return;
    const bounds = field.edge_bounds_scene_m?.bounds_m || [world.terrainExtent.xMin, world.terrainExtent.zMin, world.terrainExtent.xMax, world.terrainExtent.zMax];
    const west = num(bounds[0], world.terrainExtent.xMin);
    const south = num(bounds[1], world.terrainExtent.zMin);
    const east = num(bounds[2], world.terrainExtent.xMax);
    const north = num(bounds[3], world.terrainExtent.zMax);
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(cols, rows);
    const color = new THREE.Color();
    let offset = 0;
    let validPixels = 0;
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        const hRaw = num(heightRows[r]?.[c], nodata);
        const sdRaw = num(uncertaintyRows?.[r]?.[c], 0);
        if (hRaw === nodata) {
          image.data[offset + 3] = 0;
        } else {
          validPixels += 1;
          color.setHSL(0.30, Math.max(0.38, 0.76 - sdRaw * 0.022), Math.min(0.68, 0.24 + hRaw * 0.018));
          image.data[offset] = Math.round(color.r * 255);
          image.data[offset + 1] = Math.round(color.g * 255);
          image.data[offset + 2] = Math.round(color.b * 255);
          image.data[offset + 3] = 190;
        }
        offset += 4;
      }
    }
    ctx.putImageData(image, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace || undefined;
    texture.anisotropy = Math.min(8, world.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
    const sourcePos = world.terrain.geometry.getAttribute("position");
    const sourceIndex = world.terrain.geometry.index;
    const positions = [];
    const uvs = [];
    const vertexMap = new Map();
    const indices = [];
    function uvFor(x, z) {
      return {
        u: (x - west) / Math.max(0.001, east - west),
        v: (north - z) / Math.max(0.001, north - south),
      };
    }
    function insideUv(uv) {
      return uv.u >= 0 && uv.u <= 1 && uv.v >= 0 && uv.v <= 1;
    }
    function mappedVertex(oldIndex) {
      if (vertexMap.has(oldIndex)) return vertexMap.get(oldIndex);
      const x = sourcePos.getX(oldIndex);
      const y = sourcePos.getY(oldIndex) + 0.8;
      const z = sourcePos.getZ(oldIndex);
      const uv = uvFor(x, z);
      const next = positions.length / 3;
      vertexMap.set(oldIndex, next);
      positions.push(x, y, z);
      uvs.push(uv.u, uv.v);
      return next;
    }
    for (let i = 0; i < sourceIndex.count; i += 3) {
      const a = sourceIndex.getX(i);
      const b = sourceIndex.getX(i + 1);
      const c = sourceIndex.getX(i + 2);
      const auv = uvFor(sourcePos.getX(a), sourcePos.getZ(a));
      const buv = uvFor(sourcePos.getX(b), sourcePos.getZ(b));
      const cuv = uvFor(sourcePos.getX(c), sourcePos.getZ(c));
      if (!insideUv(auv) || !insideUv(buv) || !insideUv(cuv)) continue;
      indices.push(mappedVertex(a), mappedVertex(b), mappedVertex(c));
    }
    if (!indices.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.userData.heightRows = heightRows;
    geometry.userData.uncertaintyRows = uncertaintyRows;
    geometry.userData.nodata = nodata;
    geometry.userData.frame = { west, south, east, north, rows, cols };
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.72,
      side: THREE.FrontSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "ETH canopy continuous raster texture";
    mesh.renderOrder = 3;
    mesh.userData.kind = "canopy";
    world.canopy = mesh;
    world.pickables.push(mesh);
    world.root.add(mesh);
    state.objectCounts.canopy = validPixels;
    state.diagnostics.canopy.representation = "continuous_raster_texture_field";
    state.diagnostics.canopy.renderedPrimitive = "dem_geometry_texture_mesh";
    state.diagnostics.canopy.renderedVertices = positions.length / 3;
    state.diagnostics.canopy.renderedTriangles = indices.length / 3;
    state.diagnostics.canopy.fieldWidth = cols;
    state.diagnostics.canopy.fieldHeight = rows;
    state.diagnostics.canopy.validPixels = field.height_stats?.valid_pixels || validPixels;
    state.diagnostics.canopy.nodataPixels = field.height_stats?.nodata_pixels || (rows * cols - validPixels);
  }

  function makeWaterCells() {
    const cells = state.data.jrc_water_cells || [], qa = {};
    for (const [field, kind, metric] of [
      ["jrcOccurrence", "water-occurrence", "occurrence_percent"],
      ["jrcSeasonality", "water-seasonality", "seasonality_2024_months"],
      ["jrcChange", "water-change", "normalized_change_percent"],
    ]) {
      const layer = world.layers.rasterEvidenceLayer(renderContext(), cells, metric, kind);
      world[field] = layer.mesh; world.root.add(layer.mesh); world.pickables.push(layer.mesh); qa[kind] = layer.qa;
    }
    state.diagnostics.jrcCoverage = qa;
    state.objectCounts.jrcWaterCells = cells.length;
  }

  function measureTopNormalY(geometry) {
    const pos = geometry.getAttribute("position");
    const normal = geometry.getAttribute("normal");
    if (!pos || !normal) return null;
    let maxY = -Infinity;
    for (let i = 0; i < pos.count; i += 1) maxY = Math.max(maxY, pos.getY(i));
    let sum = 0;
    let count = 0;
    for (let i = 0; i < pos.count; i += 3) {
      const y0 = pos.getY(i);
      const y1 = pos.getY(i + 1);
      const y2 = pos.getY(i + 2);
      const n = (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3;
      const horizontal = Math.abs(y0 - y1) < 0.001 && Math.abs(y1 - y2) < 0.001;
      const atTop = Math.abs(y0 - maxY) < 0.01 && Math.abs(y1 - maxY) < 0.01 && Math.abs(y2 - maxY) < 0.01;
      if (horizontal && atTop && n > 0.2) {
        sum += n;
        count += 1;
      }
    }
    if (!count) {
      for (let i = 0; i < pos.count; i += 3) {
        const y0 = pos.getY(i);
        const y1 = pos.getY(i + 1);
        const y2 = pos.getY(i + 2);
        const n = (normal.getY(i) + normal.getY(i + 1) + normal.getY(i + 2)) / 3;
        if (Math.abs(y0 - y1) < 0.001 && Math.abs(y1 - y2) < 0.001 && n > 0.2) {
          sum += n;
          count += 1;
        }
      }
    }
    return count ? sum / count : null;
  }

  async function setupScene() {
    const THREE = world.THREE;
    world.scene = new THREE.Scene();
    world.scene.background = new THREE.Color("#c2d1d0");
    world.scene.fog = new THREE.FogExp2("#c2d1d0", 0.00007);
    world.root = new THREE.Group();
    world.scene.add(world.root);
    world.camera = new THREE.PerspectiveCamera(48, 1, 1, 8000);
    world.raycaster = new THREE.Raycaster();
    world.pointer = new THREE.Vector2();
    const ambient = new THREE.HemisphereLight("#f0f4fa", "#797f61", 1.55);
    world.scene.add(ambient);
    const sun = new THREE.DirectionalLight("#fff4c7", 2.2);
    sun.position.set(-500, 1400, 760);
    world.scene.add(sun);
    world.sun = sun;
    world.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    world.renderer.setPixelRatio(Math.min(DPR_CAP, window.devicePixelRatio || 1));
    world.renderer.outputColorSpace = THREE.SRGBColorSpace || world.renderer.outputColorSpace;
    world.renderer.toneMapping = THREE.ACESFilmicToneMapping || THREE.LinearToneMapping;
    world.renderer.toneMappingExposure = 1.04;
    dom.scene.replaceChildren(world.renderer.domElement);
    world.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    world.renderer.domElement.tabIndex = 0;
    world.renderer.domElement.setAttribute("aria-label", "Bản đồ Gia Lộc 3D: kéo để xoay, cuộn để zoom, Q/E xoay và R về tổng quan");
    world.controls.target = new THREE.Vector3(0, 0, 0);
    await makeTerrain();
    updateFogForExtent();
    await prepareS07Chunks();
    makeBuildings();
    updateS07Chunks(false);
    makeLineLayers();
    makeCanopy();
    makeWaterCells();
    state.solution.ready = true;
    resetCamera();
    resize();
  }

  function resetCamera() {
    const extent = world.terrainExtent;
    world.controls.target.set(0, Math.max(0, extent.mean * extent.exag), 0);
    world.controls.radius = Math.max(extent.width, extent.depth) * 0.58;
    world.controls.theta = -0.68;
    world.controls.phi = 0.96;
    updateCamera();
    state.solution.focus = null;
    publishSolutionState();
    state.needsRender = true;
  }

  function updateCamera() {
    const c = world.controls;
    const sinPhi = Math.sin(c.phi);
    world.camera.position.set(
      c.target.x + c.radius * sinPhi * Math.sin(c.theta),
      c.target.y + c.radius * Math.cos(c.phi),
      c.target.z + c.radius * sinPhi * Math.cos(c.theta)
    );
    world.camera.lookAt(c.target);
    world.vegetationLayer?.updateLOD(c.target, c.radius);
    world.s07Vegetation?.updateLOD?.(c.target, c.radius, false);
    if (world.buildingLayer?.detailMesh) world.buildingLayer.detailMesh.visible = state.solution.detail === "detailed" && c.radius < 850 && state.mode !== "elevation";
    updateS07Chunks(false);
    if (dom.northNeedle) dom.northNeedle.style.transform = `rotate(${(-c.theta).toFixed(3)}rad)`;
  }

  function setVisible(object, visible) {
    if (object) object.visible = visible;
  }

  function isRaycastVisible(object) {
    let current = object;
    while (current) {
      if (current.visible === false) return false;
      current = current.parent;
    }
    return true;
  }

  function setOpacity(mesh, opacity) {
    mesh?.traverse(v => { for (const material of (Array.isArray(v.material) ? v.material : v.material ? [v.material] : [])) {
      material.opacity = opacity; material.transparent = opacity < 1;
      material.depthWrite = opacity > .5; material.needsUpdate = true;
    } });
  }

  function applyMode(mode) {
    state.mode = MODES[mode] ? mode : "overview";
    document.body.dataset.mode = state.mode;
    const cfg = MODES[state.mode];
    if (dom.modeTitle) dom.modeTitle.textContent = cfg.title;
    if (dom.modeCopy) dom.modeCopy.textContent = cfg.copy;
    const metrics = modeMetrics(state.mode);
    const metricLabels = modeMetricLabels(state.mode);
    [dom.metricA, dom.metricB, dom.metricC].forEach((node, index) => {
      if (node) node.textContent = metrics[index] || "—";
    });
    [dom.metricLabelA, dom.metricLabelB, dom.metricLabelC].forEach((node, index) => {
      if (node) node.textContent = metricLabels[index] || "";
    });
    document.querySelectorAll("button[data-mode]").forEach((button) => {
      const active = button.dataset.mode === state.mode;
      button.classList.remove("active");
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
    setVisible(world.buildings, ["overview", "buildings", "elevation"].includes(state.mode));
    setVisible(world.roads, state.mode !== "canopy");
    setVisible(world.osmWater, ["overview", "water", "change"].includes(state.mode));
    setVisible(world.canopy, state.mode === "canopy");
    setVisible(world.jrcOccurrence, state.mode === "water");
    setVisible(world.jrcSeasonality, state.mode === "water");
    setVisible(world.jrcChange, state.mode === "change");
    setOpacity(world.buildings, state.mode === "elevation" ? 0.28 : 1);
    setVisible(world.buildingLayer?.detailMesh, state.solution.detail === "detailed" && world.controls.radius < 850 && state.mode !== "elevation");
    setVisible(world.s07FineGroup, state.solution.detail === "detailed" && ["overview", "buildings"].includes(state.mode));
    syncS07CoarseVisibility();
    setOpacity(world.s07CoarseGroup, state.mode === "elevation" ? 0.28 : 1);
    setOpacity(world.s07FineGroup, state.mode === "elevation" ? 0.28 : 1);
    setVisible(world.vegetationLayer?.group, state.solution.detail === "detailed" && ["overview", "buildings"].includes(state.mode));
    setVisible(world.s07Vegetation?.group, state.solution.detail === "detailed" && ["overview", "buildings"].includes(state.mode));
    updateS07Chunks(false);
    setOpacity(world.canopy, state.mode === "canopy" ? 0.68 : 0.22);
    if (world.terrainMaterial) {
      world.terrainMaterial.wireframe = state.mode === "elevation";
      world.terrainMaterial.opacity = state.mode === "elevation" ? 0.88 : 1;
      world.terrainMaterial.transparent = state.mode === "elevation";
      world.terrainMaterial.needsUpdate = true;
    }
    updateDisclosure();
    mirrorProbe();
    state.needsRender = true;
  }

  function updateDisclosure() {
    if (!dom.disclosure) return;
    const extent = world.terrainExtent;
    const terrain = state.solution.terrain === "gedtm" ? "GEDTM30 dự đoán 2006–2015, EGM2008, thử nghiệm" : "COPDEM DSM; hệ cao nguồn chưa xác minh tại chỗ";
    const models = state.solutionData?.buildings || [];
    const qualified = models.filter(world.layers.acceptedGoogle).length;
    const heights = state.solution.heights === "google" ? `Google 2023: ${qualified} đủ mẫu, ${(state.data?.buildings?.length || 0) - qualified} dùng xấp xỉ; chưa đo` : "Cao xấp xỉ theo diện tích; chưa đo";
    const geometry = state.diagnostics.buildingGeometry;
    const coverage = geometry ? `Hiện ${geometry.renderedTotal || geometry.buildingCount}/${geometry.sourceCount} footprint; ${geometry.excludedCount} ngoài terrain` : "";
    dom.disclosure.textContent = [
      "AOI mẫu, không phải ranh chính thức.",
      `${terrain}, 30 m, ${extent.exag.toFixed(2)}×.`,
      heights + ".", coverage + ".",
      state.solution.detail === "detailed" ? "Mái/cửa/cây đồ họa mô phỏng; RGB Sentinel 10 m." : "Chế độ dữ liệu; RGB Sentinel 10 m.",
      "Không LiDAR, ảnh 1 cm hay mô hình ngập.",
      state.solution.error ? "Lớp bổ sung chưa sẵn sàng, dùng nguồn dự phòng." : "",
    ].filter(Boolean).join(" ");
  }

  function populateSources() {
    if (!dom.sourceDrawer) return;
    const sources = (state.data.sources || []).slice();
    if (state.solutionData) sources.push(
      { product: "GEDTM30 · nền dự đoán", date: "2006–2015 · v1.2", resolution: "1 arc-sec (~30 m), EGM2008", provenance: "CC BY 4.0 · thử nghiệm; 217 nút rìa dùng nearest valid edge support, không khảo sát đất trần", path: "derived/solution/solution-data.json" },
      { product: "Google Open Buildings 2.5D · chiều cao mô hình", date: "30/06/2023", resolution: "Grid gốc 0,5 m · hiệu dụng 4 m; không phải ảnh RGB", provenance: "CC BY 4.0; 482 đủ support /175 xấp xỉ, thresholds chưa kiểm định địa phương; chiều cao đo vẫn thiếu", path: "derived/solution/solution-qa.json" },
      { product: "Roadmap C05 và nguồn sơ cấp", date: "14/09/2026", resolution: "Phân biệt quan sát, mô hình và độ chính xác", provenance: "Mái/cửa/màu/cây đồ họa chưa được quan sát", path: "tayninh-imagery-campaign-05/research/techniques.md" },
    );
    const html = `<div class="engine-source-list"><h2>Nguồn dữ liệu</h2>${sources.map((source) => {
      const href = source.path ? (/^tayninh-data-batch-\d+\//.test(source.path) ? `../${source.path}` : resolveAsset(source.path)) : null;
      return `
      <article>
        <strong>${escapeHtml(source.product || source.title || source.path || "Nguồn")}</strong>
        <p>${escapeHtml(source.date || source.data_date || "—")} · ${escapeHtml(source.resolution || "—")}</p>
        <p>${escapeHtml(source.provenance || source.license || "—")}</p>
        <p>${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">evidence/path</a>` : "evidence/path"} <code>${escapeHtml(source.path || "")}</code></p>
      </article>`;
    }).join("") || "<p>Scene-data chưa liệt kê nguồn.</p>"}
    ${state.solutionData ? `<details><summary>Hồ sơ kỹ thuật S06 · nguồn và dấu vân tay</summary>
      <p>Đối chiếu SHA-256 được thực hiện khi biên dịch; trình duyệt kiểm cấu trúc và điều kiện sử dụng.</p>
      <pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(JSON.stringify({
        schema: state.solutionData.schema, frame: state.solutionData.frame,
        terrain: Object.fromEntries(Object.entries(state.solutionData.terrain_profiles).map(([k, p]) => [k, { kind: p.kind, epoch: p.epoch, crs: p.source_metadata.crs, vertical_datum: p.vertical_datum, grid: [p.cols, p.rows], bounds: p.source_metadata.bounds, nodata_policy: "only validity===true finite nodes; incomplete GEDTM disabled", resolution: p.source_metadata.native_resolution_m_approx || "30 m nominal", rights: p.source_metadata.license || p.source_metadata.rights, resampling: p.source_metadata.resampling, quality: p.source_metadata.use_recommendation || "baseline source limits inherited", statistics: p.statistics, coverage: p.coverage }])),
        google: { kind: "modelled", date: "2023-06-30", measured_height: false, source_height_m: null, manifest: state.solutionProvenance?.googleManifest, quality: state.solutionProvenance?.googleQa, accepted_buildings: state.solutionData.qa_summary.google_model_heights_accepted, fallback_buildings: state.solutionData.qa_summary.google_model_heights_proxy, height_policy: "explicit accepted support + consistent flags; total envelope including generic roof" },
        future_adapter: state.solutionData.future_data_adapter,
      }, null, 2))}</pre>
      ${Object.entries(state.solutionData.source_fingerprints).map(([p, h]) => `<p><a href="${escapeHtml(resolveAsset(p))}" target="_blank" rel="noreferrer">${escapeHtml(p)}</a><br><code style="overflow-wrap:anywhere">${escapeHtml(h)}</code></p>`).join("")}
      </details>` : `<p>${escapeHtml(state.solution.error || "Lớp bổ sung chưa có; COPDEM và chiều cao xấp xỉ đang được dùng.")}</p>`}</div>`;
    const slot = dom.sourceDrawer.querySelector("[data-source-list]") || dom.sourceDrawer.querySelector(".source-list");
    if (slot) slot.innerHTML = html;
    else dom.sourceDrawer.insertAdjacentHTML("beforeend", html);
  }

  function escapeHtml(value) {
    return String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  function inspectPayload(hit) {
    const obj = hit.object;
    const feature = obj.geometry?.userData?.triangleToFeature?.[hit.faceIndex];
    if (feature) return feature;
    if (obj === world.terrain) return obj.userData.inspect;
    if (obj === world.buildings) return obj.geometry.userData.triangleToFeature?.[hit.faceIndex] || null;
    if (obj === world.roads || obj === world.osmWater) return obj.geometry.userData.triangleToFeature?.[hit.faceIndex] || null;
    if (obj === world.canopy) {
      const frame = obj.geometry.userData.frame;
      const u = frame ? (hit.point.x - frame.west) / Math.max(0.001, frame.east - frame.west) : -1;
      const v = frame ? (frame.north - hit.point.z) / Math.max(0.001, frame.north - frame.south) : -1;
      const px = Math.max(0, Math.min((frame?.cols || 1) - 1, Math.floor(u * (frame?.cols || 1))));
      const py = Math.max(0, Math.min((frame?.rows || 1) - 1, Math.floor(v * (frame?.rows || 1))));
      const height = obj.geometry.userData.heightRows?.[py]?.[px];
      if (!Number.isFinite(height) || height === obj.geometry.userData.nodata) return null;
      const sd = obj.geometry.userData.uncertaintyRows?.[py]?.[px];
      return {
        type: "Bề mặt tán cây",
        title: "ETH canopy 2020 — ô raster liên tục",
        method: "Bề mặt mô hình hóa bám địa hình; không phải cây riêng lẻ.",
        date: "2020",
        resolution: `${num(height, 0).toFixed(1)} m độ cao mô hình · bất định ${num(sd, 0).toFixed(1)} m`,
        limitation: "Trường độ cao/bất định tán cây; không phải kiểm kê từng cây hay LiDAR.",
      };
    }
    if ([world.jrcOccurrence, world.jrcSeasonality, world.jrcChange].includes(obj)) return obj.userData.cells?.[hit.instanceId] || null;
    return obj.userData.inspect || null;
  }

  function showInspector(payload) {
    if (!payload || !dom.inspector || !dom.inspectorBody) return;
    if (dom.sourceDrawer) dom.sourceDrawer.hidden = true;
    dom.inspector.hidden = false;
    renderInspectorPayload(payload);
  }

  function renderInspectorPayload(payload) {
    if (!payload || !dom.inspectorBody) return;
    state.activeSelection = payload;
    dom.inspectorBody.innerHTML = `
      <h3>${escapeHtml(payload.title || payload.type || "Đối tượng")}</h3>
      <dl>
        <dt>Loại</dt><dd>${escapeHtml(payload.type)}</dd>
        <dt>Phương pháp</dt><dd>${escapeHtml(payload.method)}</dd>
        <dt>Thời gian</dt><dd>${escapeHtml(payload.date)}</dd>
        <dt>Độ phân giải / giá trị</dt><dd>${escapeHtml(payload.resolution)}</dd>
        <dt>Giới hạn</dt><dd>${escapeHtml(payload.limitation)}</dd>
      </dl>`;
  }

  function onPointerDown(event) {
    if (state.touring) toggleTour();
    world.controls.dragging = true;
    world.controls.panning = event.button === 2 || event.shiftKey;
    world.controls.lastX = event.clientX;
    world.controls.lastY = event.clientY;
    world.controls.startX = event.clientX;
    world.controls.startY = event.clientY;
    world.renderer.domElement.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!world.controls.dragging) return;
    const dx = event.clientX - world.controls.lastX;
    const dy = event.clientY - world.controls.lastY;
    world.controls.lastX = event.clientX;
    world.controls.lastY = event.clientY;
    if (world.controls.panning) {
      const panScale = world.controls.radius * 0.0018;
      world.controls.target.x -= Math.cos(world.controls.theta) * dx * panScale;
      world.controls.target.z += Math.sin(world.controls.theta) * dx * panScale;
      world.controls.target.y += dy * panScale;
    } else {
      world.controls.theta -= dx * 0.005;
      world.controls.phi = Math.min(1.42, Math.max(0.24, world.controls.phi + dy * 0.004));
    }
    updateCamera();
    state.needsRender = true;
  }

  function onPointerUp(event) {
    const moved = Math.abs(event.clientX - world.controls.startX) + Math.abs(event.clientY - world.controls.startY);
    world.controls.dragging = false;
    world.renderer.domElement.releasePointerCapture?.(event.pointerId);
    if (moved < 3) pick(event);
  }

  function pick(event) {
    const rect = world.renderer.domElement.getBoundingClientRect();
    world.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    world.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    world.raycaster.setFromCamera(world.pointer, world.camera);
    const candidates = world.pickables.filter(isRaycastVisible);
    const hits = world.raycaster.intersectObjects(candidates, false);
    for (const hit of hits) {
      const payload = inspectPayload(hit);
      if (payload) {
        showInspector(payload);
        break;
      }
    }
  }

  function onWheel(event) {
    event.preventDefault();
    if (state.touring) toggleTour();
    const factor = Math.exp(event.deltaY * 0.001);
    world.controls.radius = Math.min(5000, Math.max(80, world.controls.radius * factor));
    updateCamera();
    state.needsRender = true;
  }

  function onKey(event) {
    const target = event.target;
    if (target && (/^(input|textarea|select)$/i.test(target.tagName) || target.closest?.("[contenteditable=true]"))) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const step = world.controls.radius * 0.035;
    let handled = true;
    if (key === "r") resetCamera();
    else if (key === "t") toggleTour();
    else if (key === "h") toggleUI();
    else if (key === "+" || key === "=") world.controls.radius = Math.max(80, world.controls.radius * 0.88);
    else if (key === "-" || key === "_") world.controls.radius = Math.min(5000, world.controls.radius * 1.14);
    else if (key === "q") world.controls.theta += 0.08;
    else if (key === "e") world.controls.theta -= 0.08;
    else if (key === "arrowleft" || key === "a") world.controls.target.x -= step;
    else if (key === "arrowright" || key === "d") world.controls.target.x += step;
    else if (key === "arrowup" || key === "w") world.controls.target.z -= step;
    else if (key === "arrowdown" || key === "s") world.controls.target.z += step;
    else handled = false;
    if (!handled) return;
    event.preventDefault();
    if (state.touring && key !== "t") toggleTour();
    updateCamera();
    state.needsRender = true;
  }

  function resize() {
    const rect = dom.scene.getBoundingClientRect();
    const width = Math.max(320, rect.width || window.innerWidth);
    const height = Math.max(240, rect.height || window.innerHeight);
    world.camera.aspect = width / height;
    world.camera.updateProjectionMatrix();
    world.renderer.setSize(width, height, false);
    state.needsRender = true;
  }

  function toggleTour() {
    state.touring = !state.touring;
    state.tourStarted = performance.now();
    if (dom.tour) dom.tour.setAttribute("aria-pressed", state.touring ? "true" : "false");
  }

  function toggleUI() {
    state.hiddenUI = !state.hiddenUI;
    if (dom.uiShell) dom.uiShell.classList.toggle("ui-hidden", state.hiddenUI);
    mirrorProbe();
    state.needsRender = true;
  }

  function wireUi() {
    document.addEventListener("click", event => {
      const s07Button = event.target.closest?.("[data-s07-command]");
      if (s07Button) {
        const command = s07Button.dataset.s07Command;
        if (command === "validate-importer" || command === "validate-glb") { event.preventDefault(); handleS07ImporterCommand(command); return; }
        solutionCommand({ command, value: s07Button.dataset.s07Value ?? s07Button.value }); return;
      }
      const button = event.target.closest?.("[data-solution-command]");
      if (button) solutionCommand({ command: button.dataset.solutionCommand, value: button.dataset.solutionValue ?? button.value });
    });
    window.addEventListener("b04:solution-command", event => solutionCommand(event.detail));
    window.addEventListener("b04:solution-request-state", publishSolutionState);
    window.addEventListener("b04:debug-optical", () => { state.captureOptical = true; state.needsRender = true; });
    document.querySelectorAll("button[data-mode]").forEach((button) => {
      button.addEventListener("click", () => applyMode(button.dataset.mode));
    });
    dom.tour?.addEventListener("click", toggleTour);
    dom.resetView?.addEventListener("click", resetCamera);
    dom.toggleUI?.addEventListener("click", toggleUI);
    dom.sourceToggle?.addEventListener("click", () => {
      if (dom.sourceDrawer) dom.sourceDrawer.hidden = false;
      if (dom.inspector) dom.inspector.hidden = true;
    });
    dom.sourceClose?.addEventListener("click", () => { if (dom.sourceDrawer) dom.sourceDrawer.hidden = true; });
    dom.inspectorClose?.addEventListener("click", () => { if (dom.inspector) dom.inspector.hidden = true; });
    const canvas = world.renderer.domElement;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (event) => event.preventDefault());
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pagehide", event => {
      if (event.persisted) return;
      state.s07.chunks?.dispose?.();
      state.s07.materialLibrary?.dispose?.();
      state.s07.surface?.disposeSharedTextures?.(world.THREE);
      world.layers.dispose(world.root, true);
      world.textureCache.forEach(texture => texture.dispose());
      world.layers.disposeTextureLibrary(world.THREE); world.renderer.dispose();
    }, { once: true });
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (state.touring) {
      const elapsed = (now - state.tourStarted) / 1000;
      world.controls.theta -= Math.min(.05, (now - (state.previousAnimationAt || now)) / 1000) * .16;
      if (elapsed > 5.5) {
        const keys = Object.keys(MODES);
        applyMode(keys[(keys.indexOf(state.mode) + 1) % keys.length]);
        state.tourStarted = now;
      }
      updateCamera();
      state.needsRender = true;
    }
    if (state.needsRender || state.touring) {
      const cpuStarted = performance.now();
      world.renderer.render(world.scene, world.camera);
      state.perf.renderCpuMs.push(performance.now() - cpuStarted);
      if (state.perf.renderCpuMs.length > 90) state.perf.renderCpuMs.shift();
      state.perf.renders++; state.perf.idle = false;
      recordRenderRate(now);
      if (state.perf.renders === 1 || state.captureOptical) { updateLitPixelRatio(now, true); state.captureOptical = false; }
      state.needsRender = false;
      mirrorProbeThrottled(now);
    } else if (!state.touring && dom.fps && state.lastFrame && now - state.lastFrame > 1000) {
      dom.fps.textContent = "Đứng yên";
      if (!state.perf.idle) { state.perf.idle = true; mirrorProbe(); }
    }
    state.previousAnimationAt = now;
  }

  function recordRenderRate(now) {
    state.frameCount += 1;
    if (!state.lastFrame) state.lastFrame = now;
    if (now - state.lastFrame > 500) {
      state.fps = Math.round(state.frameCount * 1000 / (now - state.lastFrame));
      state.frameCount = 0;
      state.lastFrame = now;
      if (dom.fps) dom.fps.textContent = state.fps < 2 && !state.touring ? "Đứng yên" : `${state.fps} renders/s`;
    }
  }

  function updateLitPixelRatio(now, force) {
    try {
      const canvas = world.renderer?.domElement;
      if (!canvas || !canvas.width || !canvas.height) return;
      if (!force && world.lastLitSampleAt && now && now - world.lastLitSampleAt < 1000) return;
      world.lastLitSampleAt = now || performance.now();
      if (!world.diagnosticCanvas) {
        world.diagnosticCanvas = document.createElement("canvas");
        world.diagnosticCanvas.width = 96;
        world.diagnosticCanvas.height = 54;
        world.diagnosticContext = world.diagnosticCanvas.getContext("2d", { willReadFrequently: true });
      }
      const sample = world.diagnosticCanvas;
      const ctx = world.diagnosticContext;
      if (!ctx) return;
      ctx.drawImage(canvas, 0, 0, sample.width, sample.height);
      const pixels = ctx.getImageData(0, 0, sample.width, sample.height).data;
      let lit = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const y = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        if (y > 24) lit += 1;
      }
      state.lastLitPixelRatio = lit / (sample.width * sample.height);
    } catch {
      state.lastLitPixelRatio = null;
    }
  }

  function buildProbePayload() {
    const timings = state.perf.renderCpuMs.slice().sort((a, b) => a - b);
    const quantile = q => timings.length ? Number(timings[Math.min(timings.length - 1, Math.floor(q * timings.length))].toFixed(3)) : null;
    return {
      schema: state.data?.schema || null,
      rendererReady: !!world.renderer,
      sceneReady: state.sceneReady,
      activeMode: state.mode,
      solution: solutionState(),
      architecture: { rendererModule: world.layers?.VERSION || null, sourceAdapterSchema: state.solutionData?.schema || null, s07: s07Probe(), adapter: state.diagnostics.adapter || null, nativeObservationsPreserved: true, geometryDetailModeled: true, proceduralMaterials: { modeled: true, nativeRgbModified: false, cachedTextures: world.layers && world.THREE ? world.layers.sharedTextures(world.THREE).length : 0, textureSize: [64, 64], mipmapped: true } },
      performance: { renders: state.perf.renders, idle: state.perf.idle, rebuildMs: Number(state.perf.rebuildMs.toFixed(2)), commandCount: state.perf.commandCount, drawCalls: world.renderer?.info?.render?.calls || 0, triangles: world.renderer?.info?.render?.triangles || 0, memory: world.renderer?.info?.memory || null, renderSubmitCpuMs: { samples: timings.length, median: quantile(.5), p95: quantile(.95), max: timings.length ? quantile(1) : null }, metricNote: "CPU/driver render submission timing; not GPU time or FPS guarantee. Idle counter should remain stable." },
      camera: world.camera ? {
        x: Number(world.camera.position.x.toFixed(2)),
        y: Number(world.camera.position.y.toFixed(2)),
        z: Number(world.camera.position.z.toFixed(2)),
        radius: Number(world.controls.radius.toFixed(2)),
      } : null,
      fpsText: dom.fps?.textContent || "",
      dpr: world.renderer?.getPixelRatio?.() || null,
      litPixelRatio: state.lastLitPixelRatio === null ? null : Number(state.lastLitPixelRatio.toFixed(4)),
      objectCounts: {
        buildings: state.objectCounts.buildings || 0,
        buildingsSource: state.data?.buildings?.length || 0,
        canopy: state.objectCounts.canopy || 0,
        canopyRenderedTriangles: state.diagnostics.canopy.renderedTriangles || 0,
        canopyConeCount: state.diagnostics.canopy.coneCount || 0,
        jrcWaterCells: state.objectCounts.jrcWaterCells || 0,
        sceneChildren: world.scene?.children?.length || 0,
        pickables: world.pickables.length,
        roadsRendered: world.roads?.userData?.renderedFeatures || 0,
        osmWaterRendered: world.osmWater?.userData?.renderedFeatures || 0,
      },
      anchoring: {
        samples: state.anchorStats.samples,
        minClearanceM: Number((Number.isFinite(state.anchorStats.minClearanceM) ? state.anchorStats.minClearanceM : 0).toFixed(4)),
        maxAbsClearanceM: Number(state.anchorStats.maxAbsClearanceM.toFixed(4)),
        verticalExaggeration: world.terrainExtent.exag,
        worldYApplied: state.anchorStats.samples > 0 && state.anchorStats.maxAbsClearanceM < 0.001,
      },
      visible: {
        buildings: !!world.buildings?.visible,
        canopy: !!world.canopy?.visible,
        roads: !!world.roads?.visible,
        osmWater: !!world.osmWater?.visible,
        jrcOccurrence: !!world.jrcOccurrence?.visible,
        jrcSeasonality: !!world.jrcSeasonality?.visible,
        jrcChange: !!world.jrcChange?.visible,
      },
      disclosureFlags: state.disclosureFlags,
      diagnostics: {
        topNormalY: state.diagnostics.buildingTopNormalY === null ? null : Number(state.diagnostics.buildingTopNormalY.toFixed(4)),
        northMappingOk: state.diagnostics.northMappingOk,
        fogDensity: state.diagnostics.fogDensity ? Number(state.diagnostics.fogDensity.toFixed(7)) : null,
        jrcGainCells: state.diagnostics.jrcGainCells,
        jrcLossCells: state.diagnostics.jrcLossCells,
        imagery: state.diagnostics.imagery,
        canopy: state.diagnostics.canopy,
        terrainFrame: state.diagnostics.terrainFrame,
        coordinateTransform: state.diagnostics.coordinateTransform,
        grounding: state.diagnostics.grounding,
        buildingGeometry: state.diagnostics.buildingGeometry,
        roads: state.diagnostics.roads,
        roadGrounding: state.diagnostics.roadGrounding,
        waterGrounding: state.diagnostics.waterGrounding,
        osmWater: state.diagnostics.osmWater,
        jrcCoverage: state.diagnostics.jrcCoverage,
        vegetation: state.diagnostics.vegetation,
        modeMetrics: modeMetrics(state.mode),
        metricLabels: modeMetricLabels(state.mode),
      },
      loadingHidden: !!dom.loading?.hidden,
      uiHidden: state.hiddenUI,
    };
  }

  function mirrorProbe() {
    if (!world.probeEl) return;
    const payload = buildProbePayload();
    const text = JSON.stringify(payload);
    world.probeEl.textContent = text;
    world.probeEl.dataset.probe = text;
    document.body.dataset.b04Probe = text;
    const experience = document.getElementById("experience");
    if (experience) experience.dataset.probe = text;
    world.lastProbeMirrorAt = performance.now();
  }

  function mirrorProbeThrottled(now) {
    if (!world.probeEl) return;
    if (!now || now - world.lastProbeMirrorAt >= 250) mirrorProbe();
  }

  function exposeProbe() {
    window.__B04_PROBE__ = function () {
      return buildProbePayload();
    };
    mirrorProbe();
  }

  async function boot() {
    initDom();
    exposeProbe();
    try {
      setLoading("Đang nạp Three.js cục bộ…");
      world.THREE = await loadThree();
      world.layers = await loadSolutionModule();
      setLoading("Đang nạp scene-data fusion…");
      state.data = await fetchJson(DATA_URL);
      setLoading("Đang kiểm tra visual-data native…");
      state.visualData = await fetchOptionalJson(VISUAL_URL);
      await loadSolutionData();
      recordDisclosureFlags(state.data);
      updateDiagnosticsFromData(state.data);
      setLoading("Đang dựng địa hình và lớp phân tích…");
      await setupScene();
      populateSources();
      wireUi();
      applyMode("overview");
      state.sceneReady = true;
      publishSolutionState();
      if (new URLSearchParams(window.location.search).get("focus") === "cluster") focusCluster();
      if (new URLSearchParams(window.location.search).get("s07") === "sample" && state.s07.sampleBounds) { const b = state.s07.sampleBounds; world.controls.target.set((b.west + b.east) / 2, worldY(world.groundSampler((b.west + b.east) / 2, (b.south + b.north) / 2)) + 20, (b.south + b.north) / 2); world.controls.radius = 310; applyMode("buildings"); updateCamera(); }
      const imagery = state.diagnostics.imagery;
      setLoading(imagery.ready ? "Sẵn sàng với texture Sentinel native" : "Sẵn sàng tạm thời với fallback 109×109; đang chờ visual-data native", true);
      state.needsRender = true;
      mirrorProbe();
      requestAnimationFrame(animate);
    } catch (error) {
      setLoading(`Không khởi động được engine: ${error.message}`, false);
      console.error("[B04 engine]", error);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
}());
