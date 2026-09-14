(function (global) {
  "use strict";
  const VERSION = "s07-ui.3";
  function esc(v) { return String(v ?? "—").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[c]); }
  function statusLabel(status) { return status === "ready" ? "Sẵn sàng" : status === "fallback" ? "Dự phòng" : status === "error" ? "Lỗi" : "Đang nạp"; }
  function linkHref(value) {
    const raw = String(value || "").trim();
    if (!raw) return "#";
    if (/^(https?:|mailto:|#|\/)/i.test(raw)) return raw;
    if (/^tayninh-data-batch-\d+\//.test(raw) || /^tayninh-imagery-campaign-\d+\//.test(raw)) return `../${raw}`;
    return raw;
  }
  function vnPhotoStatus(status) {
    if (status === "pending_no_verified_free_photo") return "Chưa có ảnh đúng công trình";
    if (status === "verified") return "Đã đối chiếu";
    if (status === "candidate") return "Ứng viên";
    return status || "Đang chờ";
  }
  function linkList(paths, empty) {
    if (!Array.isArray(paths) || !paths.length) return esc(empty || "Chưa có đường dẫn");
    return paths.map((path, index) => `<a href="${esc(linkHref(path))}" target="_blank" rel="noreferrer">biên nhận ${index + 1}</a>`).join(" · ");
  }
  function photoItems(photos) {
    if (!photos.length) return "<li>Chưa có ảnh địa điểm đã đối chiếu; registry ảnh giữ trạng thái pending.</li>";
    return photos.map(p => {
      const href = linkHref(p.href || p.url || p.candidate_url || p.path || p.candidate_local_file || p.receipt_paths?.[0] || "#");
      const label = p.title || p.target_id || p.id || "hồ sơ ảnh";
      const body = href === "#" ? esc(label) : `<a href="${esc(href)}" target="_blank" rel="noreferrer">${esc(label)}</a>`;
      return `<li>${body} · ${esc(vnPhotoStatus(p.status || p.rights_status))}<br><span>${linkList(p.receipt_paths, "không có biên nhận")}</span></li>`;
    }).join("");
  }
  function importerResultHtml(result) {
    if (!result) return "Chưa chạy kiểm tra trong trình duyệt.";
    const ok = result.ok ? "Đạt kiểm tra cấu trúc" : "Bị từ chối";
    return `${ok}: ${esc(result.message || result.kind || "—")}${result.summary ? `\n${esc(JSON.stringify(result.summary, null, 2))}` : ""}`;
  }
  function renderPanel(model) {
    const chunks = model?.chunks || {};
    const photos = model?.photos || [];
    const detailed = model?.detail !== "data";
    const sampleCount = model?.sampleCount ?? chunks.sampleIds ?? 0;
    const photoCount = model?.photoSummary?.total ?? photos.length;
    const verifiedCount = model?.photoSummary?.verified ?? 0;
    return `<section class="s07-panel" aria-label="S07 ô mẫu và nguồn vật liệu">
      <div class="s07-panel__head"><span>S07</span><strong>Ô chi tiết 250 m</strong><em>${esc(statusLabel(model?.status))}</em></div>
      <div class="s07-ab" role="group" aria-label="So sánh mức chi tiết">
        <button type="button" data-s07-command="detail" data-s07-value="data" aria-pressed="${detailed ? "false" : "true"}">A · mô hình cơ bản</button>
        <button type="button" data-s07-command="detail" data-s07-value="detailed" aria-pressed="${detailed ? "true" : "false"}">B · chi tiết mô phỏng</button>
      </div>
      <div class="s07-grid">
        <article><small>Công trình trong ô</small><strong>${esc(sampleCount)}</strong><span>${esc(chunks.active?.length || 0)} ô chi tiết đang bật</span></article>
        <article><small>Hồ sơ ảnh</small><strong>${esc(photoCount)}</strong><span>${esc(verifiedCount)} ảnh đã đối chiếu</span></article>
        <article><small>Nguồn vật liệu</small><strong>${esc(statusLabel(model?.materials?.status))}</strong><span>${esc(model?.materials?.textureCount || 0)} ảnh vật liệu mô phỏng</span></article>
      </div>
      <details><summary>Nguồn ảnh và trạng thái</summary><ul>${photoItems(photos)}</ul>
        <p>${linkList(model?.receiptPaths, "Chưa có registry/pack")}</p>
        <p>Ảnh pending không được phủ lên công trình. Chi tiết cửa, mái và vật liệu vẫn là mô phỏng trừ khi registry đánh dấu đã đối chiếu.</p></details>
      <details class="s07-importer"><summary>Kiểm tra nguồn tương lai</summary>
        <label>Loại JSON <select data-s07-import-kind><option value="raster">Raster metadata</option><option value="geojson">GeoJSON footprint</option></select></label>
        <textarea data-s07-import-json rows="5" spellcheck="false" placeholder='Dán metadata/source JSON hoặc GeoJSON ở đây'></textarea>
        <label>GLB + sourcehash <input type="file" accept=".glb,model/gltf-binary" data-s07-import-file></label>
        <div class="s07-importer__actions"><button type="button" data-s07-command="validate-importer">Kiểm tra JSON</button><button type="button" data-s07-command="validate-glb">Kiểm tra GLB</button></div>
        <pre data-s07-import-result>${importerResultHtml(model?.importerResult)}</pre>
        <p>Đường này chỉ kiểm tra cấu trúc, quyền, hash khi có byte GLB và metadata. Chưa tự xuất bản dữ liệu vào cảnh.</p>
      </details>
      <details class="s07-technical"><summary>Chi tiết kỹ thuật</summary><pre>${esc(JSON.stringify({ chunks, materials: model?.materials, status: model?.status }, null, 2))}</pre></details>
    </section>`;
  }
  function mount(target, model) { if (target) target.innerHTML = renderPanel(model); }
  global.B04S07UI = { VERSION, renderPanel, mount };
}(typeof window !== "undefined" ? window : globalThis));
