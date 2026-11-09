import { col } from './columns.js';
import { parseCLP, parseNum, parseDate, getRefDate, toAPIDate, lastDayOfMonth, fetchUF } from './utils.js';

export async function calcIPC(data) {
  const refDate = getRefDate();
  const refKey  = toAPIDate(refDate);
  const dateKeys = new Set([refKey]);

  const firmaCol = col.firma || 'Firma';
  data.forEach(row => {
    const dest = (row['Destino'] || '').trim().replace('−', '-');
    if ((row['Estatus'] || '').trim() !== '1' || dest !== '-') return;
    const p = parseDate(row[firmaCol]);
    if (p) dateKeys.add(toAPIDate(lastDayOfMonth(p.month, p.year)));
  });

  const ufMap = Object.fromEntries(
    await Promise.all([...dateKeys].map(k => fetchUF(k).then(v => [k, v])))
  );
  const refUF = ufMap[refKey];

  data.forEach(row => {
    const dest = (row['Destino'] || '').trim().replace('−', '-');
    row.__ipc = row.__firmaUF = null;
    row.__refUF = refUF;
    if ((row['Estatus'] || '').trim() !== '1' || dest !== '-') return;
    const p = parseDate(row[firmaCol]);
    if (!p || !refUF) return;
    const fUF = ufMap[toAPIDate(lastDayOfMonth(p.month, p.year))];
    if (!fUF) return;
    row.__ipc = (refUF / fUF) - 1;
    row.__firmaUF = fUF;
  });

  return { refKey, refUF };
}

export function precompute(data, refUF) {
  data.forEach(row => {
    const dest       = (row['Destino'] || '').trim().replace('−', '-');
    const stat       = (row['Estatus'] || '').trim();
    const isContrato = stat === '1' && dest === '-';
    const isVacante  = dest === '-' && !isContrato;

    const canonRaw = parseCLP(row['Canon Deptos.']);
    row.__ggccCLP  = parseCLP(col.ggcc ? row[col.ggcc] : row['GGCC Deptos.']);
    row.__canonCLP = row.__canonUF = row.__canonUFm2 = null;
    if (canonRaw !== null) {
      row.__canonCLP = row.__ipc != null ? canonRaw * (1 + row.__ipc) : canonRaw;
      if (refUF) {
        row.__canonUF = row.__canonCLP / refUF;
        const util = parseNum(row[col.util]);
        if (util > 0) row.__canonUFm2 = row.__canonUF / util;
      }
    }

    row.__salarioRatio = null;
    if (isContrato && col.salario) {
      const sal = parseCLP(row[col.salario]);
      if (sal != null && row.__canonCLP > 0) row.__salarioRatio = sal / row.__canonCLP;
    }

    row.__diasRemanentes = null;
    if (isContrato) {
      const vencStr = (col.termino ? row[col.termino] : null) || row['Vencimiento'] || row['VENCIMIENTO'] || null;
      const p = parseDate(vencStr);
      if (p) {
        const td = new Date(p.year, p.month - 1, p.day);
        const today = new Date(); today.setHours(0,0,0,0);
        const diff = Math.round((td - today) / 86400000);
        row.__diasRemanentes = Math.max(0, diff);
      }
    }

    row.__diasVacante = null;
    if (isVacante && col.termino) {
      const p = parseDate(row[col.termino]);
      if (p) {
        const td = new Date(p.year, p.month - 1, p.day);
        const today = new Date(); today.setHours(0,0,0,0);
        row.__diasVacante = Math.round((today - td) / 86400000);
      }
    }
  });
}
