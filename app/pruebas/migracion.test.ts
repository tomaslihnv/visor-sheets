// Irarrázaval y Echaurren pasan a la app nueva: sus números tienen que coincidir con los del visor anterior.
// Se comparan con los módulos del visor anterior (anterior/src/*.js) sobre las mismas hojas (anonimizadas).
import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { EDIFICIOS } from '../src/edificios'
import { unidadesDelLayout } from '../src/dominio/layout'
import { construirUnidades } from '../src/dominio/unidades'
import { construirBodegas, construirEstacionamientos } from '../src/dominio/subterraneo'
import { metricasDeptos, metricasSimple } from '../src/dominio/metricas'
import { analisisSalidas, desgloseSalidas, renewalRate, vencimientos } from '../src/indicadores/evolucion/datos'
// @ts-expect-error módulos JS del visor anterior, sin tipos
import { getBodegaCategory, getCategory, getParkingCategory } from '../../anterior/src/categories.js'
// @ts-expect-error idem
import { resolveBodegaColumns, resolveParkingColumns } from '../../anterior/src/columns.js'
// @ts-expect-error idem
import { LAYOUTS } from '../../anterior/src/config.js'

const leer = (f: string) => Papa.parse<Fila>(readFileSync(new URL(`./datos/${f}`, import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data
const hoy = new Date(2026, 10, 9)

describe.each(['irr', 'ech'])('migración de %s', (id) => {
  const edificio = EDIFICIOS.find((e) => e.id === id)!
  const estatus = leer(`${id}_estatus.csv`)
  const est = leer(`${id}_est.csv`)
  const bod = leer(`${id}_bod.csv`)
  const unidades = construirUnidades(estatus, {}, hoy)

  it('el layout es el mismo del visor anterior y todas sus unidades están en Estatus actual', () => {
    const viejo = (LAYOUTS[id] as { p: number; cells: { n: number }[] }[]).flatMap((f) => f.cells.map((c) => String(c.n)))
    expect(unidadesDelLayout(edificio.layout)).toEqual(viejo)
    expect(unidadesDelLayout(edificio.layout).filter((n) => !unidades.has(n))).toEqual([])
  })

  it('mismos conteos de departamentos que el visor anterior', () => {
    const umap = Object.fromEntries(estatus.map((f) => [parseInt(f['Unidad']), f]))
    const viejo: Record<string, number> = {}
    for (const n of unidadesDelLayout(edificio.layout)) { const c = getCategory(umap[parseInt(n)]); viejo[c] = (viejo[c] ?? 0) + 1 }
    const m = metricasDeptos(edificio.layout, unidades)
    expect({ contrato: m.contratos, rc: m.rentaCorta, vacante: m.vacantes, piloto: m.pilotos })
      .toEqual({ contrato: viejo.contrato ?? 0, rc: viejo.rc ?? 0, vacante: viejo.vacante ?? 0, piloto: viejo.piloto ?? 0 })
  })

  it('mismos estacionamientos y bodegas arrendados', () => {
    resolveParkingColumns(Object.keys(est[0]))
    resolveBodegaColumns(Object.keys(bod[0]))
    expect(metricasSimple(construirEstacionamientos(est)).arrendadas).toBe(est.filter((r) => getParkingCategory(r) === 'contrato').length)
    expect(metricasSimple(construirBodegas(bod)).arrendadas).toBe(bod.filter((r) => getBodegaCategory(r) === 'contrato').length)
  })

  it('los gráficos de evolución tienen datos', () => {
    const venc = leer(`${id}_venc.csv`)
    const sal = leer(`${id}_sal.csv`)
    const rango = { desde: '2024-01', hasta: '2026-10' }
    expect(vencimientos(venc, rango, '', hoy).some((p) => p.total > 0)).toBe(true)
    expect(renewalRate(venc, rango, '').promedio).not.toBeNull()
    expect(analisisSalidas(sal, rango, '').motivos.length).toBeGreaterThan(0)
    expect(desgloseSalidas(sal, rango).some((p) => p.total > 0)).toBe(true)
  })
})
