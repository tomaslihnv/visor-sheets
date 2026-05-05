import { state, BD } from '../state.js';
import { LAYOUT_IRR, LAYOUT_ECH } from '../config.js';
import { getCategory, getParkingCategory, getBodegaCategory } from '../categories.js';
import { EVOL_COL } from '../columns.js';
import { parseEvolDate } from '../utils.js';

export function updateMetrics(deptoData, estacData, bodData) {
  const layout = state.AB === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const umap   = BD[state.AB].umap;

  let dContr = 0, dRC = 0, dVac = 0, dPilot = 0;
  layout.forEach(floor => floor.cells.forEach(cell => {
    const u = umap[cell.n];
    const cat = getCategory(u);
    if      (cat === 'contrato') dContr++;
    else if (cat === 'rc')       dRC++;
    else if (cat === 'vacante')  dVac++;
    else if (cat === 'piloto')   dPilot++;
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

  let eContr = 0, eRC = 0, eVac = 0;
  estacData.forEach(row => {
    const cat = getParkingCategory(row);
    if      (cat === 'contrato') eContr++;
    else if (cat === 'rc')       eRC++;
    else                         eVac++;
  });
  const eEnRenta = eContr + eRC;
  const eTotal   = estacData.length;
  document.getElementById('occ-estac').textContent =
    eTotal > 0 ? Math.round(eEnRenta / eTotal * 100) + '%' : '—';

  let bContr = 0, bVac = 0;
  bodData.forEach(row => {
    if (getBodegaCategory(row) === 'contrato') bContr++;
    else bVac++;
  });
  const bTotal = bodData.length;
  document.getElementById('occ-bod').textContent =
    bTotal > 0 ? Math.round(bContr / bTotal * 100) + '%' : '—';

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
