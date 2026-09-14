(function () {
  "use strict";

  window.__B04_PROBE__ = window.__B04_PROBE__ || function () {
    return { rendererReady: false, sceneReady: false, activeMode: "booting", objectCounts: { pickables: 0 } };
  };

  const DATA_URL = "derived/fusion/scene-data.json";
  const VISUAL_URL = "derived/visual/visual-data.json";
  const THREE_URL = "vendor/three.min.js";
  const DPR_CAP = 1.5;
  const MODES = {
    overview: {
      title: "Tổng quan 2.5D",
      copy: "Địa hình, công trình, thực vật từ ảnh Sentinel và thủy hệ được hợp nhất từ nguồn công khai đã đối chiếu nguồn.",
      metrics: ["DEM công khai", "dấu chân công trình", "AOI mẫu OSM"],
    },
    elevation: {
      title: "Phân tích cao độ",
      copy: "Địa hình DEM 30 m-class được phóng đứng có khai báo để đọc relief tốt hơn.",
      metrics: ["min/max/trung bình DEM", "phóng đứng", "không phải LiDAR"],
    },
    buildings: {
      title: "Công trình",
      copy: "Footprint Microsoft được extrude bằng proxy phân lớp theo diện tích vì nguồn không có chiều cao đo.",
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
  };

  function $(id) {
    return document.getElementById(id);
  }

  function initDom() {
    for (const id of [
      "scene", "tour", "resetView", "toggleUI", "sourceDrawer", "sourceToggle", "sourceClose",
      "inspector", "inspectorClose", "inspectorBody", "modeTitle", "modeCopy", "metricA",
      "metricB", "metricC", "metricLabelA", "metricLabelB", "metricLabelC", "fps", "loading", "loadingStatus", "disclosure", "northNeedle", "uiShell"
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
    const terrain = state.data?.terrain || {};
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
      buildings: [`${buildings.count ?? state.data?.buildings?.length ?? 0}`, `${buildings.source_height_null_count ?? 0} chưa đo`, "xấp xỉ"],
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
    if (/^tayninh-data-batch-\d+\//.test(path)) return new URL(`../${path}`, document.baseURI).href;
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
    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(resolveAsset(path), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace || undefined;
        texture.anisotropy = Math.min(8, world.renderer.capabilities.getMaxAnisotropy());
        resolve(texture);
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
    const terrain = data.terrain || {};
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
    const exag = num(terrain.vertical_exaggeration, num(data.statistics?.vertical_exaggeration, 1.35));
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
      title: "DEM + ảnh Sentinel",
      method: fallback ? "Ảnh nền tạm thời 109×109 từ scene-data; đang chờ UV texture native" : "Ảnh Sentinel native đã đăng ký theo pixel terrain",
      date: terrain.data_date || terrain.source?.date || "nguồn công khai",
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
          overlayPositions.push(positions[idx * 3], positions[idx * 3 + 1] + 0.45, positions[idx * 3 + 2]);
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
    world.scene.fog = new THREE.FogExp2("#0d211b", density);
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

  function makeBuildings() {
    const THREE = world.THREE;
    const buildings = state.data.buildings || [];
    const entries = [];
    for (const feature of buildings) {
      const raw = feature.footprint_local_m || feature.footprint_m || feature.footprint || feature.points || feature.local_points || [];
      let points = raw.map(localPoint).filter((point) => Number.isFinite(point.x) && Number.isFinite(point.z));
      if (points.length < 3) continue;
      if (signedAreaOf(points) > 0) points = points.slice().reverse();
      const c = centroid(points);
      const area = num(feature.area_m2, areaOf(points));
      const compiledBaseElevation = num(feature.base_elevation_m, null);
      const baseElevation = world.groundSampler(c.x, c.z);
      const base = worldY(baseElevation);
      const height = buildingHeight(feature, area);
      const shape = new THREE.Shape(points.map((point) => new THREE.Vector2(point.x, point.z)));
      let geometry;
      try {
        geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      } catch {
        continue;
      }
      const position = geometry.getAttribute("position");
      for (let i = 0; i < position.count; i += 1) {
        const x = position.getX(i);
        const z = position.getY(i);
        const y = base + position.getZ(i);
        position.setXYZ(i, x, y, z);
      }
      position.needsUpdate = true;
      recordAnchorAt(c.x, c.z, base);
      entries.push({
        geometry,
        color: colorForBuilding(height),
        feature: {
          type: "Building",
          title: feature.id || feature.source_id || "Microsoft footprint",
          method: feature.height_method || "area_class_proxy_no_source_height",
          date: feature.data_date || "Microsoft open buildings source",
          resolution: `${area.toFixed(0)} m² footprint · display height ${height.toFixed(1)} m · render base ${baseElevation.toFixed(2)} m${compiledBaseElevation === null ? "" : ` · compiled base ${compiledBaseElevation.toFixed(2)} m trace`}`,
          limitation: "Chiều cao là proxy phân lớp theo diện tích; không phải chiều cao đo.",
        },
      });
    }
    if (!entries.length) return;
    const geometry = mergeNonIndexed(entries);
    state.diagnostics.buildingTopNormalY = measureTopNormalY(geometry);
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.04,
      transparent: true,
      opacity: 0.9,
      side: THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = "Merged proxy buildings";
    mesh.userData.kind = "buildings";
    world.buildings = mesh;
    world.pickables.push(mesh);
    world.root.add(mesh);
    state.objectCounts.buildings = entries.length;
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
    world.roads = makeTubeLayer(state.data.roads, {
      type: "Road",
      kind: "roads",
      color: "#f1d08a",
      opacity: 0.86,
      radius: 2,
      radiusScale: 0.22,
      minRadius: 0.9,
      lift: 1.4,
      method: "OSM road path draped above terrain with width proxy",
      date: "OSM public extract",
      resolution: "vector path",
      limitation: "Không phải khảo sát giao thông chi tiết.",
      maxFeatures: 260,
      pointLimit: 28,
      radialSegments: 4,
    });
    world.osmWater = makeTubeLayer(state.data.osm_water || state.data.water, {
      type: "OSM water",
      kind: "osm_water",
      color: "#43c0d8",
      opacity: 0.8,
      radius: 4,
      radiusScale: 0.35,
      minRadius: 1.6,
      lift: 1.0,
      method: "OSM water geometry above terrain",
      date: "OSM public extract",
      resolution: "vector geometry",
      limitation: "Không phải mô hình thủy văn.",
      maxFeatures: 80,
      pointLimit: 48,
      radialSegments: 5,
    });
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
    const THREE = world.THREE;
    const cells = state.data.jrc_water_cells || [];
    if (!cells.length) return;
    function build(kind, metric, colorHex) {
      const geometry = new THREE.BoxGeometry(12, 0.8, 12);
      const material = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.45, depthWrite: false });
      const mesh = new THREE.InstancedMesh(geometry, material, cells.length);
      const dummy = new THREE.Object3D();
      const color = new THREE.Color(colorHex);
      for (let i = 0; i < cells.length; i += 1) {
        const cell = cells[i];
        const x = num(cell.x ?? cell.local_x, 0);
        const z = num(cell.z ?? cell.local_z, 0);
        const value = num(cell[metric], 0);
        const baseElevation = world.groundSampler(x, z);
        const base = worldY(baseElevation);
        dummy.position.set(x, base + 0.9 + Math.abs(value) * 0.018, z);
        recordAnchorAt(x, z, base);
        dummy.scale.set(1.0, Math.max(0.18, Math.abs(value) / 45), 1.0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        if (mesh.setColorAt) {
          if (metric === "normalized_change_percent") {
            color.set(value >= 0 ? "#39c6a3" : "#e08a3e").offsetHSL(0, 0, Math.min(0.22, Math.abs(value) / 360));
          } else {
            color.set(colorHex).offsetHSL(0, 0, Math.min(0.28, Math.abs(value) / 260));
          }
          mesh.setColorAt(i, color);
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.name = kind;
      mesh.userData.kind = kind;
      mesh.userData.cells = cells.map((cell, index) => ({
        type: "JRC water evidence",
        title: `${kind} cell ${index + 1}`,
        method: "JRC public raster cell draped on terrain as descriptive evidence",
        date: kind === "water-seasonality" ? "2024" : kind === "water-change" ? "1984–1999 / 2000–2024" : "1984–2024",
        resolution: `${metric}: ${num(cell[metric], 0).toFixed(1)}`,
        limitation: "Không phải độ sâu ngập hay mô hình thoát nước.",
      }));
      world.pickables.push(mesh);
      world.root.add(mesh);
      return mesh;
    }
    world.jrcOccurrence = build("water-occurrence", "occurrence_percent", "#2e9ed1");
    world.jrcSeasonality = build("water-seasonality", "seasonality_2024_months", "#43c0d8");
    world.jrcChange = build("water-change", "normalized_change_percent", "#d65aa2");
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
    world.scene.background = new THREE.Color("#0d211b");
    world.scene.fog = new THREE.FogExp2("#0d211b", 0.00009);
    world.root = new THREE.Group();
    world.scene.add(world.root);
    world.camera = new THREE.PerspectiveCamera(48, 1, 1, 8000);
    world.raycaster = new THREE.Raycaster();
    world.pointer = new THREE.Vector2();
    const ambient = new THREE.HemisphereLight("#f2fff6", "#31473e", 1.55);
    world.scene.add(ambient);
    const sun = new THREE.DirectionalLight("#fff4c7", 2.2);
    sun.position.set(-500, 1400, 760);
    world.scene.add(sun);
    world.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance", preserveDrawingBuffer: true });
    world.renderer.setPixelRatio(Math.min(DPR_CAP, window.devicePixelRatio || 1));
    world.renderer.outputColorSpace = THREE.SRGBColorSpace || world.renderer.outputColorSpace;
    world.renderer.toneMapping = THREE.ACESFilmicToneMapping || THREE.LinearToneMapping;
    world.renderer.toneMappingExposure = 1.15;
    dom.scene.replaceChildren(world.renderer.domElement);
    world.renderer.domElement.style.cssText = "display:block;width:100%;height:100%;touch-action:none";
    world.controls.target = new THREE.Vector3(0, 0, 0);
    await makeTerrain();
    updateFogForExtent();
    makeBuildings();
    makeLineLayers();
    makeCanopy();
    makeWaterCells();
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
    if (mesh?.material) {
      mesh.material.opacity = opacity;
      mesh.material.transparent = opacity < 1;
      mesh.material.needsUpdate = true;
    }
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
    setOpacity(world.buildings, state.mode === "buildings" ? 0.96 : state.mode === "elevation" ? 0.28 : 0.74);
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
    const base = [
      "AOI là vùng mẫu bbox từ dữ liệu mở, không phải ranh phường chính thức.",
      `DEM public context ${extent.min.toFixed(1)}–${extent.max.toFixed(1)} m, vertical exaggeration ${extent.exag.toFixed(2)}×.`,
      "Sentinel/JRC/ETH là bằng chứng viễn thám công khai; không phải LiDAR, ảnh 1 cm, đo cao công trình hay mô hình ngập.",
    ];
    if (state.mode === "buildings") base.push("Chiều cao công trình là area-class proxy vì source height null.");
    if (state.mode === "canopy") base.push("Canopy là bề mặt raster ETH 2020 liên tục; xanh sáng hơn là tán cây mô hình cao hơn, không phải cây riêng lẻ.");
    if (state.mode === "water" || state.mode === "change") base.push("Water/change là evidence mô tả và cần rà soát, không phải kết luận vận hành.");
    dom.disclosure.textContent = base.join(" ");
  }

  function populateSources() {
    if (!dom.sourceDrawer) return;
    const sources = state.data.sources || [];
    const html = `<div class="engine-source-list"><h2>Nguồn dữ liệu</h2>${sources.map((source) => {
      const href = source.path ? (/^tayninh-data-batch-\d+\//.test(source.path) ? `../${source.path}` : resolveAsset(source.path)) : null;
      return `
      <article>
        <strong>${escapeHtml(source.product || source.title || source.path || "Nguồn")}</strong>
        <p>${escapeHtml(source.date || source.data_date || "—")} · ${escapeHtml(source.resolution || "—")}</p>
        <p>${escapeHtml(source.provenance || source.license || "—")}</p>
        <p>${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">evidence/path</a>` : "evidence/path"} <code>${escapeHtml(source.path || "")}</code></p>
      </article>`;
    }).join("") || "<p>Scene-data chưa liệt kê nguồn.</p>"}</div>`;
    const slot = dom.sourceDrawer.querySelector("[data-source-list]") || dom.sourceDrawer.querySelector(".source-list");
    if (slot) slot.innerHTML = html;
    else dom.sourceDrawer.insertAdjacentHTML("beforeend", html);
  }

  function escapeHtml(value) {
    return String(value ?? "—").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
  }

  function inspectPayload(hit) {
    const obj = hit.object;
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
    if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
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
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (state.touring) {
      const elapsed = (now - state.tourStarted) / 1000;
      world.controls.theta -= 0.0035;
      if (elapsed > 5.5) {
        const keys = Object.keys(MODES);
        applyMode(keys[(keys.indexOf(state.mode) + 1) % keys.length]);
        state.tourStarted = now;
      }
      updateCamera();
      state.needsRender = true;
    }
    if (state.needsRender || state.touring) {
      world.renderer.render(world.scene, world.camera);
      recordRenderRate(now);
      updateLitPixelRatio(now);
      state.needsRender = false;
      mirrorProbeThrottled(now);
    } else if (!state.touring && dom.fps && state.lastFrame && now - state.lastFrame > 1000) {
      dom.fps.textContent = "Đứng yên";
    }
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
    return {
      schema: state.data?.schema || null,
      rendererReady: !!world.renderer,
      sceneReady: state.sceneReady,
      activeMode: state.mode,
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
        grounding: state.diagnostics.grounding,
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
      setLoading("Đang nạp scene-data fusion…");
      state.data = await fetchJson(DATA_URL);
      setLoading("Đang kiểm tra visual-data native…");
      state.visualData = await fetchOptionalJson(VISUAL_URL);
      recordDisclosureFlags(state.data);
      updateDiagnosticsFromData(state.data);
      setLoading("Đang dựng địa hình và lớp phân tích…");
      await setupScene();
      populateSources();
      wireUi();
      applyMode("overview");
      state.sceneReady = true;
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
