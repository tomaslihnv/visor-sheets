// Lámina "Stacking plan": el plano del edificio (se dibuja con las mismas reglas del visor) y los textos de
// ocupación y vacancia. Lógica pura: la usan la vista web y la lámina de PowerPoint.
import type { Fila } from '../../datos/hojas'
import { buscarColumna } from '../../datos/columnas'
import { claveDeFecha, mesActual, type ClaveMes } from '../../datos/fechas'
import { numero } from '../../datos/numeros'
import type { Layout } from '../../dominio/layout'
import type { Unidad } from '../../dominio/unidades'
import type { Bodega, Estacionamiento } from '../../dominio/subterraneo'
import { metricasDeptos, metricasSimple } from '../../dominio/metricas'

// Dificultad de colocación de una vacante según los días que lleva desocupada.
// ponytail: criterio provisorio (no está en las hojas); ajustar los umbrales o reemplazarlo si el equipo usa otro.
export const DIFICULTAD = [
  { clave: 'alta', nombre: 'Dificultad alta', desde: 91 },
  { clave: 'media', nombre: 'Dificultad media', desde: 31 },
  { clave: 'baja', nombre: 'Dificultad baja', desde: 0 },
] as const

export interface Linea { texto: string; sub?: boolean; destacado?: string } // `destacado`: parte en negrita al inicio

export interface LaminaStacking {
  mesReporte: ClaveMes
  // Lo que dibuja el plano.
  unidades: Map<string, Unidad>
  estac: Estacionamiento[]
  bodegas: Bodega[]
  firmadas: number
  ocupacion: number | null
  velocidad: number | null // unidades netas al mes, histórico
  analisisOcupacion: Linea[]
  analisisVacancia: Linea[]
}

const tipoCorto = (t: string) => t.split('-')[0] || '—' // "1D-1B" -> "1D"
const pct = (v: number) => `${(Math.round(v * 1000) / 10).toString().replace('.', ',')}%`
const listaY = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)
// Listas largas de unidades se cortan para que quepan en la lámina.
const unidadesEn = (ns: string[], max = 30) => (ns.length > max ? `${ns.slice(0, max).join(', ')} y ${ns.length - max} más` : ns.join(', '))
const uno = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`

// Velocidad de arriendo histórica (neta): arriendos acumulados reales al mes del reporte / meses con datos reales.
export function velocidadArriendo(evol: Fila[], mesReporte: ClaveMes): number | null {
  if (!evol.length) return null
  const col = buscarColumna(Object.keys(evol[0]), (k) => k === 'ARRIENDOS ACUMULADOS REALES (UN.)')
  if (!col) return null
  const reales = evol
    .map((f) => ({ mes: claveDeFecha(f['Fecha'] ?? ''), v: numero(f[col]) }))
    .filter((x): x is { mes: ClaveMes; v: number } => !!x.mes && x.v !== null && x.mes <= mesReporte)
    .sort((a, b) => (a.mes < b.mes ? -1 : 1))
  return reales.length ? reales.at(-1)!.v / reales.length : null
}

export const CRITERIO_DIFICULTAD = 'Dificultad según días vacante: alta, más de 90; media, 31 a 90; baja, 30 o menos.'

export function laminaStacking(e: { nombre: string; layout: Layout }, unidades: Map<string, Unidad>, estac: Estacionamiento[], bodegas: Bodega[], evol: Fila[], hoy = new Date()): LaminaStacking {
  const mesReporte = mesActual(hoy)
  const d = metricasDeptos(e.layout, unidades)
  const m = metricasSimple(estac)
  const b = metricasSimple(bodegas)
  const velocidad = velocidadArriendo(evol, mesReporte)

  const analisisOcupacion: Linea[] = [
    { texto: `${e.nombre} tiene a la fecha ${uno(d.enRenta, 'unidad firmada', 'unidades firmadas')}: ${d.ocupacion === null ? '—' : pct(d.ocupacion)} de ocupación, neta de pilotos.` },
  ]
  if (velocidad !== null) analisisOcupacion.push({ texto: `La velocidad de arriendo histórica (neta) es de ${velocidad.toFixed(1).replace('.', ',')} unidades al mes.` })
  if (m.total) analisisOcupacion.push({ texto: `Los estacionamientos están al ${pct(m.ocupacion!)} de ocupación, con ${uno(m.vacantes, 'disponible', 'disponibles')}.` })
  if (b.total) analisisOcupacion.push({ texto: `Las bodegas están al ${pct(b.ocupacion!)} de ocupación.` })

  // Vacantes: por tipología y por dificultad de colocación (líneas = columnas del plano).
  const vacantes = [...unidades.values()].filter((u) => u.categoria === 'vacante' && e.layout.pisos.some((p) => p.celdas.some((c) => c.n === u.n)))
  const porTipo = new Map<string, number>()
  for (const u of vacantes) porTipo.set(tipoCorto(u.tipo), (porTipo.get(tipoCorto(u.tipo)) ?? 0) + 1)
  const analisisVacancia: Linea[] = []
  if (!vacantes.length) analisisVacancia.push({ texto: 'No hay unidades vacantes.' })
  else {
    const tipos = [...porTipo].sort((a, b) => a[0].localeCompare(b[0])).map(([t, n]) => `${n} (${t})`)
    analisisVacancia.push({ destacado: uno(vacantes.length, 'unidad vacante', 'unidades vacantes'), texto: ` | ${listaY(tipos)}` })
    const columna = (u: Unidad) => (parseInt(u.n) || 0) % 100
    for (const nivel of DIFICULTAD) {
      const hasta = DIFICULTAD[DIFICULTAD.indexOf(nivel) - 1]?.desde
      const del = vacantes.filter((u) => u.diasVacante !== null && u.diasVacante >= nivel.desde && (hasta === undefined || u.diasVacante < hasta))
      if (!del.length) continue
      const lineas = [...new Set(del.map(columna))].sort((a, b) => a - b)
      analisisVacancia.push({ destacado: `${nivel.nombre} (${del.length} un.)`, texto: ` | ${lineas.length === 1 ? 'Línea' : 'Líneas'} ${listaY(lineas.map(String))}` })
      analisisVacancia.push({ sub: true, texto: `Unidades: ${unidadesEn(del.map((u) => u.n).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0)))}` })
    }
    const sinFecha = vacantes.filter((u) => u.diasVacante === null)
    if (sinFecha.length) analisisVacancia.push({ destacado: `Sin fecha de salida (${sinFecha.length} un.)`, texto: `: ${unidadesEn(sinFecha.map((u) => u.n))}` })
  }

  return { mesReporte, unidades, estac, bodegas, firmadas: d.enRenta, ocupacion: d.ocupacion, velocidad, analisisOcupacion, analisisVacancia }
}
