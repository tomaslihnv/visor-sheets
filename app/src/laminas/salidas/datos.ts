// Lámina "Análisis de salidas": evolución mensual (no renovación / salida anticipada), motivos del período y los
// textos de análisis, generados de los mismos datos. Lógica pura: la usan la vista web y la lámina de PowerPoint.
import type { Fila } from '../../datos/hojas'
import { etiquetaMesLarga, mesActual, sumarMeses, type ClaveMes } from '../../datos/fechas'
import { desgloseSalidas, mesesConDatos, motivosSalida, type PuntoDesglose } from '../../indicadores/evolucion/datos'

export const MESES_GRAFICO = 20

export interface Opciones { mesReporte: ClaveMes; desde: ClaveMes }

export interface LaminaSalidas {
  mesReporte: ClaveMes
  evolucion: PuntoDesglose[]
  motivos: { motivo: string; n: number; pct: number }[]
  totalPeriodo: number
  analisisEvolucion: string[]
  analisisMotivos: string[]
}

// Por defecto, el último mes con salidas que no sea futuro, y los 20 meses que terminan en él.
export function opcionesPorDefecto(sal: Fila[], hoy = new Date()): Opciones {
  const meses = mesesConDatos(sal).filter((m) => m <= mesActual(hoy))
  const mesReporte = meses.at(-1) ?? sumarMeses(mesActual(hoy), -1)
  return { mesReporte, desde: sumarMeses(mesReporte, -(MESES_GRAFICO - 1)) }
}

const pct = (v: number) => `${(Math.round(v * 10) / 10).toString().replace('.', ',')}%`
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function laminaSalidas(sal: Fila[], o: Opciones): LaminaSalidas {
  const evolucion = desgloseSalidas(sal, { desde: o.desde, hasta: o.mesReporte })
  const motivos = motivosSalida(sal, { desde: o.desde, hasta: o.mesReporte }, { tipologia: '', tipo: '' })
  const totalPeriodo = motivos.reduce((s, m) => s + m.n, 0)

  // Evolución: acumulado del año, el mes del reporte y la comparación con el mes anterior.
  const año = o.mesReporte.slice(0, 4)
  const delAño = desgloseSalidas(sal, { desde: `${año}-01`, hasta: o.mesReporte })
  const saAño = delAño.reduce((s, p) => s + p.anticipada, 0)
  const nrAño = delAño.reduce((s, p) => s + p.noRenovacion, 0)
  const mes = evolucion.find((p) => p.mes === o.mesReporte)
  const anterior = desgloseSalidas(sal, { desde: sumarMeses(o.mesReporte, -1), hasta: sumarMeses(o.mesReporte, -1) })[0]
  const nombreMes = capital(etiquetaMesLarga(o.mesReporte).split(' ')[0])
  const nombreAnterior = etiquetaMesLarga(sumarMeses(o.mesReporte, -1)).split(' ')[0]

  const analisisEvolucion: string[] = []
  if (saAño + nrAño === 0) analisisEvolucion.push(`No hay salidas registradas en ${año}.`)
  else analisisEvolucion.push(`En ${año} se acumulan ${plural(saAño + nrAño, 'salida', 'salidas')}: ${plural(saAño, 'anticipada', 'anticipadas')} y ${plural(nrAño, 'no renovación', 'no renovaciones')}.`)
  if (mes && mes.total > 0) {
    analisisEvolucion.push(`${nombreMes} registra ${plural(mes.total, 'salida', 'salidas')}; ${plural(mes.anticipada, 'es anticipada', 'son anticipadas')} (${pct((mes.anticipada / mes.total) * 100)} del mes).`)
  } else analisisEvolucion.push(`${nombreMes} no registra salidas.`)
  if (mes && anterior) {
    const a = anterior.anticipada, b = mes.anticipada
    analisisEvolucion.push(a === b
      ? `Las salidas anticipadas se mantienen respecto de ${nombreAnterior} (${b}).`
      : `Respecto de ${nombreAnterior}, las salidas anticipadas ${b > a ? 'aumentan' : 'bajan'} de ${a} a ${b}.`)
  }

  // Motivos: concentración en las dos primeras causas, la tercera y el resto.
  const analisisMotivos: string[] = []
  if (motivos.length >= 2) {
    const [m1, m2] = motivos
    analisisMotivos.push(`El ${pct(m1.pct + m2.pct)} de las salidas se concentra en ${m1.motivo.toLowerCase()} (${pct(m1.pct)}) y ${m2.motivo.toLowerCase()} (${pct(m2.pct)}).`)
  } else if (motivos.length === 1) analisisMotivos.push(`Todas las salidas del período son por ${motivos[0].motivo.toLowerCase()}.`)
  if (motivos.length >= 3) analisisMotivos.push(`${motivos[2].motivo} representa un ${pct(motivos[2].pct)}, la tercera causa.`)
  if (motivos.length > 3) {
    const resto = motivos.slice(3)
    analisisMotivos.push(`El resto (${resto.map((m) => m.motivo.toLowerCase()).join(', ')}) suma ${pct(resto.reduce((s, m) => s + m.pct, 0))}.`)
  }
  if (totalPeriodo) analisisMotivos.push(`Base: ${plural(totalPeriodo, 'salida', 'salidas')} con motivo en los últimos ${evolucion.length} meses.`)

  return { mesReporte: o.mesReporte, evolucion, motivos, totalPeriodo, analisisEvolucion, analisisMotivos }
}
