import { pcol, bcol } from './columns.js';
import { parseCLP, nfdKey } from './utils.js';
import { MOTIVO_COLOR_MAP, MOTIVO_PALETTE } from './state.js';
import { MOTIVOS } from './config.js';

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
  const nKey = Object.keys(row).find(k => {
    const nk = nfdKey(k);
    return nk === 'N°' || nk === 'N' || nk === '#';
  }) || pcol.n;
  const n = (row[nKey] || '').toString().trim().toUpperCase();
  if (n.startsWith('ELC')) return 'local';
  const estatus = (row[pcol.estatus] || '').trim();
  if (estatus === '2') return 'inhabilitado';
  const titular = (row[pcol.titular] || '').trim().toLowerCase();
  if (titular === 'visita') return 'visita';
  if (estatus === '1') return 'contrato';
  const destUp = (row[pcol.destino] || '').trim().replace('−','-').toUpperCase();
  if (destUp === 'RC' || destUp === 'FORD') return 'contrato';
  return 'vacante';
}

export function getBodegaCategory(row) {
  const estatus = (row[bcol.estatus] || '').trim();
  return estatus === '1' ? 'contrato' : 'vacante';
}

export function getMotivoColor(motivo) {
  if (!MOTIVO_COLOR_MAP[motivo]) {
    let configIdx = MOTIVOS.indexOf(motivo);
    if (configIdx < 0) {
      // fallback: comparación sin mayúsculas, acentos ni variantes Des-/Dis-
      const norm = s => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/^dis/, 'des');
      configIdx = MOTIVOS.findIndex(m => norm(m) === norm(motivo));
    }
    const idx = configIdx >= 0
      ? configIdx % MOTIVO_PALETTE.length
      : Object.keys(MOTIVO_COLOR_MAP).length % MOTIVO_PALETTE.length;
    MOTIVO_COLOR_MAP[motivo] = MOTIVO_PALETTE[idx];
  }
  return MOTIVO_COLOR_MAP[motivo];
}

