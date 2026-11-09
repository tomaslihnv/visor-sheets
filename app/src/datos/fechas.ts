// Fechas de la hoja Evolución: "oct-26", "sept-29", "ene-27" (o dd/mm/aaaa).

const MESES: Record<string, number> = { ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5, jul: 6, ago: 7, sep: 8, sept: 8, oct: 9, nov: 10, dic: 11 }
const NOMBRES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Mes como 'AAAA-MM' (se compara como texto, igual que <input type="month">).
export type ClaveMes = string

export function claveDeFecha(texto: string): ClaveMes | null {
  const s = texto.trim().toLowerCase()
  const m = s.match(/^([a-z]{3,4})[.\-/](\d{2,4})$/)
  if (m && m[1] in MESES) {
    const año = +m[2] < 100 ? 2000 + +m[2] : +m[2]
    return clave(año, MESES[m[1]])
  }
  const p = s.split('/')
  if (p.length === 3 && +p[1] >= 1 && +p[1] <= 12) {
    const año = +p[2] < 100 ? 2000 + +p[2] : +p[2]
    return clave(año, +p[1] - 1)
  }
  return null
}

export const clave = (año: number, mes0: number): ClaveMes => `${año}-${String(mes0 + 1).padStart(2, '0')}`

export const mesActual = (hoy = new Date()): ClaveMes => clave(hoy.getFullYear(), hoy.getMonth())

// 'AAAA-MM' -> "oct-26"
export function etiquetaMes(c: ClaveMes): string {
  const [a, m] = c.split('-')
  return `${NOMBRES[+m - 1]}-${a.slice(2)}`
}

const NOMBRES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// 'AAAA-MM' -> "octubre 2026"
export function etiquetaMesLarga(c: ClaveMes): string {
  const [a, m] = c.split('-')
  return `${NOMBRES_LARGOS[+m - 1]} ${a}`
}

export function sumarMeses(m: ClaveMes, n: number): ClaveMes {
  const [a, mm] = m.split('-').map(Number)
  const d = new Date(a, mm - 1 + n, 1)
  return clave(d.getFullYear(), d.getMonth())
}

// Todos los meses de un período, aunque la hoja no los tenga (tope de 50 años por seguridad).
export function mesesEntre({ desde, hasta }: { desde: ClaveMes; hasta: ClaveMes }): ClaveMes[] {
  const out: ClaveMes[] = []
  for (let m = desde; m <= hasta && out.length < 600; m = sumarMeses(m, 1)) out.push(m)
  return out
}
