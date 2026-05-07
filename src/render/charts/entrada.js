import { state, BD, CHARTS, destroyChart, ENTRADA_COLOR_MAP, ENTRADA_PALETTE, TERMINO_COLOR_MAP, TERMINO_PALETTE } from '../../state.js';
import { parseDate, _MESES } from '../../utils.js';

function getEntradaColor(tipo) {
  if (!ENTRADA_COLOR_MAP[tipo]) {
    const idx = Object.keys(ENTRADA_COLOR_MAP).length % ENTRADA_PALETTE.length;
    ENTRADA_COLOR_MAP[tipo] = ENTRADA_PALETTE[idx];
  }
  return ENTRADA_COLOR_MAP[tipo];
}

// Normalización: sin tildes, sin puntos, sin espacios, uppercase
const cc = k => k.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[\s.]/g, '').toUpperCase();
const normTipo = v => v.trim().toUpperCase().startsWith('R (') ? 'R' : v.trim();

function resolveEntradaCol(keys) {
  return keys.find(k => cc(k) === 'EVENTODEENTRADA') ||
         keys.find(k => cc(k).includes('ENTRADA')) ||
         null;
}

function resolveFirmaContratosCol(keys) {
  // "F. Firma" → cc → "FFORMA", "F. Inicio" → "FINICIO"
  return keys.find(k => cc(k) === 'FFORMA')      ||
         keys.find(k => cc(k).includes('FIRMA'))  ||
         keys.find(k => cc(k) === 'FINICIO')      ||
         keys.find(k => cc(k).includes('INICIO')) ||
         keys.find(k => cc(k) === 'FECHA')        ||
         null;
}

export function initEntradaChartSelects(data) {
  const desdeEl = document.getElementById('entrada-chart-desde');
  const hastaEl = document.getElementById('entrada-chart-hasta');
  if (!desdeEl || !data.length) return;

  const keys       = Object.keys(data[0] || {});
  const entradaCol = resolveEntradaCol(keys);
  const firmaCol   = resolveFirmaContratosCol(keys);

  if (entradaCol) {
    const tipos = new Set();
    data.forEach(r => {
      const v = (r[entradaCol] || '').toString().trim();
      if (v) tipos.add(v);
    });
    [...tipos].sort().forEach(t => getEntradaColor(t));
  }

  if (!firmaCol) {
    console.error('[entrada] No se encontró columna de fecha. Columnas:', keys);
    return;
  }

  const monthsSet = new Set();
  data.forEach(r => {
    const p = parseDate((r[firmaCol] || '').toString().trim());
    if (!p) return;
    monthsSet.add(`${p.year}-${String(p.month).padStart(2,'0')}`);
  });

  const months = [...monthsSet].sort();
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  months.forEach(mk => {
    const [y, m] = mk.split('-');
    const label = _MESES[parseInt(m)-1] + '-' + String(y).slice(-2);
    desdeEl.appendChild(new Option(label, mk));
    hastaEl.appendChild(new Option(label, mk));
  });
  if (months.length) {
    desdeEl.value = months[0];
    hastaEl.value = months[months.length - 1];
  }
}

export function renderEntradaChart() {
  const data    = BD[state.AB].contratos;
  const desdeEl = document.getElementById('entrada-chart-desde');
  const hastaEl = document.getElementById('entrada-chart-hasta');
  if (!desdeEl || !data.length) return;

  const desde = desdeEl.value;
  const hasta  = hastaEl.value;
  if (!desde || !hasta || desde > hasta) return;

  const keys       = Object.keys(data[0] || {});
  const entradaCol = resolveEntradaCol(keys);
  const firmaCol   = resolveFirmaContratosCol(keys);

  if (!entradaCol || !firmaCol) {
    console.error('[entrada] col entrada:', entradaCol, '| col firma:', firmaCol);
    destroyChart('entrada');
    return;
  }

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  const tiposSet = new Set();
  data.forEach(r => {
    const v = normTipo((r[entradaCol] || '').toString());
    if (v) tiposSet.add(v);
  });
  const tipos = [...tiposSet].sort();

  const counts = {};
  tipos.forEach(t => {
    counts[t] = {};
    allMonths.forEach(mk => counts[t][mk] = 0);
  });

  data.forEach(r => {
    const p = parseDate((r[firmaCol] || '').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in (counts[tipos[0]] || {}))) return;
    const tipo = normTipo((r[entradaCol] || '').toString());
    if (!tipo || !counts[tipo]) return;
    counts[tipo][mk]++;
  });

  const labels     = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const showLabels = !!document.getElementById('entrada-chart-labels')?.checked;

  const datasets = tipos.map(tipo => {
    const tipData = allMonths.map(mk => counts[tipo][mk] || 0);
    const color   = getEntradaColor(tipo);
    return {
      label: tipo,
      data: tipData,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointBackgroundColor: color,
      fill: false,
      spanGaps: true,
      datalabels: {
        display: ctx => showLabels && tipData[ctx.dataIndex] > 0,
        anchor: 'top', align: 'top', offset: 4,
        color,
        font: { size: 8, weight: '700' },
        formatter: v => v
      }
    };
  });

  const canvas = document.getElementById('entrada-chart-canvas');
  destroyChart('entrada');

  CHARTS.entrada = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 10, usePointStyle: true }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (!v) return null;
              return ` ${ctx.dataset.label}: ${v} un.`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          type: 'linear', position: 'left',
          grace: '20%', min: 0,
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}

// ── EVENTOS DE TÉRMINO ────────────────────────────────────────────────────────

function getTerminoColor(tipo) {
  if (!TERMINO_COLOR_MAP[tipo]) {
    const idx = Object.keys(TERMINO_COLOR_MAP).length % TERMINO_PALETTE.length;
    TERMINO_COLOR_MAP[tipo] = TERMINO_PALETTE[idx];
  }
  return TERMINO_COLOR_MAP[tipo];
}

function resolveTerminoCol(keys) {
  return keys.find(k => cc(k) === 'EVENTODETERMINO') ||
         keys.find(k => cc(k).includes('TERMINO'))   ||
         null;
}

function resolveFechaTerminoCol(keys) {
  // Priorizar "F. Venc." o "F. Termino" sobre "F. Firma"
  return keys.find(k => cc(k) === 'FVENC')           ||
         keys.find(k => cc(k) === 'FTERMINO')        ||
         keys.find(k => cc(k).includes('VENC'))      ||
         keys.find(k => cc(k).includes('TERMINO') && cc(k).startsWith('F')) ||
         null;
}

export function initTerminoChartSelects(data) {
  const desdeEl = document.getElementById('termino-chart-desde');
  const hastaEl = document.getElementById('termino-chart-hasta');
  if (!desdeEl || !data.length) return;

  const keys      = Object.keys(data[0] || {});
  const terminoCol = resolveTerminoCol(keys);
  const fechaCol   = resolveFechaTerminoCol(keys);

  if (terminoCol) {
    const tipos = new Set();
    data.forEach(r => {
      const v = normTipo((r[terminoCol] || '').toString());
      if (v) tipos.add(v);
    });
    [...tipos].sort().forEach(t => getTerminoColor(t));
  }

  if (!fechaCol) {
    console.error('[termino] No se encontró columna de fecha. Columnas:', keys);
    return;
  }

  const monthsSet = new Set();
  data.forEach(r => {
    const p = parseDate((r[fechaCol] || '').toString().trim());
    if (!p) return;
    monthsSet.add(`${p.year}-${String(p.month).padStart(2,'0')}`);
  });

  const months = [...monthsSet].sort();
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  months.forEach(mk => {
    const [y, m] = mk.split('-');
    const label = _MESES[parseInt(m)-1] + '-' + String(y).slice(-2);
    desdeEl.appendChild(new Option(label, mk));
    hastaEl.appendChild(new Option(label, mk));
  });
  if (months.length) {
    desdeEl.value = months[0];
    hastaEl.value = months[months.length - 1];
  }
}

export function renderTerminoChart() {
  const data    = BD[state.AB].contratos;
  const desdeEl = document.getElementById('termino-chart-desde');
  const hastaEl = document.getElementById('termino-chart-hasta');
  if (!desdeEl || !data.length) return;

  const desde = desdeEl.value;
  const hasta  = hastaEl.value;
  if (!desde || !hasta || desde > hasta) return;

  const keys       = Object.keys(data[0] || {});
  const terminoCol = resolveTerminoCol(keys);
  const fechaCol   = resolveFechaTerminoCol(keys);

  if (!terminoCol || !fechaCol) {
    console.error('[termino] col término:', terminoCol, '| col fecha:', fechaCol);
    destroyChart('termino');
    return;
  }

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  const tiposSet = new Set();
  data.forEach(r => {
    const v = normTipo((r[terminoCol] || '').toString());
    if (v) tiposSet.add(v);
  });
  const tipos = [...tiposSet].sort();

  const counts = {};
  tipos.forEach(t => {
    counts[t] = {};
    allMonths.forEach(mk => counts[t][mk] = 0);
  });

  data.forEach(r => {
    const p = parseDate((r[fechaCol] || '').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in (counts[tipos[0]] || {}))) return;
    const tipo = normTipo((r[terminoCol] || '').toString());
    if (!tipo || !counts[tipo]) return;
    counts[tipo][mk]++;
  });

  const labels     = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const showLabels = !!document.getElementById('termino-chart-labels')?.checked;

  const datasets = tipos.map(tipo => {
    const tipData = allMonths.map(mk => counts[tipo][mk] || 0);
    const color   = getTerminoColor(tipo);
    return {
      label: tipo,
      data: tipData,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointBackgroundColor: color,
      fill: false,
      spanGaps: true,
      datalabels: {
        display: ctx => showLabels && tipData[ctx.dataIndex] > 0,
        anchor: 'top', align: 'top', offset: 4,
        color,
        font: { size: 8, weight: '700' },
        formatter: v => v
      }
    };
  });

  const canvas = document.getElementById('termino-chart-canvas');
  destroyChart('termino');

  CHARTS.termino = new Chart(canvas, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'right',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 10, usePointStyle: true }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (!v) return null;
              return ` ${ctx.dataset.label}: ${v} un.`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          type: 'linear', position: 'left',
          grace: '20%', min: 0,
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}
