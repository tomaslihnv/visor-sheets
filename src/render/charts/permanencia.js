import { state, BD, CHARTS, destroyChart } from '../../state.js';
import { col } from '../../columns.js';
import { parseDate } from '../../utils.js';

const BUCKETS = [
  { label: '< 6 meses',    color: '#60a5fa' }, // blue-400
  { label: '6 – 12 meses', color: '#fbbf24' }, // amber-400
  { label: '> 12 meses',   color: '#34d399' }, // emerald-400
];

export function initPermanenciaSelects(data) {
  const tipoEl = document.getElementById('permanencia-chart-tipo');
  if (!tipoEl) return;
  const tipos = new Set();
  data.forEach(row => {
    const t = (row['Tipo'] || '').trim();
    if (t) tipos.add(t);
  });
  tipoEl.innerHTML = '<option value="">Todas</option>';
  [...tipos].sort().forEach(t => tipoEl.appendChild(new Option(t, t)));
}

export function renderPermanenciaChart() {
  const data   = BD[state.AB].data;
  const canvas = document.getElementById('permanencia-chart-canvas');
  if (!canvas || !data.length) return;

  const tipoFilt = document.getElementById('permanencia-chart-tipo')?.value || '';
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const firmaCol = col.firma || 'Firma';
  const counts   = [0, 0, 0];
  let total = 0;

  data.forEach(row => {
    const dest = (row['Destino'] || '').trim().replace('−', '-');
    if ((row['Estatus'] || '').trim() !== '1' || dest !== '-') return;
    if (tipoFilt && (row['Tipo'] || '').trim() !== tipoFilt) return;
    const p = parseDate((row[firmaCol] || '').toString().trim());
    if (!p) return;
    const dias = Math.round((today - new Date(p.year, p.month - 1, p.day)) / 86400000);
    counts[dias < 180 ? 0 : dias < 365 ? 1 : 2]++;
    total++;
  });

  const anualPct     = total > 0 ? Math.round(counts[2] / total * 100) : 0;
  const semestralPct = total > 0 ? Math.round((counts[1] + counts[2]) / total * 100) : 0;

  const elAnual     = document.getElementById('permanencia-stat-anual');
  const elSemestral = document.getElementById('permanencia-stat-semestral');
  if (elAnual)     elAnual.textContent     = `Perm. anual (>12m): ${anualPct}%`;
  if (elSemestral) elSemestral.textContent = `Perm. semestral (>6m): ${semestralPct}%`;

  destroyChart('permanencia');
  if (!total) return;

  const showLabels = !!document.getElementById('permanencia-chart-labels')?.checked;

  CHARTS.permanencia = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: BUCKETS.map(b => b.label),
      datasets: [{
        data: counts,
        backgroundColor: BUCKETS.map(b => b.color),
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 6,
        datalabels: {
          display: ctx => showLabels && counts[ctx.dataIndex] > 0,
          color: '#fff',
          font: { size: 11, weight: '700' },
          formatter: (val) => {
            const pct = total > 0 ? Math.round(val / total * 100) : 0;
            return `${pct}%\n(${val})`;
          }
        }
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 11 },
            boxWidth: 14,
            padding: 14,
            generateLabels: () => BUCKETS.map((b, i) => ({
              text: `${b.label}  —  ${counts[i]} un. (${total > 0 ? Math.round(counts[i] / total * 100) : 0}%)`,
              fillStyle: b.color,
              strokeStyle: b.color,
              lineWidth: 0,
              index: i
            }))
          }
        },
        datalabels: {},
        tooltip: {
          callbacks: {
            label: ctx => {
              const val = ctx.parsed;
              const pct = total > 0 ? (val / total * 100).toFixed(1) : '0';
              return ` ${ctx.label}: ${val} unidades (${pct}%)`;
            }
          }
        }
      }
    }
  });
}
