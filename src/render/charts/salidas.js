import { state, BD, CHARTS, destroyChart, MOTIVO_PALETTE } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';
import { getMotivoColor } from '../../categories.js';
import { MOTIVOS as MOTIVOS_CONFIG } from '../../config.js';

// Devuelve la lista completa de motivos: primero los de config, luego cualquier extra en los datos
function buildMotivosList(salData, motivoCol) {
  const fromData = new Set();
  salData.forEach(r => {
    const m = (r[motivoCol] || '').toString().trim();
    if (m) fromData.add(m);
  });
  const base = MOTIVOS_CONFIG.length > 0 ? MOTIVOS_CONFIG : [...fromData].sort();
  const extras = [...fromData].filter(m => !base.includes(m)).sort();
  return [...base, ...extras];
}

export function initSalidasChartSelects(salData) {
  const desdeEl  = document.getElementById('salidas-chart-desde');
  const hastaEl  = document.getElementById('salidas-chart-hasta');
  const tipoEl   = document.getElementById('salidas-chart-tipo');
  if (!desdeEl) return;

  const sample    = salData[0] || {};
  const fechaCol  = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const motivoCol = Object.keys(sample).find(k => nfdKey(k).includes('MOTIVO')) || 'Motivo de Salida';
  const tipoCol   = Object.keys(sample).find(k => nfdKey(k) === 'TIPO') || 'Tipo';

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const capKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;

  if (tipoEl) {
    const tipos = new Set();
    salData.forEach(r => { const t = (r[tipoCol]||'').toString().trim(); if (t) tipos.add(t); });
    tipoEl.innerHTML = '<option value="">Todos</option>';
    [...tipos].sort().forEach(t => tipoEl.appendChild(new Option(t, t)));
  }

  const monthsSet = new Set();
  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk <= capKey) monthsSet.add(mk);
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
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    hastaEl.value = months.filter(mk => mk <= cur).pop() || months[months.length - 1];
  }

  // Pre-asignar colores a todos los motivos para que sean consistentes entre gráficos
  const motivoCol2 = Object.keys(salData[0] || {}).find(k => nfdKey(k).includes('MOTIVO')) || motivoCol;
  buildMotivosList(salData, motivoCol2).forEach(m => getMotivoColor(m));
}

export function renderSalidasChart() {
  const salData  = BD[state.AB].sal;
  const desdeEl  = document.getElementById('salidas-chart-desde');
  const hastaEl  = document.getElementById('salidas-chart-hasta');
  const tipoEl   = document.getElementById('salidas-chart-tipo');
  if (!desdeEl || !salData.length) return;

  const desde    = desdeEl.value;
  const hasta    = hastaEl.value;
  const tipoFilt = tipoEl ? tipoEl.value : '';
  if (!desde || !hasta || desde > hasta) return;

  const sample    = salData[0] || {};
  const fechaCol  = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const motivoCol = Object.keys(sample).find(k => nfdKey(k).includes('MOTIVO')) || 'Motivo de Salida';
  const tipoCol   = Object.keys(sample).find(k => nfdKey(k) === 'TIPO') || 'Tipo';

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  // Obtener lista completa de motivos (incluye los del config aunque no tengan datos)
  const todosMotivosFiltrados = salData.filter(r => {
    if (tipoFilt && (r[tipoCol]||'').toString().trim() !== tipoFilt) return false;
    return true;
  });
  const allMotivos = buildMotivosList(todosMotivosFiltrados, motivoCol);

  // Contar por motivo y mes
  const counts = {}; // { motivo: { mk: count } }
  allMotivos.forEach(m => { counts[m] = {}; allMonths.forEach(mk => counts[m][mk] = 0); });

  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in (counts[allMotivos[0]] || {}))) return;
    if (tipoFilt && (r[tipoCol]||'').toString().trim() !== tipoFilt) return;
    const motivo = (r[motivoCol]||'').toString().trim();
    if (!motivo) return;
    if (!counts[motivo]) counts[motivo] = Object.fromEntries(allMonths.map(m => [m, 0]));
    counts[motivo][mk] = (counts[motivo][mk] || 0) + 1;
  });

  const labels = allMonths.map(mk => {
    const [y, m] = mk.split('-');
    return _MESES[parseInt(m)-1] + '-' + String(y).slice(-2);
  });

  // Totales por mes para calcular porcentajes
  const totalesMes = Object.fromEntries(allMonths.map(mk => [
    mk, allMotivos.reduce((sum, m) => sum + (counts[m]?.[mk] || 0), 0)
  ]));

  const showLabels = !!document.getElementById('salidas-chart-labels')?.checked;
  const showPct    = !!document.getElementById('salidas-chart-pct')?.checked;

  const datasets = allMotivos.map((motivo, mIdx) => {
    const isLast = mIdx === allMotivos.filter(m => allMonths.some(mk => (counts[m]?.[mk] || 0) > 0)).length - 1;
    return {
      type: 'bar',
      label: motivo,
      data: allMonths.map(mk => counts[motivo]?.[mk] || 0),
      backgroundColor: getMotivoColor(motivo),
      stack: 'salidas',
      borderWidth: 0,
      borderRadius: isLast ? { topLeft: 4, topRight: 4 } : 0,
      borderSkipped: false,
      datalabels: {
        display: ctx => showLabels && (counts[motivo]?.[allMonths[ctx.dataIndex]] || 0) > 0,
        anchor: 'center', align: 'center',
        color: '#fff',
        font: { size: 8, weight: '700' },
        formatter: (v, ctx) => {
          if (!v) return '';
          if (showPct) {
            const total = totalesMes[allMonths[ctx.dataIndex]] || 1;
            return Math.round(v / total * 100) + '%';
          }
          return v;
        }
      }
    };
  });

  const canvas = document.getElementById('salidas-chart-canvas');
  destroyChart('salidas');

  CHARTS.salidas = new Chart(canvas, {
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11 }, boxWidth: 12, padding: 10,
            filter: item => {
              // Ocultar de la leyenda motivos que no tienen ningún dato en el rango
              const ds = datasets.find(d => d.label === item.text);
              return ds && ds.data.some(v => v > 0);
            }
          }
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
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          stacked: true,
          type: 'linear', position: 'left',
          grace: '15%',
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}

// ── DESGLOSE DE SALIDAS (barras apiladas: No Renovación + Salida Anticipada) ──

// Clasifica el valor crudo usando nfdKey (ya probado en el proyecto)
function clasificarTipo(raw) {
  const n = nfdKey(raw); // sin tildes, mayúsculas
  if (n === 'NR' || n.includes('RENOV'))   return 'No Renovación';
  if (n === 'SA' || n.includes('ANTICIP')) return 'Salida Anticipada';
  return null;
}

function resolveDesgloseCol(keys) {
  return keys.find(k => nfdKey(k) === 'TIPO') ||
         keys.find(k => nfdKey(k).includes('TERMINO')) ||
         keys.find(k => nfdKey(k).includes('EVENTO')) ||
         null;
}

export function initDesgloseSalidasSelects(salData) {
  const desdeEl = document.getElementById('desglose-desde');
  const hastaEl = document.getElementById('desglose-hasta');
  if (!desdeEl || !salData.length) return;

  const keys     = Object.keys(salData[0] || {});
  const fechaCol = keys.find(k => nfdKey(k) === 'FECHA') || keys[0];
  const tipoCol  = resolveDesgloseCol(keys);

  const now    = new Date();
  const prev   = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const capKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;

  const monthsSet = new Set();
  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk <= capKey && tipoCol && clasificarTipo((r[tipoCol]||'').toString())) monthsSet.add(mk);
  });

  const months = [...monthsSet].sort();
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  months.forEach(mk => {
    const [y, m] = mk.split('-');
    const label  = _MESES[parseInt(m)-1] + '-' + String(y).slice(-2);
    desdeEl.appendChild(new Option(label, mk));
    hastaEl.appendChild(new Option(label, mk));
  });
  if (months.length) {
    desdeEl.value = months[0];
    const now = new Date();
    const cur = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    hastaEl.value = months.filter(mk => mk <= cur).pop() || months[months.length - 1];
  }
}

export function renderDesgloseSalidasChart() {
  const salData = BD[state.AB].sal;
  const desdeEl = document.getElementById('desglose-desde');
  const hastaEl = document.getElementById('desglose-hasta');
  if (!desdeEl || !salData.length) return;

  const desde = desdeEl.value;
  const hasta  = hastaEl.value;
  if (!desde || !hasta || desde > hasta) return;

  const keys     = Object.keys(salData[0] || {});
  const fechaCol = keys.find(k => nfdKey(k) === 'FECHA') || keys[0];
  const tipoCol  = resolveDesgloseCol(keys);
  if (!tipoCol) { console.warn('[desglose] No se encontró columna de tipo'); return; }

  // Rango de meses
  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  // Conteo: solo "No Renovación" y "Salida Anticipada"
  const TIPOS = ['No Renovación', 'Salida Anticipada']; // orden: abajo → arriba
  const counts = { 'No Renovación': {}, 'Salida Anticipada': {} };
  TIPOS.forEach(t => allMonths.forEach(mk => counts[t][mk] = 0));

  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk < desde || mk > hasta) return;
    const cat = clasificarTipo((r[tipoCol]||'').toString());
    if (!cat) return;
    counts[cat][mk]++;
  });

  const totals = allMonths.map(mk => TIPOS.reduce((s, t) => s + counts[t][mk], 0));
  const labels = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[+m-1]+'-'+String(y).slice(-2); });
  const showLbls = !!document.getElementById('desglose-labels')?.checked;

  const COLORES = { 'No Renovación': '#fb923c', 'Salida Anticipada': '#60a5fa' };

  // Barras apiladas — labels interiores blancos en ambas
  const barDatasets = TIPOS.map((tipo, i) => {
    const isTop   = i === TIPOS.length - 1;
    const tipData = allMonths.map(mk => counts[tipo][mk] || 0);
    return {
      label: tipo,
      data: tipData,
      backgroundColor: COLORES[tipo],
      stack: 'desglose',
      borderWidth: 0,
      borderRadius: isTop ? { topLeft: 3, topRight: 3 } : 0,
      borderSkipped: false,
      datalabels: {
        display: ctx => showLbls && tipData[ctx.dataIndex] > 0,
        anchor: 'center', align: 'center',
        color: '#fff',
        font: { size: 9, weight: '700' },
        formatter: v => v
      }
    };
  });

  // Línea invisible SIN stack → sus puntos quedan exactamente en y = total,
  // incluso cuando SA = 0. Sólo porta el label del total encima.
  const totalLine = {
    type: 'line',
    label: '_total',
    data: totals,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    pointRadius: 0,
    pointHoverRadius: 0,
    borderWidth: 0,
    datalabels: {
      display: ctx => totals[ctx.dataIndex] > 0,
      anchor: 'end', align: 'top', offset: 4,
      color: '#1a2332',
      font: { size: 10, weight: '700' },
      formatter: v => v
    }
  };

  const datasets = [...barDatasets, totalLine];

  const canvas = document.getElementById('desglose-chart-canvas');
  destroyChart('desglose');

  CHARTS.desglose = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11 }, boxWidth: 12, padding: 10,
            filter: item => item.text !== '_total'
          }
        },
        datalabels: {},
        tooltip: {
          filter: item => item.dataset.label !== '_total',
          callbacks: {
            label: ctx => ctx.parsed.y ? ` ${ctx.dataset.label}: ${ctx.parsed.y} un.` : null,
            footer: items => {
              const t = items.filter(i => i.dataset.label !== '_total').reduce((s, i) => s + i.parsed.y, 0);
              return t ? `Total: ${t} un.` : '';
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          stacked: true,
          grace: '8%', min: 0,
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}

export function initMotivoChartSelects(salData) {
  const desdeEl   = document.getElementById('motivo-chart-desde');
  const hastaEl   = document.getElementById('motivo-chart-hasta');
  const tipEl     = document.getElementById('motivo-chart-tipologia');
  const tipoEl    = document.getElementById('motivo-chart-tipo');
  if (!desdeEl) return;

  const sample       = salData[0] || {};
  const fechaCol     = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const tipologiaCol = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const tipoCol      = Object.keys(sample).find(k => nfdKey(k) === 'TIPO') || 'Tipo';
  const motivoCol    = Object.keys(sample).find(k => nfdKey(k).includes('MOTIVO')) || 'Motivo de Salida';

  const now       = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const capKey    = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;

  const months = new Set();
  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk <= capKey && (r[motivoCol]||'').toString().trim()) months.add(mk);
  });
  const sorted = [...months].sort();
  if (!sorted.length) return;

  desdeEl.innerHTML = sorted.map(mk => { const [y,m]=mk.split('-'); return `<option value="${mk}">${_MESES[+m-1]}-${y.slice(-2)}</option>`; }).join('');
  hastaEl.innerHTML = desdeEl.innerHTML;
  const now2 = new Date();
  const cur2 = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}`;
  hastaEl.value = sorted.filter(mk => mk <= cur2).pop() || sorted[sorted.length - 1];

  if (tipEl) {
    const tips = new Set();
    salData.forEach(r => { const t=(r[tipologiaCol]||'').toString().trim(); if(t) tips.add(t); });
    tipEl.innerHTML = '<option value="">Todas</option>';
    [...tips].sort().forEach(t => tipEl.appendChild(new Option(t,t)));
  }
  if (tipoEl) {
    const tipos = new Set();
    salData.forEach(r => { const t=(r[tipoCol]||'').toString().trim(); if(t) tipos.add(t); });
    tipoEl.innerHTML = '<option value="">Todos</option>';
    [...tipos].sort().forEach(t => tipoEl.appendChild(new Option(t,t)));
  }

  // Pre-asignar colores para consistencia entre gráficos
  buildMotivosList(salData, motivoCol).forEach(m => getMotivoColor(m));
}

export function renderMotivoChart() {
  const salData   = BD[state.AB].sal;
  const desdeEl   = document.getElementById('motivo-chart-desde');
  const hastaEl   = document.getElementById('motivo-chart-hasta');
  const tipEl     = document.getElementById('motivo-chart-tipologia');
  const tipoEl    = document.getElementById('motivo-chart-tipo');
  if (!desdeEl || !salData.length) return;

  const desde    = desdeEl.value;
  const hasta    = hastaEl.value;
  const tipFilt  = tipEl  ? tipEl.value  : '';
  const tipoFilt = tipoEl ? tipoEl.value : '';
  if (!desde || !hasta || desde > hasta) return;

  const sample       = salData[0] || {};
  const fechaCol     = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const motivoCol    = Object.keys(sample).find(k => nfdKey(k).includes('MOTIVO')) || 'Motivo de Salida';
  const tipologiaCol = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const tipoCol      = Object.keys(sample).find(k => nfdKey(k) === 'TIPO') || 'Tipo';

  const counts = {};
  let total = 0;
  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk < desde || mk > hasta) return;
    if (tipFilt  && (r[tipologiaCol]||'').toString().trim() !== tipFilt)  return;
    if (tipoFilt && (r[tipoCol]    ||'').toString().trim() !== tipoFilt)  return;
    const motivo = (r[motivoCol]||'').toString().trim();
    if (!motivo) return;
    counts[motivo] = (counts[motivo] || 0) + 1;
    total++;
  });

  if (total === 0) { destroyChart('motivo'); return; }

  // Ordenar: primero los del config (en orden de config), luego extras por frecuencia
  const allMotivos = buildMotivosList(salData, motivoCol);
  const sortedEntries = allMotivos
    .filter(m => counts[m] > 0)
    .map(m => [m, counts[m]])
    .sort((a, b) => b[1] - a[1]);

  const labels   = sortedEntries.map(([m]) => m);
  const pcts     = sortedEntries.map(([, c]) => Math.round(c / total * 1000) / 10);
  const bgColors = labels.map(m => getMotivoColor(m));
  const showLabels = !!document.getElementById('motivo-chart-labels')?.checked;

  const canvas = document.getElementById('motivo-chart-canvas');
  destroyChart('motivo');

  CHARTS.motivo = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Motivo de Salida',
        data: pcts,
        backgroundColor: bgColors,
        borderRadius: 4,
        datalabels: {
          display: showLabels,
          anchor: 'end', align: 'right', offset: 4,
          color: '#3a4f63',
          font: { size: 10, weight: '600' },
          formatter: v => v + '%'
        }
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        datalabels: {},
        tooltip: {
          callbacks: { label: ctx => ` ${ctx.parsed.x}%` }
        }
      },
      scales: {
        x: {
          min: 0, max: 100,
          grid: { color: '#fff' },
          ticks: { font: { size: 10 }, callback: v => v + '%' }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}
