export const state = { AB: 'irr' };

export const BD = {
  irr: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], contratos:[], fields:[], refKey:'', refUF:0 },
  ech: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], contratos:[], fields:[], refKey:'', refUF:0 }
};

export const CHARTS = { evol: null, netos: null, venc: null, renewal: null, entrada: null, termino: null, salidas: null, motivo: null, desglose: null };

// Colores semánticos fijos — usar siempre estas referencias, nunca hardcodear hex.
// Cualquier label que aparezca en más de un gráfico DEBE usar el mismo color de aquí.
export const CHART_COLORS = {
  // Tipos de término/salida
  noRenovacion:    '#fb923c', // orange-400  — "No Renovación" en Vencimientos y Desglose
  renovacion:      '#34d399', // emerald-400 — "Renovación" en Vencimientos
  salidaAnticipada:'#a855f7', // purple-500  — "Salida Anticipada" en Desglose

  // Flujo: Contratos, Salidas y Netos
  nuevosContratos: '#3b82f6', // blue-500
  salidas:         '#f43f5e', // rose-500
  netos:           '#10b981', // emerald-500
};

export const ENTRADA_COLOR_MAP = {};
export const ENTRADA_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#84cc16',
  '#ec4899','#14b8a6',
];

export const TERMINO_COLOR_MAP = {};
export const TERMINO_PALETTE = [
  '#f43f5e','#fb923c','#facc15','#a3e635',
  '#34d399','#22d3ee','#818cf8','#e879f9',
  '#94a3b8','#f97316',
];

export function destroyChart(key) {
  if (CHARTS[key]) { CHARTS[key].destroy(); CHARTS[key] = null; }
}

// 15 entradas alineadas con el orden de MOTIVOS en config.js:
// 0-Cambio de domicilio, 1-Compra de vivienda, 2-Conflicto con vecino, 3-Fin de contrato,
// 4-Motivos económicos, 5-Motivos familiares, 6-Motivos laborales,
// 7-No renueva (= CHART_COLORS.noRenovacion para alinear con "No Renovación"),
// 8-Problemas con la propiedad, 9-Término anticipado (= CHART_COLORS.salidaAnticipada),
// 10-Desconformidad financiera, 11-Desconformidad por servicio, 12-Abandono,
// 13-Asuntos personales, 14-Comportamiento
export const MOTIVO_PALETTE = [
  '#60a5fa', // 0  Cambio de domicilio       — blue-400
  '#4ade80', // 1  Compra de vivienda         — green-400
  '#fbbf24', // 2  Conflicto con vecino       — amber-400
  '#94a3b8', // 3  Fin de contrato            — slate-400
  '#f87171', // 4  Motivos económicos         — red-400
  '#fde047', // 5  Motivos familiares         — yellow-300
  '#2dd4bf', // 6  Motivos laborales          — teal-400
  '#fb923c', // 7  No renueva                 — orange-400 (= CHART_COLORS.noRenovacion)
  '#a3e635', // 8  Problemas con la propiedad — lime-400
  '#a855f7', // 9  Término anticipado         — purple-500 (= CHART_COLORS.salidaAnticipada)
  '#e879f9', // 10 Desconformidad financiera  — fuchsia-400
  '#f472b6', // 11 Desconformidad por servicio — pink-400
  '#fb7185', // 12 Abandono                   — rose-400
  '#b45309', // 13 Asuntos personales         — amber-700 (café)
  '#7c3aed', // 14 Comportamiento             — violet-600
];

export const MOTIVO_COLOR_MAP = {};
