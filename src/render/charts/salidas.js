import { state, BD, CHARTS, destroyChart } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';
import { avgLineDataset, getMotivoColor } from '../../categories.js';

export function initSalidasChartSelects(salData) {
  const desdeEl   = document.getElementById('salidas-chart-desde');
  const hastaEl   = document.getElementById('salidas-chart-hasta');
  const motivoEl  = document.getElementById('salidas-chart-motivo');
  const tipoEl    = document.getElementById('salidas-chart-tipo');
  if (!desdeEl) return;

  const sample    = salData[0] || {};
  const fechaCol  = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const motivoCol = Object.keys(sample).find(k => nfdKey(k).includes('MOTIVO')) || 'Motivo de Salida';
  const tipoCol   = Object.keys(sample).find(k => nfdKey(k) === 'TIPO') || 'Tipo';

  const now = new Date();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const capKey = `${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,'0')}`;

  if (motivoEl) {
    const motivos = new Set();
    salData.forEach(r => { const m = (r[motivoCol]||'').toString().trim(); if (m) motivos.add(m); });
    motivoEl.innerHTML = '<option value="">Todos</option>';
    [...motivos].sort().forEach(m => motivoEl.appendChild(new Option(m, m)));
  }

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
}

export function renderSalidasChart() {
  const salData    = BD[state.AB].sal;
  const desdeEl    = document.getElementById('salidas-chart-desde');
  const hastaEl    = document.getElementById('salidas-chart-hasta');
  const motivoEl   = document.getElementById('salidas-chart-motivo');
  const tipoEl     = document.getElementById('salidas-chart-tipo');
  if (!desdeEl || !salData.length) return;

  const desde      = desdeEl.value;
  const hasta      = hastaEl.value;
  const motivoFilt = motivoEl ? motivoEl.value : '';
  const tipoFilt   = tipoEl   ? tipoEl.value   : '';
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

  const counts = {};
  allMonths.forEach(mk => counts[mk] = 0);
  salData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in counts)) return;
    if (motivoFilt && (r[motivoCol]||'').toString().trim() !== motivoFilt) return;
    if (tipoFilt   && (r[tipoCol]  ||'').toString().trim() !== tipoFilt)   return;
    counts[mk]++;
  });

  const labels = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const data   = allMonths.map(mk => counts[mk]);

  const legendItem  = { type:'bar', label:'Salidas reales', data: allMonths.map(()=>null), backgroundColor:'#44546A', datalabels:{display:false} };
  const showAvgSal  = !!document.getElementById('salidas-chart-avg')?.checked;
  const avgDSSal    = avgLineDataset(allMonths, data);
  const datasetsSal = [
    { type:'bar', label:'Salidas', data,
      backgroundColor: '#44546A', borderRadius: 3,
      datalabels: {
        display: ctx => !!document.getElementById('salidas-chart-labels')?.checked && data[ctx.dataIndex] != null && data[ctx.dataIndex] !== 0,
        anchor: 'end', align: 'top', offset: 2,
        color: '#44546A',
        font: { size: 8, weight: '600' },
        formatter: v => v
      }
    },
    legendItem,
    ...(showAvgSal && avgDSSal ? [avgDSSal] : [])
  ];

  const canvas = document.getElementById('salidas-chart-canvas');
  destroyChart('salidas');

  CHARTS.salidas = new Chart(canvas, {
    data: { labels, datasets: datasetsSal },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font:{ size:11 }, boxWidth:14, padding:16, filter: item => item.datasetIndex !== 0 }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Promedio') return avgDSSal ? ` Promedio: ${avgDSSal._avgValue.toFixed(1)} un.` : null;
              if (ctx.datasetIndex !== 0) return null;
              const v = ctx.parsed.y; if (v == null) return null;
              return ` Salidas: ${v} un.`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid:{ display:false }, ticks:{ font:{ size:10 } } },
        y: {
          type:'linear', position:'left', grace:'20%',
          grid:{ color:'#f0f3f6' },
          ticks:{ font:{ size:10 }, stepSize:1, precision:0 },
          title:{ display:true, text:'Unidades', font:{ size:10 }, color:'#8a9bb0' }
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

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map(([m]) => m);
  const pcts   = sortedEntries.map(([, c]) => Math.round(c / total * 1000) / 10);
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
