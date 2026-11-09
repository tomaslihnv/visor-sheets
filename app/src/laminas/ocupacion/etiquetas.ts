// Qué etiquetas lleva el gráfico de ocupación (la meta de 90% va aparte, fija al extremo derecho de su línea).
import type { Etiqueta } from '../etiquetas'
import { formatoPct, type LaminaOcupacion } from './datos'

export function etiquetasOcupacion(l: LaminaOcupacion, colores: { texto: string; presupuesto: string }) {
  const iReporte = l.puntos.findIndex((p) => p.mes === l.mesReporte)
  const iUltimo = l.puntos.length - 1
  const etiquetas: Etiqueta[] = []
  const puntos: { i: number; v: number }[] = []

  l.puntos.forEach((p, i) => {
    if (p.real === null) return
    puntos.push({ i, v: p.real })
    // La del mes del reporte siempre; las anteriores si caben.
    etiquetas.push({ id: `real-${i}`, i, v: p.real, texto: formatoPct(p.real), color: colores.texto, prioridad: i === iReporte ? 0 : 2 })
  })
  const ppto = l.puntos[iReporte]?.presupuesto
  if (ppto != null) etiquetas.push({ id: 'ppto', i: iReporte, v: ppto, texto: formatoPct(ppto), color: colores.presupuesto, prioridad: 1 })
  const forecast = l.puntos[iUltimo]?.forecast
  if (iUltimo !== iReporte && forecast != null) {
    puntos.push({ i: iUltimo, v: forecast })
    etiquetas.push({ id: 'forecast', i: iUltimo, v: forecast, texto: formatoPct(forecast), color: colores.texto, prioridad: 0 })
  }
  return { etiquetas, puntos }
}
