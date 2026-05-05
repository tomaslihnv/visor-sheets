import { state, BD } from '../state.js';
import { LAYOUT_IRR, LAYOUT_ECH, MAX_COL_IRR, MAX_COL_ECH } from '../config.js';
import { getCategory } from '../categories.js';
import { nfdKey } from '../utils.js';

export function renderColumnHeaders() {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const maxCol = state.AB === 'irr' ? MAX_COL_IRR : MAX_COL_ECH;
  const umap   = BD[state.AB].umap;

  const colInfo = {};
  layout.forEach(floor => {
    floor.cells.forEach(cell => {
      if (!colInfo[cell.c]) colInfo[cell.c] = { colNum: cell.n % 100, units: [] };
      colInfo[cell.c].units.push(cell.n);
    });
  });

  Object.values(colInfo).forEach(info => {
    let tipo = '', prod = '', enRenta = 0, base = 0;
    info.units.forEach(n => {
      const u = umap[n];
      if (!u) return;
      if (!tipo) tipo = (u['Tipo']         || '').trim();
      if (!prod) {
        const sub2Key = Object.keys(u).find(k => nfdKey(k).includes('SUB') && nfdKey(k).includes('2'));
        prod = sub2Key ? (u[sub2Key] || '').trim() : (u['Sub. Tip (2)'] || '').trim();
      }
      const cat = getCategory(u);
      if (cat === 'piloto') return;
      base++;
      if (cat === 'contrato' || cat === 'rc') enRenta++;
    });
    info.tipo = tipo;
    info.prod = prod;
    info.pct  = base > 0 ? Math.round(enRenta / base * 100) + '%' : '—';
  });

  const rows = [
    { id: 'col-hdr-col',  label: 'Columna',        val: c => colInfo[c] ? String(colInfo[c].colNum) : '' },
    { id: 'col-hdr-tipo', label: 'Tipología',       val: c => (colInfo[c]?.tipo ?? '').split('-')[0] },
    { id: 'col-hdr-prod', label: 'Sub-Tipología',   val: c => colInfo[c]?.prod ?? '' },
    { id: 'col-hdr-pct',  label: 'Ocupación (%)',   val: c => colInfo[c]?.pct  ?? '' },
  ];

  rows.forEach(({ id, label, val }) => {
    const rowEl = document.getElementById(id);
    if (!rowEl) return;
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
      cells.appendChild(el);
    }
    rowEl.appendChild(cells);
  });
}
