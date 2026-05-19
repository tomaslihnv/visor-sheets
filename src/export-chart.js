import { CHARTS } from './state.js';

const ASPECT_RATIOS  = { auto: null, '6:1': 6 / 1, '4:1': 4 / 1, '3:1': 3 / 1, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 };
const EXPORT_WIDTH   = 2560;
const PREVIEW_WIDTH  = 1280;

const ICON_DOWNLOAD = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_COPY     = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_EXPORT   = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const ICON_EYE      = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

// ── Font state per chart ───────────────────────────────────────────────────────
const _fontSizes = {}; // un solo tamaño controla todo

export function initChartFontSliders() {
  document.querySelectorAll('[data-chart-key]').forEach(card => {
    const key      = card.dataset.chartKey;
    const controls = card.querySelector('.evol-card-controls');
    if (!controls || controls.querySelector('.chart-font-wrap')) return;

    controls.appendChild(_makeSlider('Texto', 6, 52, 11,
      size => updateChartFontSize(key, size)
    ));
  });
}

function _makeSlider(label, min, max, def, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'evol-range chart-font-wrap';
  wrap.innerHTML = `
    <span class="chart-font-lbl">${label}</span>
    <input class="chart-font-slider" type="range" min="${min}" max="${max}" value="${def}" step="1">
    <span class="chart-font-val">${def}px</span>
  `;
  const slider = wrap.querySelector('.chart-font-slider');
  const valEl  = wrap.querySelector('.chart-font-val');
  slider.addEventListener('input', () => {
    const size = parseInt(slider.value);
    valEl.textContent = size + 'px';
    onChange(size);
  });
  return wrap;
}

export function updateChartFontSize(chartKey, size) {
  _fontSizes[chartKey] = size;
  _applyAllFonts(chartKey, size);
}

export function reapplyFontSize(chartKey) {
  if (_fontSizes[chartKey]) _applyAllFonts(chartKey, _fontSizes[chartKey]);
}

function _applyAllFonts(chartKey, size) {
  const chart = CHARTS[chartKey];
  if (!chart) return;
  const font   = { size, family: "'IBM Plex Sans', sans-serif" };
  const fontSm = { size: Math.max(7, Math.round(size * 0.9)), family: "'IBM Plex Sans', sans-serif" };

  if (chart.options.plugins?.legend?.labels)
    chart.options.plugins.legend.labels.font = font;

  if (chart.options.plugins?.datalabels)
    chart.options.plugins.datalabels.font = font;

  chart.data.datasets.forEach(ds => {
    if (ds.datalabels)
      ds.datalabels.font = { ...(ds.datalabels.font || {}), ...font };
  });

  if (chart.options.scales)
    Object.values(chart.options.scales).forEach(s => {
      if (s.ticks)          s.ticks.font = fontSm;
      if (s.title?.display) s.title.font = font;
    });

  chart.update('none');
  _notifyPreview(chartKey);
}

// ── Export panel ───────────────────────────────────────────────────────────────
let _panel     = null;
let _onOutside = null;

export function openExportPanel(btn) {
  if (_panel && _panel._trigger === btn) { closePanel(); return; }
  closePanel();

  const card = btn.closest('[data-chart-key]');
  if (!card) return;
  const chartKey = card.dataset.chartKey;
  const title    = card.querySelector('.evol-card-title')?.textContent || chartKey;

  _panel = buildPanel(chartKey, title);
  _panel._trigger = btn;
  document.body.appendChild(_panel);
  positionPanel(_panel, btn);
  requestAnimationFrame(() => _panel?.classList.add('ep-visible'));

  _onOutside = e => {
    if (_panel && !_panel.contains(e.target) && e.target !== btn) closePanel();
  };
  setTimeout(() => document.addEventListener('mousedown', _onOutside), 60);
}

function closePanel() {
  if (_panel) { _panel.remove(); _panel = null; }
  if (_onOutside) { document.removeEventListener('mousedown', _onOutside); _onOutside = null; }
}

function buildPanel(chartKey, title) {
  let ratio   = 'auto';
  let bgColor = '#ffffff';

  const panel = document.createElement('div');
  panel.className = 'ep';
  panel.innerHTML = `
    <div class="ep-title">${ICON_EXPORT} Exportar gráfico</div>

    <div class="ep-label">Proporción de salida</div>
    <div class="ep-pills ep-pills-wrap" id="ep-ratio">
      <button class="ep-pill active" data-r="auto">Auto</button>
      <button class="ep-pill" data-r="6:1" title="Ultra panorámica">6:1</button>
      <button class="ep-pill" data-r="4:1" title="Súper panorámica">4:1</button>
      <button class="ep-pill" data-r="3:1">3:1</button>
      <button class="ep-pill" data-r="16:9">16:9</button>
      <button class="ep-pill" data-r="4:3">4:3</button>
      <button class="ep-pill" data-r="1:1">1:1</button>
    </div>

    <div class="ep-label">Fondo</div>
    <div class="ep-pills" id="ep-bg">
      <button class="ep-pill active" data-bg="white">Blanco</button>
      <button class="ep-pill" data-bg="transparent">Transparente</button>
    </div>

    <div class="ep-hint">Ajusta <strong>Leyenda y ejes</strong> y <strong>Etiquetas</strong> sobre el gráfico para previsualizar.</div>

    <div class="ep-actions">
      <button class="ep-btn-prev">${ICON_EYE} Vista previa</button>
    </div>
    <div class="ep-actions" style="margin-top:6px">
      <button class="ep-btn-dl">${ICON_DOWNLOAD} Descargar</button>
      <button class="ep-btn-cp">${ICON_COPY} Copiar</button>
    </div>
    <div class="ep-status"></div>
  `;

  panel.querySelectorAll('#ep-ratio .ep-pill').forEach(b => {
    b.addEventListener('click', () => {
      panel.querySelectorAll('#ep-ratio .ep-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ratio = b.dataset.r;
    });
  });

  panel.querySelectorAll('#ep-bg .ep-pill').forEach(b => {
    b.addEventListener('click', () => {
      panel.querySelectorAll('#ep-bg .ep-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      bgColor = b.dataset.bg === 'white' ? '#ffffff' : 'transparent';
    });
  });

  const status = panel.querySelector('.ep-status');
  function setStatus(msg, ok = true) {
    status.textContent = msg;
    status.style.color = ok ? '#8a6830' : '#c0674d';
    setTimeout(() => { if (status) status.textContent = ''; }, 3500);
  }

  panel.querySelector('.ep-btn-prev').addEventListener('click', () => {
    closePanel();
    openPreviewModal(chartKey, title, ratio, bgColor);
  });

  panel.querySelector('.ep-btn-dl').addEventListener('click', async () => {
    setStatus('Generando…');
    try {
      const blob = await renderCapture(chartKey, EXPORT_WIDTH, ratio, bgColor);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `grafico-${chartKey}-${ratio.replace(':', 'x')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus('✓ Descargando PNG');
    } catch (e) { setStatus(e.message || 'Error al exportar', false); }
  });

  panel.querySelector('.ep-btn-cp').addEventListener('click', async () => {
    setStatus('Generando…');
    try {
      const blob = await renderCapture(chartKey, EXPORT_WIDTH, ratio, bgColor);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setStatus('✓ Copiado al portapapeles');
    } catch (e) {
      setStatus(
        e.name === 'NotAllowedError' || e.message?.includes('clipboard')
          ? 'Requiere HTTPS para copiar' : e.message || 'Error al exportar',
        false
      );
    }
  });

  return panel;
}

// ── Preview modal ──────────────────────────────────────────────────────────────
let _modal = null;

function openPreviewModal(chartKey, title, initRatio, initBg) {
  if (_modal) { _modal.remove(); _modal = null; }

  let ratio   = initRatio;
  let bgColor = initBg;
  let _debounce = null;

  const modal = document.createElement('div');
  modal.className = 'ep-modal';
  modal.innerHTML = `
    <div class="ep-modal-inner">
      <div class="ep-modal-toolbar">
        <span class="ep-modal-title">${title}</span>

        <div class="ep-modal-controls">
          <div class="ep-pills ep-pills-sm" id="mep-ratio">
            <button class="ep-pill active" data-r="auto">Auto</button>
            <button class="ep-pill" data-r="6:1" title="Ultra panorámica">6:1</button>
      <button class="ep-pill" data-r="4:1" title="Súper panorámica">4:1</button>
            <button class="ep-pill" data-r="3:1">3:1</button>
            <button class="ep-pill" data-r="16:9">16:9</button>
            <button class="ep-pill" data-r="4:3">4:3</button>
            <button class="ep-pill" data-r="1:1">1:1</button>
          </div>
          <div class="ep-pills ep-pills-sm" id="mep-bg">
            <button class="ep-pill active" data-bg="white">Blanco</button>
            <button class="ep-pill" data-bg="transparent">Transparente</button>
          </div>
        </div>

        <div class="ep-modal-actions">
          <button class="ep-btn-dl ep-btn-sm" id="mep-dl">${ICON_DOWNLOAD} Descargar</button>
          <button class="ep-btn-cp ep-btn-sm" id="mep-cp">${ICON_COPY} Copiar</button>
          <button class="ep-modal-close" id="mep-close">✕</button>
        </div>
      </div>

      <div class="ep-modal-stage">
        <div class="ep-modal-checker" id="mep-checker">
          <img class="ep-modal-img" id="mep-img" alt="Vista previa">
          <div class="ep-modal-spinner" id="mep-spinner">Generando…</div>
        </div>
      </div>

      <div class="ep-modal-status" id="mep-status"></div>
    </div>
  `;

  document.body.appendChild(modal);
  _modal = modal;
  requestAnimationFrame(() => modal.classList.add('ep-modal-visible'));

  const img     = modal.querySelector('#mep-img');
  const spinner = modal.querySelector('#mep-spinner');
  const checker = modal.querySelector('#mep-checker');
  const mstatus = modal.querySelector('#mep-status');

  function setMStatus(msg, ok = true) {
    mstatus.textContent = msg;
    mstatus.style.color = ok ? '#8a6830' : '#c0674d';
    setTimeout(() => { if (mstatus) mstatus.textContent = ''; }, 3500);
  }

  async function refreshPreview() {
    spinner.style.display = 'flex';
    img.style.opacity = '0.3';
    try {
      const blob = await renderCapture(chartKey, PREVIEW_WIDTH, ratio, bgColor);
      const url  = URL.createObjectURL(blob);
      if (img._prevUrl) URL.revokeObjectURL(img._prevUrl);
      img._prevUrl    = url;
      img.src         = url;
      img.style.opacity = '1';
      // apply checker background hint
      checker.style.background = bgColor === 'transparent'
        ? 'repeating-conic-gradient(#ccc5b5 0% 25%, #f2ede5 0% 50%) 0 0 / 20px 20px'
        : bgColor;
    } catch (e) {
      setMStatus(e.message || 'Error al previsualizar', false);
    } finally {
      spinner.style.display = 'none';
    }
  }

  function scheduleRefresh() {
    clearTimeout(_debounce);
    _debounce = setTimeout(refreshPreview, 120);
  }

  // Ratio pills
  modal.querySelectorAll('#mep-ratio .ep-pill').forEach(b => {
    b.addEventListener('click', () => {
      modal.querySelectorAll('#mep-ratio .ep-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      ratio = b.dataset.r;
      scheduleRefresh();
    });
  });

  // Bg pills
  modal.querySelectorAll('#mep-bg .ep-pill').forEach(b => {
    b.addEventListener('click', () => {
      modal.querySelectorAll('#mep-bg .ep-pill').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      bgColor = b.dataset.bg === 'white' ? '#ffffff' : 'transparent';
      scheduleRefresh();
    });
  });

  // Export
  modal.querySelector('#mep-dl').addEventListener('click', async () => {
    setMStatus('Generando…');
    try {
      const blob = await renderCapture(chartKey, EXPORT_WIDTH, ratio, bgColor);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `grafico-${chartKey}-${ratio.replace(':', 'x')}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setMStatus('✓ Descargando PNG a 2560px');
    } catch (e) { setMStatus(e.message || 'Error', false); }
  });

  modal.querySelector('#mep-cp').addEventListener('click', async () => {
    setMStatus('Generando…');
    try {
      const blob = await renderCapture(chartKey, EXPORT_WIDTH, ratio, bgColor);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setMStatus('✓ Copiado al portapapeles (2560px)');
    } catch (e) {
      setMStatus(
        e.name === 'NotAllowedError' ? 'Requiere HTTPS para copiar' : e.message || 'Error',
        false
      );
    }
  });

  modal.querySelector('#mep-close').addEventListener('click', () => {
    modal.remove(); _modal = null;
  });

  // Close on backdrop click
  modal.addEventListener('click', e => {
    if (e.target === modal) { modal.remove(); _modal = null; }
  });

  // Escape key
  function onKey(e) {
    if (e.key === 'Escape') { modal.remove(); _modal = null; document.removeEventListener('keydown', onKey); }
  }
  document.addEventListener('keydown', onKey);

  // Register so sliders can trigger refresh
  modal._refresh = scheduleRefresh;
  modal._chartKey = chartKey;

  // Initial render
  refreshPreview();
}

// Called by _applyLegendFont / _applyDatalabelFont to update open modal
function _notifyPreview(chartKey) {
  if (_modal && _modal._chartKey === chartKey && _modal._refresh) {
    _modal._refresh();
  }
}

// ── Core capture (resize-copy-restore) ────────────────────────────────────────
async function renderCapture(chartKey, targetWidth, ratioKey, bgColor) {
  const chart = CHARTS[chartKey];
  if (!chart) throw new Error('Gráfico no disponible todavía');

  const origCanvas = chart.canvas;
  const container  = origCanvas.parentNode;
  const origW      = container.offsetWidth;
  const origH      = container.offsetHeight;
  const origStyleW = container.style.width;
  const origStyleH = container.style.height;

  const aspectRatio = ASPECT_RATIOS[ratioKey];
  const exportW     = targetWidth;
  const exportH     = aspectRatio
    ? Math.round(exportW / aspectRatio)
    : Math.round(exportW * (origH / origW));

  // Resize
  container.style.width  = exportW + 'px';
  container.style.height = exportH + 'px';
  chart.resize();

  // Copy to export canvas
  const exportCanvas    = document.createElement('canvas');
  exportCanvas.width    = origCanvas.width;
  exportCanvas.height   = origCanvas.height;
  const ctx = exportCanvas.getContext('2d');
  if (bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  }
  ctx.drawImage(origCanvas, 0, 0);

  // Restore
  container.style.width  = origStyleW;
  container.style.height = origStyleH;
  chart.resize();

  return new Promise((resolve, reject) => {
    exportCanvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('No se pudo generar el PNG')),
      'image/png'
    );
  });
}

function positionPanel(panel, btn) {
  const rect   = btn.getBoundingClientRect();
  const panelW = 220;
  let left = rect.right - panelW;
  if (left < 8) left = 8;
  if (left + panelW > window.innerWidth - 8) left = window.innerWidth - panelW - 8;
  panel.style.left = left + 'px';
  panel.style.top  = (rect.bottom + 6) + 'px';
}
