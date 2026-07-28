import { state, BD, CHARTS, destroyChart } from '../state.js';
import { LAYOUT_IRR, LAYOUT_ECH, MAX_COL_IRR, MAX_COL_ECH } from '../config.js';
import { parseDate, parseEvolDate, _MESES } from '../utils.js';

// ── Colores por estado de reparación ────────────────────────────────────────
const REP_STATUS = {
  reparado: { bg: '#d1fae5', border: '#6ee7b7', color: '#065f46', label: 'Reparado'    },
  proceso:  { bg: '#fef9c3', border: '#fde047', color: '#854d0e', label: 'En proceso'  },
  revisar:  { bg: '#e2e8f0', border: '#94a3b8', color: '#334155', label: 'Por revisar' },
  danado:   { bg: '#fee2e2', border: '#fca5a5', color: '#991b1b', label: 'Dañado'      },
};
const NEUTRAL = { bg: '#f0f4f8', border: '#d1dae3', color: '#8a9bb0' };
const DIMMED  = { bg: '#f8fafc', border: '#edf1f5', color: '#d1dae3' };

let _selectedMonth = null; // 'YYYY-MM'

// ── Helpers ─────────────────────────────────────────────────────────────────
function cc(k) {
  return k.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s.]/g, '').toUpperCase();
}

function classify(row) {
  if (!row) return null;
  const estado  = (row['Estado']  || '').trim();
  const arreglo = (row['Arreglo'] || '').trim().toLowerCase();
  if (arreglo.includes('proceso') || arreglo.includes('process')) return 'proceso';
  if (/por\s*revisar/i.test(estado)) return 'revisar';
  if (/da[ñn]ado/i.test(estado))     return 'danado';
  if (/reparado/i.test(estado))       return 'reparado';
  return null;
}

function buildRepMap(rep) {
  const map = {};
  rep.forEach(row => {
    const unit = (row['Unidad'] || '').toString().trim();
    if (unit) map[unit] = row;
  });
  return map;
}

function findCol(keys, ...matchers) {
  for (const m of matchers) {
    const found = keys.find(k => m(cc(k)));
    if (found) return found;
  }
  return null;
}

function findContratosUnitCol(keys) {
  return findCol(keys,
    k => k === 'DEPTO',
    k => k.includes('DEPTO'),
    k => k === 'UNIDAD',
    k => k === 'NO' || k === 'N',
  );
}

function findTerminoCol(keys) {
  return findCol(keys, k => k === 'FTERMINO', k => k.includes('TERMINO'));
}

function findVencCol(keys) {
  return findCol(keys,
    k => k === 'FVENC',
    k => k.includes('VENCIMIENTOSNETOS') || k.includes('VENCIMIENTO'),
    k => k === 'SALIDAS' || k === 'SALIDA',
    k => k.includes('VENC'),
  );
}

// Por fila: usa F. Termino si tiene valor, si no usa F. Venc.
// Soporta DD/MM/YYYY, YYYY-MM-DD y otros formatos via parseEvolDate.
function getEndDate(row, terminoCol, vencCol) {
  const t   = terminoCol ? (row[terminoCol] || '').toString().trim() : '';
  const v   = vencCol    ? (row[vencCol]    || '').toString().trim() : '';
  const raw = t || v;
  if (!raw) return null;
  const pd = parseDate(raw);
  if (pd) return pd;
  const d = parseEvolDate(raw);
  if (!d || isNaN(d)) return null;
  return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
}

function findTitularCol(keys) {
  return findCol(keys,
    k => k === 'NOMBRE',
    k => k.includes('NOMBRE'),
    k => k === 'TITULAR' || k.includes('TITULAR'),
    k => k.includes('ARREN'),
    k => k.includes('CLIENTE'),
  );
}

function findRentaCol(keys) {
  return findCol(keys,
    k => k.includes('CANON') && k.includes('DPTO'),
    k => k.includes('CANON'),
    k => k === 'RENTA' || k.includes('RENTA'),
    k => k.includes('ARRIENDO'),
    k => k.startsWith('UF') || k.endsWith('UF'),
  );
}

// Last occurrence per unit (handles contract renewals)
function buildContratosMap(contratos) {
  if (!contratos.length) return {};
  const keys    = Object.keys(contratos[0]);
  const unitCol = findContratosUnitCol(keys);
  if (!unitCol) return {};
  const map = {};
  contratos.forEach(row => {
    const unit = (row[unitCol] || '').toString().trim();
    if (unit) map[unit] = row;
  });
  return map;
}

function toMonthKey(pd) {
  if (!pd) return null;
  return `${pd.year}-${String(pd.month).padStart(2, '0')}`;
}

function nextMonths(n = 12) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function fmtMonthLabel(key) {
  const [y, m] = key.split('-');
  const mes = _MESES[parseInt(m) - 1] || m;
  return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${y}`;
}

// ── Stacking plan de auditoría ───────────────────────────────────────────────
export function renderAuditoriaStacking() {
  const ab        = state.AB;
  const layout    = ab === 'irr' ? LAYOUT_IRR : LAYOUT_ECH;
  const maxCol    = ab === 'irr' ? MAX_COL_IRR : MAX_COL_ECH;
  const repMap    = buildRepMap(BD[ab].rep || []);
  const cmap      = buildContratosMap(BD[ab].contratos || []);
  const container = document.getElementById('auditoria-stacking');
  if (!container) return;

  // Pre-compute units expiring in _selectedMonth
  let expiringSet = null;
  if (_selectedMonth && BD[ab].contratos.length) {
    expiringSet = new Set();
    const keys       = Object.keys(BD[ab].contratos[0]);
    const terminoCol = findTerminoCol(keys);
    const vencCol    = findVencCol(keys);
    Object.entries(cmap).forEach(([unit, row]) => {
      const pd = getEndDate(row, terminoCol, vencCol);
      if (pd && toMonthKey(pd) === _selectedMonth) expiringSet.add(unit);
    });
  }

  container.innerHTML = '';
  layout.forEach(floor => {
    const colMap = {};
    floor.cells.forEach(c => { colMap[c.c] = c.n; });
    const rowEl = document.createElement('div');
    rowEl.className = 'aud-floor-row';
    const lbl = document.createElement('div');
    lbl.className = 'aud-floor-label';
    lbl.textContent = 'P' + floor.p;
    rowEl.appendChild(lbl);
    const cells = document.createElement('div');
    cells.className = 'aud-floor-cells';
    for (let c = 1; c <= maxCol; c++) {
      const el = document.createElement('div');
      if (colMap[c] !== undefined) {
        const n      = colMap[c];
        const unit   = String(n);
        const repRow = repMap[unit];
        const status = classify(repRow);
        el.className = 'aud-unit';

        let style;
        if (!status) {
          style = expiringSet ? DIMMED : NEUTRAL;
        } else if (expiringSet) {
          style = expiringSet.has(unit) ? REP_STATUS[status] : DIMMED;
        } else {
          style = REP_STATUS[status];
        }
        el.style.background  = style.bg;
        el.style.borderColor = style.border;
        el.style.color       = style.color;

        const estado  = repRow ? (repRow['Estado']  || '') : '';
        const arreglo = repRow ? (repRow['Arreglo'] || '') : '';
        el.title = repRow ? `${unit} · ${estado} · ${arreglo}` : unit;
        el.innerHTML = `<span class="aud-unit-num">${n}</span>`;
      } else {
        el.className = 'aud-cell-gap';
      }
      cells.appendChild(el);
    }
    rowEl.appendChild(cells);
    container.appendChild(rowEl);
  });
}

// ── Gráfico de barras apiladas por mes ───────────────────────────────────────
export function renderAuditoriaBarChart() {
  const ab       = state.AB;
  const rep      = BD[ab].rep || [];
  const contratos = BD[ab].contratos || [];
  const canvas   = document.getElementById('auditoria-bar-canvas');
  if (!canvas) return;

  if (!rep.length || !contratos.length) {
    destroyChart('auditoria');
    return;
  }

  const repMap     = buildRepMap(rep);
  const keys       = Object.keys(contratos[0]);
  const terminoCol = findTerminoCol(keys);
  const vencCol    = findVencCol(keys);
  if (!terminoCol && !vencCol) { destroyChart('auditoria'); return; }

  const cmap   = buildContratosMap(contratos);
  const months = nextMonths(12);
  const countsDanado   = Array(12).fill(0);
  const countsRevisar  = Array(12).fill(0);
  const countsReparado = Array(12).fill(0);

  Object.entries(cmap).forEach(([unit, row]) => {
    const status = classify(repMap[unit]);
    if (!status || status === 'proceso') return;
    const pd = getEndDate(row, terminoCol, vencCol);
    if (!pd) return;
    const idx = months.indexOf(toMonthKey(pd));
    if (idx === -1) return;
    if (status === 'danado')   countsDanado[idx]++;
    if (status === 'revisar')  countsRevisar[idx]++;
    if (status === 'reparado') countsReparado[idx]++;
  });

  destroyChart('auditoria');
  const months12 = months; // captured for onClick closure

  CHARTS.auditoria = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: months.map(fmtMonthLabel),
      datasets: [
        {
          label: 'Dañadas',
          data: countsDanado,
          backgroundColor: REP_STATUS.danado.bg,
          borderColor: REP_STATUS.danado.border,
          borderWidth: 1,
          datalabels: {
            display: ctx => countsDanado[ctx.dataIndex] > 0,
            color: REP_STATUS.danado.color,
            font: { size: 10, weight: '700' },
            anchor: 'center',
            align: 'center',
          },
        },
        {
          label: 'Por revisar',
          data: countsRevisar,
          backgroundColor: REP_STATUS.revisar.bg,
          borderColor: REP_STATUS.revisar.border,
          borderWidth: 1,
          datalabels: {
            display: ctx => countsRevisar[ctx.dataIndex] > 0,
            color: REP_STATUS.revisar.color,
            font: { size: 10, weight: '700' },
            anchor: 'center',
            align: 'center',
          },
        },
        {
          label: 'Reparados',
          data: countsReparado,
          backgroundColor: REP_STATUS.reparado.bg,
          borderColor: REP_STATUS.reparado.border,
          borderWidth: 1,
          datalabels: {
            display: ctx => countsReparado[ctx.dataIndex] > 0,
            color: REP_STATUS.reparado.color,
            font: { size: 10, weight: '700' },
            anchor: 'center',
            align: 'center',
          },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: '#e5e7eb' } },
      },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 12 } },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y} unidad(es)`,
          },
        },
      },
      onClick: (_evt, elements) => {
        if (!elements.length) return;
        const idx = elements[0].index;
        _selectedMonth = months12[idx];
        const lbl = document.getElementById('auditoria-month-label');
        if (lbl) lbl.textContent = fmtMonthLabel(_selectedMonth);
        renderAuditoriaStacking();
        renderAuditoriaTable();
      },
    },
  });
}

// ── Tabla de detalle ─────────────────────────────────────────────────────────
export function renderAuditoriaTable() {
  const ab       = state.AB;
  const tbody    = document.getElementById('auditoria-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!_selectedMonth) return;

  const rep      = BD[ab].rep || [];
  const contratos = BD[ab].contratos || [];
  if (!rep.length || !contratos.length) return;

  const repMap     = buildRepMap(rep);
  const keys       = Object.keys(contratos[0]);
  const terminoCol = findTerminoCol(keys);
  const vencCol    = findVencCol(keys);
  const titularCol = findTitularCol(keys);
  const rentaCol   = findRentaCol(keys);
  if (!terminoCol && !vencCol) return;

  const cmap = buildContratosMap(contratos);
  const rows = [];

  Object.entries(cmap).forEach(([unit, row]) => {
    const status = classify(repMap[unit]);
    if (!status || status === 'proceso') return;
    const pd = getEndDate(row, terminoCol, vencCol);
    if (!pd || toMonthKey(pd) !== _selectedMonth) return;
    rows.push({ unit, row, status, pd });
  });

  rows.sort((a, b) => parseInt(a.unit) - parseInt(b.unit));

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="aud-table-empty">Sin unidades con reparaciones pendientes para este mes</td></tr>';
    return;
  }

  rows.forEach(({ unit, row, status, pd }) => {
    const tr = document.createElement('tr');
    const fmtDate = `${String(pd.day).padStart(2,'0')}/${String(pd.month).padStart(2,'0')}/${pd.year}`;
    const titular = titularCol ? (row[titularCol] || '—') : '—';
    const renta   = rentaCol   ? (row[rentaCol]   || '—') : '—';
    tr.innerHTML = `
      <td>${unit}</td>
      <td>${titular}</td>
      <td>${renta}</td>
      <td>${fmtDate}</td>
      <td><span class="aud-badge aud-badge-${status}">${REP_STATUS[status].label}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// ── Reset al cambiar edificio ────────────────────────────────────────────────
export function resetAuditoria() {
  _selectedMonth = null;
  const lbl = document.getElementById('auditoria-month-label');
  if (lbl) lbl.textContent = '';
  const tbody = document.getElementById('auditoria-table-body');
  if (tbody) tbody.innerHTML = '';
}

// ── Entry point ──────────────────────────────────────────────────────────────
export function renderAuditoria() {
  renderAuditoriaBarChart();
  renderAuditoriaStacking();
}
