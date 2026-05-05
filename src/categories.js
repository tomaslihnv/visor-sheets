import { pcol, bcol } from './columns.js';
import { parseCLP } from './utils.js';
import { MOTIVO_COLOR_MAP, MOTIVO_PALETTE } from './state.js';

export function getCategory(u) {
  if (!u) return 'default';
  const dest = (u['Destino'] || '').trim().replace('−', '-');
  const stat = (u['Estatus'] || '').trim();
  if (dest === 'RC') return 'rc';
  if (dest === 'P')  return 'piloto';
  if (dest === '-')  return stat === '1' ? 'contrato' : 'vacante';
  return 'default';
}

export function getParkingCategory(row) {
  const dest    = (row[pcol.destino] || '').trim().replace('−','-');
  const destUp  = dest.toUpperCase();
  const estatus = (row[pcol.estatus] || '').trim();
  if (destUp === 'RC')   return 'rc';
  if (destUp === 'FORD') return 'rc';
  if (dest !== '' && dest !== '-' && dest !== '—') return 'piloto';
  if (estatus === '1')   return 'contrato';
  return 'vacante';
}

export function getBodegaCategory(row) {
  const estatus = (row[bcol.estatus] || '').trim();
  return estatus === '1' ? 'contrato' : 'vacante';
}

export function getMotivoColor(motivo) {
  if (!MOTIVO_COLOR_MAP[motivo]) {
    const idx = Object.keys(MOTIVO_COLOR_MAP).length % MOTIVO_PALETTE.length;
    MOTIVO_COLOR_MAP[motivo] = MOTIVO_PALETTE[idx];
  }
  return MOTIVO_COLOR_MAP[motivo];
}

export function avgLineDataset(allMonths, data) {
  const vals = data.filter(v => v != null && v > 0);
  if (!vals.length) return null;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return {
    type: 'line', label: 'Promedio',
    data: allMonths.map(() => avg),
    borderColor: 'rgba(239,68,68,0.55)', borderWidth: 1.5,
    borderDash: [6, 5], pointRadius: 0, pointHoverRadius: 0,
    fill: false, tension: 0, spanGaps: true,
    datalabels: { display: false },
    _avgValue: avg
  };
}
