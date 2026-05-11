import { state, BD } from './state.js';
import { col, pcol, bcol } from './columns.js';
import { parseCLP, nfdKey } from './utils.js';
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
  // Acepta tanto MouseEvent como TouchEvent
  const cx = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  const cy = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
  let x = cx + pad, y = cy + pad;
  if (x + tw > window.innerWidth  - pad) x = cx - tw - pad;
  if (y + th > window.innerHeight - pad) y = cy - th - pad;
  ttEl.style.left = x + 'px';
  ttEl.style.top  = y + 'px';
}

// Toca el propio tooltip → cierra
ttEl.addEventListener('touchend', hideTooltip, { passive: true });

// Toca fuera de una celda o del tooltip → cierra
document.addEventListener('touchend', e => {
  if (!e.target.closest('#unit-tt') && !e.target.closest('.unit')) {
    hideTooltip();
  }
}, { passive: true });

// Helper: registra tap táctil en un elemento (distingue tap de scroll)
export function addTapToShow(el, showFn) {
  let sx = 0, sy = 0;
  el.addEventListener('touchstart', e => {
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
  }, { passive: true });
  el.addEventListener('touchend', e => {
    const t = e.changedTouches[0];
    if (Math.hypot(t.clientX - sx, t.clientY - sy) < 8) {
      showFn({ clientX: t.clientX, clientY: t.clientY });
    }
  }, { passive: true });
}

export function showParkingTooltip(e, row) {
  // Fallback: si pcol.n no resuelve, busca la primera columna que parezca un número/código
  let n = (row[pcol.n] || '').toString().trim();
  if (!n) {
    const numKey = Object.keys(row).find(k => {
      const nk = nfdKey(k);
      return nk === 'N°' || nk === 'Nº' || nk === 'N' || nk === '#' || nk === 'NUMERO';
    });
    if (numKey) n = (row[numKey] || '').toString().trim();
  }

  const piso   = (row[pcol.piso]    || '').toString().trim();
  const depto  = (row[pcol.depto]   || '').trim();
  const tandem = (row[pcol.tandem]  || '').trim().toUpperCase() === 'SI';
  const dest   = (row[pcol.destino] || '').trim();
  const canon  = parseCLP(row[pcol.canon]);
  const ggcc   = parseCLP(row[pcol.ggcc]);
  const titular = (row[pcol.titular] || '').trim();

  const prefix = n.toUpperCase().startsWith('ELC') ? 'Local' : 'Estac.';
  document.getElementById('tt-title').textContent = prefix + ' ' + n;
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
