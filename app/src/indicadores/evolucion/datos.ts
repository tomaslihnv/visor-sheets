// Gráficos de la pestaña Evolución (además de la ocupación). Mismas reglas del visor anterior
// (render/charts/*.js); funciones puras que se prueban con las hojas reales.
import type { Fila } from '../../datos/hojas'
import { buscarColumna, normalizar, texto } from '../../datos/columnas'
import { claveDeFecha, etiquetaMes, mesActual, mesesEntre, type ClaveMes } from '../../datos/fechas'
import { numero } from '../../datos/numeros'
import { MOTIVOS } from '../../dominio/colores'
import type { Unidad } from '../../dominio/unidades'

export interface Rango { desde: ClaveMes; hasta: ClaveMes }


const encabezados = (filas: Fila[]) => Object.keys(filas[0] ?? {})
const colFecha = (filas: Fila[]) => buscarColumna(encabezados(filas), (k) => k === 'FECHA') ?? encabezados(filas)[0]
const mesDe = (f: Fila, col: string | null | undefined) => (col ? claveDeFecha(texto(f[col])) : null)

// Meses con datos de una hoja (por su columna de fecha), ordenados.
export function mesesConDatos(filas: Fila[], col = colFecha(filas)): ClaveMes[] {
  return [...new Set(filas.map((f) => mesDe(f, col)).filter((m): m is ClaveMes => !!m))].sort()
}

// Rango por defecto: del primer mes con datos hasta el mes actual (o el último con datos, si es posterior).
export function rangoPorDefecto(meses: ClaveMes[], hoy = new Date()): Rango {
  const actual = mesActual(hoy)
  return { desde: meses[0] ?? actual, hasta: meses.length && meses.at(-1)! > actual ? meses.at(-1)! : actual }
}

const conteoPorMes = (meses: ClaveMes[]) => Object.fromEntries(meses.map((m) => [m, 0])) as Record<ClaveMes, number>

// ── Nuevos arriendos netos (hoja Evolución) ────────────────────────────────────
export interface PuntoNetos { mes: ClaveMes; etiqueta: string; neto: number | null; real: boolean }

export function netosMensuales(evol: Fila[], rango: Rango, corte: ClaveMes): PuntoNetos[] {
  const h = encabezados(evol)
  const netos = buscarColumna(h, (k) => k === 'NUEVOS ARRIENDOS NETOS (REALES + FORECAST)', (k) => k.includes('NETO') && !k.includes('ACUMULADO'))
  const acumulado = buscarColumna(h, (k) => k === 'ARRIENDOS ACUMULADOS (REALES + FORECAST) (UN.)')
  const fecha = colFecha(evol)
  const filas = evol
    .map((f) => ({ f, mes: mesDe(f, fecha) }))
    .filter((x): x is { f: Fila; mes: ClaveMes } => !!x.mes)
    .sort((a, b) => (a.mes < b.mes ? -1 : 1))
  return filas.flatMap(({ f, mes }, i) => {
    if (mes < rango.desde || mes > rango.hasta) return []
    // Sin el neto, se deduce de la diferencia de arriendos acumulados.
    let neto = netos ? numero(f[netos]) : null
    if (neto === null && acumulado && i > 0) {
      const a = numero(f[acumulado]), b = numero(filas[i - 1].f[acumulado])
      if (a !== null && b !== null) neto = Math.round(a - b)
    }
    return [{ mes, etiqueta: etiquetaMes(mes), neto, real: mes < corte }]
  })
}

// ── Vencimientos y renewal rate (hoja Vencimientos) ────────────────────────────
const esRenovacion = (ev: string) => ev === 'R' || ev === 'R(CU)' || ev.toUpperCase().startsWith('R (')

function columnasVenc(venc: Fila[]) {
  const h = encabezados(venc)
  return {
    fecha: colFecha(venc),
    tipologia: buscarColumna(h, (k) => k.includes('TIPOLOG')),
    evento: buscarColumna(h, (k) => k.includes('EVENTO') && k.includes('TERMINO'), (k) => k.includes('EVENTO')),
  }
}

export const tipologiasDe = (filas: Fila[]) => {
  const col = buscarColumna(encabezados(filas), (k) => k.includes('TIPOLOG'))
  return col ? [...new Set(filas.map((f) => texto(f[col])).filter(Boolean))].sort() : []
}

export interface PuntoVencimientos { mes: ClaveMes; etiqueta: string; noRenovacion: number; renovacion: number; porDefinir: number; total: number }

export function vencimientos(venc: Fila[], rango: Rango, tipologia: string, hoy = new Date()): PuntoVencimientos[] {
  const c = columnasVenc(venc)
  const meses = mesesEntre(rango)
  const nr = conteoPorMes(meses), ren = conteoPorMes(meses), def = conteoPorMes(meses)
  const actual = mesActual(hoy)
  for (const f of venc) {
    const mes = mesDe(f, c.fecha)
    if (!mes || !(mes in nr)) continue
    if (tipologia && c.tipologia && texto(f[c.tipologia]) !== tipologia) continue
    const ev = c.evento ? texto(f[c.evento]) : ''
    if (ev === 'NR') nr[mes]++
    else if (esRenovacion(ev)) ren[mes]++
    else if (mes > actual && (!ev || ev === '-')) def[mes]++ // futuro sin decidir
  }
  return meses.map((mes) => ({ mes, etiqueta: etiquetaMes(mes), noRenovacion: nr[mes], renovacion: ren[mes], porDefinir: def[mes], total: nr[mes] + ren[mes] + def[mes] }))
}

export interface PuntoRenewal { mes: ClaveMes; etiqueta: string; pct: number | null; renovados: number; total: number }

// % de contratos que vencieron en el mes y se renovaron, sobre los que ya tienen evento registrado.
export function renewalRate(venc: Fila[], rango: Rango, tipologia: string): { puntos: PuntoRenewal[]; promedio: number | null } {
  const c = columnasVenc(venc)
  const meses = mesesEntre(rango)
  const ren = conteoPorMes(meses), tot = conteoPorMes(meses)
  for (const f of venc) {
    const mes = mesDe(f, c.fecha)
    if (!mes || !(mes in tot)) continue
    if (tipologia && c.tipologia && texto(f[c.tipologia]) !== tipologia) continue
    const ev = c.evento ? texto(f[c.evento]) : ''
    if (!ev) continue
    tot[mes]++
    if (ev === 'R' || ev.toUpperCase().startsWith('R (')) ren[mes]++
  }
  const puntos = meses.map((mes) => ({ mes, etiqueta: etiquetaMes(mes), renovados: ren[mes], total: tot[mes], pct: tot[mes] ? Math.round((ren[mes] / tot[mes]) * 1000) / 10 : null }))
  const validos = puntos.map((p) => p.pct).filter((v): v is number => v !== null)
  return { puntos, promedio: validos.length ? Math.round((validos.reduce((a, b) => a + b, 0) / validos.length) * 10) / 10 : null }
}

// ── Eventos de entrada y flujo (hoja I. Contratos + Salidas) ───────────────────
const sinEspacios = (k: string) => normalizar(k).replace(/[\s.]/g, '')

function columnasContratos(contratos: Fila[]) {
  const h = encabezados(contratos)
  const busca = (...p: ((k: string) => boolean)[]) => { for (const t of p) { const x = h.find((k) => t(sinEspacios(k))); if (x) return x } return null }
  return {
    entrada: busca((k) => k === 'EVENTODEENTRADA', (k) => k.includes('ENTRADA')),
    firma: busca((k) => k === 'FFIRMA', (k) => k.includes('FIRMA'), (k) => k === 'FINICIO', (k) => k.includes('INICIO'), (k) => k === 'FECHA'),
  }
}

export const mesesFirma = (contratos: Fila[]) => mesesConDatos(contratos, columnasContratos(contratos).firma ?? undefined)

// Las renovaciones "R (...)" se agrupan como "R".
const tipoEntrada = (v: string) => (v.trim().toUpperCase().startsWith('R (') ? 'R' : v.trim())

export function eventosEntrada(contratos: Fila[], rango: Rango): { tipos: string[]; puntos: ({ mes: ClaveMes; etiqueta: string } & Record<string, number | string>)[] } {
  const c = columnasContratos(contratos)
  const meses = mesesEntre(rango)
  if (!c.entrada || !c.firma) return { tipos: [], puntos: [] }
  const tipos = [...new Set(contratos.map((f) => tipoEntrada(f[c.entrada!] ?? '')).filter(Boolean))].sort()
  const conteo: Record<string, Record<ClaveMes, number>> = Object.fromEntries(tipos.map((t) => [t, conteoPorMes(meses)]))
  for (const f of contratos) {
    const mes = mesDe(f, c.firma)
    const t = tipoEntrada(f[c.entrada] ?? '')
    if (mes && t && conteo[t] && mes in conteo[t]) conteo[t][mes]++
  }
  return { tipos, puntos: meses.map((mes) => ({ mes, etiqueta: etiquetaMes(mes), ...Object.fromEntries(tipos.map((t) => [t, conteo[t][mes]])) })) }
}

export interface PuntoFlujo { mes: ClaveMes; etiqueta: string; nuevos: number; salidas: number; netos: number }

export function flujoContratos(contratos: Fila[], salidas: Fila[], rango: Rango): PuntoFlujo[] {
  const firma = columnasContratos(contratos).firma
  const fechaSal = salidas.length ? colFecha(salidas) : null
  const meses = mesesEntre(rango)
  const ent = conteoPorMes(meses), sal = conteoPorMes(meses)
  for (const f of contratos) { const m = mesDe(f, firma); if (m && m in ent) ent[m]++ }
  for (const f of salidas) { const m = mesDe(f, fechaSal); if (m && m in sal) sal[m]++ }
  return meses.map((mes) => ({ mes, etiqueta: etiquetaMes(mes), nuevos: ent[mes], salidas: sal[mes], netos: ent[mes] - sal[mes] }))
}

// ── Salidas (hoja Salidas) ─────────────────────────────────────────────────────
function columnasSalidas(sal: Fila[]) {
  const h = encabezados(sal)
  return {
    fecha: colFecha(sal),
    motivo: buscarColumna(h, (k) => k.includes('MOTIVO')),
    tipo: buscarColumna(h, (k) => k === 'TIPO'),
    tipologia: buscarColumna(h, (k) => k.includes('TIPOLOG')),
    desglose: buscarColumna(h, (k) => k === 'TIPO', (k) => k.includes('TERMINO'), (k) => k.includes('EVENTO')),
  }
}

export const tiposSalida = (sal: Fila[]) => {
  const c = columnasSalidas(sal).tipo
  return c ? [...new Set(sal.map((f) => texto(f[c])).filter(Boolean))].sort() : []
}

// Primero los motivos conocidos (en su orden), luego cualquier otro que aparezca en la hoja.
function listaMotivos(sal: Fila[], col: string | null): string[] {
  const enHoja = new Set(col ? sal.map((f) => texto(f[col])).filter(Boolean) : [])
  return [...MOTIVOS.filter((m) => enHoja.has(m)), ...[...enHoja].filter((m) => !MOTIVOS.includes(m)).sort()]
}

export function analisisSalidas(sal: Fila[], rango: Rango, tipo: string) {
  const c = columnasSalidas(sal)
  const meses = mesesEntre(rango)
  const filas = sal.filter((f) => !tipo || (c.tipo && texto(f[c.tipo]) === tipo))
  const motivos = listaMotivos(filas, c.motivo)
  const conteo: Record<string, Record<ClaveMes, number>> = Object.fromEntries(motivos.map((m) => [m, conteoPorMes(meses)]))
  for (const f of filas) {
    const mes = mesDe(f, c.fecha), m = c.motivo ? texto(f[c.motivo]) : ''
    if (mes && m && conteo[m] && mes in conteo[m]) conteo[m][mes]++
  }
  const conDatos = motivos.filter((m) => meses.some((mes) => conteo[m][mes] > 0))
  return {
    motivos: conDatos,
    puntos: meses.map((mes) => ({
      mes, etiqueta: etiquetaMes(mes),
      total: conDatos.reduce((s, m) => s + conteo[m][mes], 0),
      ...Object.fromEntries(conDatos.map((m) => [m, conteo[m][mes]])),
    })) as ({ mes: ClaveMes; etiqueta: string; total: number } & Record<string, number | string>)[],
  }
}

function clasificarSalida(v: string): 'noRenovacion' | 'anticipada' | null {
  const n = normalizar(v)
  if (n === 'NR' || n.includes('RENOV')) return 'noRenovacion'
  if (n === 'SA' || n.includes('ANTICIP')) return 'anticipada'
  return null
}

export interface PuntoDesglose { mes: ClaveMes; etiqueta: string; noRenovacion: number; anticipada: number; total: number }

export function desgloseSalidas(sal: Fila[], rango: Rango): PuntoDesglose[] {
  const c = columnasSalidas(sal)
  const meses = mesesEntre(rango)
  const nr = conteoPorMes(meses), sa = conteoPorMes(meses)
  for (const f of sal) {
    const mes = mesDe(f, c.fecha)
    const t = c.desglose ? clasificarSalida(texto(f[c.desglose])) : null
    if (!mes || !(mes in nr) || !t) continue
    if (t === 'noRenovacion') nr[mes]++
    else sa[mes]++
  }
  return meses.map((mes) => ({ mes, etiqueta: etiquetaMes(mes), noRenovacion: nr[mes], anticipada: sa[mes], total: nr[mes] + sa[mes] }))
}

export function motivosSalida(sal: Fila[], rango: Rango, filtros: { tipologia: string; tipo: string }): { motivo: string; n: number; pct: number }[] {
  const c = columnasSalidas(sal)
  const conteo = new Map<string, number>()
  let total = 0
  for (const f of sal) {
    const mes = mesDe(f, c.fecha)
    if (!mes || mes < rango.desde || mes > rango.hasta) continue
    if (filtros.tipologia && c.tipologia && texto(f[c.tipologia]) !== filtros.tipologia) continue
    if (filtros.tipo && c.tipo && texto(f[c.tipo]) !== filtros.tipo) continue
    const m = c.motivo ? texto(f[c.motivo]) : ''
    if (!m) continue
    conteo.set(m, (conteo.get(m) ?? 0) + 1)
    total++
  }
  return [...conteo].map(([motivo, n]) => ({ motivo, n, pct: Math.round((n / total) * 1000) / 10 })).sort((a, b) => b.n - a.n)
}

// ── Antigüedad de contratos vigentes (Estatus actual) ──────────────────────────
export const TRAMOS_ANTIGUEDAD = [
  { nombre: '< 6 meses', color: '#60a5fa' },
  { nombre: '6 – 12 meses', color: '#fbbf24' },
  { nombre: '> 12 meses', color: '#34d399' },
]

export function antiguedad(unidades: Iterable<Unidad>, tipo: string, hoy = new Date()) {
  const conteo = [0, 0, 0]
  const dia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime()
  for (const u of unidades) {
    if (u.categoria !== 'contrato' || (tipo && u.tipo !== tipo)) continue
    const f = u.firma
    if (!f) continue
    const dias = Math.round((dia - f.getTime()) / 86_400_000)
    conteo[dias < 180 ? 0 : dias < 365 ? 1 : 2]++
  }
  const total = conteo[0] + conteo[1] + conteo[2]
  return {
    tramos: TRAMOS_ANTIGUEDAD.map((t, i) => ({ ...t, n: conteo[i], pct: total ? Math.round((conteo[i] / total) * 100) : 0 })),
    total,
    anual: total ? Math.round((conteo[2] / total) * 100) : 0, // permanencia > 12 meses
    semestral: total ? Math.round(((conteo[1] + conteo[2]) / total) * 100) : 0, // > 6 meses
  }
}
