import { state, BD } from '../state.js';
import { LAYOUT_IRR, LAYOUT_ECH, MAX_COL_IRR, MAX_COL_ECH, CAT_STYLE } from '../config.js';
import { getCategory, getParkingCategory, getBodegaCategory } from '../categories.js';
import { showTooltip, hideTooltip, moveTooltip, showParkingTooltip, showBodegaTooltip, addTapToShow } from '../tooltip.js';
import { pcol, bcol, resolveParkingColumns, resolveBodegaColumns } from '../columns.js';

export function renderStacking() {
  const bldg = document.getElementById('building');
  bldg.innerHTML = '';
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const maxCol  = state.AB === 'irr' ? MAX_COL_IRR : MAX_COL_ECH;
  const umap    = BD[state.AB].umap;

  layout.forEach(floor => {
    const colMap = {};
    floor.cells.forEach(c => { colMap[c.c] = c.n; });
    const rowEl = document.createElement('div');
    rowEl.className = 'floor-row';
    rowEl.dataset.piso = floor.p;
    const lbl = document.createElement('div');
    lbl.className = 'floor-label';
    lbl.textContent = 'P' + floor.p;
    rowEl.appendChild(lbl);
    const cells = document.createElement('div');
    cells.className = 'floor-cells';
    for (let c = 1; c <= maxCol; c++) {
      const el = document.createElement('div');
      if (colMap[c] !== undefined) {
        const n = colMap[c];
        el.className = 'unit';
        el.id = 'u-' + n;
        el.innerHTML = `<span class="unit-num">${n}</span><span class="unit-tipo"></span>`;
        el.addEventListener('mouseenter', e => showTooltip(e, n));
        el.addEventListener('mouseleave', hideTooltip);
        el.addEventListener('mousemove',  moveTooltip);
        addTapToShow(el, e => showTooltip(e, n));
      } else {
        el.className = 'cell-gap';
      }
      cells.appendChild(el);
    }
    rowEl.appendChild(cells);
    bldg.appendChild(rowEl);
  });
}

export function makeParkingCell(unit) {
  const n      = (unit[pcol.n]     || '').toString().trim();
  const cat    = getParkingCategory(unit);
  const s      = CAT_STYLE[cat];
  const tandem = (unit[pcol.tandem] || '').trim().toUpperCase() === 'SI';
  const el = document.createElement('div');
  el.className = 'unit';
  el.id = 'p-' + n;
  el.style.background  = s.bg;
  el.style.borderColor = s.border;
  el.style.color       = s.color;
  el.innerHTML = `<span class="unit-num">${n}</span><span class="unit-tipo">${tandem ? 'T' : ''}</span>`;
  el.addEventListener('mouseenter', e => showParkingTooltip(e, unit));
  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('mousemove',  moveTooltip);
  addTapToShow(el, e => showParkingTooltip(e, unit));
  return el;
}

export function makeBodegaCell(unit) {
  const n   = (unit[bcol.n] || '').toString().trim();
  const cat = getBodegaCategory(unit);
  const s   = CAT_STYLE[cat];
  const el  = document.createElement('div');
  el.className = 'unit';
  el.id = 'b-' + n;
  el.style.background  = s.bg;
  el.style.borderColor = s.border;
  el.style.color       = s.color;
  el.innerHTML = `<span class="unit-num">${n}</span><span class="unit-tipo"></span>`;
  el.addEventListener('mouseenter', e => showBodegaTooltip(e, unit));
  el.addEventListener('mouseleave', hideTooltip);
  el.addEventListener('mousemove',  moveTooltip);
  addTapToShow(el, e => showBodegaTooltip(e, unit));
  return el;
}

export function renderSubterraneoStacking(estacData, bodData) {
  if (!estacData.length && !bodData.length) return;
  const bldg = document.getElementById('building');

  if (estacData.length) resolveParkingColumns(Object.keys(estacData[0]));
  if (bodData.length)   resolveBodegaColumns(Object.keys(bodData[0]));

  const sep = document.createElement('div');
  sep.className = 'parking-sep';
  sep.textContent = 'Subterráneo';
  bldg.appendChild(sep);

  const estacByPiso = {}, bodByPiso = {};
  estacData.forEach(row => {
    const p = parseInt((row[pcol.piso] || '').toString().trim());
    if (!isNaN(p)) { if (!estacByPiso[p]) estacByPiso[p] = []; estacByPiso[p].push(row); }
  });
  bodData.forEach(row => {
    const p = parseInt((row[bcol.piso] || '').toString().trim());
    if (!isNaN(p)) { if (!bodByPiso[p]) bodByPiso[p] = []; bodByPiso[p].push(row); }
  });

  // Solo pisos negativos en la sección subterránea
  const negPisos = [...new Set(Object.keys(estacByPiso).map(Number).filter(p => p < 0))]
    .sort((a, b) => b - a);

  if (!negPisos.length) { bldg.removeChild(sep); return; }

  negPisos.forEach(piso => {
    const estacUnits = (estacByPiso[piso] || []).slice().sort((a, b) => parseInt(a[pcol.n]) - parseInt(b[pcol.n]));
    const bodUnits   = (bodByPiso[piso]   || []).slice().sort((a, b) => parseInt(a[bcol.n]) - parseInt(b[bcol.n]));
    if (!estacUnits.length && !bodUnits.length) return;

    const estacRW  = estacUnits.length ? Math.ceil(estacUnits.length / 2) : 0;
    const bodNeg   = (bodByPiso[piso] || []).slice().sort((a, b) => parseInt(a[bcol.n]) - parseInt(b[bcol.n]));
    const bodRW    = bodNeg.length ? Math.ceil(bodNeg.length / 2) : 0;
    const numRows  = Math.max(
      estacRW ? Math.ceil(estacUnits.length / estacRW) : 0,
      bodRW   ? Math.ceil(bodNeg.length     / bodRW)   : 0
    );

    for (let i = 0; i < numRows; i++) {
      const estacChunk = estacRW ? estacUnits.slice(i * estacRW, (i + 1) * estacRW) : [];
      const bodChunk   = bodRW   ? bodNeg.slice(i * bodRW, (i + 1) * bodRW)         : [];

      const rowEl = document.createElement('div');
      rowEl.className = 'floor-row';

      const lbl = document.createElement('div');
      lbl.className = 'floor-label';
      lbl.textContent = i === 0 ? String(piso) : '';
      rowEl.appendChild(lbl);

      const estacCells = document.createElement('div');
      estacCells.className = 'floor-cells';
      estacChunk.forEach(u => estacCells.appendChild(makeParkingCell(u)));
      rowEl.appendChild(estacCells);

      if (estacChunk.length && bodChunk.length) {
        const div = document.createElement('div');
        div.className = 'estac-bod-div';
        rowEl.appendChild(div);
      }

      const bodCells = document.createElement('div');
      bodCells.className = 'floor-cells';
      bodChunk.forEach(u => bodCells.appendChild(makeBodegaCell(u)));
      rowEl.appendChild(bodCells);

      bldg.appendChild(rowEl);
    }
  });
}

// Inserta bodegas de pisos positivos a la derecha de las filas del edificio
export function injectBodegasIntoFloors(bodData) {
  if (!bodData.length) return;
  resolveBodegaColumns(Object.keys(bodData[0]));

  // Agrupar bodegas por piso (solo pisos positivos)
  const bodByPiso = {};
  bodData.forEach(row => {
    const p = parseInt((row[bcol.piso] || '').toString().trim());
    if (!isNaN(p) && p > 0) {
      if (!bodByPiso[p]) bodByPiso[p] = [];
      bodByPiso[p].push(row);
    }
  });

  if (!Object.keys(bodByPiso).length) return;

  Object.entries(bodByPiso).forEach(([pisoStr, units]) => {
    const row = document.querySelector(`.floor-row[data-piso="${pisoStr}"]`);
    if (!row) return;

    // Evitar duplicados si se llama más de una vez
    if (row.querySelector('.bod-inline-sep')) return;

    const sorted = units.slice().sort((a, b) => parseInt(a[bcol.n]) - parseInt(b[bcol.n]));

    const sep = document.createElement('div');
    sep.className = 'estac-bod-div bod-inline-sep';
    row.appendChild(sep);

    const cells = document.createElement('div');
    cells.className = 'floor-cells';
    sorted.forEach(u => cells.appendChild(makeBodegaCell(u)));
    row.appendChild(cells);
  });

  requestAnimationFrame(alignBodegaColumns);
}

export function alignBodegaColumns() {
  const seps = [...document.querySelectorAll('.bod-inline-sep')];
  if (!seps.length) return;
  seps.forEach(s => { s.style.marginLeft = ''; });
  const maxLeft = Math.max(...seps.map(s => s.getBoundingClientRect().left));
  seps.forEach(s => {
    const diff = maxLeft - s.getBoundingClientRect().left;
    if (diff > 0) s.style.marginLeft = diff + 'px';
  });
}

export function updateCellTipo() {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const umap   = BD[state.AB].umap;

  layout.forEach(floor => floor.cells.forEach(cell => {
    const el = document.getElementById('u-' + cell.n);
    if (!el) return;
    const tipoEl = el.querySelector('.unit-tipo');
    if (tipoEl) tipoEl.textContent = (umap[cell.n]?.['Tipo'] || '').trim();
  }));
}
