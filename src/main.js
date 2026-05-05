import { state, BD } from './state.js';
import { URLS } from './config.js';
import { nfdKey } from './utils.js';
import { resolveColumns, resolveParkingColumns, resolveBodegaColumns, resolveEvolColumns } from './columns.js';
import { calcIPC, precompute } from './data.js';
import { applyFilters, resetFilters, populateDropdowns, initVencFilter, initUFFilter, onVencSlider, onUFRange } from './filters.js';
import { renderStacking, renderSubterraneoStacking } from './render/stacking.js';
import { updateMetrics } from './render/metrics.js';
import { renderEstatusTable, renderRawTable } from './render/tables.js';
import { initEvolSelects, initNetosSelects, renderEvolChart, renderNetosChart } from './render/charts/evolucion.js';
import { initVencChartSelects, renderVencChart } from './render/charts/vencimiento.js';
import { initRenewalChartSelects, renderRenewalChart } from './render/charts/renewal.js';
import { initSalidasChartSelects, renderSalidasChart, initMotivoChartSelects, renderMotivoChart } from './render/charts/salidas.js';

function renderBothEvolCharts() {
  renderEvolChart();
  renderNetosChart();
  renderVencChart();
  renderRenewalChart();
  renderSalidasChart();
  renderMotivoChart();
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
  initEvolSelects(BD[state.AB].evol);
  initNetosSelects(BD[state.AB].evol);
  initVencChartSelects(BD[state.AB].venc);
  initRenewalChartSelects(BD[state.AB].venc);
  initSalidasChartSelects(BD[state.AB].sal);
  initMotivoChartSelects(BD[state.AB].sal);
  renderBothEvolCharts();
  populateDropdowns(BD[state.AB].data);
  initVencFilter(BD[state.AB].data);
  initUFFilter(BD[state.AB].data);
  applyFilters();
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

Chart.register(ChartDataLabels);

// Exponer funciones al scope global para los handlers inline del HTML
window.switchBuilding     = switchBuilding;
window.showTab            = showTab;
window.exportStackingPDF  = exportStackingPDF;
window.applyFilters       = applyFilters;
window.resetFilters       = resetFilters;
window.onVencSlider       = onVencSlider;
window.onUFRange          = onUFRange;
window.renderEvolChart    = renderEvolChart;
window.renderBothEvolCharts = renderBothEvolCharts;
window.renderNetosChart   = renderNetosChart;
window.renderVencChart    = renderVencChart;
window.renderRenewalChart = renderRenewalChart;
window.renderSalidasChart = renderSalidasChart;
window.renderMotivoChart  = renderMotivoChart;

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
      initSalidasChartSelects(BD.irr.sal);
      initMotivoChartSelects(BD.irr.sal);
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
      initSalidasChartSelects(BD.ech.sal);
      initMotivoChartSelects(BD.ech.sal);
      initVencFilter(BD.ech.data);
      initUFFilter(BD.ech.data);
      applyFilters();
      document.getElementById('ipc-notice').textContent = `UF ref (${refKeyE}): ${refUFE?.toFixed(2) ?? '—'}`;
    }
  })
  .catch(err => console.error('Error cargando hojas secundarias ECH:', err));
