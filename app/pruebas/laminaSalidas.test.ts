import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import PptxGenJS from 'pptxgenjs'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { EDIFICIOS } from '../src/edificios'
import { MESES_GRAFICO, laminaSalidas, opcionesPorDefecto } from '../src/laminas/salidas/datos'
import { agregarLaminaSalidas } from '../src/laminas/salidas/pptx'

const sal = Papa.parse<Fila>(readFileSync(new URL('./datos/ech_sal.csv', import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data
const hoy = new Date(2026, 10, 9)

describe('lámina de salidas · Echaurren', () => {
  const o = opcionesPorDefecto(sal, hoy)
  const l = laminaSalidas(sal, o)

  it('toma el último mes con salidas y los 20 meses que terminan en él', () => {
    expect(o.mesReporte <= '2026-11').toBe(true)
    expect(l.evolucion).toHaveLength(MESES_GRAFICO)
    expect(l.evolucion.at(-1)!.mes).toBe(o.mesReporte)
  })

  it('cada mes suma no renovación + anticipada, y los motivos suman 100%', () => {
    for (const p of l.evolucion) expect(p.total).toBe(p.noRenovacion + p.anticipada)
    expect(l.motivos.reduce((s, m) => s + m.pct, 0)).toBeCloseTo(100, 0)
    expect(l.motivos.map((m) => m.n)).toEqual([...l.motivos.map((m) => m.n)].sort((a, b) => b - a))
  })

  it('los textos de análisis usan los mismos números', () => {
    const mes = l.evolucion.at(-1)!
    expect(l.analisisEvolucion[1]).toContain(`${mes.total} salida`)
    expect(l.analisisMotivos[0]).toContain(l.motivos[0].motivo.toLowerCase())
  })

  it('arma la lámina de PowerPoint', async () => {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    agregarLaminaSalidas(pptx, EDIFICIOS.find((e) => e.id === 'ech')!, l, 2)
    expect(((await pptx.write({ outputType: 'nodebuffer' })) as Buffer).length).toBeGreaterThan(10_000)
  })
})

it('sin salidas (Tomás Moro) la lámina se arma igual, con avisos', () => {
  const l = laminaSalidas([], { mesReporte: '2026-10', desde: '2025-03' })
  expect(l.motivos).toEqual([])
  expect(l.analisisEvolucion[0]).toContain('No hay salidas')
})
