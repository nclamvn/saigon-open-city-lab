const statusFilter = document.querySelector("#statusFilter");
const searchBox = document.querySelector("#searchBox");
const summary = document.querySelector("#summary");
const notice = document.querySelector("#notice");
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
  roads: "Đường Batch 01",
  water: "Mặt nước Batch 01",
  elevation: "Độ cao nền",
  buildings: "Công trình",
  landcover: "Bề mặt",
  optical: "Ảnh quan sát",
  quality: "Chất lượng ảnh",
  vector: "Vector",
  image: "Ảnh",
  "raster-context": "Raster context"
};

const KIND_CLASS = {
  roads: "roads",
  water: "water",
  elevation: "elevation",
  buildings: "buildings",
  landcover: "landcover",
  optical: "landcover",
  quality: "landcover",
  vector: "landcover",
  image: "landcover",
  "raster-context": "landcover"
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
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  return element;
}

function linkFor(value, label = value) {
  if (!value) return "—";
  return `<a href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function recordHref(record, value) {
  if (!value) return null;
  if (/^https?:\/\//.test(String(value))) return value;
  if (record.source_batch === "batch01") return `../tayninh-data-batch-01/${value}`;
  return value;
}

function recordLink(record, value, label = value) {
  const href = recordHref(record, value);
  return href ? linkFor(href, label) : "—";
}

function list(values) {
  if (!Array.isArray(values) || !values.length) return "—";
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function validationFor(record) {
  return (state.registry?.validations ?? []).find((item) => item.id === record.id) ?? { ok: false, errors: ["NOT_VALIDATED"], warnings: [] };
}

function renderSummary() {
  const counts = state.registry.status_counts ?? {};
  summary.innerHTML = ["acquired", "candidate", "blocked", "missing"].map((key) => `
    <article class="metric">
      <strong>${counts[key] ?? 0}</strong>
      <span>${STATUS_LABELS[key]}</span>
    </article>
  `).join("");
}

function renderNotice() {
  const failed = (state.registry.validations ?? []).filter((item) => !item.ok).length;
  const missing = (state.registry.input_reports ?? []).filter((item) => !item.exists).length;
  const acquiredBatch02 = (state.registry.records ?? []).filter((item) => item.source_batch === "batch02" && item.status === "acquired").length;
  notice.textContent = [
    "Workbench này chỉ hiển thị dữ liệu công khai đã có provenance; không phải ranh phường chính thức, không phải ảnh 1 cm, không phải LiDAR Hera.",
    `${acquiredBatch02} nguồn Batch 02 đã thu.`,
    failed ? `${failed} record chưa đạt validation.` : "Tất cả record đang đạt validation.",
    missing ? `${missing} manifest còn thiếu.` : "Không còn thiếu manifest building/surface."
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
  return coords.map((coord, index) => {
    const [x, y] = project(coord);
    return `${index ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");
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
  const baseLayers = visibleLayers.filter((layer) => ["landcover", "quality", "optical", "image", "raster-context"].includes(layer.kind));
  const overlayRank = { roads: 10, water: 11, vector: 20, buildings: 30 };
  const overlayLayers = visibleLayers
    .filter((layer) => ["roads", "water", "buildings", "vector"].includes(layer.kind))
    .sort((left, right) => (overlayRank[left.kind] ?? 50) - (overlayRank[right.kind] ?? 50));

  for (const layer of baseLayers) {
    if (layer.image && Array.isArray(layer.bbox)) {
      const [x1, y1] = project([layer.bbox[0], layer.bbox[3]]);
      const [x2, y2] = project([layer.bbox[2], layer.bbox[1]]);
      layerGroup.append(svgEl("image", {
        href: layer.image,
        x: String(Math.min(x1, x2)),
        y: String(Math.min(y1, y2)),
        width: String(Math.abs(x2 - x1)),
        height: String(Math.abs(y2 - y1)),
        opacity: layer.kind === "optical" ? "0.72" : "0.55",
        preserveAspectRatio: "none"
      }));
    }
    if (!layer.image && Array.isArray(layer.bbox)) {
      const [x1, y1] = project([layer.bbox[0], layer.bbox[3]]);
      const [x2, y2] = project([layer.bbox[2], layer.bbox[1]]);
      layerGroup.append(svgEl("rect", {
        x: String(Math.min(x1, x2)),
        y: String(Math.min(y1, y2)),
        width: String(Math.abs(x2 - x1)),
        height: String(Math.abs(y2 - y1)),
        fill: layer.kind === "optical" ? "#e2a83b" : layer.kind === "quality" ? "#7e73b8" : "#5e9f60",
        opacity: "0.25",
        stroke: layer.kind === "optical" ? "#9a6c16" : layer.kind === "quality" ? "#4b4185" : "#356d38"
      }));
    }
  }

  if (visibleLayers.some((layer) => layer.kind === "elevation")) {
    layerGroup.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468", fill: "url(#elevationGradient)", opacity: "0.34" }));
  }

  for (const layer of overlayLayers) {
    if (Array.isArray(layer.features)) {
      for (const feature of layer.features) {
        const path = svgEl("path", {
          d: pathFromCoordinates(feature.coordinates ?? [], project),
          fill: "none",
          stroke: layer.kind === "water" ? "#2b79b9" : "#66615b",
          "stroke-width": layer.kind === "water" ? "3" : "1.3",
          "stroke-linecap": "round",
          "stroke-linejoin": "round",
          opacity: layer.kind === "water" ? "0.85" : "0.5"
        });
        layerGroup.append(path);
      }
    }
    if (Array.isArray(layer.polygons)) {
      for (const feature of layer.polygons) {
        for (const ring of feature.rings ?? []) {
          const polygon = svgEl("path", {
            d: `${pathFromCoordinates(ring, project)} Z`,
            fill: layer.kind === "buildings" ? "#b84c2f" : "#5e9f60",
            stroke: layer.kind === "buildings" ? "#7b2c1b" : "#356d38",
            "stroke-width": "1",
            opacity: layer.kind === "buildings" ? "0.72" : "0.45"
          });
          layerGroup.append(polygon);
        }
      }
    }
  }
  mapSvg.append(svgEl("rect", { x: "46", y: "46", width: "808", height: "468", fill: "none", stroke: "#7b3a22", "stroke-width": "2", "stroke-dasharray": "8 6" }));
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

function setDefaultVisibleLayers() {
  state.visibleLayers.clear();
  for (const layer of state.registry.map?.layers ?? []) {
    const label = `${layer.id} ${layer.label ?? ""}`.toLowerCase();
    const defaultOn = ["roads", "water", "buildings", "optical"].includes(layer.kind) && !label.includes("quality");
    if (defaultOn) state.visibleLayers.add(layer.id);
  }
}

function renderLayerDetails() {
  layerDetails.innerHTML = (state.registry.map?.layers ?? []).map((layer) => {
    const klass = KIND_CLASS[layer.kind] ?? "landcover";
    const rendered = layer.features?.length ?? layer.rendered_count ?? layer.polygons?.length ?? "—";
    const total = layer.feature_count ?? rendered;
    const source = layer.source ?? layer.path ?? layer.image ?? "—";
    return `
      <article class="detail">
        <p><span class="swatch ${klass}"></span> <b>${escapeHtml(layer.label ?? KIND_LABELS[layer.kind] ?? layer.kind)}</b></p>
        <p class="muted">Loại: ${escapeHtml(KIND_LABELS[layer.kind] ?? layer.kind)} · render: ${escapeHtml(rendered)} · tổng nguồn: ${escapeHtml(total)}</p>
        <p class="muted">Nguồn: ${escapeHtml(source)}</p>
      </article>
    `;
  }).join("");
}

function searchableText(record, validation) {
  return [
    record.id,
    record.title,
    record.publisher,
    record.status,
    record.source_batch,
    record.manifest_kind,
    record.url,
    record.license,
    record.evidence_span,
    ...(record.requirements ?? []),
    ...(record.limitations ?? []),
    ...(validation.errors ?? [])
  ].join(" ").toLowerCase();
}

function renderRecords() {
  const filter = statusFilter.value;
  const query = searchBox.value.trim().toLowerCase();
  const records = (state.registry.records ?? []).filter((record) => {
    const validation = validationFor(record);
    return (filter === "all" || record.status === filter) && (!query || searchableText(record, validation).includes(query));
  });
  const missingCards = (state.registry.input_reports ?? [])
    .filter((input) => !input.exists && (filter === "all" || filter === "missing"))
    .map((input) => `
      <article class="record">
        <div>
          <h2>Thiếu manifest: ${escapeHtml(input.path)}</h2>
          <p class="muted">Workbench đang chờ Builder bổ sung ${escapeHtml(input.kind)}.</p>
        </div>
        <span class="pill missing">Đầu vào thiếu</span>
      </article>
    `);
  const cards = records.map((record) => {
    const validation = validationFor(record);
    const validationOk = validation.ok && validation.errors.length === 0;
    return `
      <article class="record">
        <div>
          <h2>${escapeHtml(record.title)}</h2>
          <p class="muted">${escapeHtml(record.publisher)} · ${escapeHtml(record.source_batch ?? "batch02")} ${record.manifest_kind ? `· ${escapeHtml(record.manifest_kind)}` : ""}</p>
          <div class="meta">
            <div><b>Nguồn</b>${recordLink(record, record.url, "Mở nguồn")}</div>
            <div><b>Bằng chứng</b><blockquote>${escapeHtml(record.evidence_span)}</blockquote></div>
            <div><b>Quyền dùng</b>${escapeHtml(record.license)} ${record.license_url ? recordLink(record, record.license_url, "Chi tiết") : ""}</div>
            <div><b>Thời gian</b>${escapeHtml(record.data_date ?? record.captured_at)}</div>
            <div><b>CRS / độ phân giải</b>${escapeHtml(record.crs)} / ${escapeHtml(record.resolution)}</div>
            <div><b>File nguồn</b>${recordLink(record, record.local_file)}</div>
            <div><b>Snapshot</b>${recordLink(record, record.snapshot)}</div>
            <div><b>Yêu cầu</b>${escapeHtml((record.requirements ?? []).join(", "))}</div>
            <div class="wide"><b>Giới hạn</b>${list(record.limitations)}</div>
            <div class="wide"><b>Validation</b><span class="validation ${validationOk ? "valid" : "invalid"}">${validationOk ? "Đạt" : "Không đạt"}</span> ${validation.errors.length ? escapeHtml(validation.errors.join(", ")) : ""}</div>
          </div>
        </div>
        <span class="pill ${escapeHtml(record.status)}">${escapeHtml(STATUS_LABELS[record.status] ?? record.status)}</span>
      </article>
    `;
  });
  recordsEl.innerHTML = [...missingCards, ...cards].join("") || "<p class='empty'>Không có nguồn phù hợp bộ lọc hiện tại.</p>";
}

function renderCoverage() {
  const coverage = state.registry.coverage ?? {};
  coverageEl.innerHTML = `
    <div class="coverage-grid">
      <article class="metric"><strong>${coverage.review_groups_touched_by_acquired?.length ?? 0}/${coverage.review_groups_total ?? 0}</strong><span>nhóm review có dữ liệu đã thu</span></article>
      <article class="metric"><strong>${coverage.questions_touched_by_acquired?.length ?? 0}/${coverage.questions_total ?? 0}</strong><span>câu hỏi được chạm tới</span></article>
      <article class="metric"><strong>${coverage.document_groups_touched_by_acquired?.length ?? 0}</strong><span>nhóm tài liệu 2D/3D</span></article>
    </div>
  `;
}

async function boot() {
  try {
    const response = await fetch("registry/data-registry.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.registry = await response.json();
    setDefaultVisibleLayers();
    renderSummary();
    renderNotice();
    renderLayerControls();
    renderLayerDetails();
    drawMap();
    renderCoverage();
    renderRecords();
    statusFilter.addEventListener("change", renderRecords);
    searchBox.addEventListener("input", renderRecords);
  } catch (error) {
    notice.textContent = "Không tải được registry/data-registry.json. Hãy chạy build registry và mở bằng web server cục bộ.";
    mapSvg.replaceChildren(svgEl("text", { x: "40", y: "60", fill: "#596054" }));
    mapSvg.firstChild.textContent = `Lỗi tải dữ liệu: ${error.message}`;
    recordsEl.innerHTML = "<p class='empty'>Registry chưa sẵn sàng.</p>";
  }
}

boot();
