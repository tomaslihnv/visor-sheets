export function parseCLP(str) {
  if (str == null || str === '') return null;
  const n = parseFloat(String(str).trim().replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function parseNum(str) {
  if (str == null || str === '') return null;
  const n = parseFloat(String(str).trim().replace(',', '.'));
  return isNaN(n) ? null : n;
}

export function nfdKey(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

export function parseDate(str) {
  if (!str) return null;
  const parts = String(str).trim().split('/');
  if (parts.length !== 3) return null;
  const d = parseInt(parts[0]), m = parseInt(parts[1]), y = parseInt(parts[2]);
  if (!d || !m || !y || isNaN(d+m+y)) return null;
  return { day: d, month: m, year: y };
}

export function lastDayOfMonth(month, year) { return new Date(year, month, 0); }

export function getRefDate() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), 0);
}

export function toAPIDate(date) {
  return `${String(date.getDate()).padStart(2,'0')}-${String(date.getMonth()+1).padStart(2,'0')}-${date.getFullYear()}`;
}

export function fetchUF(dateStr) {
  return fetch(`https://mindicador.cl/api/uf/${dateStr}`)
    .then(r => r.json())
    .then(d => d?.serie?.[0]?.valor ?? null)
    .catch(() => null);
}

export const _MESES_IDX = { ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,sept:8,oct:9,nov:10,dic:11 };

export function parseEvolDate(str) {
  if (!str) return null;
  str = str.toString().trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return new Date(str);
  const p = str.split('/');
  if (p.length === 3) {
    const y = +p[2] >= 100 ? +p[2] : 2000 + +p[2];
    return new Date(y, +p[1] - 1, +p[0]);
  }
  if (p.length === 2) {
    const y = +p[1] >= 100 ? +p[1] : 2000 + +p[1];
    return new Date(y, +p[0] - 1, 1);
  }
  const m = str.match(/^([a-záéíóúü]{3,5})[.\-\/](\d{2,4})$/i);
  if (m) {
    const key = m[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const mon = _MESES_IDX[key];
    if (mon !== undefined) {
      const y = +m[2] < 100 ? 2000 + +m[2] : +m[2];
      return new Date(y, mon, 1);
    }
  }
  return null;
}

export const _MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

export function formatEvolLabel(str) {
  const d = parseEvolDate(str);
  if (!d || isNaN(d)) return str;
  return _MESES[d.getMonth()] + '-' + String(d.getFullYear()).slice(-2);
}
