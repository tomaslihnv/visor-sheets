import { state, BD, CHARTS, destroyChart } from '../state.js';

const C = {
  granate: '#7c2d3e',
  slate:   '#3d5a73',
  gris:    '#9fb3c8',
  grid:    '#edf2f7',
  muted:   '#64748b',
};

const TIPO_PALETTE = [C.granate, C.slate, C.gris, '#2d6a4f', '#6d28d9', '#9a3412'];

function isContrato(row) {
  const dest = (row['Destino'] || '').toString().trim().replace('−', '-');
  return (row['Estatus'] || '').toString().trim() === '1' && dest === '-';
}

// Busca el valor de una columna probando múltiples nombres exactos
function get(row, ...keys) {
  for (const k of keys) if (row[k] !== undefined && row[k] !== null) return row[k];
  return '';
}

const FONT = { family: 'IBM Plex Sans, system-ui, sans-serif', size: 11 };

// ── Composición del hogar (desde Descripción) ────────────────────────────────
// Usa Descripción: Individual, Pareja, Familia, Padres, etc.
// Si no hay datos, muestra placeholder.

function renderTamanioHogar(data) {
  destroyChart('dirHogar');
  const canvas   = document.getElementById('dir-chart-hogar');
  const noDataEl = document.getElementById('dir-hogar-nodata');
  if (!canvas) return;

  const contratos = data.filter(isContrato);

  // Cuenta por valor de Descripción (normalizado a Capitalizado)
  const counts = {};
  contratos.forEach(row => {
    const desc = (get(row, 'Descripción', 'Descripcion') || '').toString().trim();
    if (!desc) return;
    const key = desc.charAt(0).toUpperCase() + desc.slice(1).toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
  });

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    canvas.style.display = 'none';
    if (noDataEl) noDataEl.style.display = 'flex';
    return;
  }
  if (noDataEl) noDataEl.style.display = 'none';
  canvas.style.display = '';

  // Color semántico por tipo de hogar
  const colorMap = {
    individual: C.slate,
    pareja:     C.gris,
    familia:    C.granate,
    padres:     '#2d6a4f',
  };
  const getColor = label =>
    colorMap[label.toLowerCase()] || TIPO_PALETTE[entries.findIndex(([l]) => l === label) % TIPO_PALETTE.length];

  const labels = entries.map(([l]) => l);
  const values = entries.map(([, v]) => v);
  const total  = values.reduce((a, b) => a + b, 0) || 1;

  CHARTS.dirHogar = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(getColor),
        borderRadius: 4,
        borderSkipped: false,
        barThickness: 28,
      }],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.parsed.x} contratos (${Math.round(ctx.parsed.x / total * 100)}%)`,
          },
        },
        datalabels: {
          anchor: 'end', align: 'right', offset: 4,
          font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 10, weight: '600' },
          color: C.muted,
          formatter: (v) => `${v}  (${Math.round(v / total * 100)}%)`,
        },
      },
      scales: {
        x: { grid: { color: C.grid }, ticks: { font: FONT },
             title: { display: true, text: '# Contratos', font: FONT, color: C.muted } },
        y: { grid: { display: false }, ticks: { font: { ...FONT, size: 12, weight: '500' } } },
      },
      layout: { padding: { right: 60 } },
    },
  });
}

// ── Ocupación residentes (donut) ──────────────────────────────────────────────
// Lee desde BD[ab].contratos (hoja "I. Contratos")

// Normaliza clave: sin tildes, sin espacios, uppercase
const cc = k => k.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s.()_-]/g, '').toUpperCase();

function findOcupCol(keys) {
  return keys.find(k => cc(k) === 'OCUPACION')      ||
         keys.find(k => cc(k) === 'PROFESION')       ||
         keys.find(k => cc(k).includes('OCUPAC'))    ||
         keys.find(k => cc(k).includes('PROFES'))    ||
         keys.find(k => cc(k) === 'CARGO')           ||
         keys.find(k => cc(k).includes('ACTIVIDAD')) ||
         null;
}

function findHabitantesCol(keys) {
  return keys.find(k => cc(k).includes('HABITANTES')) || null;
}

// La hoja "I. Contratos" trae una columna "Estatus" por cada residente
// adicional (Residente I, Residente II) — a veces con nombre repetido
// (Echaurren, desambiguado por parseContratosCSV como "Estatus", "Estatus (2)")
// y a veces ya único de fábrica (Irarrázaval: "Estatus (R1)", "Estatus (R3)").
// En ambos casos la primera columna "Estatus..." en orden de hoja corresponde
// a Residente I, que es la fuente oficial de "Estudiante" (trae el conteo
// precalculado en la propia hoja).
function findEstatusCol(keys) {
  return keys.find(k => cc(k).startsWith('ESTATUS')) || null;
}

// Agrupa ocupaciones/cargos en categorías amplias (orden = prioridad de match)
const OCUP_CATEGORIAS = [
  ['Salud',                        ['MEDIC', 'ENFERM', 'KINESIOLOG', 'ODONTOLOG', 'CIRUJAN', 'PSICOLOG', 'FARMAC', 'DENTIST']],
  ['Legal',                        ['ABOGAD']],
  ['Ingeniería y Tecnología',      ['INGENIER', 'SOFTWARE', 'DEVSEC', 'CIBERSEGURIDAD', 'TECHLEAD', 'DESARROLLADOR', 'DEVELOPER', 'INFORMATIC', 'SISTEMAS', 'PROGRAMADOR']],
  ['Educación',                    ['PROFESOR', 'DOCENTE', 'ACADEMIC', 'INVESTIGADOR', 'PEDAGOG']],
  ['Comercio y Ventas',            ['COMERCIANTE', 'VENDEDOR', 'VENTAS', 'COMERCIAL']],
  ['Empresarios e Independientes', ['EMPRESARI', 'INDEPENDIENTE', 'EMPRENDEDOR', 'DUENO']],
  ['Gerencia y Dirección',         ['GERENTE', 'DIRECTOR', 'SUBGERENTE', 'JEFE', 'SUPERVISOR', 'COORDINADOR', 'ENCARGADO', 'PRESIDENTE', 'PDTE', 'LIDER']],
  ['Funcionarios Públicos',        ['FUNCIONARI', 'CARABINER', 'MUNICIPAL', 'INVESTIGACIONES', 'FISCALIZADOR']],
  ['Administración y Oficina',     ['SECRETARI', 'ASISTENTE', 'ADMINISTRATIV', 'ADMINISTRACION', 'ADMIN']],
  ['Oficios y Técnicos',           ['OBRERO', 'OPERARIO', 'OPERADOR', 'MECANIC', 'ELECTRIC', 'ELECTROMECANIC', 'CONDUCTOR', 'CHOFER', 'TRANSPORTISTA', 'PORTUARIO', 'AGRICOLA', 'MINERO', 'CONSTRUCTOR', 'MANTENCION', 'MANTENEDOR', 'TECNIC']],
  ['Arquitectura y Diseño',        ['ARQUITECTO', 'GEOMENSOR', 'DISENADOR', 'GEOFISIC', 'GEOSCIENT', 'PAISAJIST']],
  ['Estudiantes y Jubilados',      ['ESTUDIANTE', 'JUBILAD', 'PENSIONADO', 'TRAINEE']],
];

function classifyOcupacion(occ) {
  const norm = cc(occ);
  for (const [cat, kws] of OCUP_CATEGORIAS) {
    if (kws.some(kw => norm.includes(kw))) return cat;
  }
  return 'Otros';
}

function renderOcupacion(data) {
  destroyChart('dirOcupacion');
  const canvas   = document.getElementById('dir-chart-ocupacion');
  const noDataEl = document.getElementById('dir-ocup-nodata');
  if (!canvas) return;

  const ab        = state.AB;
  const contratos = BD[ab].contratos || [];
  const keys      = Object.keys(contratos[0] || {});
  const ocupCol  = findOcupCol(keys);
  const estatCol = findEstatusCol(keys);

  const counts = {};
  contratos.forEach(row => {
    // Titular: se clasifica por su "Actividad Laboral"
    if (ocupCol) {
      const occ = (row[ocupCol] || '').toString().trim();
      if (occ) {
        const cat = classifyOcupacion(occ);
        counts[cat] = (counts[cat] || 0) + 1;
      }
    }

    // Residente I: no tiene ocupación propia, solo se identifica como
    // estudiante vía su columna "Estatus"
    if (estatCol && cc(row[estatCol] || '') === 'ESTUDIANTE') {
      counts['Estudiantes y Jubilados'] = (counts['Estudiantes y Jubilados'] || 0) + 1;
    }
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const TOP_N  = OCUP_CATEGORIAS.length + 1; // categorías + "Otros" fallback, sin necesidad de agrupar más
  const top    = sorted.slice(0, TOP_N);
  const otros  = sorted.slice(TOP_N).reduce((s, [, v]) => s + v, 0);
  if (otros > 0) top.push(['Otros', otros]);

  if (!top.length) {
    canvas.style.display = 'none';
    if (noDataEl) noDataEl.style.display = 'flex';
    return;
  }
  if (noDataEl) noDataEl.style.display = 'none';
  canvas.style.display = '';

  const palette = [
    C.granate, C.slate, C.gris,
    '#2d6a4f','#6d28d9','#9a3412','#0369a1','#b45309','#374151','#be185d','#0e7490','#65a30d','#57534e',
  ];

  CHARTS.dirOcupacion = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: top.map(([l]) => l),
      datasets: [{
        data: top.map(([, v]) => v),
        backgroundColor: palette.slice(0, top.length),
        borderWidth: 1.5,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 10 },
            boxWidth: 10, padding: 7,
            generateLabels(chart) {
              const ds = chart.data.datasets[0];
              const total = ds.data.reduce((a, b) => a + b, 0);
              return chart.data.labels.map((l, i) => ({
                text: `${l} (${Math.round(ds.data[i] / total * 100)}%)`,
                fillStyle: ds.backgroundColor[i],
                strokeStyle: '#fff',
                lineWidth: 1,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              return ` ${ctx.label}: ${Math.round(ctx.parsed / total * 100)}% (${ctx.parsed} residentes)`;
            },
          },
        },
        datalabels: {
          color: '#fff',
          font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 10, weight: '600' },
          formatter: (v, ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = v / total;
            return pct > 0.06 ? `${Math.round(pct * 100)}%` : '';
          },
        },
      },
    },
  });
}

// ── Caracterización KPIs ──────────────────────────────────────────────────────

function renderKpis(data) {
  const el = document.getElementById('dir-kpis');
  if (!el) return;

  const contratos = data.filter(isContrato);
  const total     = contratos.length || 1;

  // % con estacionamiento — columna "Estac." (con o sin espacio)
  const withEstac = contratos.filter(r => {
    const v = parseFloat((get(r, 'Estac.', 'Estac. ', 'Estacionamiento') || '0').toString().replace(',', '.'));
    return v > 0;
  }).length;

  // % chilenos — columna "Nacionalidad"
  const chileCount = contratos.filter(r =>
    (get(r, 'Nacionalidad', 'Nacion', 'Pais') || '').toLowerCase().includes('chile')
  ).length;

  // Edad promedio — columna "Edad"
  const edades = contratos.map(r => parseInt(get(r, 'Edad') || '')).filter(v => v > 10 && v < 100);
  const avgEdad = edades.length ? Math.round(edades.reduce((a, b) => a + b, 0) / edades.length) : null;

  // Personas por hogar — columna "Habitantes (n°)" en hoja I. Contratos
  const contratosSheet = BD[state.AB].contratos || [];
  const habCol = findHabitantesCol(Object.keys(contratosSheet[0] || {}));
  const habs   = habCol
    ? contratosSheet.map(r => parseFloat((r[habCol] || '').toString().replace(',', '.'))).filter(v => v > 0)
    : [];
  const avgHab = habs.length ? (habs.reduce((a, b) => a + b, 0) / habs.length).toFixed(1).replace('.', ',') : null;

  // Salario / arriendo — precomputado en data.js
  const ratios = contratos.map(r => r.__salarioRatio).filter(v => v != null && v > 0);
  const avgRat = ratios.length ? (ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(1) : null;

  // % mascota — columna "Mascota": 1 = tiene, 0 = no tiene
  const hasMascotaCol = contratos.some(r => get(r, 'Mascota') !== '');
  const pctMasc = hasMascotaCol
    ? Math.round(contratos.filter(r => String(get(r, 'Mascota')).trim() === '1').length / total * 100)
    : null;

  const kpis = [
    { svg: svgCar,    value: `${Math.round(withEstac / total * 100)}%`,          sub: 'tiene estacionamiento' },
    { svg: svgPaw,    value: pctMasc != null ? `${pctMasc}%` : '—',             sub: 'tiene mascota',         dim: pctMasc == null },
    { svg: svgPeople, value: avgHab != null ? `${avgHab} persona por hogar` : '—', sub: avgEdad != null ? `${avgEdad} años promedio` : `${total} contratos activos`, dim: avgHab == null },
    { svg: svgFlag,   value: `${Math.round(chileCount / total * 100)}%`,         sub: 'chilenos', accent: chileCount / total >= 0.6 },
    { svg: svgMoney,  value: avgRat   != null ? `${avgRat}x` : '—',             sub: 'salario / arriendo',    dim: avgRat == null },
  ];

  el.innerHTML = kpis.map(k => `
    <div class="dir-kpi">
      <div class="dir-kpi-icon ${k.dim ? 'dir-kpi-icon-dim' : ''}">${k.svg}</div>
      <div>
        <div class="dir-kpi-value ${k.accent ? 'dir-kpi-accent' : ''} ${k.dim ? 'dir-kpi-dim' : ''}">${k.value}</div>
        <div class="dir-kpi-sub">${k.sub}</div>
      </div>
    </div>
  `).join('');
}

// ── Residente por grupo etario y tipología ────────────────────────────────────

function renderEdadTipologia(data) {
  destroyChart('dirEdad');
  const canvas   = document.getElementById('dir-chart-edad');
  const noDataEl = document.getElementById('dir-edad-nodata');
  if (!canvas) return;

  const hasEdad = data.filter(isContrato).some(r => parseInt(get(r, 'Edad') || '') > 0);
  if (!hasEdad) {
    canvas.style.display = 'none';
    if (noDataEl) noDataEl.style.display = 'flex';
    return;
  }
  if (noDataEl) noDataEl.style.display = 'none';
  canvas.style.display = '';

  const RANGES = ['20-25','26-30','31-35','36-40','41-45','46-50','51-55','56+'];
  const toRange = age => {
    if (age < 20) return null;
    if (age <= 25) return '20-25';
    if (age >= 56) return '56+';
    const lo = Math.floor((age - 26) / 5) * 5 + 26;
    return `${lo}-${lo + 4}`;
  };

  const contratos = data.filter(isContrato);
  const tipos     = [...new Set(contratos.map(r => (r['Tipo'] || '').toString().trim()).filter(Boolean))].sort();

  const matrix = Object.fromEntries(tipos.map(t => [t, Object.fromEntries(RANGES.map(r => [r, 0]))]));
  contratos.forEach(row => {
    const age  = parseInt(get(row, 'Edad') || '');
    const tipo = (row['Tipo'] || '').toString().trim();
    if (!age || !tipo || !matrix[tipo]) return;
    const rng = toRange(age);
    if (rng) matrix[tipo][rng]++;
  });

  CHARTS.dirEdad = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: RANGES,
      datasets: tipos.map((t, i) => ({
        label: t,
        data: RANGES.map(r => matrix[t][r]),
        backgroundColor: TIPO_PALETTE[i % TIPO_PALETTE.length],
        borderRadius: 3,
        borderSkipped: false,
      })),
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: FONT, boxWidth: 11, padding: 14 } },
        tooltip: { mode: 'index' },
        datalabels: { display: false },
      },
      scales: {
        x: { stacked: true, grid: { display: false }, ticks: { font: FONT } },
        y: { stacked: true, grid: { color: C.grid }, ticks: { font: FONT, stepSize: 5 } },
      },
    },
  });
}

// ── Residentes por sexo ────────────────────────────────────────────────────────

function renderSexoResidentes(data) {
  destroyChart('dirSexo');
  const canvas = document.getElementById('dir-chart-sexo');
  if (!canvas) return;

  const contratos = data.filter(isContrato);
  let hombres = 0, mujeres = 0, otros = 0;
  contratos.forEach(row => {
    const sexo = (row['Sexo'] || '').toString().trim().toUpperCase();
    if (sexo === 'M') hombres++;
    else if (sexo === 'F') mujeres++;
    else if (sexo) otros++;
  });

  const labels = ['Hombres', 'Mujeres'];
  const values = [hombres, mujeres];
  if (otros > 0) { labels.push('Otro / s/d'); values.push(otros); }
  const total = values.reduce((a, b) => a + b, 0) || 1;

  CHARTS.dirSexo = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: [C.slate, C.granate, C.gris],
        borderWidth: 1.5,
        borderColor: '#fff',
        hoverOffset: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 11 },
            boxWidth: 11, padding: 10,
            generateLabels(chart) {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map((l, i) => ({
                text: `${l} (${ds.data[i]})`,
                fillStyle: ds.backgroundColor[i],
                strokeStyle: '#fff',
                lineWidth: 1,
                index: i,
              }));
            },
          },
        },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} (${Math.round(ctx.parsed / total * 100)}%)` } },
        datalabels: {
          color: '#fff',
          font: { family: 'IBM Plex Sans, system-ui, sans-serif', size: 11, weight: '600' },
          formatter: v => v > 0 ? `${Math.round(v / total * 100)}%` : '',
        },
      },
    },
  });
}

// ── Tabla stock ───────────────────────────────────────────────────────────────

// Inicio real de arriendo de cada proyecto (no se puede derivar del CSV: la
// hoja "Estatus Actual" solo trae la firma vigente por unidad, no el
// historial completo de rotación).
const PROJECT_START = {
  ech: { year: 2023, month: 12 },
  irr: { year: 2024, month: 2 },
};

function renderTablaStock(data) {
  const el = document.getElementById('dir-tabla-stock');
  if (!el) return;

  const stock = {}, firmas = {};
  data.forEach(row => {
    const estat = (row['Estatus'] || '').toString().trim();
    const tipo  = (row['Tipo'] || '').toString().trim();
    if (!tipo) return;
    stock[tipo] = (stock[tipo] || 0) + 1;
    if (estat === '1') firmas[tipo] = (firmas[tipo] || 0) + 1;
  });

  const start     = PROJECT_START[state.AB];
  const startMk   = start.year * 12 + start.month;
  const now       = new Date();
  const nowMk     = now.getFullYear() * 12 + (now.getMonth() + 1);
  const tipos     = Object.keys(stock).sort();
  const totStock  = Object.values(stock).reduce((a, b) => a + b, 0);
  const totFirmas = Object.values(firmas).reduce((a, b) => a + b, 0);
  // "Meses de renta": tiempo transcurrido desde que empezó el proyecto (misma
  // ventana para todas las tipologías, no una por fila).
  const meses     = Math.max(1, nowMk - startMk + 1);
  const fmtP      = (f, s) => s > 0 ? (f / s * 100).toFixed(1) + '%' : '—';
  const fmtV      = f => f > 0 ? (f / meses).toFixed(1) + '/mes' : '—';

  el.innerHTML = `
    <table class="dir-table">
      <thead>
        <tr><th>Tipología</th><th>Stock</th><th>Firmas</th><th>% Ocup. Neta</th><th>Vel. Renta</th></tr>
      </thead>
      <tbody>
        ${tipos.map(t => `<tr>
          <td>${t}</td>
          <td>${stock[t] || 0}</td>
          <td>${firmas[t] || 0}</td>
          <td>${fmtP(firmas[t] || 0, stock[t] || 0)}</td>
          <td>${fmtV(firmas[t] || 0)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td><strong>Total</strong></td>
          <td><strong>${totStock}</strong></td>
          <td><strong>${totFirmas}</strong></td>
          <td><strong>${fmtP(totFirmas, totStock)}</strong></td>
          <td><strong>${fmtV(totFirmas)}</strong></td>
        </tr>
      </tfoot>
    </table>`;
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const svgCar    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="11" width="22" height="9" rx="2"/><path d="M5 11L7 6h10l2 5"/><circle cx="7" cy="20" r="2"/><circle cx="17" cy="20" r="2"/></svg>`;
const svgPaw    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><circle cx="4" cy="8" r="2"/><path d="M9 10a5 5 0 0 1 6 0l3 6.5a2 2 0 0 1-2 3H8a2 2 0 0 1-2-3L9 10z"/></svg>`;
const svgPeople = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const svgFlag   = `<svg viewBox="0 0 24 24"><clipPath id="clFlag"><rect x="1" y="4" width="22" height="16" rx="1.5"/></clipPath><g clip-path="url(#clFlag)"><rect x="1" y="4" width="22" height="16" fill="#fff"/><rect x="1" y="12" width="22" height="8" fill="#D52B1E"/><rect x="1" y="4" width="8" height="8" fill="#0039A6"/></g><path d="M5 6.1l.55 1.55h1.63l-1.32 1 .5 1.55L5 9.3l-1.36.9.5-1.55-1.32-1h1.63z" fill="#fff"/></svg>`;
const svgMoney  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>`;

// ── Entry point ───────────────────────────────────────────────────────────────

export function renderDirectorio() {
  const ab   = state.AB;
  const data = BD[ab].data;
  if (!data.length) return;

  renderTamanioHogar(data);
  renderOcupacion(data);
  renderKpis(data);
  renderEdadTipologia(data);
  renderSexoResidentes(data);
  renderTablaStock(data);
}
