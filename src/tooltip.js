import { state, BD } from './state.js';
import { col, pcol, bcol } from './columns.js';
import { parseCLP } from './utils.js';
import { getCategory } from './categories.js';

export const ttEl = document.getElementById('unit-tt');

export function showTooltip(e, n) {
  const umap = BD[state.AB].umap;
  const u    = umap[n];
  const cat  = getCategory(u);
  document.getElementById('tt-title').textContent = 'Unidad ' + n;
  const rows = [
    ['Titular',      (u && col.titular ? (u[col.titular] || '').trim() : '') || '—'],
    ['Tipología',    (u?.['Tipo'] || '').trim() || '—'],
    ['Canon CLP',    u?.__canonCLP  != null ? '$' + Math.round(u.__canonCLP).toLocaleString('es-CL') : '—'],
    ['GGCC',         u?.__ggccCLP   != null ? '$' + Math.round(u.__ggccCLP).toLocaleString('es-CL')  : '—'],
    ['Canon UF/m²',  u?.__canonUFm2 != null ? u.__canonUFm2.toFixed(2) + ' UF/m²' : '—'],
    ['Sal/arriendo', u?.__salarioRatio != null ? u.__salarioRatio.toFixed(1).replace('.', ',') + 'x' : '—'],
  ];
  if (cat === 'contrato') {
    const d = u?.__diasRemanentes;
    rows.push(['Días remanentes', d != null ? (d >= 0 ? `${d} días` : `−${Math.abs(d)} días (vencido)`) : '—']);
  } else if (cat === 'vacante') {
    rows.push(['Días vacantes', u?.__diasVacante != null ? `${u.__diasVacante} días` : '—']);
  }
  document.getElementById('tt-body').innerHTML = rows
    .map(([k, v]) => `<div class="tt-row"><span class="tt-key">${k}</span><span class="tt-val">${v}</span></div>`)
    .join('');
  ttEl.style.display = 'block';
  positionTooltip(e);
}

export function hideTooltip() { ttEl.style.display = 'none'; }
export function moveTooltip(e) { positionTooltip(e); }

export function positionTooltip(e) {
  const pad = 14, tw = ttEl.offsetWidth, th = ttEl.offsetHeight;
  let x = e.clientX + pad, y = e.clientY + pad;
  if (x + tw > window.innerWidth  - pad) x = e.clientX - tw - pad;
  if (y + th > window.innerHeight - pad) y = e.clientY - th - pad;
  ttEl.style.left = x + 'px';
  ttEl.style.top  = y + 'px';
}

export function showParkingTooltip(e, row) {
  const n      = (row[pcol.n]       || '').toString().trim();
  const piso   = (row[pcol.piso]    || '').toString().trim();
  const depto  = (row[pcol.depto]   || '').trim();
  const tandem = (row[pcol.tandem]  || '').trim().toUpperCase() === 'SI';
  const dest   = (row[pcol.destino] || '').trim();
  const canon  = parseCLP(row[pcol.canon]);
  const ggcc   = parseCLP(row[pcol.ggcc]);
  const titular = (row[pcol.titular] || '').trim();

  document.getElementById('tt-title').textContent = 'Estac. ' + n;
  const rows = [
    ['Titular', titular || '—'],
    ['Canon',   canon != null ? '$' + Math.round(canon).toLocaleString('es-CL') : '—'],
    ['GGCC',    ggcc  != null ? '$' + Math.round(ggcc).toLocaleString('es-CL')  : '—'],
    ['Tándem',  tandem ? 'Sí' : 'No'],
  ];
  if (depto) rows.push(['Depto.',  depto]);
  if (dest)  rows.push(['Destino', dest]);

  document.getElementById('tt-body').innerHTML = rows
    .map(([k, v]) => `<div class="tt-row"><span class="tt-key">${k}</span><span class="tt-val">${v}</span></div>`)
    .join('');
  ttEl.style.display = 'block';
  positionTooltip(e);
}

export function showBodegaTooltip(e, row) {
  const n       = (row[bcol.n]       || '').toString().trim();
  const titular = (row[bcol.titular] || '').trim();
  const depto   = (row[bcol.depto]   || '').trim();
  const canon   = parseCLP(row[bcol.canon]);
  const ggcc    = parseCLP(row[bcol.ggcc]);

  document.getElementById('tt-title').textContent = 'Bodega ' + n;
  const rows = [
    ['Titular', titular || '—'],
    ['Canon',   canon != null ? '$' + Math.round(canon).toLocaleString('es-CL') : '—'],
    ['GGCC',    ggcc  != null ? '$' + Math.round(ggcc).toLocaleString('es-CL')  : '—'],
  ];
  if (depto) rows.push(['Depto.', depto]);

  document.getElementById('tt-body').innerHTML = rows
    .map(([k, v]) => `<div class="tt-row"><span class="tt-key">${k}</span><span class="tt-val">${v}</span></div>`)
    .join('');
  ttEl.style.display = 'block';
  positionTooltip(e);
}
