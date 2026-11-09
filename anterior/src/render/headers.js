import { state, BD } from '../state.js';
import { LAYOUTS, MAX_COLS } from '../config.js';
import { getCategory } from '../categories.js';
import { nfdKey } from '../utils.js';
// Devuelve el set de columnas donde empieza un nuevo tramo de orientación,
// usado tanto para el header combinado como para las líneas divisorias del resto de filas.
function getOrientBoundaries(maxCol, colInfo) {
  const boundaries = new Set();
  let prev;
  for (let c = 1; c <= maxCol; c++) {
    const cur = colInfo[c]?.orient || null;
    if (c > 1 && cur !== prev) boundaries.add(c);
    prev = cur;
  }
  return boundaries;
}

// Renderiza el header de Orientación como celdas combinadas: un mismo color
// sobrio para todas las orientaciones, diferenciadas por la etiqueta y por
// líneas divisorias verticales en cada tramo de columnas.
function renderOrientHeaderRow(rowEl, maxCol, colInfo, boundaries) {
  rowEl.innerHTML = '';
  const lbl = document.createElement('div');
  lbl.className = 'col-hdr-lbl';
  lbl.textContent = 'Orientación';
  rowEl.appendChild(lbl);

  const cells = document.createElement('div');
  cells.className = 'floor-cells';
  let c = 1;
  while (c <= maxCol) {
    if (!colInfo[c]) {
      const gap = document.createElement('div');
      gap.className = 'col-hdr-gap';
      cells.appendChild(gap);
      c++;
      continue;
    }
    const orient = colInfo[c].orient || '';
    let span = 1;
    while (c + span <= maxCol && colInfo[c + span] && (colInfo[c + span].orient || '') === orient) span++;

    const seg = document.createElement('div');
    seg.className = 'col-hdr-orient-seg';
    seg.style.width = (span * 34 + (span - 1) * 2) + 'px';
    if (boundaries.has(c)) seg.classList.add('col-orient-boundary');
    seg.textContent = orient || '—';
    seg.title = orient || '—';
    cells.appendChild(seg);
    c += span;
  }
  rowEl.appendChild(cells);
}

export function renderColumnHeaders() {
  const layout = LAYOUTS[state.AB];
  const maxCol = MAX_COLS[state.AB];
  const umap   = BD[state.AB].umap;

  const colInfo = {};
  layout.forEach(floor => {
    floor.cells.forEach(cell => {
      if (!colInfo[cell.c]) colInfo[cell.c] = { colNum: parseInt(cell.n) % 100, torre: /^\d+([A-Z])$/.exec(cell.n)?.[1] ?? '', units: [] };
      colInfo[cell.c].units.push(cell.n);
    });
  });

  // Valor más frecuente: con unidades de otra planta (pisos 1 y 10) "la primera" puede no ser la típica.
  const top = m => Object.entries(m).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '';
  Object.values(colInfo).forEach(info => {
    const tipos = {}, prods = {}, orients = {};
    let enRenta = 0, base = 0;
    info.units.forEach(n => {
      const u = umap[n];
      if (!u) return;
      const add = (m, v) => { if (v) m[v] = (m[v] || 0) + 1; };
      add(tipos,   (u['Tipo']         || '').trim());
      add(orients, (u['Orientación'] || '').trim().toUpperCase());
      const sub2Key = Object.keys(u).find(k => nfdKey(k).includes('SUB') && nfdKey(k).includes('2'));
      add(prods, sub2Key ? (u[sub2Key] || '').trim() : (u['Sub. Tip (2)'] || '').trim());
      const cat = getCategory(u);
      if (cat === 'piloto') return;
      base++;
      if (cat === 'contrato' || cat === 'rc') enRenta++;
    });
    info.tipo   = top(tipos);
    info.orient = top(orients);
    info.prod   = top(prods);
    info.pct    = base > 0 ? Math.round(enRenta / base * 100) + '%' : '—';
  });

  const boundaries = getOrientBoundaries(maxCol, colInfo);

  const orientRowEl = document.getElementById('col-hdr-orient');
  if (orientRowEl) renderOrientHeaderRow(orientRowEl, maxCol, colInfo, boundaries);

  const hasTorres = Object.values(colInfo).some(i => i.torre);
  const rows = [
    { id: 'col-hdr-torre', label: 'Torre',          val: c => colInfo[c]?.torre ?? '' },
    { id: 'col-hdr-col',  label: 'Columna',        val: c => colInfo[c] ? String(colInfo[c].colNum) : '' },
    { id: 'col-hdr-tipo', label: 'Tipología',       val: c => (colInfo[c]?.tipo ?? '').split('-')[0] },
    { id: 'col-hdr-prod', label: 'Sub-Tipología',   val: c => colInfo[c]?.prod ?? '' },
    { id: 'col-hdr-pct',  label: 'Ocupación (%)',   val: c => colInfo[c]?.pct  ?? '' },
  ];

  rows.forEach(({ id, label, val }) => {
    const rowEl = document.getElementById(id);
    if (!rowEl) return;
    rowEl.style.display = id === 'col-hdr-torre' && !hasTorres ? 'none' : '';
    rowEl.innerHTML = '';
    const lbl = document.createElement('div');
    lbl.className = 'col-hdr-lbl';
    lbl.textContent = label;
    rowEl.appendChild(lbl);
    const cells = document.createElement('div');
    cells.className = 'floor-cells';
    for (let c = 1; c <= maxCol; c++) {
      const el = document.createElement('div');
      el.className = colInfo[c] ? 'col-hdr-cell' : 'col-hdr-gap';
      if (colInfo[c]) el.textContent = val(c);
      if (boundaries.has(c)) el.classList.add('col-orient-boundary');
      cells.appendChild(el);
    }
    rowEl.appendChild(cells);
  });
}
