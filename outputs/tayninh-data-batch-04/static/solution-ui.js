/* S06: presentation state only. The scene engine owns all solution commands. */
(() => {
  "use strict";
  const byId = (id) => document.getElementById(id);
  const buttons = [...document.querySelectorAll("[data-solution-command]")];
  const advanced = byId("solutionControls");
  const status = byId("solutionStatus");
  const drawer = byId("sourceDrawer");
  const inspector = byId("inspector");
  const narrative = document.querySelector(".narrative-panel");
  const help = document.querySelector(".keyboard-help");
  const setText = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  const setAttr = (node, name, value) => { if (node && node.getAttribute(name) !== String(value)) node.setAttribute(name, String(value)); };

  function syncSolution(event) {
    const current = event.detail;
    if (!current || typeof current !== "object") return;
    const ready = current.ready === true;
    const busy = current.busy === true;
    const available = current.available || {};
    for (const button of buttons) {
      const command = button.dataset.solutionCommand;
      const value = button.dataset.solutionValue;
      const supported = !(command === "terrain" && value === "gedtm" && available.gedtm !== true)
        && !(command === "heights" && value === "google" && available.google !== true);
      const disabled = !ready || busy || !supported;
      if (button.disabled !== disabled) button.disabled = disabled;
      if (command !== "focus") setAttr(button, "aria-pressed", ready && String(current[command]) === value);
      setAttr(button, "title", supported ? "" : "Nguồn này chưa sẵn sàng; cảnh đang dùng lớp dự phòng.");
    }
    const terrain = current.terrain === "gedtm" ? "GEDTM thử nghiệm" : "COPDEM DSM";
    const height = current.heights === "google" ? "Chiều cao mô hình Google / ước tính" : "Chiều cao ước theo diện tích";
    const representation = current.detail === "detailed" ? "Chi tiết mô phỏng" : "Lớp dữ liệu";
    const scale = Number(current.scale) === 1.35 ? "1,35×" : "1×";
    const error = typeof current.error === "string" ? current.error : current.error?.message;
    const normal = `${representation} · ${terrain} · ${scale}`;
    setText(status, busy ? "Đang cập nhật cảnh…" : error ? (ready ? "Một lớp bổ sung chưa sẵn sàng · đang dùng lớp dự phòng. Xem Nguồn." : "Chưa thể tải lớp bổ sung. Xem Nguồn để kiểm tra lỗi.") : ready ? normal : "Đang kiểm tra lớp bổ sung…");
    const errorDetails = byId("solutionErrorDetails");
    if (errorDetails) errorDetails.hidden = !error;
    setText(byId("solutionErrorText"), error || "");
    setAttr(status, "data-state", error ? "error" : busy ? "busy" : ready ? "ready" : "loading");
    setAttr(advanced, "aria-busy", busy);
    setText(byId("solutionSourceStatus"), ready ? `${terrain} · ${height}. ${available.gedtm && available.google ? "Hai mô hình bổ sung đã sẵn sàng." : "Một số nguồn chưa sẵn sàng; xem trạng thái bên ngoài bảng."}` : "Đang đối chiếu trạng thái lớp bổ sung…");
    setText(byId("solutionModelTag"), ready ? height : "Chiều cao mô hình / ước tính");
    setText(byId("solutionHiddenTag"), `${ready ? height : "Chiều cao mô hình / ước tính"} · không thay thế khảo sát`);
    setAttr(document.body, "data-solution-ready", ready);
  }

  advanced?.addEventListener("toggle", () => {
    setAttr(advanced.querySelector("summary"), "aria-expanded", advanced.open);
    if (advanced.open) {
      if (help) help.open = false;
      // Keep one expanded explanation on the map at a time.
      if (narrative && !narrative.classList.contains("is-collapsed")) byId("toggleNarrative")?.click();
    }
  });
  byId("toggleNarrative")?.addEventListener("click", () => { if (advanced) advanced.open = false; });
  help?.addEventListener("toggle", () => { if (help.open && advanced) advanced.open = false; });
  byId("focusCluster")?.addEventListener("click", () => {
    if (advanced) advanced.open = false;
    queueMicrotask(() => document.querySelector("#scene canvas")?.focus({ preventScroll: true }));
  });

  function syncPanels() {
    const sourceOpen = drawer && !drawer.hidden;
    const inspectorOpen = inspector && !inspector.hidden;
    document.body.classList.toggle("solution-source-open", Boolean(sourceOpen));
    document.body.classList.toggle("solution-inspector-open", Boolean(inspectorOpen));
    if ((sourceOpen || inspectorOpen) && advanced) advanced.open = false;
  }
  for (const panel of [drawer, inspector]) if (panel) new MutationObserver(syncPanels).observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  byId("sourceToggle")?.addEventListener("click", () => queueMicrotask(() => byId("sourceClose")?.focus({ preventScroll: true })));
  byId("sourceClose")?.addEventListener("click", () => byId("sourceToggle")?.focus({ preventScroll: true }));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const wasAdvanced = advanced?.open;
    if (advanced) advanced.open = false;
    if (wasAdvanced) advanced.querySelector("summary")?.focus({ preventScroll: true });
  });
  // Subscribe first; replay is synchronous when the engine is already ready.
  window.addEventListener("b04:solution-state", syncSolution);
  document.addEventListener("b04:solution-state", (event) => { if (!event.bubbles) syncSolution(event); });
  window.dispatchEvent(new CustomEvent("b04:solution-request-state"));
  syncPanels();
})();
