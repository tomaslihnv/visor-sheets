// Filtros del stacking. Una unidad que no pasa queda atenuada (no desaparece), igual que en el visor anterior.
import { enRenta, type Categoria } from './categorias'
import type { Unidad } from './unidades'
import type { Bodega, Estacionamiento } from './subterraneo'

export type TipoBien = 'todos' | 'departamentos' | 'estacionamientos' | 'bodegas'
export type EstadoFiltro = 'todas' | 'contratos' | 'en-renta' | 'vacantes' | 'inhabilitadas'

export interface Filtros {
  bien: TipoBien
  estado: EstadoFiltro
  tipo: string
  sub1: string
  sub2: string
  orientaciones: string[]
  vencHasta: number | null // contratos que vencen en ≤ N días; null = sin filtro
  uf: [number, number] | null // canon UF/m² de los contratos; null = sin filtro
}

export const FILTROS_INICIALES: Filtros = { bien: 'todos', estado: 'todas', tipo: '', sub1: '', sub2: '', orientaciones: [], vencHasta: null, uf: null }

function pasaEstado(c: Categoria, estado: EstadoFiltro, admiteInhab: boolean): boolean {
  switch (estado) {
    case 'contratos': return c === 'contrato'
    case 'en-renta': return enRenta(c)
    case 'vacantes': return c === 'vacante'
    case 'inhabilitadas': return admiteInhab && c === 'inhabilitado'
    default: return c !== 'inhabilitado' // ocultos por defecto
  }
}

// Todo menos el rango de UF: también define el rango que ofrece ese control.
function pasaSinUF(u: Unidad | undefined, f: Filtros): boolean {
  if (f.bien !== 'todos' && f.bien !== 'departamentos') return false
  if (!pasaEstado(u?.categoria ?? 'default', f.estado, false)) return false
  if (!u) return true
  if (f.tipo && u.tipo !== f.tipo) return false
  if (f.sub1 && u.sub1 !== f.sub1) return false
  if (f.sub2 && u.sub2 !== f.sub2) return false
  if (f.orientaciones.length && !f.orientaciones.includes(u.orientacion)) return false
  if (f.vencHasta !== null && u.categoria === 'contrato' && !(u.diasRemanentes !== null && u.diasRemanentes <= f.vencHasta)) return false
  return true
}

export function unidadVisible(u: Unidad | undefined, f: Filtros): boolean {
  if (!pasaSinUF(u, f)) return false
  if (f.uf && u?.categoria === 'contrato') return u.canonUFm2 !== null && u.canonUFm2 >= f.uf[0] && u.canonUFm2 <= f.uf[1]
  return true
}

export const estacVisible = (e: Estacionamiento, f: Filtros) =>
  (f.bien === 'todos' || f.bien === 'estacionamientos') && pasaEstado(e.categoria, f.estado, true)

export const bodegaVisible = (b: Bodega, f: Filtros) =>
  (f.bien === 'todos' || f.bien === 'bodegas') && pasaEstado(b.categoria, f.estado, false)

const redondeo = (v: number, hacia: 'abajo' | 'arriba') => (hacia === 'abajo' ? Math.floor(v * 100) : Math.ceil(v * 100)) / 100

// Rango de canon UF/m² entre las unidades que pasan los demás filtros: el control se acota a lo visible.
export function rangoUF(unidades: Iterable<Unidad>, f: Filtros): [number, number] | null {
  const v = [...unidades].filter((u) => u.canonUFm2 !== null && pasaSinUF(u, f)).map((u) => u.canonUFm2!)
  return v.length ? [redondeo(Math.min(...v), 'abajo'), redondeo(Math.max(...v), 'arriba')] : null
}

export function rangoVencimiento(unidades: Iterable<Unidad>): [number, number] | null {
  const v = [...unidades].filter((u) => u.categoria === 'contrato' && u.diasRemanentes !== null).map((u) => u.diasRemanentes!)
  return v.length ? [Math.min(...v), Math.max(...v)] : null
}

// Opciones de los selectores de tipología, en orden alfabético.
export function opcionesTipologia(unidades: Iterable<Unidad>) {
  const s = { tipo: new Set<string>(), sub1: new Set<string>(), sub2: new Set<string>() }
  for (const u of unidades) {
    if (u.tipo) s.tipo.add(u.tipo)
    if (u.sub1) s.sub1.add(u.sub1)
    if (u.sub2) s.sub2.add(u.sub2)
  }
  return { tipo: [...s.tipo].sort(), sub1: [...s.sub1].sort(), sub2: [...s.sub2].sort() }
}
