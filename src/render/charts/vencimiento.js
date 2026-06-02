import { state, BD, CHARTS, destroyChart, CHART_COLORS } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';

function curMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

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
    const cur = curMonthKey();
    hastaEl.value = months.filter(mk => mk <= cur).pop() || months[months.length - 1];
  }
}

export function renderVencChart() {
  const vencData = BD[state.AB].venc;
  const desdeEl  = document.getElementById('venc-chart-desde');
  const hastaEl  = document.getElementById('venc-chart-hasta');
  const tipoEl   = document.getElementById('venc-chart-tipo');
  if (!desdeEl || !vencData.length) return;

  const desde    = desdeEl.value;
  const hasta    = hastaEl.value;
  const tipoFilt = tipoEl ? tipoEl.value : '';
  if (!desde || !hasta || desde > hasta) return;

  const sample    = vencData[0] || {};
  const tipoCol   = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const fechaCol  = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const eventoCol = Object.keys(sample).find(k => nfdKey(k).includes('EVENTO') && nfdKey(k).includes('TERMINO'));

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  const curMk = curMonthKey();
  const nr = {}, ren = {}, proj = {};
  allMonths.forEach(mk => { nr[mk] = 0; ren[mk] = 0; proj[mk] = 0; });

  vencData.forEach(r => {
    const p = parseDate((r[fechaCol] || '').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in nr)) return;
    if (tipoFilt && (r[tipoCol] || '').toString().trim() !== tipoFilt) return;
    const ev = eventoCol ? (r[eventoCol] || '').toString().trim() : '';
    if (ev === 'NR') nr[mk]++;
    else if (ev === 'R' || ev === 'R(CU)' || ev.toUpperCase().startsWith('R (')) ren[mk]++;
    else if (mk > curMk && (!ev || ev === '-')) proj[mk]++;
  });

  const labels     = allMonths.map(mk => { const [y,m] = mk.split('-'); return _MESES[parseInt(m)-1]+'-'+String(y).slice(-2); });
  const dataNR     = allMonths.map(mk => nr[mk]);
  const dataRen    = allMonths.map(mk => ren[mk]);
  const dataProj   = allMonths.map(mk => proj[mk]);
  const totals     = allMonths.map(mk => nr[mk] + ren[mk] + proj[mk]);
  const showLabels = !!document.getElementById('venc-chart-labels')?.checked;

  const totalLine = {
    type: 'line', label: '_total', data: totals,
    borderColor: 'transparent', backgroundColor: 'transparent',
    pointRadius: 0, pointHoverRadius: 0, borderWidth: 0,
    datalabels: {
      display: ctx => totals[ctx.dataIndex] > 0,
      anchor: 'end', align: 'top', offset: 4,
      color: '#1a2332', font: { size: 10, weight: '700' },
      formatter: v => v
    }
  };

  // El dataset de arriba varía según si hay proyectados o no en cada barra
  const hasProj = allMonths.some(mk => proj[mk] > 0);

  const datasets = [
    {
      type: 'bar', label: 'No Renovación',
      data: dataNR, backgroundColor: CHART_COLORS.noRenovacion,
      stack: 'venc', borderWidth: 0, borderRadius: 0, borderSkipped: false,
      datalabels: {
        display: ctx => showLabels && dataNR[ctx.dataIndex] > 0,
        anchor: 'center', align: 'center',
        color: '#fff', font: { size: 9, weight: '700' },
        formatter: v => v
      }
    },
    {
      type: 'bar', label: 'Renovación',
      data: dataRen, backgroundColor: CHART_COLORS.renovacion,
      stack: 'venc', borderWidth: 0,
      borderRadius: ctx => {
        const i = ctx.dataIndex;
        const isTop = dataProj[i] === 0;
        return isTop ? { topLeft: 3, topRight: 3 } : 0;
      },
      borderSkipped: false,
      datalabels: {
        display: ctx => showLabels && dataRen[ctx.dataIndex] > 0,
        anchor: 'center', align: 'center',
        color: '#fff', font: { size: 9, weight: '700' },
        formatter: v => v
      }
    },
    ...(hasProj ? [{
      type: 'bar', label: 'Por definir',
      data: dataProj, backgroundColor: '#cbd5e1',
      stack: 'venc', borderWidth: 0,
      borderRadius: { topLeft: 3, topRight: 3 }, borderSkipped: false,
      datalabels: {
        display: ctx => showLabels && dataProj[ctx.dataIndex] > 0,
        anchor: 'center', align: 'center',
        color: '#64748b', font: { size: 9, weight: '700' },
        formatter: v => v
      }
    }] : []),
    totalLine
  ];

  const canvas = document.getElementById('venc-chart-canvas');
  destroyChart('venc');

  CHARTS.venc = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 14, padding: 16,
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
          stacked: true, grace: '8%', min: 0,
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 1, precision: 0 },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}
