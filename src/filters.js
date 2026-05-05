import { state, BD } from './state.js';
import { LAYOUT_IRR, LAYOUT_ECH, CAT_STYLE } from './config.js';
import { getCategory, getParkingCategory, getBodegaCategory } from './categories.js';
import { pcol, bcol } from './columns.js';
import { renderColumnHeaders } from './render/headers.js';

export let _vencMin = 0, _vencMax = 1;
export let _ufMin = 0, _ufMax = 1;

export function populateDropdowns(data) {
  const tipos = new Set(), sub1s = new Set(), sub2s = new Set();
  data.forEach(r => {
    const t = (r['Tipo'] || '').trim(); if (t) tipos.add(t);
    const s1 = (r['Sub Tip. (1)'] || '').trim(); if (s1) sub1s.add(s1);
    const s2 = (r['Sub. Tip (2)'] || '').trim(); if (s2) sub2s.add(s2);
  });
  const fill = (id, vals) => {
    const sel = document.getElementById(id);
    while (sel.options.length > 1) sel.remove(1);
    [...vals].sort().forEach(v => {
      const o = document.createElement('option');
      o.value = o.textContent = v;
      sel.appendChild(o);
    });
  };
  fill('ft-tipo', tipos); fill('ft-sub1', sub1s); fill('ft-sub2', sub2s);
}

export function initVencFilter(data) {
  const vals = [];
  data.forEach(r => {
    const dest = (r['Destino'] || '').trim().replace('−', '-');
    const stat = (r['Estatus'] || '').trim();
    if (stat === '1' && dest === '-' && r.__diasRemanentes != null) {
      vals.push(r.__diasRemanentes);
    }
  });
  if (!vals.length) return;
  _vencMin = Math.min(...vals);
  _vencMax = Math.max(...vals);
  const sl = document.getElementById('venc-slider');
  sl.min   = _vencMin;
  sl.max   = _vencMax;
  sl.value = _vencMax;
  document.getElementById('venc-label').textContent = 'Sin filtro';
  document.getElementById('fd-venc').style.display = '';
  document.getElementById('fs-venc').style.display = '';
}

export function onVencSlider(el) {
  const val = parseInt(el.value);
  document.getElementById('venc-label').textContent =
    val >= _vencMax ? 'Sin filtro' : `Hasta ${val} días`;
  applyFilters();
}

export function initUFFilter(data) {
  const vals = data.filter(r => r.__canonUFm2 != null).map(r => r.__canonUFm2);
  if (!vals.length) return;
  _ufMin = Math.floor(Math.min(...vals) * 100) / 100;
  _ufMax = Math.ceil( Math.max(...vals) * 100) / 100;
  _setUFSliders(_ufMin, _ufMax, _ufMin, _ufMax);
  document.getElementById('fd-uf').style.display = '';
  document.getElementById('fs-uf').style.display = '';
}

export function onUFRange() {
  const loEl = document.getElementById('uf-lo'), hiEl = document.getElementById('uf-hi');
  let loV = parseFloat(loEl.value), hiV = parseFloat(hiEl.value);
  if (loV > hiV) { loV = hiV; loEl.value = loV; }
  updateUFFill(parseFloat(loEl.min), parseFloat(hiEl.max), loV, hiV);
  document.getElementById('uf-lo-lbl').textContent = loV.toFixed(2);
  document.getElementById('uf-hi-lbl').textContent = hiV.toFixed(2);
  applyFilters();
}

export function _setUFSliders(min, max, lo, hi) {
  const loEl = document.getElementById('uf-lo');
  const hiEl = document.getElementById('uf-hi');
  if (!loEl || !hiEl) return;
  loEl.min = min; loEl.max = max; loEl.value = lo;
  hiEl.min = min; hiEl.max = max; hiEl.value = hi;
  document.getElementById('uf-lo-lbl').textContent = parseFloat(lo).toFixed(2);
  document.getElementById('uf-hi-lbl').textContent = parseFloat(hi).toFixed(2);
  updateUFFill(min, max, lo, hi);
}

export function updateUFFill(min, max, lo, hi) {
  const r = max - min || 1;
  const fill = document.getElementById('uf-fill');
  fill.style.left  = ((lo - min) / r * 100) + '%';
  fill.style.width = ((hi - lo)  / r * 100) + '%';
}

export function applyFilters() {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const umap   = BD[state.AB].umap;
  const pmapData = BD[state.AB].park;
  const bmapData = BD[state.AB].bod;

  const fu   = document.querySelector('input[name="fu"]:checked')?.value  || 'todas';
  const ftb  = document.querySelector('input[name="ftb"]:checked')?.value || 'todos';
  const ftT  = document.getElementById('ft-tipo').value;
  const ftS1 = document.getElementById('ft-sub1').value;
  const ftS2 = document.getElementById('ft-sub2').value;
  const foC  = [...document.querySelectorAll('.check-group input:checked')].map(c => c.value);
  const foA  = foC.length > 0;

  const vencEl     = document.getElementById('venc-slider');
  const vencActive = document.getElementById('fs-venc').style.display !== 'none';
  const vencVal    = vencEl ? parseInt(vencEl.value) : null;
  const vencOn     = vencActive && vencVal != null && vencVal < _vencMax;

  const loEl      = document.getElementById('uf-lo');
  const hiEl      = document.getElementById('uf-hi');
  const ufVisible = document.getElementById('fs-uf').style.display !== 'none';
  const ufLo      = loEl ? parseFloat(loEl.value) : null;
  const ufHi      = hiEl ? parseFloat(hiEl.value) : null;
  const ufFilterOn = ufVisible && loEl != null && (ufLo > _ufMin || ufHi < _ufMax);

  layout.forEach(floor => floor.cells.forEach(cell => {
    const el  = document.getElementById('u-' + cell.n);
    if (!el) return;
    const u   = umap[cell.n];
    const cat = getCategory(u);
    const s   = CAT_STYLE[cat];

    let show = (ftb === 'todos' || ftb === 'departamentos');

    if (show) {
      if      (fu === 'contratos') show = cat === 'contrato';
      else if (fu === 'en-renta')  show = cat === 'contrato' || cat === 'rc';
      else if (fu === 'vacantes')  show = cat === 'vacante';
    }
    if (show && u) {
      if (ftT  && (u['Tipo']         || '').trim() !== ftT)  show = false;
      if (ftS1 && (u['Sub Tip. (1)'] || '').trim() !== ftS1) show = false;
      if (ftS2 && (u['Sub. Tip (2)'] || '').trim() !== ftS2) show = false;
    }
    if (show && foA && u) show = foC.includes((u['Orientación'] || '').trim());
    if (show && vencOn && cat === 'contrato' && u)
      show = u.__diasRemanentes != null && u.__diasRemanentes <= vencVal;
    if (show && ufFilterOn && cat === 'contrato' && u)
      show = u.__canonUFm2 != null && u.__canonUFm2 >= ufLo && u.__canonUFm2 <= ufHi;

    el.style.background  = s.bg;
    el.style.borderColor = s.border;
    el.style.color       = s.color;
    el.classList.toggle('dimmed', !show);
  }));

  pmapData.forEach(unit => {
    const n  = (unit[pcol.n] || '').toString().trim();
    const el = document.getElementById('p-' + n);
    if (!el) return;
    const cat = getParkingCategory(unit);
    const s   = CAT_STYLE[cat];

    let show = (ftb === 'todos' || ftb === 'estacionamientos');
    if (show) {
      if      (fu === 'contratos') show = cat === 'contrato';
      else if (fu === 'en-renta')  show = cat === 'contrato' || cat === 'rc';
      else if (fu === 'vacantes')  show = cat === 'vacante';
    }
    el.style.background  = s.bg;
    el.style.borderColor = s.border;
    el.style.color       = s.color;
    el.classList.toggle('dimmed', !show);
  });

  bmapData.forEach(unit => {
    const n  = (unit[bcol.n] || '').toString().trim();
    const el = document.getElementById('b-' + n);
    if (!el) return;
    const cat = getBodegaCategory(unit);
    const s   = CAT_STYLE[cat];

    let show = (ftb === 'todos' || ftb === 'bodegas');
    if (show) {
      if      (fu === 'contratos') show = cat === 'contrato';
      else if (fu === 'en-renta')  show = cat === 'contrato';
      else if (fu === 'vacantes')  show = cat === 'vacante';
    }
    el.style.background  = s.bg;
    el.style.borderColor = s.border;
    el.style.color       = s.color;
    el.classList.toggle('dimmed', !show);
  });

  renderColumnHeaders();
  refreshUFRange(fu, ftb, ftT, ftS1, ftS2, foC, foA, vencOn, vencVal);
}

export function refreshUFRange(fu, ftb, ftT, ftS1, ftS2, foC, foA, vencOn, vencVal) {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const umap   = BD[state.AB].umap;
  if (!Object.keys(umap).length) return;

  const vals = [];
  layout.forEach(floor => floor.cells.forEach(cell => {
    const u = umap[cell.n];
    if (!u || u.__canonUFm2 == null) return;
    const cat = getCategory(u);

    if (!(ftb === 'todos' || ftb === 'departamentos')) return;
    if (fu === 'contratos' && cat !== 'contrato') return;
    if (fu === 'en-renta'  && cat !== 'contrato' && cat !== 'rc') return;
    if (fu === 'vacantes'  && cat !== 'vacante') return;
    if (ftT  && (u['Tipo']         || '').trim() !== ftT)  return;
    if (ftS1 && (u['Sub Tip. (1)'] || '').trim() !== ftS1) return;
    if (ftS2 && (u['Sub. Tip (2)'] || '').trim() !== ftS2) return;
    if (foA  && !foC.includes((u['Orientación'] || '').trim())) return;
    if (vencOn && cat === 'contrato' && !(u.__diasRemanentes != null && u.__diasRemanentes <= vencVal)) return;

    vals.push(u.__canonUFm2);
  }));

  if (!vals.length) return;
  const newMin = Math.floor(Math.min(...vals) * 100) / 100;
  const newMax = Math.ceil( Math.max(...vals) * 100) / 100;

  if (newMin === _ufMin && newMax === _ufMax) return;

  _ufMin = newMin;
  _ufMax = newMax;
  _setUFSliders(newMin, newMax, newMin, newMax);
}

export function resetFilters() {
  document.getElementById('fu-todas').checked  = true;
  document.getElementById('ftb-todos').checked = true;
  ['ft-tipo','ft-sub1','ft-sub2'].forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('.check-group input').forEach(c => c.checked = false);
  const sl = document.getElementById('venc-slider');
  if (sl) { sl.value = _vencMax; document.getElementById('venc-label').textContent = 'Sin filtro'; }
  if (document.getElementById('fs-uf').style.display !== 'none')
    _setUFSliders(_ufMin, _ufMax, _ufMin, _ufMax);
  applyFilters();
}
