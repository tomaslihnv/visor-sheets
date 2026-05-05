import { state, BD, CHARTS, destroyChart } from '../../state.js';
import { EVOL_COL } from '../../columns.js';
import { parseEvolDate, formatEvolLabel, _MESES } from '../../utils.js';

export function initEvolSelects(data) {
  const desdeEl = document.getElementById('evol-desde');
  const hastaEl = document.getElementById('evol-hasta');
  if (!desdeEl) return;
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  let defDesde = 0, defHasta = data.length - 1;
  data.forEach((row, i) => {
    const f = (row[EVOL_COL.fecha] || '').toString().trim();
    if (!f) return;
    const label = formatEvolLabel(f);
    desdeEl.appendChild(new Option(label, i));
    hastaEl.appendChild(new Option(label, i));
    const d = parseEvolDate(f);
    if (d && d.getMonth() === 11) defHasta = i;
  });
  desdeEl.value = defDesde;
  hastaEl.value = defHasta;
}

export function initNetosSelects(data) {
  const desdeEl = document.getElementById('netos-desde');
  const hastaEl = document.getElementById('netos-hasta');
  if (!desdeEl) return;
  desdeEl.innerHTML = hastaEl.innerHTML = '';
  let defDesde = 0, defHasta = data.length - 1;
  data.forEach((row, i) => {
    const f = (row[EVOL_COL.fecha] || '').toString().trim();
    if (!f) return;
    const label = formatEvolLabel(f);
    desdeEl.appendChild(new Option(label, i));
    hastaEl.appendChild(new Option(label, i));
    const d = parseEvolDate(f);
    if (d && d.getMonth() === 11) defHasta = i;
  });
  desdeEl.value = defDesde;
  hastaEl.value = defHasta;
}

export function renderEvolChart() {
  const evolData = BD[state.AB].evol;
  const desdeEl = document.getElementById('evol-desde');
  const hastaEl = document.getElementById('evol-hasta');
  if (!desdeEl || !evolData.length) return;
  const desde = parseInt(desdeEl.value);
  const hasta  = parseInt(hastaEl.value);
  if (isNaN(desde) || isNaN(hasta) || desde > hasta) return;

  const rows = evolData.slice(desde, hasta + 1);

  const cutoff = new Date(); cutoff.setDate(1); cutoff.setHours(0,0,0,0);
  const isPast = r => { const d = parseEvolDate((r[EVOL_COL.fecha] || '').toString()); return d && d < cutoff; };

  const labels = rows.map(r => formatEvolLabel((r[EVOL_COL.fecha] || '').toString().trim()));

  const barReal  = rows.map((r, i) => { const v = parseFloat((r[EVOL_COL.unFcast] || '').toString().replace(',','.')); return !isNaN(v) && isPast(r) ? v : null; });
  const barFcast = rows.map((r, i) => { const v = parseFloat((r[EVOL_COL.unFcast] || '').toString().replace(',','.')); return !isNaN(v) && !isPast(r) ? v : null; });

  const allPct = rows.map(r => {
    const v = parseFloat((r[EVOL_COL.pctFcast] || '').toString().replace(',','.').replace('%',''));
    if (isNaN(v)) return null;
    return v < 2 ? Math.round(v * 1000) / 10 : v;
  });

  let totalUnits = null, maxPctSeen = 0;
  rows.forEach((r, i) => {
    const bar = barReal[i] ?? barFcast[i];
    const pct = allPct[i];
    if (bar != null && pct != null && pct > maxPctSeen) { maxPctSeen = pct; totalUnits = Math.round(bar / (pct / 100)); }
  });
  const yRightMax = totalUnits ? Math.ceil(totalUnits * 1.2) : undefined;

  const cutoffIdx = rows.reduce((acc, r, i) => isPast(r) ? i : acc, -1);

  const canvas = document.getElementById('evol-chart');
  destroyChart('evol');

  CHARTS.evol = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Ocupación real (un.)',
          data: barReal, backgroundColor: '#44546A', borderRadius: 3,
          yAxisID: 'yRight', order: 2,
          datalabels: {
            display: ctx => !!document.getElementById('evol-labels')?.checked && barReal[ctx.dataIndex] != null,
            anchor: 'end', align: 'top', offset: 2,
            color: '#44546A', font: { size: 8, weight: '600' },
            formatter: (v, ctx) => { const p = allPct[ctx.dataIndex]; return p != null ? Math.round(p) + '%' : ''; }
          }
        },
        { type: 'bar', label: 'Ocupación proyectada (un.)',
          data: barFcast, backgroundColor: '#cbd5e1', borderRadius: 3,
          yAxisID: 'yRight', order: 2,
          datalabels: {
            display: ctx => !!document.getElementById('evol-labels')?.checked && barFcast[ctx.dataIndex] != null,
            anchor: 'end', align: 'top', offset: 2,
            color: '#64748b', font: { size: 8, weight: '600' },
            formatter: (v, ctx) => { const p = allPct[ctx.dataIndex]; return p != null ? Math.round(p) + '%' : ''; }
          }
        },
        { type: 'line', label: 'Ocupación %',
          data: allPct, yAxisID: 'yLeft', order: 1,
          borderWidth: 2.5, tension: 0.4, pointRadius: 3, pointHoverRadius: 5,
          spanGaps: true, backgroundColor: 'transparent', borderColor: '#44546A',
          pointBackgroundColor: rows.map(r => isPast(r) ? '#44546A' : '#94a3b8'),
          segment: {
            borderColor: ctx => ctx.p0DataIndex <= cutoffIdx ? '#44546A' : '#94a3b8',
            borderDash:  ctx => ctx.p0DataIndex <= cutoffIdx ? [] : [5, 4],
          },
          datalabels: { display: false }
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11 }, boxWidth: 14, padding: 16 } },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              if (v == null) return null;
              if (ctx.dataset.yAxisID === 'yLeft') return ` Ocupación: ${v.toFixed(1)}%`;
              return ` ${ctx.dataset.label}: ${v} un.`;
            }
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        yLeft: {
          type: 'linear', position: 'left', min: 0, max: 120,
          ticks: { stepSize: 10, callback: v => v + '%', font: { size: 10 } },
          grid: { color: '#f0f3f6' },
          title: { display: true, text: 'Ocupación (%)', font: { size: 10 }, color: '#8a9bb0' }
        },
        yRight: {
          type: 'linear', position: 'right', min: 0, max: yRightMax,
          grid: { drawOnChartArea: false },
          ticks: { font: { size: 10 } },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}

export function renderNetosChart() {
  const evolData = BD[state.AB].evol;
  const desdeEl = document.getElementById('netos-desde');
  const hastaEl = document.getElementById('netos-hasta');
  if (!desdeEl || !evolData.length) return;
  const desde = parseInt(desdeEl.value);
  const hasta  = parseInt(hastaEl.value);
  if (isNaN(desde) || isNaN(hasta) || desde > hasta) return;

  const rows = evolData.slice(desde, hasta + 1);

  const cutoff = new Date(); cutoff.setDate(1); cutoff.setHours(0,0,0,0);
  const isPast = r => { const d = parseEvolDate((r[EVOL_COL.fecha] || '').toString()); return d && d < cutoff; };

  const labels = rows.map(r => formatEvolLabel((r[EVOL_COL.fecha] || '').toString().trim()));

  const accAll = rows.map(r => {
    const v = parseFloat((r[EVOL_COL.unFcast] || '').toString().replace(',','.'));
    return isNaN(v) ? null : v;
  });

  const allNetos = rows.map((r, i) => {
    const raw = parseInt((r[EVOL_COL.netos] || '').toString().replace(/\./g,''));
    if (!isNaN(raw)) return raw;
    if (accAll[i] != null && i > 0 && accAll[i - 1] != null)
      return Math.round(accAll[i] - accAll[i - 1]);
    return null;
  });

  const colors      = rows.map(r => isPast(r) ? '#44546A' : '#cbd5e1');
  const labelColors = rows.map(r => isPast(r) ? '#44546A' : '#64748b');

  const legendReal  = { type:'bar', label:'Netos reales',      data: rows.map(() => null), backgroundColor:'#44546A',  datalabels:{display:false} };
  const legendFcast = { type:'bar', label:'Netos proyectados', data: rows.map(() => null), backgroundColor:'#cbd5e1', datalabels:{display:false} };

  const canvas = document.getElementById('netos-chart');
  destroyChart('netos');

  CHARTS.netos = new Chart(canvas, {
    data: {
      labels,
      datasets: [
        { type: 'bar', label: 'Arriendos netos',
          data: allNetos,
          backgroundColor: colors,
          borderRadius: 3,
          datalabels: {
            display: ctx => {
              const v = allNetos[ctx.dataIndex];
              return !!document.getElementById('netos-labels')?.checked && v != null && v !== 0;
            },
            anchor: ctx => (allNetos[ctx.dataIndex] || 0) >= 0 ? 'end' : 'start',
            align:  ctx => (allNetos[ctx.dataIndex] || 0) >= 0 ? 'top'  : 'bottom',
            offset: 2,
            color: ctx => labelColors[ctx.dataIndex],
            font: { size: 8, weight: '600' },
            formatter: v => v > 0 ? '+' + v : v
          }
        },
        legendReal,
        legendFcast
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            font: { size: 11 }, boxWidth: 14, padding: 16,
            filter: item => item.datasetIndex !== 0
          }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex !== 0) return null;
              const v = ctx.parsed.y;
              if (v == null) return null;
              const past = isPast(rows[ctx.dataIndex]);
              return ` Netos ${past ? 'reales' : 'proyectados'}: ${v > 0 ? '+' + v : v} un.`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          type: 'linear', position: 'left',
          grace: '20%',
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 } },
          title: { display: true, text: 'Unidades', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}

export function renderBothEvolCharts() {
  renderEvolChart();
  renderNetosChart();
}
