const statusFilter = document.querySelector("#statusFilter");
const searchBox = document.querySelector("#searchBox");
const summary = document.querySelector("#summary");
const notice = document.querySelector("#notice");
const epochGrid = document.querySelector("#epochGrid");
const mapSvg = document.querySelector("#mapSvg");
const aoiTitle = document.querySelector("#aoiTitle");
const aoiMeta = document.querySelector("#aoiMeta");
const layerToggles = document.querySelector("#layerToggles");
const layerDetails = document.querySelector("#layerDetails");
const coverageEl = document.querySelector("#coverage");
const recordsEl = document.querySelector("#records");

const STATUS_LABELS = {
  acquired: "Đã thu",
  candidate: "Ứng viên",
  blocked: "Bị chặn",
  missing: "Đầu vào thiếu"
};

const KIND_LABELS = {
  landcover: "WorldCover",
  quality: "Chất lượng ảnh",
  optical: "Ảnh rõ",
  "epoch-a": "Epoch A",
  "epoch-b": "Epoch B",
  "candidate-change": "Candidate change",
  "sentinel-change": "Sentinel candidate-change",
  "temporal-mask": "Mask hợp lệ / candidate",
  canopy: "Canopy",
  "canopy-uncertainty": "Canopy uncertainty",
  "water-history": "Lịch sử nước",
  "water-occurrence": "JRC water occurrence",
  "water-seasonality": "JRC water seasonality",
  "water-change": "JRC water change",
  elevation: "Độ cao nền",
  roads: "Đường",
  water: "Nước",
  buildings: "Công trình"
};

const state = {
  registry: null,
  visibleLayers: new Set()
};

function escapeHtml(value) {
  return String(value ?? "—").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function svgEl(name, attrs = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== null && value !== undefined) element.setAttribute(key, value);
  }
  return element;
}

function linkFor(value, label = value) {
  if (!value) return "—";
  return `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function recordHref(record, value) {
  if (!value) return null;
  const text = String(value);
  if (/^(https?:|\/|data:)/.test(text)) return text;
  if (record.source_batch === "batch01") return `../tayninh-data-batch-01/${text}`;
  if (record.source_batch === "batch02") return `../tayninh-data-batch-02/${text}`;
  return text;
}

function recordLink(record, value, label = value) {
  const href = recordHref(record, value);
  return href ? linkFor(href, label) : "—";
}

function list(values) {
  if (!Array.isArray(values) || !values.length) return "—";
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function textList(values) {
  return Array.isArray(values) && values.length ? values.join(" ") : "";
}

function validationFor(record) {
  return (state.registry?.validations ?? []).find((item) => item.id === record.id) ?? { ok: false, errors: ["NOT_VALIDATED"], warnings: [] };
}

function recordForLayer(layer) {
  return (state.registry?.records ?? []).find((record) => record.id === layer.record_id) ?? null;
}

function renderSummary() {
  const counts = state.registry.status_counts ?? {};
  const failed = (state.registry.validations ?? []).filter((item) => !item.ok).length;
  const items = [
    ["acquired", counts.acquired ?? 0, STATUS_LABELS.acquired],
    ["candidate", counts.candidate ?? 0, STATUS_LABELS.candidate],
    ["blocked", counts.blocked ?? 0, STATUS_LABELS.blocked],
    ["missing", counts.missing ?? 0, STATUS_LABELS.missing],
    ["validation", failed, failed ? "Validation lỗi" : "Validation đạt"]
  ];
  summary.innerHTML = items.map(([, value, label]) => `
    <article class="metric">
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");
}

function renderNotice() {
  const failed = (state.registry.validations ?? []).filter((item) => !item.ok).length;
  const reports = state.registry.input_reports ?? [];
  const missing = reports.filter((item) => !item.exists).map((item) => item.kind);
  const batch03 = (state.registry.records ?? []).filter((item) => item.source_batch === "batch03").length;
  notice.textContent = [
    "Workbench này chỉ hiển thị dữ liệu công khai có provenance; không phải ranh phường chính thức, không phải ảnh 1 cm và không phải LiDAR Hera.",
    `${batch03} record Batch 03 đang có trong manifest.`,
    failed ? `${failed} record chưa đạt validation.` : "Tất cả record hiện có đạt validation.",
    missing.length ? `Manifest còn thiếu: ${missing.join(", ")}.` : "Manifest temporal/ecosystem đã có."
  ].join(" ");
}

function projectFactory(bbox) {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const pad = 46;
  const width = 900;
  const height = 560;
  return ([lon, lat]) => {
    const x = pad + ((lon - minLon) / (maxLon - minLon || 1)) * (width - pad * 2);
    const y = height - pad - ((lat - minLat) / (maxLat - minLat || 1)) * (height - pad * 2);
    return [x, y];
  };
}

function pathFromCoordinates(coords, project) {
  return (coords ?? []).map((coord, index) => {
    const [x, y] = project(coord);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
}

function imageBBoxAttrs(layer, project) {
  if (!Array.isArray(layer.bbox)) return null;
  const [x1, y1] = project([layer.bbox[0], layer.bbox[3]]);
  const [x2, y2] = project([layer.bbox[2], layer.bbox[1]]);
  return {
    x: String(Math.min(x1, x2)),
    y: String(Math.min(y1, y2)),
    width: String(Math.abs(x2 - x1)),
    height: String(Math.abs(y2 - y1))
  };
}

function rasterOpacity(kind) {
  if (kind === "optical" || kind === "epoch-b") return "0.74";
  if (kind === "epoch-a") return "0.58";
  if (kind === "quality") return "0.42";
  if (kind === "candidate-change" || kind === "sentinel-change" || kind === "temporal-mask") return "0.56";
  if (kind === "canopy" || kind === "canopy-uncertainty" || kind === "water-history") return "0.48";
  if (kind === "water-occurrence" || kind === "water-seasonality" || kind === "water-change") return "0.48";
  return "0.5";
}

function rasterFill(kind) {
  if (kind === "candidate-change" || kind === "sentinel-change" || kind === "temporal-mask") return "#d6518f";
  if (kind === "canopy" || kind === "canopy-uncertainty") return "#4f8d57";
  if (kind === "water-history" || kind === "water-occurrence" || kind === "water-seasonality" || kind === "water-change") return "#2c78ad";
  return "#c58b28";
}

function drawMap() {
  const registry = state.registry;
  const map = registry.map ?? {};
  const bbox = map.aoi_bbox ?? registry.aoi?.bbox;
  mapSvg.replaceChildren();
  if (!Array.isArray(bbox)) {
    mapSvg.append(svgEl("text", { x: "40", y: "60", fill: "#596054" })).textContent = "Chưa có AOI để vẽ.";
    return;
  }
  aoiTitle.textContent = map.aoi_label ?? registry.aoi?.label ?? "Vùng mẫu Gia Lộc";
  aoiMeta.textContent = `BBox WGS84: ${bbox.map((number) => Number(number).toFixed(6)).join(", ")}. ${map.warning ?? "Vùng mẫu, không phải ranh phường."}`;

  const project = projectFactory(bbox);
  const defs = svgEl("defs");
  const clip = svgEl("clipPath", { id: "aoiClip" });
  clip.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468" }));
  defs.append(clip);
  const gradient = svgEl("linearGradient", { id: "elevationGradient", x1: "0", x2: "1", y1: "0", y2: "1" });
  gradient.append(svgEl("stop", { offset: "0%", "stop-color": "#e9ddb1" }));
  gradient.append(svgEl("stop", { offset: "100%", "stop-color": "#b9c98f" }));
  defs.append(gradient);
  mapSvg.append(defs);
  mapSvg.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468", fill: "none", stroke: "#7b3a22", "stroke-width": "2", "stroke-dasharray": "8 6" }));

  const layerGroup = svgEl("g", { "clip-path": "url(#aoiClip)" });
  mapSvg.append(layerGroup);
  const visibleLayers = (map.layers ?? []).filter((layer) => state.visibleLayers.has(layer.id));
  const rasterKinds = new Set([
    "landcover",
    "quality",
    "optical",
    "epoch-a",
    "epoch-b",
    "candidate-change",
    "sentinel-change",
    "temporal-mask",
    "canopy",
    "canopy-uncertainty",
    "water-history",
    "water-occurrence",
    "water-seasonality",
    "water-change"
  ]);
  const vectorKinds = new Set(["roads", "water", "buildings"]);

  for (const layer of visibleLayers.filter((item) => rasterKinds.has(item.kind))) {
    const attrs = imageBBoxAttrs(layer, project);
    if (layer.image && attrs) {
      layerGroup.append(svgEl("image", {
        href: layer.image,
        ...attrs,
        opacity: rasterOpacity(layer.kind),
        preserveAspectRatio: "none"
      }));
    } else if (attrs) {
      const fill = rasterFill(layer.kind);
      layerGroup.append(svgEl("rect", { ...attrs, fill, opacity: rasterOpacity(layer.kind), stroke: fill }));
    }
  }

  if (visibleLayers.some((layer) => layer.kind === "elevation")) {
    layerGroup.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468", fill: "url(#elevationGradient)", opacity: "0.30" }));
  }

  const overlayRank = { roads: 10, water: 11, buildings: 30 };
  for (const layer of visibleLayers.filter((item) => vectorKinds.has(item.kind)).sort((a, b) => (overlayRank[a.kind] ?? 50) - (overlayRank[b.kind] ?? 50))) {
    if (Array.isArray(layer.features)) {
      for (const feature of layer.features) {
        layerGroup.append(svgEl("path", {
          d: pathFromCoordinates(feature.coordinates ?? [], project),
          fill: "none",
          stroke: layer.kind === "water" ? "#2c78ad" : "#66615b",
          "stroke-width": layer.kind === "water" ? "3" : "1.4",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          opacity: layer.kind === "water" ? "0.86" : "0.52"
        }));
      }
    }
    if (Array.isArray(layer.polygons)) {
      for (const feature of layer.polygons) {
        for (const ring of feature.rings ?? []) {
          layerGroup.append(svgEl("path", {
            d: `${pathFromCoordinates(ring, project)} Z`,
            fill: "#b84c2f",
            stroke: "#7b2c1b",
            "stroke-width": "1",
            opacity: "0.72"
          }));
        }
      }
    }
  }
  mapSvg.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468", fill: "none", stroke: "#7b3a22", "stroke-width": "2", "stroke-dasharray": "8 6" }));
}

function setDefaultVisibleLayers() {
  state.visibleLayers.clear();
  for (const layer of state.registry.map?.layers ?? []) {
    if (layer.default_visible) state.visibleLayers.add(layer.id);
  }
}

function renderLayerControls() {
  const layers = state.registry.map?.layers ?? [];
  layerToggles.innerHTML = layers.map((layer) => `
    <label class="toggle">
      <span>${escapeHtml(layer.label ?? KIND_LABELS[layer.kind] ?? layer.kind)}</span>
      <input type="checkbox" data-layer-id="${escapeHtml(layer.id)}" ${state.visibleLayers.has(layer.id) ? "checked" : ""}>
    </label>
  `).join("");
  layerToggles.querySelectorAll("input").forEach((input) => {
    input.addEventListener("change", () => {
      if (input.checked) state.visibleLayers.add(input.dataset.layerId);
      else state.visibleLayers.delete(input.dataset.layerId);
      drawMap();
    });
  });
}

function syncLayerControls() {
  layerToggles.querySelectorAll("input").forEach((input) => {
    input.checked = state.visibleLayers.has(input.dataset.layerId);
  });
}

function setLayerVisible(layerId, visible) {
  if (visible) state.visibleLayers.add(layerId);
  else state.visibleLayers.delete(layerId);
  syncLayerControls();
  drawMap();
}

function renderLayerDetails() {
  layerDetails.innerHTML = (state.registry.map?.layers ?? []).map((layer) => {
    const record = recordForLayer(layer);
    const rendered = layer.features?.length ?? layer.rendered_count ?? layer.polygons?.length ?? "—";
    const total = layer.feature_count ?? rendered;
    const date = layer.layer_date ?? record?.data_date ?? "—";
    const resolution = record?.resolution ?? "—";
    const limits = Array.isArray(record?.limitations) ? record.limitations.slice(0, 2).join("; ") : "—";
    const source = layer.image ?? layer.path ?? layer.source ?? null;
    return `
      <article class="layer-card ${escapeHtml(layer.kind)}">
        <strong>${escapeHtml(layer.label ?? KIND_LABELS[layer.kind] ?? layer.kind)}</strong>
        <div>${escapeHtml(KIND_LABELS[layer.kind] ?? layer.kind)} · ${escapeHtml(rendered)} hiển thị / ${escapeHtml(total)} tổng</div>
        <div>Ngày: ${escapeHtml(date)} · Độ phân giải: ${escapeHtml(resolution)}</div>
        <div>Giới hạn: ${escapeHtml(limits)}</div>
        <div>${source ? linkFor(source, "mở file/lớp") : "—"}</div>
      </article>
    `;
  }).join("");
}

function renderEpochPanel() {
  const layers = state.registry.map?.layers ?? [];
  const epochLayers = [
    layers.find((layer) => layer.kind === "epoch-a"),
    layers.find((layer) => layer.kind === "epoch-b"),
  ].filter(Boolean);
  const fallbackOptical = layers.find((layer) => layer.kind === "optical");
  const cards = epochLayers.length ? epochLayers : (fallbackOptical ? [fallbackOptical] : []);
  if (!cards.length) {
    epochGrid.innerHTML = `<article class="epoch-card"><div class="epoch-body"><strong>Chưa có epoch raster</strong><p class="muted">Registry hiện mới kế thừa context Batch02 hoặc đang chờ temporal manifest.</p></div></article>`;
    return;
  }
  epochGrid.innerHTML = cards.map((layer, index) => {
    const record = recordForLayer(layer);
    const label = layer.kind === "epoch-a" ? "Epoch A" : layer.kind === "epoch-b" ? "Epoch B" : "Ảnh rõ hiện có";
    const visible = state.visibleLayers.has(layer.id);
    return `
      <article class="epoch-card">
        ${layer.image ? `<img src="${escapeHtml(layer.image)}" alt="${escapeHtml(label)}">` : ""}
        <div class="epoch-body">
          <strong>${escapeHtml(label)}${cards.length === 1 ? "" : ` · ${index === 0 ? "trước" : "sau"}`}</strong>
          <p class="muted">${escapeHtml(layer.label ?? "")}</p>
          <p>Ngày dữ liệu: ${escapeHtml(layer.layer_date ?? record?.data_date ?? "chưa ghi")}</p>
          <p>Độ phân giải: ${escapeHtml(record?.resolution ?? "chưa ghi")}</p>
          <button class="epoch-toggle" type="button" data-layer-id="${escapeHtml(layer.id)}" data-visible="${visible ? "1" : "0"}">${visible ? "Ẩn lớp này" : "Hiện lớp này"}</button>
        </div>
      </article>
    `;
  }).join("");
  epochGrid.querySelectorAll(".epoch-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const currentlyVisible = button.dataset.visible === "1";
      setLayerVisible(button.dataset.layerId, !currentlyVisible);
      renderEpochPanel();
    });
  });
}

function renderCoverage() {
  const coverage = state.registry.coverage ?? {};
  function pills(values) {
    if (!Array.isArray(values) || !values.length) return `<span class="muted">Chưa chạm</span>`;
    return `<div class="pill-list">${values.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>`;
  }
  coverageEl.innerHTML = `
    <div class="coverage-grid">
      <article>
        <strong>Nhóm review</strong>
        ${pills(coverage.review_groups_touched_by_acquired)}
      </article>
      <article>
        <strong>Câu hỏi tài liệu</strong>
        ${pills(coverage.questions_touched_by_acquired)}
      </article>
      <article>
        <strong>Cụm tài liệu</strong>
        ${pills(coverage.document_groups_touched_by_acquired)}
      </article>
    </div>
  `;
}

function renderRecords() {
  const status = statusFilter.value;
  const query = searchBox.value.trim().toLowerCase();
  const records = (state.registry.records ?? []).filter((record) => {
    if (status !== "all" && record.status !== status) return false;
    if (!query) return true;
    return [
      record.id,
      record.publisher,
      record.title,
      record.status,
      record.license,
      record.data_date,
      record.crs,
      record.resolution,
      textList(record.requirements),
      textList(record.limitations)
    ].join(" ").toLowerCase().includes(query);
  });
  recordsEl.innerHTML = records.map((record) => {
    const validation = validationFor(record);
    const validationText = validation.ok ? "Đạt validation" : `Chưa đạt: ${(validation.errors ?? []).join(", ")}`;
    return `
      <article class="record">
        <div class="record-head">
          <div>
            <p class="eyebrow">${escapeHtml(record.publisher)} · ${escapeHtml(record.source_batch ?? "batch03")}</p>
            <h2>${escapeHtml(record.title)}</h2>
          </div>
          <span class="badge ${escapeHtml(record.status)}">${escapeHtml(STATUS_LABELS[record.status] ?? record.status)}</span>
        </div>
        <div class="record-grid">
          <div class="field"><strong>Nguồn</strong>${linkFor(record.url, "trang nguồn")}</div>
          <div class="field"><strong>Bằng chứng</strong>${recordLink(record, record.snapshot, "snapshot")}<br>${escapeHtml(record.evidence_span ?? "—")}</div>
          <div class="field"><strong>Quyền dùng</strong>${escapeHtml(record.license ?? "—")}<br>${record.license_url ? linkFor(record.license_url, "license") : "—"}</div>
          <div class="field"><strong>Thời gian</strong>${escapeHtml(record.data_date ?? "—")}<br>Captured: ${escapeHtml(record.captured_at ?? "—")}</div>
          <div class="field"><strong>CRS / datum</strong>${escapeHtml(record.crs ?? "—")}<br>${escapeHtml(record.vertical_datum ?? "—")}</div>
          <div class="field"><strong>Độ phân giải</strong>${escapeHtml(record.resolution ?? "—")}</div>
          <div class="field"><strong>File cục bộ</strong>${recordLink(record, record.local_file, "local file")}</div>
          <div class="field"><strong>Validation</strong><span class="${validation.ok ? "validation-ok" : "validation-bad"}">${escapeHtml(validationText)}</span></div>
          <div class="field"><strong>Yêu cầu</strong>${list(record.requirements)}</div>
          <div class="field"><strong>Giới hạn</strong>${list(record.limitations)}</div>
        </div>
      </article>
    `;
  }).join("") || `<article class="record"><p>Không có record phù hợp bộ lọc.</p></article>`;
}

function renderAll() {
  renderSummary();
  renderNotice();
  renderEpochPanel();
  renderLayerControls();
  renderLayerDetails();
  renderCoverage();
  renderRecords();
  drawMap();
}

async function init() {
  try {
    const response = await fetch("registry/data-registry.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.registry = await response.json();
    setDefaultVisibleLayers();
    statusFilter.addEventListener("change", renderRecords);
    searchBox.addEventListener("input", renderRecords);
    renderAll();
  } catch (error) {
    notice.textContent = `Không tải được registry/data-registry.json: ${error.message}`;
    summary.innerHTML = "";
    epochGrid.innerHTML = "";
    mapSvg.replaceChildren();
    recordsEl.innerHTML = `<article class="record"><p>Fetch error. Kiểm tra registry build trước khi review.</p></article>`;
  }
}

init();
