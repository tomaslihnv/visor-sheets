import { state, BD, CHARTS, destroyChart, ENTRADA_COLOR_MAP, ENTRADA_PALETTE } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';

function getEntradaColor(tipo) {
  if (!ENTRADA_COLOR_MAP[tipo]) {
    const idx = Object.keys(ENTRADA_COLOR_MAP).length % ENTRADA_PALETTE.length;
    ENTRADA_COLOR_MAP[tipo] = ENTRADA_PALETTE[idx];
  }
  return ENTRADA_COLOR_MAP[tipo];
}

// Resuelve la columna "Evento de Entrada" (AX) dinámicamente
function resolveEntradaCol(sample) {
  const keys = Object.keys(sample);
  return keys.find(k => nfdKey(k) === 'Evento de Entrada') ||
         keys.find(k => nfdKey(k).includes('ENTRADA')) ||
         keys.find(k => nfdKey(k).includes('INICIO')) ||
         null;
}

// Resuelve la columna de fecha del sheet de vencimientos
function resolveFechaCol(sample) {
  const keys = Object.keys(sample);
  return keys.find(k => nfdKey(k) === 'FECHA') || keys[0];
}

export function initEntradaChartSelects(vencData) {
  const desdeEl = document.getElementById('entrada-chart-desde');
  const hastaEl = document.getElementById('entrada-chart-hasta');
  if (!desdeEl || !vencData.length) return;

  const sample    = vencData[0] || {};
  const fechaCol  = resolveFechaCol(sample);
  const entradaCol = resolveEntradaCol(sample);

  // Pre-asignar colores a todos los tipos de entrada presentes
  if (entradaCol) {
    const tipos = new Set();
    vencData.forEach(r => {
      const v = (r[entradaCol]||'').toString().trim();
      if (v) tipos.add(v);
    });
    [...tipos].sort().forEach(t => getEntradaColor(t));
  }

  // Obtener meses únicos
  const monthsSet = new Set();
  vencData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
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
  const vencData = BD[state.AB].venc;
  const desdeEl  = document.getElementById('entrada-chart-desde');
  const hastaEl  = document.getElementById('entrada-chart-hasta');
  if (!desdeEl || !vencData.length) return;

  const desde = desdeEl.value;
  const hasta  = hastaEl.value;
  if (!desde || !hasta || desde > hasta) return;

  const sample     = vencData[0] || {};
  const fechaCol   = resolveFechaCol(sample);
  const entradaCol = resolveEntradaCol(sample);

  if (!entradaCol) {
    destroyChart('entrada');
    return;
  }

  // Generar todos los meses en el rango
  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  // Reunir todos los tipos de entrada y sus conteos por mes
  const tiposSet = new Set();
  vencData.forEach(r => {
    const v = (r[entradaCol]||'').toString().trim();
    if (v) tiposSet.add(v);
  });
  const tipos = [...tiposSet].sort();

  // counts[tipo][mk] = número
  const counts = {};
  tipos.forEach(t => {
    counts[t] = {};
    allMonths.forEach(mk => counts[t][mk] = 0);
  });

  vencData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in (counts[tipos[0]] || {}))) return;
    const tipo = (r[entradaCol]||'').toString().trim();
    if (!tipo || !counts[tipo]) return;
    counts[tipo][mk]++;
  });

  const labels      = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const showLabels  = !!document.getElementById('entrada-chart-labels')?.checked;

  const datasets = tipos.map(tipo => {
    const data  = allMonths.map(mk => counts[tipo][mk] || 0);
    const color = getEntradaColor(tipo);
    return {
      label: tipo,
      data,
      borderColor: color,
      backgroundColor: color + '22',
      borderWidth: 2,
      tension: 0.3,
      pointRadius: 4,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
      fill: false,
      spanGaps: true,
      datalabels: {
        display: ctx => showLabels && data[ctx.dataIndex] > 0,
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
              if (v == null) return null;
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
