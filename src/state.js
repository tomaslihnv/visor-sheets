export const state = { AB: 'irr' };

export const BD = {
  irr: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], fields:[], refKey:'', refUF:0 },
  ech: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], fields:[], refKey:'', refUF:0 }
};

export const CHARTS = { evol: null, netos: null, venc: null, renewal: null, entrada: null, salidas: null, motivo: null };

export const ENTRADA_COLOR_MAP = {};
export const ENTRADA_PALETTE = [
  '#3b82f6','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#06b6d4','#f97316','#84cc16',
  '#ec4899','#14b8a6',
];

export function destroyChart(key) {
  if (CHARTS[key]) { CHARTS[key].destroy(); CHARTS[key] = null; }
}

export const MOTIVO_PALETTE = [
  '#93c5fd','#86efac','#fca5a5','#fcd34d',
  '#c4b5fd','#fdba74','#a5f3fc','#f9a8d4',
  '#6ee7b7','#bef264'
];

export const MOTIVO_COLOR_MAP = {};
