// Números como vienen de Google Sheets en es-CL: " 1.234", "12,5", "6%", " -" (vacío).

// Los negativos pueden venir entre paréntesis, formato contable: "(3)" = -3.
export function numero(texto: string | undefined): number | null {
  let s = (texto ?? '').trim().replace(/[$%\s]/g, '')
  if (s === '' || /^[-–—]+$/.test(s)) return null
  const negativo = /^\(.*\)$/.test(s)
  if (negativo) s = s.slice(1, -1)
  const n = parseFloat(s.replace(/\./g, '').replace(',', '.'))
  return Number.isNaN(n) ? null : negativo ? -n : n
}

// Porcentaje en 0..100. La hoja a veces lo entrega como fracción (0,96) y a veces como "96%".
export function porcentaje(texto: string | undefined): number | null {
  const n = numero(texto)
  if (n === null) return null
  return (texto ?? '').includes('%') || n > 1.5 ? n : Math.round(n * 1000) / 10
}
