import { state, BD, CHARTS } from './state.js';
import { URLS, URLS_CONTRATOS, LAYOUT_IRR, LAYOUT_ECH, MAX_COL_IRR, MAX_COL_ECH, CAT_STYLE } from './config.js';
import { getCategory, getParkingCategory, getBodegaCategory } from './categories.js';
import { DRIVE_FOLDERS_ECH, DRIVE_FOLDERS_ECH_ESTAC, DRIVE_FOLDERS_ECH_BOD, DRIVE_FOLDERS_IRR, DRIVE_FOLDERS_IRR_ESTAC, DRIVE_FOLDERS_IRR_BOD, driveUrl } from './drive.js';
import { nfdKey } from './utils.js';
import { resolveColumns, resolveParkingColumns, resolveBodegaColumns, resolveEvolColumns, pcol, bcol } from './columns.js';
import { calcIPC, precompute } from './data.js';
import { applyFilters, resetFilters, populateDropdowns, initVencFilter, initUFFilter, onVencSlider, onUFRange } from './filters.js';
import { renderStacking, renderSubterraneoStacking, injectBodegasIntoFloors, alignBodegaColumns, alignSubterraneoColumns } from './render/stacking.js';
import { updateMetrics } from './render/metrics.js';
import { renderEstatusTable, renderRawTable } from './render/tables.js';
import { openEstatusExportModal, closeEstatusExportModal, toggleAllExportCols, runEstatusExport } from './render/export-table.js';
import { initEvolSelects, initNetosSelects, renderEvolChart, renderNetosChart } from './render/charts/evolucion.js';
import { initVencChartSelects, renderVencChart } from './render/charts/vencimiento.js';
import { initRenewalChartSelects, renderRenewalChart } from './render/charts/renewal.js';
import { initSalidasChartSelects, renderSalidasChart, initMotivoChartSelects, renderMotivoChart, initDesgloseSalidasSelects, renderDesgloseSalidasChart } from './render/charts/salidas.js';
import { initEntradaChartSelects, renderEntradaChart, initFlujoChartSelects, renderFlujoChart } from './render/charts/entrada.js';
import { renderPermanenciaChart, initPermanenciaSelects } from './render/charts/permanencia.js';
import { renderAuditoria, resetAuditoria } from './render/auditoria.js';
import { renderDirectorio } from './render/directorio.js';
import { URLS_REPARACION } from './config.js';
import { openExportPanel, initChartFontSliders, reapplyFontSize } from './export-chart.js';

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
  renderPermanenciaChart();
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
  initPermanenciaSelects(BD[state.AB].data);
  resetAuditoria();
  renderBothEvolCharts();
  renderAuditoria();
  if (document.getElementById('panel-caracterizacion')?.classList.contains('active')) renderDirectorio();
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
  if (id === 'evolucion')  renderBothEvolCharts();
  if (id === 'auditoria')  renderAuditoria();
  if (id === 'caracterizacion') renderDirectorio();
}

async function exportStackingPDF() {
  const btn = document.getElementById('btn-export-pdf');
  btn.disabled = true;
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> Generando…`;

  try {
    const opts = await showPdfModal();
    if (!opts) { btn.disabled = false; btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar PDF`; return; }
    const includeLinks = opts.includeLinks;
    const ab       = state.AB;
    const layout   = ab === 'irr' ? LAYOUT_IRR  : LAYOUT_ECH;
    const maxCol   = ab === 'irr' ? MAX_COL_IRR : MAX_COL_ECH;
    const umap     = BD[ab].umap;
    const driveMap = includeLinks ? (ab === 'ech' ? DRIVE_FOLDERS_ECH : DRIVE_FOLDERS_IRR) : {};

    // ── Calcular métricas ────────────────────────────────────────────────────
    let dContr = 0, dRC = 0, dVac = 0, dPilot = 0;
    const tipMap = {}, orientMap = {}, colOrient = {};
    layout.forEach(floor => floor.cells.forEach(cell => {
      const u   = umap[cell.n];
      const cat = getCategory(u);
      if      (cat === 'contrato') dContr++;
      else if (cat === 'rc')       dRC++;
      else if (cat === 'vacante')  dVac++;
      else if (cat === 'piloto')   dPilot++;
      if (u && cat !== 'piloto' && cat !== 'default') {
        const tipo = (u['Tipo'] || '').trim() || '—';
        if (!tipMap[tipo]) tipMap[tipo] = { total: 0, rented: 0 };
        tipMap[tipo].total++;
        if (cat === 'contrato' || cat === 'rc') tipMap[tipo].rented++;
        const o = (u['Orientación'] || '').trim().toUpperCase();
        if (o) orientMap[o] = (orientMap[o] || 0) + 1;
      }
      // orientación por columna (primera aparición por col, para header)
      if (colOrient[cell.c] === undefined) {
        const o = (u?.['Orientación'] || '').trim().toUpperCase();
        colOrient[cell.c] = o || null;
      }
    }));
    const dBase    = dContr + dRC + dVac;
    const dEnRenta = dContr + dRC;
    const dOccPct  = dBase > 0 ? Math.round(dEnRenta / dBase * 100) + '%' : '—';

    const eOccPctEl = document.getElementById('occ-estac');
    const bOccPctEl = document.getElementById('occ-bod');
    const eOccPct   = eOccPctEl?.textContent || '—';
    const bOccPct   = bOccPctEl?.textContent || '—';

    const tipRows    = Object.entries(tipMap).sort((a, b) => b[1].total - a[1].total);
    const orientRows = Object.entries(orientMap).sort((a, b) => b[1] - a[1]);
    const ORIENT_LABEL = { N:'Norte', S:'Sur', O:'Oriente', P:'Poniente', NP:'Norte-Pon.', SP:'Sur-Pon.' };

    // ── Orientación por columna (para header) ────────────────────────────────
    // Segmentos consecutivos de igual orientación
    const orientSegs = []; // [{label, fromCol, span}]
    let segStart = 1, segOrient = colOrient[1] || '';
    for (let c = 2; c <= maxCol; c++) {
      const cur = colOrient[c] || '';
      if (cur !== segOrient) {
        orientSegs.push({ label: ORIENT_LABEL[segOrient] || segOrient, fromCol: segStart, span: c - segStart });
        segStart = c; segOrient = cur;
      }
    }
    orientSegs.push({ label: ORIENT_LABEL[segOrient] || segOrient, fromCol: segStart, span: maxCol - segStart + 1 });

    // Límites de columna donde cambia la orientación (para líneas divisoras)
    const orientBoundariesPDF = new Set();
    for (let c = 2; c <= maxCol; c++) {
      if ((colOrient[c] ?? null) !== (colOrient[c-1] ?? null)) orientBoundariesPDF.add(c);
    }

    // Bodegas sobre nivel de suelo (piso > 0), agrupadas por piso
    const aboveBodByPiso = {};
    (BD[ab].bod || []).forEach(row => {
      const p = parseInt((row[bcol.piso] || '').toString().trim());
      if (!isNaN(p) && p > 0) {
        if (!aboveBodByPiso[p]) aboveBodByPiso[p] = [];
        aboveBodByPiso[p].push(row);
      }
    });
    const maxBodPerFloor = Object.values(aboveBodByPiso).reduce((m, a) => Math.max(m, a.length), 0);

    // ── jsPDF setup ──────────────────────────────────────────────────────────
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

    const pageW    = doc.internal.pageSize.getWidth();   // 420mm
    const pageH    = doc.internal.pageSize.getHeight();  // 297mm
    const margin   = 10;
    const headerH  = 25;
    const legendH  = 14;
    const metricsW = 46;
    const metGap   = 5;
    const lblW     = 11;
    const gap      = 0.5;
    const orientH  = 6;

    const stackX    = margin + metricsW + metGap;
    const availWFull = pageW - stackX - margin - lblW - gap;
    const availH    = pageH - margin - headerH - orientH - legendH - margin;
    const nFloors   = layout.length;

    // Paso 1: estimar cellW sin reserva de bodegas, para calcular cuánto espacio necesitan
    const cellWest  = Math.min(
      (availWFull - (maxCol - 1) * gap) / maxCol,
      ((availH - (nFloors - 1) * gap) / nFloors) * (34 / 28)
    );
    const bodRightW = maxBodPerFloor > 0 ? (7 + maxBodPerFloor * (cellWest + gap)) : 0;

    // Paso 2: recalcular con espacio reservado para bodegas
    const availW   = availWFull - bodRightW;
    const cellWbyW = (availW - (maxCol - 1) * gap) / maxCol;
    const cellHbyH = (availH - (nFloors - 1) * gap) / nFloors;
    const cellW    = Math.min(cellWbyW, cellHbyH * (34 / 28));
    const cellH    = cellW * (28 / 34);

    const gridW    = maxCol * cellW + (maxCol - 1) * gap;
    const gridH    = nFloors * cellH + (nFloors - 1) * gap;
    const cellsX   = stackX + lblW + gap + (availW - gridW) / 2;
    const cellsY   = headerH + orientH + (availH - gridH) / 2;

    const rgb = hex => {
      const h = hex.replace('#', '');
      return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
    };

    // ── Header ───────────────────────────────────────────────────────────────
    const bldgName  = ab === 'irr' ? 'INSITU IRARRÁZAVAL' : 'INSITU ECHAURREN';
    const accentRgb = ab === 'irr' ? [0,209,102] : [52,193,214];
    const dateStr   = new Date().toLocaleDateString('es-CL', { day:'2-digit', month:'long', year:'numeric' });

    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0.8);
    doc.line(margin, 8, pageW - margin, 8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(26, 35, 50);
    doc.text(`${bldgName}  —  Stacking Plan`, margin, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(138, 155, 176);
    doc.text(dateStr, margin, 21);

    // ── Panel métricas (izquierda) ───────────────────────────────────────────
    const mx  = margin;
    let   my  = headerH + 2;
    const mW  = metricsW;

    // Fondo panel
    doc.setFillColor(249, 245, 238);
    doc.setDrawColor(227, 219, 208);
    doc.setLineWidth(0.3);
    doc.roundedRect(mx, my - 1, mW, pageH - my - margin - legendH + 1, 2, 2, 'FD');

    const mRow = (label, value, bold = false) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 110, 95);
      doc.text(label, mx + 3, my);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      doc.setFontSize(bold ? 9 : 7.5);
      doc.setTextColor(26, 35, 50);
      doc.text(String(value), mx + mW - 3, my, { align: 'right' });
      my += 6;
    };
    const mSep = () => {
      doc.setDrawColor(220, 212, 200);
      doc.setLineWidth(0.2);
      doc.line(mx + 3, my - 1, mx + mW - 3, my - 1);
      my += 2;
    };
    const mTitle = (label) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.5);
      doc.setTextColor(180, 165, 140);
      doc.text(label.toUpperCase(), mx + 3, my);
      my += 4.5;
    };

    my += 2;
    mTitle('Departamentos');
    mRow('Contratos',  dContr,  true);
    mRow('Renta corta', dRC);
    mRow('Vacantes',   dVac);
    mRow('Pilotos',    dPilot);
    mSep();
    mTitle('Ocupación');
    mRow('Depto.',     dOccPct, true);
    mRow(`(${dEnRenta} un.)`, '');
    mRow('Estac.',     eOccPct);
    mRow('Bodega',     bOccPct);
    mSep();
    mTitle('Tipología');
    tipRows.forEach(([tipo, { total, rented }]) => {
      const pct = total > 0 ? Math.round(rented / total * 100) + '%' : '—';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 110, 95);
      doc.text(tipo, mx + 3, my);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(26, 35, 50);
      doc.text(`${rented}/${total}`, mx + mW - 3, my, { align: 'right' });
      my += 5;
    });
    mSep();
    mTitle('Orientación');
    orientRows.forEach(([o, count]) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(120, 110, 95);
      doc.text(ORIENT_LABEL[o] || o, mx + 3, my);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(26, 35, 50);
      doc.text(String(count), mx + mW - 3, my, { align: 'right' });
      my += 5;
    });

    // ── Header orientación (encima del stacking) ──────────────────────────────
    const orientY = headerH + 1;
    const orientBg = rgb('#ccc5b5');
    orientSegs.forEach(({ label, fromCol, span }) => {
      const segX = cellsX + (fromCol - 1) * (cellW + gap);
      const segW = span * cellW + (span - 1) * gap;
      doc.setFillColor(...orientBg);
      doc.setDrawColor(...orientBg);
      doc.setLineWidth(0);
      doc.roundedRect(segX, orientY, segW, orientH - 1.5, 0.8, 0.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(Math.max(5, Math.min(6.5, segW * 0.15)));
      doc.setTextColor(74, 64, 48);
      doc.text(label || '—', segX + segW / 2, orientY + (orientH - 1.5) / 2 + 1, { align: 'center' });
    });

    // ── Pisos ─────────────────────────────────────────────────────────────────
    const lblFontSize = Math.max(4, Math.min(6.5, cellH * 0.52));
    const numFontSize = Math.max(4.5, Math.min(7.5, cellW * 0.42));
    const tipFontSize = Math.max(3,   Math.min(5,   cellW * 0.28));

    layout.forEach((floor, fi) => {
      const colMap = {};
      floor.cells.forEach(c => { colMap[c.c] = c.n; });
      const y = cellsY + fi * (cellH + gap);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(lblFontSize);
      doc.setTextColor(154, 144, 128);
      doc.text(`P${floor.p}`, stackX + lblW - 1, y + cellH / 2 + lblFontSize * 0.18, { align: 'right' });

      for (let c = 1; c <= maxCol; c++) {
        const n = colMap[c];
        if (!n) continue;
        const x = cellsX + (c - 1) * (cellW + gap);
        const u = umap[n];
        const style = CAT_STYLE[getCategory(u)] || CAT_STYLE.default;
        const tipo  = (u?.['Tipo'] || '').trim();

        doc.setFillColor(...rgb(style.bg));
        doc.setDrawColor(...rgb(style.border));
        doc.setLineWidth(0.18);
        doc.roundedRect(x, y, cellW, cellH, 0.7, 0.7, 'FD');

        const cx = x + cellW / 2;
        if (tipo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(numFontSize);
          doc.setTextColor(...rgb(style.color));
          doc.text(String(n), cx, y + cellH * 0.42 + numFontSize * 0.18, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(tipFontSize);
          doc.setTextColor(...rgb(style.color));
          doc.text(tipo, cx, y + cellH * 0.78 + tipFontSize * 0.18, { align: 'center' });
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(numFontSize);
          doc.setTextColor(...rgb(style.color));
          doc.text(String(n), cx, y + cellH / 2 + numFontSize * 0.18, { align: 'center' });
        }

        if (driveMap[n]) doc.link(x, y, cellW, cellH, { url: driveUrl(driveMap[n]) });
      }
    });

    // ── Líneas divisoras de orientación ──────────────────────────────────────
    doc.setDrawColor(160, 148, 128);
    doc.setLineWidth(0.5);
    orientBoundariesPDF.forEach(c => {
      const bx = cellsX + (c - 1) * (cellW + gap) - gap / 2;
      doc.line(bx, cellsY - 1, bx, cellsY + gridH + 1);
    });

    // ── Bodegas sobre nivel de suelo ──────────────────────────────────────────
    if (maxBodPerFloor > 0) {
      const bodSepX   = cellsX + gridW + 3;
      const bodStartX = bodSepX + 4;
      const bodDriveMap = includeLinks ? (ab === 'ech' ? DRIVE_FOLDERS_ECH_BOD : DRIVE_FOLDERS_IRR_BOD) : {};
      doc.setDrawColor(160, 148, 128);
      doc.setLineWidth(0.4);
      doc.line(bodSepX, cellsY, bodSepX, cellsY + gridH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5);
      doc.setTextColor(154, 144, 128);
      doc.text('Bod.', bodSepX + 2, cellsY - 1.5);
      layout.forEach((floor, fi) => {
        const bods = (aboveBodByPiso[floor.p] || []).slice().sort((a,b) => parseInt(a[bcol.n]) - parseInt(b[bcol.n]));
        const y = cellsY + fi * (cellH + gap);
        bods.forEach((unit, bi) => {
          const n     = (unit[bcol.n] || '').toString().trim();
          const style = CAT_STYLE[getBodegaCategory(unit)];
          const bx    = bodStartX + bi * (cellW + gap);
          doc.setFillColor(...rgb(style.bg));
          doc.setDrawColor(...rgb(style.border));
          doc.setLineWidth(0.18);
          doc.roundedRect(bx, y, cellW, cellH, 0.7, 0.7, 'FD');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(numFontSize);
          doc.setTextColor(...rgb(style.color));
          doc.text(String(n), bx + cellW / 2, y + cellH / 2 + numFontSize * 0.18, { align: 'center' });
          if (bodDriveMap[parseInt(n)]) doc.link(bx, y, cellW, cellH, { url: driveUrl(bodDriveMap[parseInt(n)]) });
        });
      });
    }

    // ── Leyenda ───────────────────────────────────────────────────────────────
    const legendY  = pageH - margin - 4;
    const swatchSz = 3.5;
    const legendCats = [
      { key:'contrato',    label:'Arrendado'    },
      { key:'rc',          label:'RC'           },
      { key:'vacante',     label:'Vacante'      },
      { key:'piloto',      label:'Piloto'       },
      { key:'visita',      label:'Visita'       },
      { key:'inhabilitado',label:'Inhabilitado' },
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    let lx = margin;
    legendCats.forEach(({ key, label }) => {
      const s = CAT_STYLE[key];
      doc.setFillColor(...rgb(s.bg));
      doc.setDrawColor(...rgb(s.border));
      doc.setLineWidth(0.15);
      doc.roundedRect(lx, legendY - swatchSz, swatchSz, swatchSz, 0.4, 0.4, 'FD');
      doc.setTextColor(60, 60, 60);
      doc.text(label, lx + swatchSz + 1.2, legendY - 0.3);
      lx += swatchSz + doc.getTextWidth(label) + 5;
    });
    if (Object.keys(driveMap).length) {
      doc.setFontSize(5.5);
      doc.setTextColor(138, 155, 176);
      doc.text('· Celdas clickeables — abren carpeta de contratos en Google Drive', lx + 6, legendY - 0.3);
    }

    // ── Página 2: Subterráneo ─────────────────────────────────────────────────
    const parkData = BD[ab].park || [];
    const bodData  = BD[ab].bod  || [];
    if (parkData.length || bodData.length) {
      doc.addPage();

      // Header igual al de p.1
      doc.setDrawColor(...accentRgb);
      doc.setLineWidth(0.8);
      doc.line(margin, 8, pageW - margin, 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(26, 35, 50);
      doc.text(`${bldgName}  —  Subterráneo`, margin, 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(138, 155, 176);
      doc.text(dateStr, margin, 21);

      // Agrupar por piso
      const parkByPiso = {}, bodByPiso = {};
      parkData.forEach(row => {
        const p = parseInt((row[pcol.piso] || '').toString().trim());
        if (!isNaN(p)) { if (!parkByPiso[p]) parkByPiso[p] = []; parkByPiso[p].push(row); }
      });
      bodData.forEach(row => {
        const p = parseInt((row[bcol.piso] || '').toString().trim());
        if (!isNaN(p) && p < 0) { if (!bodByPiso[p]) bodByPiso[p] = []; bodByPiso[p].push(row); }
      });

      const negPisos = [...new Set([
        ...Object.keys(parkByPiso).map(Number),
        ...Object.keys(bodByPiso).map(Number),
      ].filter(p => p < 0))].sort((a, b) => b - a);

      const subCellW = 9, subCellH = 7.5, subGap = 1, subLblW = 10;
      const subX = margin + subLblW + subGap;
      let   subY = headerH + 4;
      const MAX_ROW = 30;

      const sortByN  = (a, b) => parseInt(a[pcol.n]) - parseInt(b[pcol.n]);
      const subNumFs = 5;
      const isInhab  = u => getParkingCategory(u) === 'inhabilitado';
      const isMoto   = u => !isInhab(u) && (u[pcol.destino] || '').toString().trim().toUpperCase().includes('MOTO');

      const drawSubCell = (u, catFn, nCol, driveMapSub, cx, cy) => {
        const n = (u[nCol] || '').toString().trim();
        const s = CAT_STYLE[catFn(u)] || CAT_STYLE.default;
        doc.setFillColor(...rgb(s.bg));
        doc.setDrawColor(...rgb(s.border));
        doc.setLineWidth(0.15);
        doc.roundedRect(cx, cy, subCellW, subCellH, 0.5, 0.5, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(subNumFs);
        doc.setTextColor(...rgb(s.color));
        doc.text(n, cx + subCellW / 2, cy + subCellH / 2 + subNumFs * 0.18, { align: 'center' });
        if (driveMapSub[parseInt(n)]) doc.link(cx, cy, subCellW, subCellH, { url: driveUrl(driveMapSub[parseInt(n)]) });
      };

// Pre-calcular el sepX fijo alineando al piso con más autos en la primera fila
      // (equivalente a alignSubterraneoColumns del visor web)
      const estacDrive = includeLinks ? (ab === 'ech' ? DRIVE_FOLDERS_ECH_ESTAC : DRIVE_FOLDERS_IRR_ESTAC) : {};
      const bodDrive   = includeLinks ? (ab === 'ech' ? DRIVE_FOLDERS_ECH_BOD   : DRIVE_FOLDERS_IRR_BOD)   : {};

      const pisoGroups = negPisos.map(piso => {
        const allRaw = (parkByPiso[piso] || []).slice();
        const allBod = (bodByPiso[piso]  || []).slice().sort((a,b) => parseInt(a[bcol.n]) - parseInt(b[bcol.n]));
        const autos  = allRaw.filter(u => !isMoto(u) && !isInhab(u)).sort(sortByN);
        const motos  = allRaw.filter(u => isMoto(u)).sort(sortByN);
        return { piso, autos, motos, allBod };
      }).filter(g => g.autos.length || g.motos.length || g.allBod.length);

      // Bodega reserve para calcular el máximo de autos por fila
      const maxBodInSub  = Math.max(0, ...pisoGroups.map(g => g.allBod.length));
      const bodReserveSub = maxBodInSub > 0 ? maxBodInSub * (subCellW + subGap) + 7 : 0;
      const parkPerRowSub = Math.max(1, Math.floor((pageW - margin - subX - bodReserveSub) / (subCellW + subGap)));
      // Separador fijo: ancho del piso con más autos en la primera fila
      const maxFirstChunk = Math.max(1, ...pisoGroups.map(g => Math.min(g.autos.length, parkPerRowSub)));
      const fixedSepX = subX + maxFirstChunk * (subCellW + subGap) + 2;

      pisoGroups.forEach(({ piso, autos, motos, allBod }) => {
        // Autos con bodegas alineadas a la derecha
        const autoChunks = [];
        for (let i = 0; i < Math.max(autos.length, 1); i += parkPerRowSub) autoChunks.push(autos.slice(i, i + parkPerRowSub));
        autoChunks.forEach((chunk, ci) => {
          const rowH = subCellH + subGap;
          if (subY + rowH > pageH - margin - legendH) { doc.addPage(); subY = margin + 4; }
          doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(154, 144, 128);
          doc.text(ci === 0 ? String(piso) : '', margin + subLblW - 1, subY + subCellH / 2 + 1, { align: 'right' });
          chunk.forEach((u, idx) => drawSubCell(u, getParkingCategory, pcol.n, estacDrive, subX + idx * (subCellW + subGap), subY));
          if (ci === 0 && allBod.length) {
            doc.setDrawColor(160, 148, 128); doc.setLineWidth(0.3);
            doc.line(fixedSepX, subY, fixedSepX, subY + subCellH);
            allBod.forEach((u, bi) => drawSubCell(u, getBodegaCategory, bcol.n, bodDrive, fixedSepX + 3 + bi * (subCellW + subGap), subY));
          }
          subY += rowH;
        });

        // Motos en fila separada (sin bodegas, sin inhabilitados)
        if (motos.length) {
          const motoChunks = [];
          for (let i = 0; i < motos.length; i += parkPerRowSub) motoChunks.push(motos.slice(i, i + parkPerRowSub));
          motoChunks.forEach((chunk, ci) => {
            const rowH = subCellH + subGap;
            if (subY + rowH > pageH - margin - legendH) { doc.addPage(); subY = margin + 4; }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(154, 144, 128);
            doc.text(ci === 0 ? (autos.length ? 'Moto' : String(piso)) : '', margin + subLblW - 1, subY + subCellH / 2 + 1, { align: 'right' });
            chunk.forEach((u, idx) => drawSubCell(u, getParkingCategory, pcol.n, estacDrive, subX + idx * (subCellW + subGap), subY));
            subY += rowH;
          });
        }

        subY += 2;
      });

      // Leyenda p.2
      const leg2Y = pageH - margin - 4;
      let lx2 = margin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      legendCats.forEach(({ key, label }) => {
        const s = CAT_STYLE[key];
        doc.setFillColor(...rgb(s.bg));
        doc.setDrawColor(...rgb(s.border));
        doc.setLineWidth(0.15);
        doc.roundedRect(lx2, leg2Y - swatchSz, swatchSz, swatchSz, 0.4, 0.4, 'FD');
        doc.setTextColor(60, 60, 60);
        doc.text(label, lx2 + swatchSz + 1.2, leg2Y - 0.3);
        lx2 += swatchSz + doc.getTextWidth(label) + 5;
      });
    }

    doc.save(`stacking_${ab}_${new Date().toISOString().slice(0,10)}.pdf`);

  } catch (err) {
    console.error('Error exportando PDF:', err);
    alert('Error al generar el PDF. Revisa la consola (F12).');
  }

  btn.disabled = false;
  btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Exportar PDF`;
}

// ── Copiar tarjeta (gráfico o card de caracterización) al portapapeles ──────
const ICON_COPY  = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
const ICON_CHECK = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

async function copyCardAsImage(btn, cardSelector) {
  btn.disabled = true;
  const card = btn.closest(cardSelector);
  try {
    const canvas = await html2canvas(card, { scale: 4, useCORS: true, logging: false, backgroundColor: '#ffffff' });
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
    console.error('Error copiando tarjeta:', err);
    btn.disabled = false; btn.innerHTML = ICON_COPY;
  }
}

const copyChartCard = btn => copyCardAsImage(btn, '.evol-card');
const copyDirCard   = btn => copyCardAsImage(btn, '.dir-card');

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
function toggleTipologia(btn) {
  const building = document.getElementById('building');
  if (!building) return;
  const show = building.classList.toggle('show-tipo');
  btn.classList.toggle('active', show);
}

function toggleHeader(btn) {
  const hdr = document.getElementById('col-hdr-wrap');
  if (!hdr) return;
  const hide = hdr.classList.toggle('hdr-hidden');
  btn.classList.toggle('active', !hide);
}
window.toggleHeader = toggleHeader;

let pdfModalResolve = () => {};
function showPdfModal() {
  return new Promise(resolve => {
    pdfModalResolve = (val) => {
      document.getElementById('pdf-export-modal').style.display = 'none';
      document.getElementById('pdf-include-links').checked = false;
      resolve(val);
    };
    document.getElementById('pdf-export-modal').style.display = 'flex';
  });
}
window.pdfModalResolve = (val) => pdfModalResolve(val);

window.switchBuilding    = switchBuilding;
window.toggleTipologia   = toggleTipologia;
window.switchLegendTab   = switchLegendTab;
window.copyChartCard   = copyChartCard;
window.copyDirCard     = copyDirCard;
window.openEstatusExportModal  = openEstatusExportModal;
window.closeEstatusExportModal = closeEstatusExportModal;
window.toggleAllExportCols     = toggleAllExportCols;
window.runEstatusExport        = runEstatusExport;
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
window.renderPermanenciaChart     = _wrap(renderPermanenciaChart,     'permanencia');
window.openExportPanel       = openExportPanel;

// Inicializar sliders de fuente en cards de evolución
document.addEventListener('DOMContentLoaded', initChartFontSliders);

// ── Bootstrap ──────────────────────────────────────────────────────────────

renderStacking();

function revealStacking() {
  const skel = document.getElementById('stacking-skel');
  const real = document.getElementById('stacking-zoom-inner');
  if (skel) skel.style.display = 'none';
  if (real) real.style.display = '';
}

// Fase 1 IRR: carga ESTATUS ACTUAL → colorea stacking inmediatamente
fetch(URLS.irr[0]).then(r => r.text()).then(csv => {
  const p1i = Papa.parse(csv.trim(), {header:true, skipEmptyLines:true});
  BD.irr.data   = p1i.data;
  BD.irr.fields = p1i.meta.fields;
  const unidadCol = p1i.meta.fields.find(h => nfdKey(h) === 'UNIDAD') || 'Unidad';
  p1i.data.forEach(row => { const n = parseInt((row[unidadCol]||'').trim()); if (!isNaN(n)) BD.irr.umap[n] = row; });
  if (state.AB === 'irr') {
    resolveColumns(p1i.meta.fields);
    populateDropdowns(BD.irr.data);
    renderStacking();
    applyFilters();
    revealStacking();
  }
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
    revealStacking();
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
      initPermanenciaSelects(BD.irr.data);
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
      initPermanenciaSelects(BD.ech.data);
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

// ── Hoja Reparación IRR ────────────────────────────────────────────────────
if (URLS_REPARACION.irr) {
  fetch(URLS_REPARACION.irr).then(r => r.text()).then(csv => {
    BD.irr.rep = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true }).data;
    if (state.AB === 'irr') renderAuditoria();
  }).catch(err => console.error('Error cargando Reparación IRR:', err));
}

// ── Hoja Reparación ECH ────────────────────────────────────────────────────
if (URLS_REPARACION.ech) {
  fetch(URLS_REPARACION.ech).then(r => r.text()).then(csv => {
    BD.ech.rep = Papa.parse(csv.trim(), { header: true, skipEmptyLines: true }).data;
    if (state.AB === 'ech') renderAuditoria();
  }).catch(err => console.error('Error cargando Reparación ECH:', err));
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
      if (document.getElementById('panel-caracterizacion')?.classList.contains('active')) renderDirectorio();
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
      if (document.getElementById('panel-caracterizacion')?.classList.contains('active')) renderDirectorio();
    }
  }).catch(err => console.error('Error cargando I. Contratos ECH:', err));
}
