// Conteos y ocupación de la leyenda del stacking. Mismas reglas del visor anterior (metrics.js).
import type { Fila } from '../datos/hojas'
import { buscarColumna } from '../datos/columnas'
import { claveDeFecha, mesActual } from '../datos/fechas'
import { numero, porcentaje } from '../datos/numeros'
import { enRenta } from './categorias'
import { unidadesDelLayout, type Layout } from './layout'
import type { Unidad } from './unidades'
import type { Bodega, Estacionamiento } from './subterraneo'

export const NOMBRE_ORIENTACION: Record<string, string> = { N: 'Norte', S: 'Sur', O: 'Oriente', P: 'Poniente' }

export interface MetricasDeptos {
  contratos: number
  rentaCorta: number
  vacantes: number
  pilotos: number
  enRenta: number
  base: number // sin pilotos: es el denominador de la ocupación
  ocupacion: number | null // 0..1
  tipologias: { tipo: string; total: number; arrendadas: number }[]
  orientaciones: { orientacion: string; total: number; arrendadas: number }[]
}

export function metricasDeptos(layout: Layout, unidades: Map<string, Unidad>): MetricasDeptos {
  const c = { contrato: 0, rc: 0, vacante: 0, piloto: 0 }
  const tip = new Map<string, { total: number; arrendadas: number }>()
  const ori = new Map<string, { total: number; arrendadas: number }>()
  for (const n of unidadesDelLayout(layout)) {
    const u = unidades.get(n)
    const cat = u?.categoria ?? 'default'
    if (cat in c) c[cat as keyof typeof c]++
    if (!u || cat === 'piloto' || cat === 'default') continue
    const t = tip.get(u.tipo || '—') ?? { total: 0, arrendadas: 0 }
    t.total++
    if (enRenta(cat)) t.arrendadas++
    tip.set(u.tipo || '—', t)
    if (u.orientacion) {
      const o = ori.get(u.orientacion) ?? { total: 0, arrendadas: 0 }
      o.total++
      if (enRenta(cat)) o.arrendadas++
      ori.set(u.orientacion, o)
    }
  }
  const arrendadas = c.contrato + c.rc
  const base = arrendadas + c.vacante
  return {
    contratos: c.contrato, rentaCorta: c.rc, vacantes: c.vacante, pilotos: c.piloto,
    enRenta: arrendadas, base,
    ocupacion: base ? arrendadas / base : null,
    tipologias: [...tip].map(([tipo, v]) => ({ tipo, ...v })).sort((a, b) => b.total - a.total),
    orientaciones: [...ori].map(([orientacion, v]) => ({ orientacion, ...v })).sort((a, b) => b.total - a.total),
  }
}

export interface MetricasSimple { arrendadas: number; vacantes: number; total: number; ocupacion: number | null }

// EST solo trae estacionamientos arrendables, así que la ocupación es arrendados / total de la hoja.
export function metricasSimple(lista: (Estacionamiento | Bodega)[]): MetricasSimple {
  const arrendadas = lista.filter((x) => x.categoria === 'contrato').length
  return { arrendadas, vacantes: lista.length - arrendadas, total: lista.length, ocupacion: lista.length ? arrendadas / lista.length : null }
}

// Proyección del mes actual según la hoja Evolución.
export function proyeccionDelMes(evolucion: Fila[], hoy = new Date()) {
  if (!evolucion.length) return null
  const h = Object.keys(evolucion[0])
  const fila = evolucion.find((f) => claveDeFecha(f['Fecha'] ?? '') === mesActual(hoy))
  if (!fila) return null
  const netos = buscarColumna(h, (k) => k.includes('NETO') && k.includes('FORECAST') && !k.includes('ACUMULADO'))
  return {
    pct: porcentaje(fila['Arriendos acumulados (reales + forecast) (%)']),
    unidades: numero(fila['Arriendos acumulados (reales + forecast) (un.)']),
    netos: netos ? numero(fila[netos]) : null,
  }
}
