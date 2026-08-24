import { state, BD } from '../state.js';
import { CALC_COLS, computeCellText } from './tables.js';

let _allCols = [];

export function openEstatusExportModal() {
  const headers = BD[state.AB].fields || [];
  _allCols = [...headers, ...CALC_COLS];

  const list = document.getElementById('exp-cols-list');
  list.innerHTML = _allCols.map((h, i) => `
    <label class="exp-col-item">
      <input type="checkbox" value="${i}" checked>
      <span>${h}</span>
    </label>
  `).join('');

  document.getElementById('estatus-export-modal').style.display = 'flex';
}

export function closeEstatusExportModal() {
  document.getElementById('estatus-export-modal').style.display = 'none';
}

export function toggleAllExportCols(checked) {
  document.querySelectorAll('#exp-cols-list input[type="checkbox"]').forEach(c => { c.checked = checked; });
}

function getSelectedCols() {
  const idxs = [...document.querySelectorAll('#exp-cols-list input[type="checkbox"]:checked')]
    .map(c => parseInt(c.value));
  return idxs.map(i => _allCols[i]);
}

function getExportRows(cols) {
  const data = BD[state.AB].data || [];
  return data.map(row => Object.fromEntries(cols.map(h => [h, computeCellText(row, h)])));
}

// ── CSV ──────────────────────────────────────────────────────────────────────

function toCSV(cols, rows) {
  const esc = v => {
    const s = String(v ?? '');
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [cols.map(esc).join(',')];
  rows.forEach(r => lines.push(cols.map(h => esc(r[h])).join(',')));
  return '﻿' + lines.join('\r\n'); // BOM para que Excel abra bien los acentos
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Tabla (portapapeles) ──────────────────────────────────────────────────────

function buildHTMLTable(cols, rows) {
  const th = cols.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map(r => '<tr>' + cols.map(h => `<td>${r[h] ?? ''}</td>`).join('') + '</tr>').join('');
  return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
}

async function copyAsTable(cols, rows) {
  const html = buildHTMLTable(cols, rows);
  const text = [cols.join('\t'), ...rows.map(r => cols.map(h => r[h] ?? '').join('\t'))].join('\n');
  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html':  new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' }),
    }),
  ]);
}

// ── XLSX ─────────────────────────────────────────────────────────────────────

function exportXLSX(cols, rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows, { header: cols });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Estatus Actual');
  XLSX.writeFile(wb, filename);
}

// ── PDF ──────────────────────────────────────────────────────────────────────

// Más columnas → letra y padding más chicos, para que autoTable no tenga que
// partir el contenido en varias líneas dentro de la celda.
function fontSizeForCols(n) {
  if (n <= 12) return 7;
  if (n <= 18) return 6;
  if (n <= 24) return 5;
  if (n <= 32) return 4.2;
  return 3.5;
}

function exportPDF(cols, rows, filename) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const fontSize = fontSizeForCols(cols.length);
  doc.autoTable({
    head: [cols],
    body: rows.map(r => cols.map(h => r[h] ?? '')),
    styles: { fontSize, cellPadding: fontSize < 5 ? 0.7 : 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [26, 24, 16], fontSize },
    margin: { top: 10, left: 6, right: 6 },
  });
  doc.save(filename);
}

// ── Entry point ────────────────────────────────────────────────────────────────

export async function runEstatusExport(format, btn) {
  const cols = getSelectedCols();
  if (!cols.length) { alert('Selecciona al menos una columna.'); return; }

  const rows = getExportRows(cols);
  const stamp = new Date().toISOString().slice(0, 10);
  const base  = `estatus-actual_${state.AB}_${stamp}`;

  if (btn) btn.disabled = true;
  try {
    if (format === 'csv') {
      downloadBlob(new Blob([toCSV(cols, rows)], { type: 'text/csv;charset=utf-8' }), `${base}.csv`);
    } else if (format === 'xlsx') {
      exportXLSX(cols, rows, `${base}.xlsx`);
    } else if (format === 'pdf') {
      exportPDF(cols, rows, `${base}.pdf`);
    } else if (format === 'table') {
      await copyAsTable(cols, rows);
      alert('Tabla copiada al portapapeles. Pégala directo en Excel, Sheets o Word.');
    }
    closeEstatusExportModal();
  } catch (err) {
    console.error('Error exportando:', err);
    alert('Error al exportar. Revisa la consola (F12).');
  } finally {
    if (btn) btn.disabled = false;
  }
}
