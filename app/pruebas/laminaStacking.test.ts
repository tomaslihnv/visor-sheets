import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
import PptxGenJS from 'pptxgenjs'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { EDIFICIOS } from '../src/edificios'
import { construirUnidades } from '../src/dominio/unidades'
import { construirBodegas, construirEstacionamientos } from '../src/dominio/subterraneo'
import { laminaStacking } from '../src/laminas/stacking/datos'
import { agregarLaminaStacking } from '../src/laminas/stacking/pptx'

const leer = (f: string): Fila[] => {
  const u = new URL(`./datos/${f}`, import.meta.url)
  return existsSync(u) ? Papa.parse<Fila>(readFileSync(u, 'utf8').trim(), { header: true, skipEmptyLines: true }).data : []
}
const hoy = new Date(2026, 10, 9)

describe.each(['irr', 'ech', 'tm'])('lámina de stacking · %s', (id) => {
  const e = EDIFICIOS.find((x) => x.id === id)!
  const l = laminaStacking(e, construirUnidades(leer(`${id}_estatus.csv`), {}, hoy), construirEstacionamientos(leer(`${id}_est.csv`)), construirBodegas(leer(`${id}_bod.csv`)), leer(`${id}_evolucion.csv`), hoy)

  it('los textos usan las métricas del plano', () => {
    expect(l.firmadas).toBeGreaterThan(0)
    expect(l.analisisOcupacion[0].texto).toContain(`${l.firmadas} unidades firmadas`)
    const vacantes = [...l.unidades.values()].filter((u) => u.categoria === 'vacante' && e.layout.pisos.some((p) => p.celdas.some((c) => c.n === u.n))).length
    expect(l.analisisVacancia[0].destacado ?? l.analisisVacancia[0].texto).toContain(vacantes ? String(vacantes) : 'No hay')
  })

  it('arma la lámina de PowerPoint', async () => {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    agregarLaminaStacking(pptx, e, l, 3)
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    expect(buf.length).toBeGreaterThan(10_000)
    if (process.env.SALIDA_LAMINAS) writeFileSync(`${process.env.SALIDA_LAMINAS}/stacking_${id}.pptx`, buf)
  })
})
