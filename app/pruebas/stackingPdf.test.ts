import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { EDIFICIOS } from '../src/edificios'
import { construirUnidades } from '../src/dominio/unidades'
import { construirBodegas, construirEstacionamientos } from '../src/dominio/subterraneo'
import { generarStackingPdf } from '../src/stacking/pdf'

const leer = (f: string) => Papa.parse<Fila>(readFileSync(new URL(`./datos/${f}`, import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data
const pdf = (id: string, conLinks: boolean) => {
  const e = EDIFICIOS.find((x) => x.id === id)!
  return generarStackingPdf({ edificio: e, unidades: construirUnidades(leer(`${id}_estatus.csv`), {}), estac: construirEstacionamientos(leer(`${id}_est.csv`)), bodegas: construirBodegas(leer(`${id}_bod.csv`)), conLinks })
}
const links = (texto: string) => (texto.match(/\/URI \(/g) ?? []).length

describe.each(['irr', 'ech', 'tm'])('stacking en PDF · %s', (id) => {
  it('edificio y subterráneo en dos páginas A3', () => {
    const doc = pdf(id, false)
    expect(doc.getNumberOfPages()).toBe(2)
    expect(Math.round(doc.internal.pageSize.getWidth())).toBe(420)
  })
  it('los links a Drive aparecen solo si se piden', () => {
    expect(links(pdf(id, false).output())).toBe(0)
    if (id !== 'tm') expect(links(pdf(id, true).output())).toBeGreaterThan(100) // Tomás Moro aún no tiene carpetas
  })
})
