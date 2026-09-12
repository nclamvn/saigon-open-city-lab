/* Demo shell: presentation controls, keyboard affordances and accessible UI state. */
(() => {
  const body = document.body;
  const viewport = document.getElementById('viewport');
  const dock = document.getElementById('uiDock');
  const views = document.querySelector('.views');
  const toolsPanel = document.querySelector('.tools');
  const intro = document.querySelector('.intro');
  const selection = document.getElementById('selection');
  const research = document.getElementById('research');

  if (!viewport || !dock || !views || !toolsPanel || !intro) return;

  views.id = 'viewDrawer';
  toolsPanel.id = 'controlDrawer';
  intro.id = 'infoDrawer';
  dock.querySelectorAll('button[data-panel]').forEach((button) => {
    button.type = 'button';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', {
      views: views.id,
      controls: toolsPanel.id,
      info: intro.id,
    }[button.dataset.panel]);
  });

  const utilities = document.createElement('section');
  utilities.className = 'demo-utilities';
  utilities.setAttribute('aria-label', 'Điều khiển khi trình chiếu');
  utilities.innerHTML = `
    <p>TRÌNH CHIẾU</p>
    <button id="demoReset" type="button">↺ <span>Đặt lại góc · 0</span></button>
    <button id="demoFullscreen" type="button">⛶ <span>Toàn màn hình · F</span></button>
    <button id="demoHideUi" type="button">◫ <span>Ẩn giao diện · H</span></button>
    <small>Mũi tên/WASD di chuyển · Q/E xoay · +/− zoom · Esc đóng bảng</small>`;
  toolsPanel.append(utilities);

  const presenterExit = document.createElement('button');
  presenterExit.id = 'presenterExit';
  presenterExit.type = 'button';
  presenterExit.textContent = 'H · HIỆN GIAO DIỆN';
  presenterExit.setAttribute('aria-label', 'Hiện lại giao diện');
  viewport.append(presenterExit);

  const toast = document.createElement('div');
  toast.id = 'demoToast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  viewport.append(toast);

  let toastTimer = 0;
  function notify(message) {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  function activeViewButton() {
    return views.querySelector(`[data-view="${CSS.escape(window.currentView || 'river')}"]`)
      || views.querySelector('[data-view].active');
  }

  function syncViewState() {
    views.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === window.currentView;
      button.setAttribute('aria-current', active ? 'true' : 'false');
      if (active) button.classList.add('active');
    });
  }

  function closeTransientUi() {
    window.cityUi?.closePanels();
    if (selection) selection.hidden = true;
  }

  function resetView() {
    const director = document.getElementById('p12Director');
    if (director?.textContent.trim().startsWith('■')) director.click();
    const button = activeViewButton();
    if (button) button.click();
    closeTransientUi();
    notify('Đã đặt lại góc nhìn');
  }

  function setPresenterMode(enabled) {
    body.classList.toggle('presenter-clean', enabled);
    document.getElementById('demoHideUi')?.setAttribute('aria-pressed', String(enabled));
    closeTransientUi();
    notify(enabled ? 'Chế độ trình chiếu · H để hiện giao diện' : 'Đã hiện giao diện');
    window.demoShellStatus.presenterMode = enabled;
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      notify('Trình duyệt không cho phép toàn màn hình');
    }
  }

  views.addEventListener('click', (event) => {
    const button = event.target.closest('[data-view]');
    if (!button) return;
    requestAnimationFrame(() => {
      syncViewState();
      const url = new URL(location.href);
      url.searchParams.set('view', button.dataset.view);
      history.replaceState(null, '', url);
    });
  });

  document.getElementById('demoReset').addEventListener('click', resetView);
  document.getElementById('demoHideUi').addEventListener('click', () => setPresenterMode(true));
  document.getElementById('demoFullscreen').addEventListener('click', toggleFullscreen);
  presenterExit.addEventListener('click', () => setPresenterMode(false));

  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    document.getElementById('demoFullscreen')?.setAttribute('aria-pressed', String(active));
    const label = document.querySelector('#demoFullscreen span');
    if (label) label.textContent = active ? 'Thoát toàn màn hình · F' : 'Toàn màn hình · F';
  });

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    const key = event.key.toLowerCase();
    if (key === 'escape') {
      window.cityUi?.closePanels();
      if (research?.open) research.close();
      if (selection) selection.hidden = true;
      if (body.classList.contains('presenter-clean')) setPresenterMode(false);
      return;
    }
    if (key === 'h') {
      event.preventDefault();
      setPresenterMode(!body.classList.contains('presenter-clean'));
    } else if (key === 'f') {
      event.preventDefault();
      toggleFullscreen();
    } else if (key === '0') {
      event.preventDefault();
      resetView();
    }
  });

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  body.classList.toggle('reduced-motion', reducedMotion);
  body.classList.add('demo-ready');
  window.demoShellStatus = {
    ready: true,
    presenterMode: false,
    reducedMotion,
    shortcuts: ['H', 'F', '0', 'Escape', 'Arrow/WASD', 'Q/E', '+/-'],
  };

  syncViewState();
  const query = new URLSearchParams(location.search);
  const isDemoEntry = query.get('v')?.includes('demo');
  if (isDemoEntry && !query.has('view')) {
    document.querySelector('[data-view="overview"]')?.click();
  }
  if (query.get('presenter') === '1') setTimeout(() => setPresenterMode(true), 4700);
})();
