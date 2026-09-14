const statusFilter = document.querySelector("#statusFilter");
const searchBox = document.querySelector("#searchBox");
const summary = document.querySelector("#summary");
const aoiPanel = document.querySelector("#aoiPanel");
const notice = document.querySelector("#notice");
const recordsEl = document.querySelector("#records");
const coverageEl = document.querySelector("#coverage");

const STATUS_LABELS = {
  acquired: "Đã thu",
  candidate: "Ứng viên",
  blocked: "Bị chặn",
  missing: "Đầu vào thiếu"
};

const VALIDATION_LABELS = {
  ok: "Đạt kiểm tra",
  failed: "Không đạt"
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

function isUrl(value) {
  return /^https?:\/\//.test(String(value ?? ""));
}

function linkFor(value, label = value) {
  if (!value) return "—";
  const href = isUrl(value) ? value : value;
  return `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
}

function formatList(values) {
  if (!Array.isArray(values) || !values.length) return "—";
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function validationFor(registry, record) {
  return (registry.validations ?? []).find((validation) => validation.id === record.id) ?? { errors: [], warnings: [], ok: false };
}

function searchableText(record, validation) {
  return [
    record.id,
    record.title,
    record.publisher,
    record.url,
    record.status,
    record.license,
    record.evidence_span,
    record.local_file,
    record.snapshot,
    ...(record.limitations ?? []),
    ...(record.requirements ?? []),
    ...(validation.errors ?? [])
  ].join(" ").toLowerCase();
}

function renderSummary(registry) {
  const counts = registry.status_counts ?? {};
  summary.innerHTML = ["acquired", "candidate", "blocked", "missing"].map((key) => `
    <article class="metric">
      <strong>${counts[key] ?? 0}</strong>
      <span>${STATUS_LABELS[key]}</span>
    </article>
  `).join("");
}

function renderAoi(registry) {
  const aoi = registry.aoi ?? {};
  const bbox = Array.isArray(aoi.bbox) ? aoi.bbox.map((number) => Number(number).toFixed(6)).join(", ") : "—";
  const limits = formatList(aoi.limitations);
  aoiPanel.innerHTML = `
    <div>
      <p class="eyebrow">Phạm vi kiểm kê</p>
      <h2>${escapeHtml(aoi.label ?? "Vùng mẫu Gia Lộc")}</h2>
      <p class="warning">Vùng mẫu, không phải ranh phường.</p>
      <p class="muted">${escapeHtml(aoi.basis ?? "AOI dùng để kiểm thử thu thập dữ liệu, không thay thế ranh hành chính chính thức.")}</p>
    </div>
    <dl class="aoi-meta">
      <div><dt>BBox WGS84</dt><dd>${escapeHtml(bbox)}</dd></div>
      <div><dt>Nguồn AOI</dt><dd>${escapeHtml(aoi.source ?? "fallback")}</dd></div>
      <div><dt>CRS</dt><dd>${escapeHtml(aoi.crs ?? "—")}</dd></div>
      <div><dt>Giới hạn</dt><dd>${limits}</dd></div>
    </dl>
  `;
}

function renderNotice(registry) {
  const failed = (registry.validations ?? []).filter((validation) => !validation.ok).length;
  const inputMissing = (registry.input_reports ?? []).filter((input) => !input.exists).length;
  const parts = [
    "Chỉ nguồn có trạng thái Đã thu và validation đạt mới được xem là sẵn sàng dùng thử.",
    failed ? `${failed} nguồn đang không đạt kiểm tra hash/bằng chứng.` : "Tất cả nguồn hiện có trong registry đã đạt validation.",
    inputMissing ? `${inputMissing} đầu vào registry còn thiếu.` : "Không còn thiếu file input registry."
  ];
  notice.textContent = parts.join(" ");
}

function renderRecords(registry) {
  const filter = statusFilter.value;
  const query = searchBox.value.trim().toLowerCase();
  const records = (registry.records ?? []).filter((record) => {
    const validation = validationFor(registry, record);
    const statusMatch = filter === "all" || record.status === filter;
    const searchMatch = !query || searchableText(record, validation).includes(query);
    return statusMatch && searchMatch;
  });
  const missingInputs = (registry.input_reports ?? []).filter((input) => !input.exists);
  const recordCards = records.map((record) => {
    const validation = validationFor(registry, record);
    const validationOk = validation.ok && !validation.errors.length;
    const evidence = record.evidence_span ? `<blockquote>${escapeHtml(record.evidence_span)}</blockquote>` : "—";
    return `
      <article class="record">
        <div>
          <h2>${escapeHtml(record.title)}</h2>
          <p class="muted">${escapeHtml(record.publisher)}</p>
          <div class="meta">
            <div><b>Liên kết nguồn</b>${linkFor(record.url, "Mở nguồn")}</div>
            <div><b>Bằng chứng</b>${evidence}</div>
            <div><b>Quyền dùng</b>${escapeHtml(record.license)} ${record.license_url ? linkFor(record.license_url, "Chi tiết") : ""}</div>
            <div><b>Thời gian</b>${escapeHtml(record.data_date ?? record.captured_at)}</div>
            <div><b>CRS / độ phân giải</b>${escapeHtml(record.crs)} / ${escapeHtml(record.resolution)}</div>
            <div><b>File cục bộ</b>${linkFor(record.local_file)}</div>
            <div><b>Snapshot</b>${linkFor(record.snapshot)}</div>
            <div><b>Yêu cầu liên quan</b>${escapeHtml((record.requirements ?? []).join(", "))}</div>
            <div class="wide"><b>Giới hạn</b>${formatList(record.limitations)}</div>
            <div class="wide"><b>Validation</b><span class="validation ${validationOk ? "valid" : "invalid"}">${validationOk ? VALIDATION_LABELS.ok : VALIDATION_LABELS.failed}</span>${validation.errors.length ? `<p>${escapeHtml(validation.errors.join(", "))}</p>` : ""}</div>
          </div>
        </div>
        <span class="pill ${escapeHtml(record.status)}">${escapeHtml(STATUS_LABELS[record.status] ?? record.status)}</span>
      </article>
    `;
  });
  const missingCards = missingInputs
    .filter(() => filter === "all" || filter === "missing")
    .map((input) => `
      <article class="record">
        <div>
          <h2>Thiếu đầu vào: ${escapeHtml(input.path)}</h2>
          <p class="muted">Workbench đang chờ nhóm nguồn bổ sung file ${escapeHtml(input.kind)} theo contract.</p>
        </div>
        <span class="pill missing">Đầu vào thiếu</span>
      </article>
    `);
  recordsEl.innerHTML = [...missingCards, ...recordCards].join("") || "<p class='empty'>Không có nguồn phù hợp bộ lọc hiện tại.</p>";
}

function renderCoverage(registry) {
  const coverage = registry.coverage ?? {};
  coverageEl.innerHTML = `
    <div class="coverage-grid">
      <article class="metric">
        <strong>${coverage.review_groups_touched_by_acquired?.length ?? 0}/${coverage.review_groups_total ?? 0}</strong>
        <span>nhóm review có dữ liệu đã thu chạm tới</span>
      </article>
      <article class="metric">
        <strong>${coverage.questions_touched_by_acquired?.length ?? 0}/${coverage.questions_total ?? 0}</strong>
        <span>câu hỏi có dữ liệu đã thu chạm tới</span>
      </article>
      <article class="metric">
        <strong>${coverage.document_groups_touched_by_acquired?.length ?? 0}</strong>
        <span>nhóm 2D/3D được chạm tới</span>
      </article>
    </div>
  `;
}

async function boot() {
  try {
    const response = await fetch("registry/data-registry.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const registry = await response.json();
    renderSummary(registry);
    renderAoi(registry);
    renderNotice(registry);
    renderRecords(registry);
    renderCoverage(registry);
    statusFilter.addEventListener("change", () => renderRecords(registry));
    searchBox.addEventListener("input", () => renderRecords(registry));
  } catch (error) {
    summary.innerHTML = "";
    aoiPanel.innerHTML = "";
    notice.textContent = "Không tải được registry/data-registry.json. Hãy mở qua web server cục bộ hoặc rebuild registry trước khi xem.";
    recordsEl.innerHTML = `<p class="empty">Lỗi tải dữ liệu: ${escapeHtml(error.message)}</p>`;
    coverageEl.innerHTML = "";
  }
}

boot();
