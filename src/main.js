import { state, BD, CHARTS } from './state.js';
import { URLS, URLS_CONTRATOS } from './config.js';
import { nfdKey } from './utils.js';
import { resolveColumns, resolveParkingColumns, resolveBodegaColumns, resolveEvolColumns } from './columns.js';
import { calcIPC, precompute } from './data.js';
import { applyFilters, resetFilters, populateDropdowns, initVencFilter, initUFFilter, onVencSlider, onUFRange } from './filters.js';
import { renderStacking, renderSubterraneoStacking, injectBodegasIntoFloors, alignBodegaColumns, alignSubterraneoColumns } from './render/stacking.js';
import { updateMetrics } from './render/metrics.js';
import { renderEstatusTable, renderRawTable } from './render/tables.js';
import { initEvolSelects, initNetosSelects, renderEvolChart, renderNetosChart } from './render/charts/evolucion.js';
import { initVencChartSelects, renderVencChart } from './render/charts/vencimiento.js';
import { initRenewalChartSelects, renderRenewalChart } from './render/charts/renewal.js';
import { initSalidasChartSelects, renderSalidasChart, initMotivoChartSelects, renderMotivoChart, initDesgloseSalidasSelects, renderDesgloseSalidasChart } from './render/charts/salidas.js';
import { initEntradaChartSelects, renderEntradaChart, initFlujoChartSelects, renderFlujoChart } from './render/charts/entrada.js';
import { openExportPanel, initChartFontSliders, reapplyFontSize, updateChartLegendSize, updateChartDatalabelSize } from './export-chart.js';

function renderBothEvolCharts() {
  renderEvolChart();
  renderNetosChart();
  renderVencChart();
  renderRenewalChart();
  renderEntradaChart();
  renderFlujoChart();
  renderSalidasChart();
  renderMotivoChart();
  renderDesgloseSalidasChart();
}

function switchBuilding(id) {
  if (state.AB === id) return;
  state.AB = id;
  const color = id === 'irr' ? '#00D166' : '#34C1D6';
  document.documentElement.style.setProperty('--accent', color);
  document.querySelectorAll('.bldg-tab').forEach(t => {
    t.classList.toggle('active', t.id === 'bt-' + id);
    t.style.borderBottomColor = '';
    t.querySelector('.bldg-name').style.color = '';
  });
  resetFilters();
  renderStacking();
  applyFilters();
  updateMetrics(BD[state.AB].data, BD[state.AB].park, BD[state.AB].bod);
  renderEstatusTable(BD[state.AB].data, BD[state.AB].fields, BD[state.AB].refKey, BD[state.AB].refUF);
  renderRawTable('table2', { data: BD[state.AB].evol, meta: { fields: Object.keys(BD[state.AB].evol[0] || {}) } });
  renderRawTable('table3', { data: BD[state.AB].park, meta: { fields: Object.keys(BD[state.AB].park[0] || {}) } });
  renderRawTable('table4', { data: BD[state.AB].bod,  meta: { fields: Object.keys(BD[state.AB].bod[0]  || {}) } });
  renderRawTable('table5', { data: BD[state.AB].venc, meta: { fields: Object.keys(BD[state.AB].venc[0] || {}) } });
  renderRawTable('table6', { data: BD[state.AB].sal,  meta: { fields: Object.keys(BD[state.AB].sal[0]  || {}) } });
  renderSubterraneoStacking(BD[state.AB].park, BD[state.AB].bod);
  injectBodegasIntoFloors(BD[state.AB].bod);
  initEvolSelects(BD[state.AB].evol);
  initNetosSelects(BD[state.AB].evol);
  initVencChartSelects(BD[state.AB].venc);
  initRenewalChartSelects(BD[state.AB].venc);
  initEntradaChartSelects(BD[state.AB].contratos);
  initFlujoChartSelects(BD[state.AB].contratos);
  initSalidasChartSelects(BD[state.AB].sal);
  initMotivoChartSelects(BD[state.AB].sal);
  initDesgloseSalidasSelects(BD[state.AB].sal);
  renderBothEvolCharts();
  populateDropdowns(BD[state.AB].data);
  initVencFilter(BD[state.AB].data);
  initUFFilter(BD[state.AB].data);
  applyFilters();
}

function switchLegendTab(tab, btn) {
  document.querySelectorAll('.legend-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.legend-tab').forEach(b => b.classList.remove('active'));
  document.getElementById('legend-panel-' + tab).classList.add('active');
  btn.classList.add('active');
}

function showTab(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  btn.classList.add('active');
  if (id === 'evolucion') renderBothEvolCharts();
}

async function exportStackingPDF() {
  const btn = document.getElementById('btn-export-pdf');
  btn.disabled = true;
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Generando…`;

  const panelEl  = document.getElementById('panel-stacking');
  const leftEl   = document.querySelector('.stacking-left');
  const wrapEl   = document.querySelector('.stacking-wrap');
  const sidebar  = document.querySelector('.filters-panel');
  const tooltip  = document.getElementById('unit-tt');

  const origPanel  = { overflow: panelEl.style.overflow, height: panelEl.style.height };
  const origLeft   = { overflow: leftEl.style.overflow };
  const origWrap   = { overflow: wrapEl.style.overflow, height: wrapEl.style.height, flex: wrapEl.style.flex };
  const origSidebar = sidebar.style.display;

  function restoreStyles() {
    panelEl.style.overflow  = origPanel.overflow;
    panelEl.style.height    = origPanel.height;
    leftEl.style.overflow   = origLeft.overflow;
    wrapEl.style.overflow   = origWrap.overflow;
    wrapEl.style.height     = origWrap.height;
    wrapEl.style.flex       = origWrap.flex;
    sidebar.style.display   = origSidebar;
  }

  try {
    panelEl.style.overflow = 'visible';
    panelEl.style.height   = 'auto';
    leftEl.style.overflow  = 'visible';
    wrapEl.style.overflow  = 'visible';
    wrapEl.style.height    = 'auto';
    wrapEl.style.flex      = 'none';
    sidebar.style.display  = 'none';
    if (tooltip) tooltip.style.display = 'none';

    await new Promise(r => setTimeout(r, 120));

    const canvas = await html2canvas(leftEl, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#f0f4f8',
      removeContainer: true
    });

    restoreStyles();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    const pageW  = pdf.internal.pageSize.getWidth();
    const pageH  = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const headerH = 22;

    const imgAspect = canvas.width / canvas.height;
    let imgW = pageW - margin * 2;
    let imgH = imgW / imgAspect;

    if (imgH > pageH - headerH - margin) {
      imgH = pageH - headerH - margin;
      imgW = imgH * imgAspect;
    }

    const bldgName = state.AB === 'irr' ? 'INSITU IRARRÁZAVAL' : 'INSITU ECHAURREN';
    const accentColor = state.AB === 'irr' ? [0, 209, 102] : [52, 193, 214];
    const dateStr = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });

    pdf.setDrawColor(...accentColor);
    pdf.setLineWidth(0.8);
    pdf.line(margin, 8, pageW - margin, 8);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.setTextColor(26, 35, 50);
    pdf.text(`${bldgName}  —  Stacking Plan`, margin, 15);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(138, 155, 176);
    pdf.text(dateStr, margin, 20);

    const xOffset = (pageW - imgW) / 2;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, headerH, imgW, imgH);

    const filename = `stacking_${state.AB}_${new Date().toISOString().slice(0, 10)}.pdf`;
    pdf.save(filename);

  } catch (err) {
    console.error('Error exportando PDF:', err);
    restoreStyles();
    alert('Error al generar el PDF. Revisa la consola (F12).');
  }

  btn.disabled = false;
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar PDF`;
}

// ── Copiar gráfico individual al portapapeles ───────────────────────────────
const ICON_COPY  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

async function copyChartCard(btn) {
  btn.disabled = true;
  const card = btn.closest('.evol-card');
  try {
    const canvas = await html2canvas(card, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    canvas.toBlob(async blob => {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        btn.innerHTML = ICON_CHECK;
        setTimeout(() => { btn.disabled = false; btn.innerHTML = ICON_COPY; }, 2000);
      } catch {
        alert('El navegador no permite copiar imágenes al portapapeles desde este contexto (requiere HTTPS).');
        btn.disabled = false; btn.innerHTML = ICON_COPY;
      }
    }, 'image/png');
  } catch (err) {
    console.error('Error copiando gráfico:', err);
    btn.disabled = false; btn.innerHTML = ICON_COPY;
  }
}

// ── Pinch-to-zoom stacking (mobile/tablet) ─────────────────────────────────
(function initStackingPinchZoom() {
  const wrap  = document.querySelector('.stacking-wrap');
  const inner = document.getElementById('stacking-zoom-inner');
  if (!wrap || !inner) return;

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 1.0;
  let startDist  = 0;
  let startZoom  = 1.0;
  let curZoom    = 1.0;

  function dist(t) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  wrap.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      startDist = dist(e.touches);
      startZoom = curZoom;
    }
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    if (e.touches.length !== 2) return;
    e.preventDefault(); // evita scroll de página durante pinch
    const scale = dist(e.touches) / startDist;
    curZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, startZoom * scale));
    inner.style.zoom = curZoom;
  }, { passive: false });

  wrap.addEventListener('touchend', e => {
    if (e.touches.length < 2) { startDist = 0; alignBodegaColumns(); alignSubterraneoColumns(); }
  }, { passive: true });
})();

// ── Cierra tooltips de Chart.js al tocar fuera del canvas en touch ──────────
document.addEventListener('touchstart', e => {
  if (e.target.tagName === 'CANVAS') return;
  Object.values(CHARTS).forEach(chart => {
    if (!chart) return;
    chart.tooltip.setActiveElements([], {});
    chart.update('none');
  });
}, { passive: true });

Chart.register(ChartDataLabels);

// Exponer funciones al scope global para los handlers inline del HTML
window.switchBuilding    = switchBuilding;
window.switchLegendTab   = switchLegendTab;
window.copyChartCard   = copyChartCard;
window.showTab            = showTab;
window.exportStackingPDF  = exportStackingPDF;
window.applyFilters       = applyFilters;
window.resetFilters       = resetFilters;
window.onVencSlider       = onVencSlider;
window.onUFRange          = onUFRange;
// Wraps de render: reaplican tamaño de fuente tras cada re-render
function _wrap(fn, key)  { return (...a) => { fn(...a); reapplyFontSize(key); }; }
window.renderEvolChart       = _wrap(renderEvolChart,       'evol');
window.renderBothEvolCharts  = () => { renderEvolChart(); reapplyFontSize('evol'); renderNetosChart(); reapplyFontSize('netos'); };
window.renderNetosChart      = _wrap(renderNetosChart,      'netos');
window.renderVencChart       = _wrap(renderVencChart,       'venc');
window.renderRenewalChart    = _wrap(renderRenewalChart,    'renewal');
window.renderEntradaChart    = _wrap(renderEntradaChart,    'entrada');
window.renderFlujoChart      = _wrap(renderFlujoChart,      'termino');
window.renderSalidasChart    = _wrap(renderSalidasChart,    'salidas');
window.renderMotivoChart     = _wrap(renderMotivoChart,     'motivo');
window.renderDesgloseSalidasChart = _wrap(renderDesgloseSalidasChart, 'desglose');
window.openExportPanel       = openExportPanel;

// Inicializar sliders de fuente en cards de evolución
document.addEventListener('DOMContentLoaded', initChartFontSliders);

// ── Bootstrap ──────────────────────────────────────────────────────────────

renderStacking();

// Fase 1 IRR: carga ESTATUS ACTUAL → colorea stacking inmediatamente
fetch(URLS.irr[0]).then(r => r.text()).then(csv => {
  const p1i = Papa.parse(csv.trim(), {header:true, skipEmptyLines:true});
  BD.irr.data   = p1i.data;
  BD.irr.fields = p1i.meta.fields;
  const unidadCol = p1i.meta.fields.find(h => nfdKey(h) === 'UNIDAD') || 'Unidad';
  p1i.data.forEach(row => { const n = parseInt((row[unidadCol]||'').trim()); if (!isNaN(n)) BD.irr.umap[n] = row; });
  resolveColumns(p1i.meta.fields);
  populateDropdowns(BD.irr.data);
  renderStacking();
  applyFilters();
}).catch(err => console.error('Error cargando ESTATUS IRR:', err));

// Fase 1 ECH: carga ESTATUS ACTUAL → tiene datos listos para cuando el usuario cambie
fetch(URLS.ech[0]).then(r => r.text()).then(csv => {
  const p1e = Papa.parse(csv.trim(), {header:true, skipEmptyLines:true});
  BD.ech.data   = p1e.data;
  BD.ech.fields = p1e.meta.fields;
  const unidadCol = p1e.meta.fields.find(h => nfdKey(h) === 'UNIDAD') || 'Unidad';
  p1e.data.forEach(row => { const n = parseInt((row[unidadCol]||'').trim()); if (!isNaN(n)) BD.ech.umap[n] = row; });
  if (state.AB === 'ech') {
    resolveColumns(p1e.meta.fields);
    populateDropdowns(BD.ech.data);
    renderStacking();
    applyFilters();
  }
}).catch(err => console.error('Error cargando ESTATUS ECH:', err));

// Fase 2 IRR: resto de hojas en paralelo
Promise.all(URLS.irr.slice(1).map(u => fetch(u).then(r => r.text())))
  .then(async ([c2i,c3i,c4i,c5i,c6i]) => {
    const p2i = Papa.parse(c2i.trim(), {header:true, skipEmptyLines:true});
    const p3i = Papa.parse(c3i.trim(), {header:true, skipEmptyLines:true});
    const p4i = Papa.parse(c4i.trim(), {header:true, skipEmptyLines:true});
    const p5i = Papa.parse(c5i.trim(), {header:true, skipEmptyLines:true});
    const p6i = Papa.parse(c6i.trim(), {header:true, skipEmptyLines:true});

    BD.irr.evol = p2i.data;
    BD.irr.park = p3i.data;
    BD.irr.bod  = p4i.data;
    BD.irr.venc = p5i.data;
    BD.irr.sal  = p6i.data;

    resolveParkingColumns(p3i.meta.fields);
    resolveBodegaColumns(p4i.meta.fields);
    resolveEvolColumns(p2i.meta.fields);

    const { refKey, refUF } = await calcIPC(BD.irr.data);
    BD.irr.refKey = refKey; BD.irr.refUF = refUF;
    precompute(BD.irr.data, refUF);

    if (state.AB === 'irr') {
      updateMetrics(BD.irr.data, BD.irr.park, BD.irr.bod);
      renderEstatusTable(BD.irr.data, BD.irr.fields, BD.irr.refKey, BD.irr.refUF);
      renderRawTable('table2', p2i);
      renderRawTable('table3', p3i);
      renderRawTable('table4', p4i);
      renderRawTable('table5', p5i);
      renderRawTable('table6', p6i);
      renderSubterraneoStacking(BD.irr.park, BD.irr.bod);
      initEvolSelects(BD.irr.evol);
      initNetosSelects(BD.irr.evol);
      initVencChartSelects(BD.irr.venc);
      initRenewalChartSelects(BD.irr.venc);
      initEntradaChartSelects(BD.irr.contratos);
      initFlujoChartSelects(BD.irr.contratos);
      initSalidasChartSelects(BD.irr.sal);
      initMotivoChartSelects(BD.irr.sal);
      initDesgloseSalidasSelects(BD.irr.sal);
      initVencFilter(BD.irr.data);
      initUFFilter(BD.irr.data);
      applyFilters();
      document.getElementById('ipc-notice').textContent = `UF ref (${refKey}): ${refUF?.toFixed(2) ?? '—'}`;
    }
  })
  .catch(err => console.error('Error cargando hojas secundarias IRR:', err));

// Fase 2 ECH: resto de hojas en paralelo
Promise.all(URLS.ech.slice(1).map(u => fetch(u).then(r => r.text())))
  .then(async ([c2e,c3e,c4e,c5e,c6e]) => {
    const p2e = Papa.parse(c2e.trim(), {header:true, skipEmptyLines:true});
    const p3e = Papa.parse(c3e.trim(), {header:true, skipEmptyLines:true});
    const p4e = Papa.parse(c4e.trim(), {header:true, skipEmptyLines:true});
    const p5e = Papa.parse(c5e.trim(), {header:true, skipEmptyLines:true});
    const p6e = Papa.parse(c6e.trim(), {header:true, skipEmptyLines:true});

    BD.ech.evol = p2e.data;
    BD.ech.park = p3e.data;
    BD.ech.bod  = p4e.data;
    BD.ech.venc = p5e.data;
    BD.ech.sal  = p6e.data;

    const { refKey: refKeyE, refUF: refUFE } = await calcIPC(BD.ech.data);
    BD.ech.refKey = refKeyE; BD.ech.refUF = refUFE;
    precompute(BD.ech.data, refUFE);

    if (state.AB === 'ech') {
      resolveParkingColumns(p3e.meta.fields);
      resolveBodegaColumns(p4e.meta.fields);
      resolveEvolColumns(p2e.meta.fields);
      updateMetrics(BD.ech.data, BD.ech.park, BD.ech.bod);
      renderEstatusTable(BD.ech.data, BD.ech.fields, BD.ech.refKey, BD.ech.refUF);
      renderRawTable('table2', p2e);
      renderRawTable('table3', p3e);
      renderRawTable('table4', p4e);
      renderRawTable('table5', p5e);
      renderRawTable('table6', p6e);
      renderSubterraneoStacking(BD.ech.park, BD.ech.bod);
      initEvolSelects(BD.ech.evol);
      initNetosSelects(BD.ech.evol);
      initVencChartSelects(BD.ech.venc);
      initRenewalChartSelects(BD.ech.venc);
      initEntradaChartSelects(BD.ech.contratos);
      initFlujoChartSelects(BD.ech.contratos);
      initSalidasChartSelects(BD.ech.sal);
      initMotivoChartSelects(BD.ech.sal);
      initDesgloseSalidasSelects(BD.ech.sal);
      initVencFilter(BD.ech.data);
      initUFFilter(BD.ech.data);
      applyFilters();
      document.getElementById('ipc-notice').textContent = `UF ref (${refKeyE}): ${refUFE?.toFixed(2) ?? '—'}`;
    }
  })
  .catch(err => console.error('Error cargando hojas secundarias ECH:', err));

// Parsea un CSV donde la primera fila podría ser un título vacío o decorativo.
// Busca la primera fila con suficientes celdas no vacías y la usa como encabezado.
function parseContratosCSV(csv) {
  const raw = Papa.parse(csv.trim(), { header: false, skipEmptyLines: false });
  const rows = raw.data;
  const headerIdx = 4; // fila 5 en Google Sheets (índice 0-based)
  const headers = rows[headerIdx].map(h => h.toString().trim());
  return rows.slice(headerIdx + 1)
    .filter(row => row.some(c => c && c.toString().trim()))
    .map(row => Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])));
}

// ── Hoja I. Contratos IRR ──────────────────────────────────────────────────
if (!URLS_CONTRATOS.irr.startsWith('PENDIENTE')) {
  fetch(URLS_CONTRATOS.irr).then(r => r.text()).then(csv => {
    BD.irr.contratos = parseContratosCSV(csv);
    if (state.AB === 'irr') {
      initEntradaChartSelects(BD.irr.contratos);
      initFlujoChartSelects(BD.irr.contratos);
      renderEntradaChart();
      renderFlujoChart();
    }
  }).catch(err => console.error('Error cargando I. Contratos IRR:', err));
}

// ── Hoja I. Contratos ECH ──────────────────────────────────────────────────
if (!URLS_CONTRATOS.ech.startsWith('PENDIENTE')) {
  fetch(URLS_CONTRATOS.ech).then(r => r.text()).then(csv => {
    BD.ech.contratos = parseContratosCSV(csv);
    if (state.AB === 'ech') {
      initEntradaChartSelects(BD.ech.contratos);
      initFlujoChartSelects(BD.ech.contratos);
      renderEntradaChart();
      renderFlujoChart();
    }
  }).catch(err => console.error('Error cargando I. Contratos ECH:', err));
}
