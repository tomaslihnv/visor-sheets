import { state, BD, CHARTS, destroyChart } from '../../state.js';
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
    hastaEl.value = months[months.length - 1];
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

  // Un dataset por motivo (apilado)
  const showLabels = !!document.getElementById('salidas-chart-labels')?.checked;
  const datasets = allMotivos.map(motivo => ({
    type: 'bar',
    label: motivo,
    data: allMonths.map(mk => counts[motivo]?.[mk] || 0),
    backgroundColor: getMotivoColor(motivo),
    stack: 'salidas',
    borderWidth: 0,
    datalabels: {
      display: ctx => showLabels && (counts[motivo]?.[allMonths[ctx.dataIndex]] || 0) > 0,
      anchor: 'center', align: 'center',
      color: '#fff',
      font: { size: 8, weight: '700' },
      formatter: v => v || ''
    }
  }));

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
  hastaEl.value = sorted[sorted.length - 1];

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
          grid: { color: '#f0f3f6' },
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
