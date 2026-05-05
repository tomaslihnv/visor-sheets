import { state, BD, CHARTS, destroyChart } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';
import { avgLineDataset } from '../../categories.js';

export function initVencChartSelects(vencData) {
  const desdeEl = document.getElementById('venc-chart-desde');
  const hastaEl = document.getElementById('venc-chart-hasta');
  const tipoEl  = document.getElementById('venc-chart-tipo');
  if (!desdeEl) return;

  if (tipoEl) {
    const tipos = new Set();
    vencData.forEach(r => {
      const key = Object.keys(r).find(k => nfdKey(k).includes('TIPOLOG'));
      const t = (key ? r[key] : '').toString().trim();
      if (t) tipos.add(t);
    });
    tipoEl.innerHTML = '<option value="">Todas</option>';
    [...tipos].sort().forEach(t => tipoEl.appendChild(new Option(t, t)));
  }

  const eventoEl = document.getElementById('venc-chart-evento');
  if (eventoEl) {
    const eventoCol = Object.keys(vencData[0] || {}).find(k => nfdKey(k).includes('EVENTO') && nfdKey(k).includes('TERMINO'));
    const ORDER = ['R', 'R(CU)', 'NR', '-'];
    const valSet = new Set();
    vencData.forEach(r => {
      const v = eventoCol ? (r[eventoCol] || '').toString().trim() : '';
      valSet.add(v === '' ? '-' : v);
    });
    const sorted = [...ORDER.filter(o => valSet.has(o)), ...[...valSet].filter(v => !ORDER.includes(v)).sort()];
    eventoEl.innerHTML = '<option value="">Todas</option>';
    sorted.forEach(v => eventoEl.appendChild(new Option(v, v)));
  }

  const monthsSet = new Set();
  vencData.forEach(r => {
    const fKey = Object.keys(r).find(k => nfdKey(k) === 'FECHA') || Object.keys(r)[0];
    const p = parseDate((r[fKey] || '').toString().trim());
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

export function renderVencChart() {
  const vencData = BD[state.AB].venc;
  const desdeEl  = document.getElementById('venc-chart-desde');
  const hastaEl  = document.getElementById('venc-chart-hasta');
  const tipoEl   = document.getElementById('venc-chart-tipo');
  if (!desdeEl || !vencData.length) return;

  const desde      = desdeEl.value;
  const hasta      = hastaEl.value;
  const tipoFilt   = tipoEl ? tipoEl.value : '';
  const eventoFilt = (document.getElementById('venc-chart-evento')?.value) || '';
  if (!desde || !hasta || desde > hasta) return;

  const sample     = vencData[0] || {};
  const tipoCol    = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const fechaCol   = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const eventoCol  = Object.keys(sample).find(k => nfdKey(k).includes('EVENTO') && nfdKey(k).includes('TERMINO'));

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
  vencData.forEach(r => {
    const p = parseDate((r[fechaCol] || '').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in counts)) return;
    if (tipoFilt && (r[tipoCol] || '').toString().trim() !== tipoFilt) return;
    if (eventoFilt) {
      const ev = eventoCol ? (r[eventoCol] || '').toString().trim() : '';
      const evNorm = ev === '' ? '-' : ev;
      if (evNorm !== eventoFilt) return;
    }
    counts[mk]++;
  });

  const cutoff = new Date(); cutoff.setDate(1); cutoff.setHours(0,0,0,0);
  const isPastMk = mk => { const [y,m] = mk.split('-').map(Number); return new Date(y, m-1, 1) < cutoff; };

  const labels      = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const data        = allMonths.map(mk => counts[mk]);
  const colors      = allMonths.map(mk => isPastMk(mk) ? '#44546A' : '#cbd5e1');
  const labelColors = allMonths.map(mk => isPastMk(mk) ? '#44546A' : '#64748b');

  const legendReal  = { type:'bar', label:'Vencimientos reales',      data: allMonths.map(()=>null), backgroundColor:'#44546A',  datalabels:{display:false} };
  const legendFcast = { type:'bar', label:'Vencimientos proyectados', data: allMonths.map(()=>null), backgroundColor:'#cbd5e1', datalabels:{display:false} };
  const showAvg  = !!document.getElementById('venc-chart-avg')?.checked;
  const avgDS    = avgLineDataset(allMonths, data);
  const datasets = [
    { type:'bar', label:'Vencimientos', data,
      backgroundColor: colors, borderRadius: 3,
      datalabels: {
        display: ctx => {
          const v = data[ctx.dataIndex];
          return !!document.getElementById('venc-chart-labels')?.checked && v != null && v !== 0;
        },
        anchor: 'end', align: 'top', offset: 2,
        color: ctx => labelColors[ctx.dataIndex],
        font: { size: 8, weight: '600' },
        formatter: v => v
      }
    },
    legendReal, legendFcast,
    ...(showAvg && avgDS ? [avgDS] : [])
  ];

  const canvas = document.getElementById('venc-chart-canvas');
  destroyChart('venc');

  CHARTS.venc = new Chart(canvas, {
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode:'index', intersect:false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font:{ size:11 }, boxWidth:14, padding:16,
            filter: item => item.label === 'Vencimientos reales' || item.label === 'Vencimientos proyectados' || item.label === 'Promedio'
          }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === 'Promedio') return avgDS ? ` Promedio: ${avgDS._avgValue.toFixed(1)} un.` : null;
              if (ctx.datasetIndex !== 0) return null;
              const v = ctx.parsed.y; if (v == null) return null;
              const past = isPastMk(allMonths[ctx.dataIndex]);
              return ` Vencimientos ${past ? 'reales' : 'proyectados'}: ${v} un.`;
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
