export const CALC_COLS = ['Ajuste x IPC', 'Canon CLP', 'Canon UF', 'Canon UF/m²', 'Salario/arriendo', 'Días Remanentes'];

export function renderEstatusTable(data, headers, refKey, refUF) {
  const augHeaders = [...headers, ...CALC_COLS];
  const notice = document.getElementById('ipc-notice');
  if (notice) {
    const [dd,mm,yyyy] = refKey.split('-');
    notice.textContent = `UF de referencia (${dd}/${mm}/${yyyy}): $${refUF ? refUF.toLocaleString('es-CL',{minimumFractionDigits:2}) : '—'}`;
  }
  let html = '<table><thead><tr>';
  augHeaders.forEach(h => {
    html += CALC_COLS.includes(h) ? `<th class="col-calc">${h}</th>` : `<th>${h}</th>`;
  });
  html += '</tr></thead><tbody>';
  data.forEach(row => {
    const dest = (row['Destino'] || '').trim().replace('−', '-');
    const isC  = (row['Estatus'] || '').trim() === '1' && dest === '-';
    html += '<tr>';
    augHeaders.forEach(h => {
      switch (h) {
        case 'Ajuste x IPC':
          if (row.__ipc != null) {
            const pct = (row.__ipc * 100).toFixed(2), pos = row.__ipc >= 0;
            const tip = `UF firma: $${row.__firmaUF?.toLocaleString('es-CL',{minimumFractionDigits:2})} → UF ref: $${row.__refUF?.toLocaleString('es-CL',{minimumFractionDigits:2})}`;
            html += `<td class="col-calc" style="color:${pos?'#065f46':'#991b1b'};background:${pos?'#f0fdf4':'#fef2f2'}" title="${tip}">${pos?'+':''}${pct}%</td>`;
          } else html += `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        case 'Canon CLP':
          html += row.__canonCLP != null
            ? `<td class="col-calc">$${Math.round(row.__canonCLP).toLocaleString('es-CL')}</td>`
            : `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        case 'Canon UF':
          html += row.__canonUF != null
            ? `<td class="col-calc">${row.__canonUF.toFixed(2)} UF</td>`
            : `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        case 'Canon UF/m²':
          html += row.__canonUFm2 != null
            ? `<td class="col-calc">${row.__canonUFm2.toFixed(2)} UF/m²</td>`
            : `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        case 'Salario/arriendo':
          html += (isC && row.__salarioRatio != null)
            ? `<td class="col-calc">${row.__salarioRatio.toFixed(1).replace('.',',')}x</td>`
            : `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        case 'Días Remanentes':
          html += isC
            ? `<td class="col-calc">${row.__diasRemanentes != null ? row.__diasRemanentes : '—'}</td>`
            : `<td class="col-calc" style="color:#c0cad4">—</td>`;
          break;
        default: {
          const rawVal = (row[h] ?? '').toString().trim();
          const isEmpty = rawVal === '' || rawVal === '-' || rawVal === '—';
          const contrato = parseInt((row['Contrato'] || '0').toString().trim()) || 0;
          const estac    = parseFloat((row['Estac. '] || row['Estac.'] || '0').toString().replace(',','.')) || 0;
          const bod      = parseFloat((row['Bod.'] || '0').toString().replace(',','.')) || 0;

          let redCell = false;
          if (isC && contrato > 1 && isEmpty) {
            const camposHistorico = ['Titular','Nacionalidad','Sexo','Edad','Salario','Descripción','Canon Deptos.','GGCC Deptos.'];
            if (camposHistorico.includes(h)) redCell = true;
          }
          if (isC && estac > 0 && isEmpty) {
            if (['Canon Estac. ', 'Canon Estac.', 'GGCC Estac.'].some(c => h.includes('Estac'))) redCell = true;
          }
          if (isC && bod > 0 && isEmpty) {
            if (h.includes('Bod')) redCell = true;
          }
          if (isC && (h === 'Vencimiento' || h === 'VENCIMIENTO')) {
            if (row.__diasRemanentes === 0) redCell = true;
          }

          html += redCell
            ? `<td style="background:#fee2e2;color:#991b1b;font-weight:700">${rawVal || '—'}</td>`
            : `<td>${row[h] ?? ''}</td>`;
          break;
        }
      }
    });
    html += '</tr>';
  });
  document.getElementById('table1').innerHTML = html + '</tbody></table>';
}

export function renderRawTable(containerId, results) {
  const h = results.meta.fields;
  let html = '<table><thead><tr>' + h.map(x => `<th>${x}</th>`).join('') + '</tr></thead><tbody>';
  results.data.forEach(row => { html += '<tr>' + h.map(x => `<td>${row[x] ?? ''}</td>`).join('') + '</tr>'; });
  document.getElementById(containerId).innerHTML = html + '</tbody></table>';
}
