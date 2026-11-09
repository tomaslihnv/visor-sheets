// Lámina "Ocupación y arriendos netos": tabla de ingresos, salidas, neto y presupuesto por mes, y la ocupación
// real, presupuestada y proyectada contra la meta de 90%. Lógica pura: la usan la vista web y la lámina de PowerPoint.
import type { Fila } from '../../datos/hojas'
import { buscarColumna } from '../../datos/columnas'
import { claveDeFecha, etiquetaMes, mesActual, mesesEntre, sumarMeses, type ClaveMes } from '../../datos/fechas'
import { numero, porcentaje } from '../../datos/numeros'

export const META_OCUPACION = 90
// Columnas de la tabla: las que caben en la lámina. Los meses reales se completan hacia la derecha con la proyección.
export const COLUMNAS_TABLA = 12

export interface MesFlujo {
  mes: ClaveMes
  etiqueta: string
  ingresos: number
  salidas: number
  neto: number // ingresos − salidas
  presupuesto: number | null // neto presupuestado
  variacion: number | null // (neto − presupuesto) / |presupuesto|
  proyectado: boolean // después del mes del reporte: valores de forecast
}

export interface PuntoOcupacion {
  mes: ClaveMes
  etiqueta: string
  real: number | null // % de ocupación, hasta el mes del reporte
  presupuesto: number | null
  forecast: number | null // desde el mes del reporte (comparte ese punto con la real para que la línea siga)
}

export interface Opciones {
  mesReporte: ClaveMes
  mesesTabla: number // meses reales (terminando en el del reporte); el resto de las columnas es proyección
  desde: ClaveMes
  hasta: ClaveMes
}

export interface LaminaOcupacion {
  mesReporte: ClaveMes
  tabla: MesFlujo[]
  puntos: PuntoOcupacion[]
  totalUnidades: number | null
}

function columnas(filas: Fila[]) {
  const h = filas.length ? Object.keys(filas[0]) : []
  const exacta = (nombre: string) => buscarColumna(h, (k) => k === nombre)
  return {
    ingresos: exacta('NUEVOS ARRIENDOS REALES'),
    ingresosForecast: exacta('NUEVOS ARRIENDOS (REALES + FORECAST)'),
    salidasNoRenovacionForecast: exacta('SALIDAS X NO RENOVACION (REAL + FORECAST)'),
    salidasAnticipadasForecast: exacta('SALIDAS ANTICIPADAS (REAL + FORECAST)'),
    salidasNoRenovacion: exacta('SALIDAS X NO RENOVACION REALES'),
    salidasAnticipadas: exacta('SALIDAS ANTICIPADAS REALES'),
    presupuestoNeto: exacta('NUEVOS ARRIENDOS NETOS PRESUPUESTO'),
    realUn: exacta('ARRIENDOS ACUMULADOS REALES (UN.)'),
    presupuestoUn: exacta('ARRIENDOS ACUMULADOS PRESUPUESTO (UN.)'),
    forecastUn: exacta('ARRIENDOS ACUMULADOS (REALES + FORECAST) (UN.)'),
    forecastPct: exacta('ARRIENDOS ACUMULADOS (REALES + FORECAST) (%)'),
  }
}

const valor = (f: Fila, col: string | null) => (col ? numero(f[col]) : null)

function porMes(filas: Fila[]): Map<ClaveMes, Fila> {
  const m = new Map<ClaveMes, Fila>()
  for (const f of filas) {
    const k = claveDeFecha(f['Fecha'] ?? '')
    if (k) m.set(k, f)
  }
  return m
}


// La hoja trae el % redondeado a entero (5 de 291 aparece como 0%). Se estima el total de unidades con el punto
// de mayor %, donde el redondeo pesa menos, y la ocupación se calcula con las unidades.
export function estimarTotalUnidades(filas: Fila[]): number | null {
  const c = columnas(filas)
  let total: number | null = null
  let mejor = 0
  for (const f of filas) {
    const u = valor(f, c.forecastUn)
    const p = c.forecastPct ? porcentaje(f[c.forecastPct]) : null
    if (u && p && p > mejor) { mejor = p; total = Math.round(u / (p / 100)) }
  }
  return total
}

// Por defecto, el último mes con datos reales que no sea futuro (el mes en curso suele venir vacío).
export function opcionesPorDefecto(filas: Fila[], hoy = new Date()): Opciones | null {
  const c = columnas(filas)
  const meses = [...porMes(filas)].sort(([a], [b]) => (a < b ? -1 : 1))
  if (!meses.length) return null
  const conReal = meses.filter(([m, f]) => m <= mesActual(hoy) && valor(f, c.realUn) !== null)
  const mesReporte = (conReal.at(-1) ?? meses[0])[0]
  const primero = meses[0][0]
  const desde = sumarMeses(mesReporte, -11) > primero ? sumarMeses(mesReporte, -11) : primero
  return { mesReporte, mesesTabla: 6, desde, hasta: meses.at(-1)![0] }
}

export function laminaOcupacion(filas: Fila[], o: Opciones): LaminaOcupacion {
  const c = columnas(filas)
  const mapa = porMes(filas)
  const total = estimarTotalUnidades(filas)
  const pct = (u: number | null) => (u === null || !total ? null : (u / total) * 100)

  const tabla: MesFlujo[] = []
  for (let i = -(o.mesesTabla - 1); tabla.length < COLUMNAS_TABLA; i++) {
    const mes = sumarMeses(o.mesReporte, i)
    if (i > 0 && !mapa.has(mes) && mes > [...mapa.keys()].sort().at(-1)!) break // se acabó la hoja
    const f = mapa.get(mes)
    if (!f) continue
    const proyectado = i > 0
    // Una celda vacía es cero (no hubo ingresos o salidas ese mes).
    const ingresos = valor(f, proyectado ? c.ingresosForecast : c.ingresos) ?? 0
    const salidas = proyectado
      ? (valor(f, c.salidasNoRenovacionForecast) ?? 0) + (valor(f, c.salidasAnticipadasForecast) ?? 0)
      : (valor(f, c.salidasNoRenovacion) ?? 0) + (valor(f, c.salidasAnticipadas) ?? 0)
    const neto = ingresos - salidas
    const presupuesto = valor(f, c.presupuestoNeto)
    tabla.push({
      mes, etiqueta: etiquetaMes(mes), ingresos, salidas, neto, presupuesto, proyectado,
      variacion: presupuesto ? (neto - presupuesto) / Math.abs(presupuesto) : null,
    })
  }

  // Todos los meses del período: el usuario puede extenderlo más allá de la hoja (esos meses quedan vacíos).
  const puntos: PuntoOcupacion[] = mesesEntre(o).map((mes) => {
    const f = mapa.get(mes)
    return {
      mes,
      etiqueta: etiquetaMes(mes),
      real: f && mes <= o.mesReporte ? pct(valor(f, c.realUn)) : null,
      presupuesto: f ? pct(valor(f, c.presupuestoUn)) : null,
      forecast: f && mes >= o.mesReporte ? pct(valor(f, c.forecastUn)) : null,
    }
  })

  return { mesReporte: o.mesReporte, tabla, puntos, totalUnidades: total }
}

export const formatoPct = (v: number | null) => (v === null ? '—' : `${Math.round(v)}%`)
export const formatoVariacion = (v: number | null) => (v === null ? '—' : `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`)
export const formatoNumero = (v: number | null) => (v === null ? '—' : v.toLocaleString('es-CL'))
