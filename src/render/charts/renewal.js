import { state, BD, CHARTS, destroyChart } from '../../state.js';
import { nfdKey, parseDate, _MESES } from '../../utils.js';

export function initRenewalChartSelects(vencData) {
  const desdeEl  = document.getElementById('renewal-chart-desde');
  const hastaEl  = document.getElementById('renewal-chart-hasta');
  const tipoEl   = document.getElementById('renewal-chart-tipo');
  if (!desdeEl) return;

  const sample   = vencData[0] || {};
  const tipoCol  = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const fechaCol = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const eventoCol= Object.keys(sample).find(k => nfdKey(k).includes('EVENTO')) || 'Evento Final';

  if (tipoEl) {
    const tipos = new Set();
    vencData.forEach(r => { const t = (r[tipoCol]||'').toString().trim(); if (t) tipos.add(t); });
    tipoEl.innerHTML = '<option value="">Todas</option>';
    [...tipos].sort().forEach(t => tipoEl.appendChild(new Option(t, t)));
  }

  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const capKey = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;

  const monthsWithData = new Set();
  vencData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (mk > capKey) return;
    if ((r[eventoCol]||'').toString().trim()) monthsWithData.add(mk);
  });

  const months = [...monthsWithData].sort();
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

export function renderRenewalChart() {
  const vencData  = BD[state.AB].venc;
  const desdeEl   = document.getElementById('renewal-chart-desde');
  const hastaEl   = document.getElementById('renewal-chart-hasta');
  const tipoEl    = document.getElementById('renewal-chart-tipo');
  if (!desdeEl || !vencData.length) return;

  const desde    = desdeEl.value;
  const hasta    = hastaEl.value;
  const tipoFilt = tipoEl ? tipoEl.value : '';
  if (!desde || !hasta || desde > hasta) return;

  const sample    = vencData[0] || {};
  const tipoCol   = Object.keys(sample).find(k => nfdKey(k).includes('TIPOLOG')) || 'Tipología';
  const fechaCol  = Object.keys(sample).find(k => nfdKey(k) === 'FECHA') || Object.keys(sample)[0];
  const eventoCol = Object.keys(sample).find(k => nfdKey(k).includes('EVENTO')) || 'Evento Final';

  const [dy, dm] = desde.split('-').map(Number);
  const [hy, hm] = hasta.split('-').map(Number);
  const allMonths = [];
  let cy = dy, cm = dm;
  while (cy < hy || (cy === hy && cm <= hm)) {
    allMonths.push(`${cy}-${String(cm).padStart(2,'0')}`);
    cm++; if (cm > 12) { cm = 1; cy++; }
  }

  const stats = {};
  allMonths.forEach(mk => stats[mk] = { renovados: 0, total: 0 });

  vencData.forEach(r => {
    const p = parseDate((r[fechaCol]||'').toString().trim());
    if (!p) return;
    const mk = `${p.year}-${String(p.month).padStart(2,'0')}`;
    if (!(mk in stats)) return;
    if (tipoFilt && (r[tipoCol]||'').toString().trim() !== tipoFilt) return;
    const evento = (r[eventoCol]||'').toString().trim();
    if (!evento) return;
    stats[mk].total++;
    if (evento === 'R' || evento.toUpperCase().startsWith('R (')) stats[mk].renovados++;
  });

  const labels = allMonths.map(mk => {
    const [y, m] = mk.split('-');
    return _MESES[parseInt(m)-1] + '-' + String(y).slice(-2);
  });
  const data = allMonths.map(mk => {
    const { renovados, total } = stats[mk];
    return total > 0 ? Math.round((renovados / total) * 1000) / 10 : null;
  });

  const validData = data.filter(v => v != null);
  const avgRate = validData.length > 0
    ? Math.round(validData.reduce((a, b) => a + b, 0) / validData.length * 10) / 10
    : null;

  const canvas = document.getElementById('renewal-chart-canvas');
  destroyChart('renewal');

  CHARTS.renewal = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Renewal Rate',
          data,
          borderColor: '#44546A',
          backgroundColor: 'rgba(68,84,106,0.07)',
          borderWidth: 2.5,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#44546A',
          fill: true,
          spanGaps: true,
          datalabels: {
            display: ctx => !!document.getElementById('renewal-chart-labels')?.checked && data[ctx.dataIndex] != null,
            anchor: 'top', align: 'top', offset: 4,
            color: '#44546A',
            font: { size: 8, weight: '600' },
            formatter: v => v.toFixed(1) + '%'
          }
        },
        ...(!!document.getElementById('renewal-chart-avg')?.checked && avgRate != null ? [{
          label: 'Promedio',
          data: allMonths.map(() => avgRate),
          borderColor: 'rgba(239,68,68,0.55)',
          borderWidth: 1.5,
          borderDash: [6, 5],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          spanGaps: true,
          datalabels: { display: false }
        }] : [])
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 14, padding: 16 }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              if (ctx.datasetIndex === 1) return avgRate != null ? ` Promedio: ${avgRate.toFixed(1)}%` : null;
              const v = ctx.parsed.y; if (v == null) return null;
              const { renovados, total } = stats[allMonths[ctx.dataIndex]];
              return ` Renewal Rate: ${v.toFixed(1)}%  (${renovados} de ${total})`;
            }
          }
        }
      },
      clip: false,
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: {
          type: 'linear', position: 'left', min: 0, max: 120,
          grid: { color: '#f0f3f6' },
          ticks: { font: { size: 10 }, stepSize: 20, callback: v => v + '%' },
          title: { display: true, text: 'Renewal Rate (%)', font: { size: 10 }, color: '#8a9bb0' }
        }
      }
    }
  });
}
