// Cabecera de columnas del stacking: torre, número, tipología, sub-tipología, % de ocupación y orientación.
import { enRenta } from './categorias'
import type { Layout } from './layout'
import type { Unidad } from './unidades'

export interface InfoColumna {
  torre: string // "A"/"B" si las unidades terminan en letra (Tomás Moro); "" si no
  numero: number
  tipo: string
  sub2: string
  orientacion: string
  ocupacion: number | null // 0..1, sin pilotos
}

// Valor más frecuente: con plantas distintas (pisos 1 y 10 de Tomás Moro) "la primera unidad" puede no ser la típica.
function masFrecuente(valores: string[]): string {
  const c = new Map<string, number>()
  for (const v of valores) if (v) c.set(v, (c.get(v) ?? 0) + 1)
  return [...c].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
}

export function infoColumnas(layout: Layout, unidades: Map<string, Unidad>): Map<number, InfoColumna> {
  const porCol = new Map<number, string[]>()
  for (const p of layout.pisos) for (const c of p.celdas) porCol.set(c.c, [...(porCol.get(c.c) ?? []), c.n])

  const info = new Map<number, InfoColumna>()
  for (const [col, ns] of porCol) {
    const us = ns.map((n) => unidades.get(n)).filter((u): u is Unidad => !!u)
    const base = us.filter((u) => u.categoria !== 'piloto')
    info.set(col, {
      torre: masFrecuente(ns.map((n) => /^\d+([A-Z])$/.exec(n)?.[1] ?? '')),
      numero: (parseInt(ns[0]) || 0) % 100,
      tipo: masFrecuente(us.map((u) => u.tipo)),
      sub2: masFrecuente(us.map((u) => u.sub2)),
      orientacion: masFrecuente(us.map((u) => u.orientacion)),
      ocupacion: base.length ? base.filter((u) => enRenta(u.categoria)).length / base.length : null,
    })
  }
  return info
}

// Columnas donde empieza un nuevo tramo de orientación: ahí va una línea divisoria que baja por todos los pisos.
export function cambiosDeOrientacion(maxCol: number, info: Map<number, InfoColumna>): Set<number> {
  const s = new Set<number>()
  let previa: string | null | undefined
  for (let c = 1; c <= maxCol; c++) {
    const actual = info.get(c)?.orientacion ?? null
    if (c > 1 && actual !== previa) s.add(c)
    previa = actual
  }
  return s
}
