// Estacionamientos (hoja EST) y bodegas (hoja BOD).
import type { Fila } from '../datos/hojas'
import { buscarColumna, texto } from '../datos/columnas'
import { numero } from '../datos/numeros'
import { categoriaBodega, categoriaEstacionamiento, type Categoria } from './categorias'

export interface Estacionamiento {
  n: string
  piso: number | null
  categoria: Categoria
  grupo: 'auto' | 'moto' | 'inhab'
  tandem: boolean
  titular: string
  depto: string
  destino: string
  canon: number | null
  ggcc: number | null
}

export interface Bodega {
  n: string
  piso: number | null
  categoria: Categoria
  titular: string
  depto: string
  canon: number | null
  ggcc: number | null
}

const esNumero = (k: string) => k === 'N°' || k === 'Nº' || k === 'N' || k === '#' || k === 'NUMERO' || k === 'N.'
const piso = (v: string | undefined) => { const p = parseInt(texto(v)); return Number.isNaN(p) ? null : p }

export function construirEstacionamientos(filas: Fila[]): Estacionamiento[] {
  if (!filas.length) return []
  const h = Object.keys(filas[0])
  const b = (...p: ((k: string) => boolean)[]) => buscarColumna(h, ...p)
  const c = {
    n: b(esNumero) ?? h[0],
    piso: b((k) => k === 'PISO') ?? 'Piso',
    tandem: b((k) => k === 'TANDEM') ?? 'Tandem',
    destino: b((k) => k === 'DESTINO') ?? 'Destino',
    tipo: b((k) => k === 'TIPO') ?? 'Tipo',
    depto: b((k) => k.startsWith('DEPTO')) ?? 'Depto.',
    canon: b((k) => k.includes('CANON') && k.includes('ESTAC')) ?? 'Canon Estac.',
    ggcc: b((k) => k.includes('GGCC') && k.includes('ESTAC')) ?? 'GGCC Estac.',
    estatus: b((k) => k === 'ESTATUS') ?? 'Estatus',
    titular: b((k) => k === 'TITULAR' || k === 'ARRENDATARIO') ?? 'Titular',
  }
  return filas.map((f) => {
    const e = { n: texto(f[c.n]), estatus: texto(f[c.estatus]), titular: texto(f[c.titular]), destino: texto(f[c.destino]) }
    const categoria = categoriaEstacionamiento(e)
    // Moto: por Destino (visor anterior) o por Tipo (hojas que lo traen en esa columna, como Tomás Moro).
    const moto = `${e.destino} ${texto(f[c.tipo])}`.toUpperCase().includes('MOTO')
    return {
      ...e,
      piso: piso(f[c.piso]),
      categoria,
      grupo: categoria === 'inhabilitado' ? 'inhab' : moto ? 'moto' : 'auto',
      tandem: texto(f[c.tandem]).toUpperCase() === 'SI',
      depto: texto(f[c.depto]),
      canon: numero(f[c.canon]),
      ggcc: numero(f[c.ggcc]),
    }
  })
}

export function construirBodegas(filas: Fila[]): Bodega[] {
  if (!filas.length) return []
  const h = Object.keys(filas[0])
  const b = (...p: ((k: string) => boolean)[]) => buscarColumna(h, ...p)
  const c = {
    n: b(esNumero) ?? h[0],
    piso: b((k) => k === 'PISO') ?? 'Piso',
    estatus: b((k) => k === 'ESTATUS') ?? 'Estatus',
    titular: b((k) => k === 'TITULAR' || k === 'ARRENDATARIO') ?? 'Titular',
    depto: b((k) => k.startsWith('DEPTO')) ?? 'Depto.',
    canon: b((k) => k.includes('CANON') && k.includes('BOD')) ?? 'Canon Bod.',
    ggcc: b((k) => k.includes('GGCC') && k.includes('BOD')) ?? 'GGCC Bod.',
  }
  return filas.map((f) => ({
    n: texto(f[c.n]),
    piso: piso(f[c.piso]),
    categoria: categoriaBodega(texto(f[c.estatus])),
    titular: texto(f[c.titular]),
    depto: texto(f[c.depto]),
    canon: numero(f[c.canon]),
    ggcc: numero(f[c.ggcc]),
  }))
}

const porNumero = <T extends { n: string }>(a: T, b: T) => (parseInt(a.n) || 0) - (parseInt(b.n) || 0)

export interface PisoSubterraneo {
  piso: number
  autos: Estacionamiento[]
  motos: Estacionamiento[]
  inhab: Estacionamiento[]
  bodegas: Bodega[]
}

// Pisos con estacionamientos (el piso sale de la columna Piso de EST: también los de superficie, p. ej. visitas
// en el 1) y los subterráneos con bodegas, del más alto al más profundo. Las bodegas de pisos sobre el suelo van
// al lado del edificio (bodegasPorPiso), no aquí.
export function pisosSubterraneo(estac: Estacionamiento[], bodegas: Bodega[]): PisoSubterraneo[] {
  const conPiso = [...estac, ...bodegas.filter((b) => b.piso !== null && b.piso < 0)].map((x) => x.piso)
  const pisos = [...new Set(conPiso.filter((p): p is number => p !== null))].sort((a, b) => b - a)
  return pisos.map((p) => {
    const del = estac.filter((e) => e.piso === p).sort(porNumero)
    return {
      piso: p,
      autos: del.filter((e) => e.grupo === 'auto'),
      motos: del.filter((e) => e.grupo === 'moto'),
      inhab: del.filter((e) => e.grupo === 'inhab'),
      bodegas: p < 0 ? bodegas.filter((b) => b.piso === p).sort(porNumero) : [],
    }
  })
}

// Bodegas de pisos sobre el suelo: van a la derecha de cada piso del edificio.
export function bodegasPorPiso(bodegas: Bodega[]): Map<number, Bodega[]> {
  const m = new Map<number, Bodega[]>()
  for (const b of bodegas) if (b.piso !== null && b.piso > 0) m.set(b.piso, [...(m.get(b.piso) ?? []), b])
  for (const [p, l] of m) m.set(p, l.sort(porNumero))
  return m
}
