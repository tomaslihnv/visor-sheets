// Reparaciones: estado de cada unidad (hoja "Reparación") y contratos que vencen con reparaciones pendientes
// (hoja I. Contratos). Mismas reglas del visor anterior (render/auditoria.js).
import type { Fila } from '../datos/hojas'
import { normalizar, texto } from '../datos/columnas'
import { clave, claveDeFecha, etiquetaMes, mesActual, sumarMeses, type ClaveMes } from '../datos/fechas'
import { leerFecha } from './unidades'

export type EstadoReparacion = 'reparado' | 'proceso' | 'revisar' | 'danado'

export const ESTILO_REPARACION: Record<EstadoReparacion | 'sinDatos', { bg: string; borde: string; texto: string; nombre: string }> = {
  danado:   { bg: '#fee2e2', borde: '#fca5a5', texto: '#991b1b', nombre: 'Dañado' },
  revisar:  { bg: '#e2e8f0', borde: '#94a3b8', texto: '#334155', nombre: 'Por revisar' },
  proceso:  { bg: '#fef9c3', borde: '#fde047', texto: '#854d0e', nombre: 'En proceso' },
  reparado: { bg: '#d1fae5', borde: '#6ee7b7', texto: '#065f46', nombre: 'Reparado' },
  sinDatos: { bg: '#f0f4f8', borde: '#d1dae3', texto: '#8a9bb0', nombre: 'Sin datos' },
}

// "En proceso" manda sobre el estado; después "por revisar", "dañado" y "reparado".
export function estadoReparacion(f: Fila | undefined): EstadoReparacion | null {
  if (!f) return null
  const estado = texto(f['Estado'])
  const arreglo = texto(f['Arreglo']).toLowerCase()
  if (arreglo.includes('proceso') || arreglo.includes('process')) return 'proceso'
  if (/por\s*revisar/i.test(estado)) return 'revisar'
  if (/da[ñn]ado/i.test(estado)) return 'danado'
  if (/reparado/i.test(estado)) return 'reparado'
  return null
}

export const reparacionesPorUnidad = (rep: Fila[]) => new Map(rep.filter((f) => texto(f['Unidad'])).map((f) => [texto(f['Unidad']), f]))

// Encabezados de I. Contratos sin tildes, puntos ni espacios ("F. Término" -> "FTERMINO").
const compacta = (k: string) => normalizar(k).replace(/[\s.]/g, '')
function columna(claves: string[], ...pruebas: ((k: string) => boolean)[]) {
  for (const p of pruebas) { const c = claves.find((k) => p(compacta(k))); if (c) return c }
  return null
}

export interface Contrato { unidad: string; fila: Fila; termino: Date | null; titular: string; renta: string }

// Último contrato de cada unidad (las renovaciones vienen después en la hoja). Término: F. Término si tiene
// fecha real; si no, F. Venc.
export function ultimosContratos(contratos: Fila[]): Map<string, Contrato> {
  const mapa = new Map<string, Contrato>()
  if (!contratos.length) return mapa
  const k = Object.keys(contratos[0])
  const unidad = columna(k, (x) => x === 'DEPTO', (x) => x.includes('DEPTO'), (x) => x === 'UNIDAD', (x) => x === 'NO' || x === 'N')
  if (!unidad) return mapa
  const termino = columna(k, (x) => x === 'FTERMINO', (x) => x.includes('TERMINO'))
  const venc = columna(k, (x) => x === 'FVENC', (x) => x.includes('VENCIMIENTOSNETOS') || x.includes('VENCIMIENTO'), (x) => x === 'SALIDAS' || x === 'SALIDA', (x) => x.includes('VENC'))
  const titular = columna(k, (x) => x === 'NOMBRE', (x) => x.includes('NOMBRE'), (x) => x === 'TITULAR' || x.includes('TITULAR'), (x) => x.includes('ARREN'), (x) => x.includes('CLIENTE'))
  const renta = columna(k, (x) => x.includes('CANON') && x.includes('DPTO'), (x) => x.includes('CANON'), (x) => x === 'RENTA' || x.includes('RENTA'), (x) => x.includes('ARRIENDO'), (x) => x.startsWith('UF') || x.endsWith('UF'))
  const valor = (f: Fila, c: string | null) => { const v = c ? texto(f[c]) : ''; return /^[-–—]+$/.test(v) ? '' : v }
  // dd/mm/aaaa; si no, "oct-26" (primer día del mes), como el visor anterior.
  const fecha = (v: string) => { const d = leerFecha(v); if (d) return d; const m = claveDeFecha(v); return m ? new Date(+m.slice(0, 4), +m.slice(5) - 1, 1) : null }
  for (const f of contratos) {
    const u = valor(f, unidad)
    if (!u) continue
    mapa.set(u, { unidad: u, fila: f, termino: fecha(valor(f, termino) || valor(f, venc)), titular: valor(f, titular) || '—', renta: valor(f, renta) || '—' })
  }
  return mapa
}

const claveDe = (d: Date | null) => (d ? clave(d.getFullYear(), d.getMonth()) : null)

export interface MesVencimientos { mes: ClaveMes; etiqueta: string; danado: number; revisar: number; reparado: number }

// Próximos 12 meses: contratos que terminan cada mes, según el estado de reparación de su unidad (sin "en proceso").
export function vencimientosConReparaciones(rep: Fila[], contratos: Fila[], hoy = new Date()): MesVencimientos[] {
  const estados = reparacionesPorUnidad(rep)
  const meses = Array.from({ length: 12 }, (_, i) => sumarMeses(mesActual(hoy), i))
  const conteo = new Map(meses.map((m) => [m, { mes: m, etiqueta: etiquetaMes(m), danado: 0, revisar: 0, reparado: 0 }]))
  for (const c of ultimosContratos(contratos).values()) {
    const e = estadoReparacion(estados.get(c.unidad))
    const fila = conteo.get(claveDe(c.termino) ?? '')
    if (!e || e === 'proceso' || !fila) continue
    fila[e]++
  }
  return [...conteo.values()]
}

// Unidades cuyo contrato termina en el mes, con su estado de reparación (sin "en proceso").
export function detalleDelMes(rep: Fila[], contratos: Fila[], mes: ClaveMes) {
  const estados = reparacionesPorUnidad(rep)
  return [...ultimosContratos(contratos).values()]
    .map((c) => ({ ...c, estado: estadoReparacion(estados.get(c.unidad)) }))
    .filter((c): c is Contrato & { estado: EstadoReparacion } => !!c.estado && c.estado !== 'proceso' && claveDe(c.termino) === mes)
    .sort((a, b) => (parseInt(a.unidad) || 0) - (parseInt(b.unidad) || 0))
}

export const unidadesQueVencen = (contratos: Fila[], mes: ClaveMes) =>
  new Set([...ultimosContratos(contratos).values()].filter((c) => claveDe(c.termino) === mes).map((c) => c.unidad))
