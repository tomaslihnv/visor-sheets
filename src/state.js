export const state = { AB: 'irr' };

export const BD = {
  irr: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], fields:[], refKey:'', refUF:0 },
  ech: { umap:{}, data:[], evol:[], park:[], bod:[], venc:[], sal:[], fields:[], refKey:'', refUF:0 }
};

export const CHARTS = { evol: null, netos: null, venc: null, renewal: null, salidas: null, motivo: null };

export function destroyChart(key) {
  if (CHARTS[key]) { CHARTS[key].destroy(); CHARTS[key] = null; }
}

export const MOTIVO_PALETTE = [
  '#93c5fd','#86efac','#fca5a5','#fcd34d',
  '#c4b5fd','#fdba74','#a5f3fc','#f9a8d4',
  '#6ee7b7','#bef264'
];

export const MOTIVO_COLOR_MAP = {};
