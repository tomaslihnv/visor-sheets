import { state, BD } from '../state.js';
import { LAYOUT_IRR, LAYOUT_ECH } from '../config.js';
import { getCategory, getParkingCategory, getBodegaCategory } from '../categories.js';
import { EVOL_COL } from '../columns.js';
import { parseEvolDate } from '../utils.js';

export function updateMetrics(deptoData, estacData, bodData) {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const umap   = BD[state.AB].umap;

  let dContr = 0, dRC = 0, dVac = 0, dPilot = 0;
  const tipMap = {};
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
    }
  }));
  const dTotal   = dContr + dRC + dVac + dPilot;
  const dEnRenta = dContr + dRC;
  const dBase    = dTotal - dPilot;
  document.getElementById('lc-contr').textContent  = dContr;
  document.getElementById('lc-rc').textContent     = dRC;
  document.getElementById('lc-vac').textContent    = dVac;
  document.getElementById('lc-pilot').textContent  = dPilot;
  document.getElementById('occ-depto').textContent =
    dBase > 0 ? Math.round(dEnRenta / dBase * 100) + '%' : '—';
  document.getElementById('occ-depto-un').textContent =
    dBase > 0 ? `(${dEnRenta} un.)` : '';

  const tipEl = document.getElementById('tipologia-breakdown');
  if (tipEl) {
    const rows = Object.entries(tipMap).sort((a, b) => b[1].total - a[1].total);
    tipEl.innerHTML = rows.map(([tipo, { total, rented }]) => {
      const pct = total > 0 ? Math.round(rented / total * 100) : 0;
      return `<div class="tipo-row">
        <span class="tipo-name">${tipo}</span>
        <span class="tipo-count">${rented}/${total}</span>
        <span class="tipo-pct">${pct}%</span>
      </div>`;
    }).join('');
  }

  let eContr = 0, eRC = 0, eVac = 0, eInhab = 0, eVisita = 0, eLocal = 0;
  estacData.forEach(row => {
    const cat = getParkingCategory(row);
    if      (cat === 'contrato')     eContr++;
    else if (cat === 'rc')           eRC++;
    else if (cat === 'inhabilitado') eInhab++;
    else if (cat === 'visita')       eVisita++;
    else if (cat === 'local')        eLocal++;
    else                             eVac++;
  });
  const eEnRenta = eContr + eRC;
  // Total operativo: solo contrato + RC + vacante (excluye inhabilitados, visita y locales)
  const eDisp    = eContr + eRC + eVac;
  const eTotal   = eDisp + eInhab + eVisita + eLocal;
  const eOccPct  = eDisp > 0 ? Math.round(eEnRenta / eDisp * 100) + '%' : '—';
  document.getElementById('occ-estac').textContent = eOccPct;
  // Panel Estacionamientos
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('lc-estac-arr',   eEnRenta);
  set('lc-estac-vac',   eVac);
  set('lc-estac-inhab', eInhab);
  set('lc-estac-visita',eVisita);
  set('lc-estac-local', eLocal);
  set('occ-estac-pct',  eOccPct);
  set('occ-estac-un',   eDisp > 0 ? `(${eEnRenta}/${eDisp})` : '');
  set('occ-estac-total',eTotal);
  set('occ-estac-noarr',eVisita);

  let bContr = 0, bVac = 0;
  bodData.forEach(row => {
    if (getBodegaCategory(row) === 'contrato') bContr++;
    else bVac++;
  });
  const bTotal = bodData.length;
  document.getElementById('occ-bod').textContent =
    bTotal > 0 ? Math.round(bContr / bTotal * 100) + '%' : '—';
  // Panel Bodegas
  const elBodContr = document.getElementById('lc-bod-contr');
  const elBodVac   = document.getElementById('lc-bod-vac');
  const elBodPct   = document.getElementById('occ-bod-pct');
  const elBodUn    = document.getElementById('occ-bod-un');
  if (elBodContr) elBodContr.textContent = bContr;
  if (elBodVac)   elBodVac.textContent   = bVac;
  if (elBodPct)   elBodPct.textContent   = bTotal > 0 ? Math.round(bContr / bTotal * 100) + '%' : '—';
  if (elBodUn)    elBodUn.textContent    = bTotal > 0 ? `(${bContr} un.)` : '';

  const evolData = BD[state.AB].evol;
  const now = new Date();
  const curYear = now.getFullYear(), curMonth = now.getMonth();
  let proyPct = '—', proyUn = '—', naNetos = '—';
  if (evolData && evolData.length) {
    const row = evolData.find(r => {
      const d = parseEvolDate((r[EVOL_COL.fecha]||'').toString());
      return d && d.getFullYear() === curYear && d.getMonth() === curMonth;
    });
    if (row) {
      const pct = parseFloat((row[EVOL_COL.pctFcast]||'').toString().replace('%','').replace(',','.'));
      const un  = parseFloat((row[EVOL_COL.unFcast] ||'').toString().replace(',','.'));
      const net = parseFloat((row[EVOL_COL.netos]   ||'').toString().replace(',','.'));
      if (!isNaN(pct)) proyPct = Math.round(pct * (pct <= 1 ? 100 : 1)) + '%';
      if (!isNaN(un))  proyUn  = `(${Math.round(un)} un.)`;
      if (!isNaN(net)) naNetos = (net > 0 ? '+' : '') + Math.round(net) + ' un.';
    }
  }
  document.getElementById('occ-proy-pct').textContent = proyPct;
  document.getElementById('occ-proy-un').textContent  = proyUn;
  document.getElementById('occ-netos-un').textContent = naNetos;
}
