import { nfdKey } from './utils.js';

export let pcol = { n:'N°', piso:'Piso', tandem:'Tandem', destino:'Destino',
                    depto:'Depto.', canon:'Canon Estac.', ggcc:'GGCC Estac.',
                    estatus:'Estatus', titular:'Titular' };

export function resolveParkingColumns(headers) {
  const find = (test) => headers.find(h => test(nfdKey(h))) || null;
  pcol.n       = find(k => k === 'N°' || k === 'N')                    || headers[0];
  pcol.piso    = find(k => k === 'PISO')                               || 'Piso';
  pcol.tandem  = find(k => k === 'TANDEM')                             || 'Tandem';
  pcol.destino = find(k => k === 'DESTINO')                            || 'Destino';
  pcol.depto   = find(k => k.startsWith('DEPTO'))                      || 'Depto.';
  pcol.canon   = find(k => k.includes('CANON') && k.includes('ESTAC')) || 'Canon Estac.';
  pcol.ggcc    = find(k => k.includes('GGCC')  && k.includes('ESTAC')) || 'GGCC Estac.';
  pcol.estatus = find(k => k === 'ESTATUS')                            || 'Estatus';
  pcol.titular = find(k => k === 'TITULAR' || k === 'ARRENDATARIO')    || 'Titular';
}

export let col = {
  util:    'ÚTIL',
  termino: null,
  firma:   null,
  salario: null,
  titular: null,
  diasRem: null,
  ggcc:    null,
};

export function resolveColumns(headers) {
  const find = (test) => headers.find(h => test(nfdKey(h))) || null;
  col.util    = find(k => k === 'UTIL') || 'ÚTIL';
  col.termino = find(k => k === 'TERMINO' || k === 'VENCIMIENTO' || k.startsWith('TERMINO') || k.includes('VENCIMIENT'));
  col.firma   = find(k => k === 'FIRMA' || k.includes('FIRMA'));
  col.salario = find(k => k === 'SALARIO');
  col.titular = find(k => k === 'TITULAR' || k === 'ARRENDATARIO' || k === 'NOMBRE');
  col.diasRem = find(k => k === 'DIAS REMANENTES' || k === 'DIAS REM' || k.includes('REMANENTE'));
  col.ggcc    = find(k => k.includes('GGCC') && k.includes('DEPTO')) || 'GGCC Deptos.';
}

export let bcol = { n:'N°', piso:'Piso', estatus:'Estatus', titular:'Titular',
                    depto:'Depto.', canon:'Canon Bod.', ggcc:'GGCC Bod.' };

export function resolveBodegaColumns(headers) {
  const find = (test) => headers.find(h => test(nfdKey(h))) || null;
  bcol.n       = find(k => k === 'N°' || k === 'N')                  || headers[0];
  bcol.piso    = find(k => k === 'PISO')                             || 'Piso';
  bcol.estatus = find(k => k === 'ESTATUS')                          || 'Estatus';
  bcol.titular = find(k => k === 'TITULAR' || k === 'ARRENDATARIO')  || 'Titular';
  bcol.depto   = find(k => k.startsWith('DEPTO'))                    || 'Depto.';
  bcol.canon   = find(k => k.includes('CANON') && k.includes('BOD')) || 'Canon Bod.';
  bcol.ggcc    = find(k => k.includes('GGCC')  && k.includes('BOD')) || 'GGCC Bod.';
}

export const EVOL_COL = {
  fecha:   'Fecha',
  unFcast: 'Arriendos acumulados (reales + forecast) (un.)',
  pctFcast:'Arriendos acumulados (reales + forecast) (%)',
  netos:   'Nuevos arriendos netos (reales + forecast)',
};

export function resolveEvolColumns(headers) {
  if (!headers || !headers.length) return;
  const find = (test) => headers.find(h => test(nfdKey(h))) || null;
  const netos = find(k => k.includes('NETO') && !k.includes('ACUMULADO')) ||
                find(k => k.includes('NETO'));
  if (netos) EVOL_COL.netos = netos;
}
