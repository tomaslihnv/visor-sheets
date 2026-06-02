import { state, BD, CHARTS, destroyChart, ENTRADA_COLOR_MAP, ENTRADA_PALETTE, CHART_COLORS } from '../../state.js';
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

function curMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
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
    const cur = curMonthKey();
    hastaEl.value = months.filter(mk => mk <= cur).pop() || months[months.length - 1];
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

// ── CONTRATOS, SALIDAS Y NETOS (flujo) ───────────────────────────────────────

export function initFlujoChartSelects(contratosData) {
  const desdeEl = document.getElementById('flujo-chart-desde');
  const hastaEl = document.getElementById('flujo-chart-hasta');
  if (!desdeEl) return;

  const salData    = BD[state.AB]?.sal || [];
  const keys       = Object.keys(contratosData[0] || {});
  const firmaCol   = resolveFirmaContratosCol(keys);
  const salFechaCol = salData.length
    ? Object.keys(salData[0]).find(k => cc(k) === 'FECHA') || Object.keys(salData[0])[0]
    : null;

  const monthsSet = new Set();
  if (firmaCol) {
    contratosData.forEach(r => {
      const p = parseDate((r[firmaCol] || '').toString().trim());
      if (p) monthsSet.add(`${p.year}-${String(p.month).padStart(2,'0')}`);
    });
  }
  if (salFechaCol) {
    salData.forEach(r => {
      const p = parseDate((r[salFechaCol] || '').toString().trim());
      if (p) monthsSet.add(`${p.year}-${String(p.month).padStart(2,'0')}`);
    });
  }

  const months = [...monthsSet].sort();
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  months.forEach(mk => {
    const [y, m] = mk.split('-');
    desdeEl.appendChild(new Option(_MESES[parseInt(m)-1] + '-' + String(y).slice(-2), mk));
    hastaEl.appendChild(new Option(_MESES[parseInt(m)-1] + '-' + String(y).slice(-2), mk));
  });
  if (months.length) {
    desdeEl.value = months[0];
    const cur = curMonthKey();
    hastaEl.value = months.filter(mk => mk <= cur).pop() || months[months.length - 1];
  }
}

export function renderFlujoChart() {
  const contratosData = BD[state.AB].contratos;
  const salData       = BD[state.AB].sal;
  const desdeEl       = document.getElementById('flujo-chart-desde');
  const hastaEl       = document.getElementById('flujo-chart-hasta');
  if (!desdeEl || !contratosData.length) return;

  const desde = desdeEl.value;
  const hasta  = hastaEl.value;
  if (!desde || !hasta || desde > hasta) return;

  const keys     = Object.keys(contratosData[0] || {});
  const firmaCol = resolveFirmaContratosCol(keys);
  if (!firmaCol) { destroyChart('termino'); return; }

  const salFechaCol = salData.length
    ? Object.keys(salData[0]).find(k => cc(k) === 'FECHA') || Object.keys(salData[0])[0]
    : null;

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  const entradas = {}, salidas = {};
  allMonths.forEach(mk => { entradas[mk] = 0; salidas[mk] = 0; });

  contratosData.forEach(r => {
    const p = parseDate((r[firmaCol] || '').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk in entradas) entradas[mk]++;
  });

  if (salFechaCol) {
    salData.forEach(r => {
      const p = parseDate((r[salFechaCol] || '').toString().trim());
      if (!p) return;
      const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
      if (mk in salidas) salidas[mk]++;
    });
  }

  const labels       = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const dataEntradas = allMonths.map(mk => entradas[mk]);
  const dataSalidas  = allMonths.map(mk => salidas[mk]);
  const dataNetos    = allMonths.map(mk => entradas[mk] - salidas[mk]);
  const showLabels   = !!document.getElementById('flujo-chart-labels')?.checked;

  const canvas = document.getElementById('flujo-chart-canvas');
  destroyChart('termino');

  CHARTS.termino = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Nuevos Contratos',
          data: dataEntradas,
          borderColor: CHART_COLORS.nuevosContratos, backgroundColor: CHART_COLORS.nuevosContratos + '14',
          borderWidth: 2, tension: 0.3, pointRadius: 2, pointHoverRadius: 4,
          pointBackgroundColor: CHART_COLORS.nuevosContratos, fill: false, spanGaps: true,
          datalabels: {
            display: ctx => showLabels && dataEntradas[ctx.dataIndex] > 0,
            anchor: 'top', align: 'top', offset: 4,
            color: CHART_COLORS.nuevosContratos, font: { size: 8, weight: '700' }, formatter: v => v
          }
        },
        {
          label: 'Salidas',
          data: dataSalidas,
          borderColor: CHART_COLORS.salidas, backgroundColor: CHART_COLORS.salidas + '14',
          borderWidth: 2, tension: 0.3, pointRadius: 2, pointHoverRadius: 4,
          pointBackgroundColor: CHART_COLORS.salidas, fill: false, spanGaps: true,
          datalabels: {
            display: ctx => showLabels && dataSalidas[ctx.dataIndex] > 0,
            anchor: 'top', align: 'top', offset: 4,
            color: CHART_COLORS.salidas, font: { size: 8, weight: '700' }, formatter: v => v
          }
        },
        {
          label: 'Netos',
          data: dataNetos,
          borderColor: CHART_COLORS.netos, backgroundColor: CHART_COLORS.netos + '14',
          borderWidth: 2, tension: 0.3, pointRadius: 2, pointHoverRadius: 4,
          pointBackgroundColor: CHART_COLORS.netos, fill: false, spanGaps: true,
          datalabels: {
            display: ctx => showLabels && dataNetos[ctx.dataIndex] !== 0,
            anchor: ctx => dataNetos[ctx.dataIndex] >= 0 ? 'top' : 'bottom',
            align:  ctx => dataNetos[ctx.dataIndex] >= 0 ? 'top' : 'bottom',
            offset: 4, color: CHART_COLORS.netos, font: { size: 8, weight: '700' },
            formatter: v => v > 0 ? '+' + v : v
          }
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 12, padding: 10, usePointStyle: true } },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (v == null) return null;
              const prefix = ctx.dataset.label === 'Netos' ? (v >= 0 ? '+' : '') : '';
              return ` ${ctx.dataset.label}: ${prefix}${v} un.`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          type: 'linear', position: 'left', grace: '20%',
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}
