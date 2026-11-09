import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { claveDeFecha } from '../src/datos/fechas'
import { porcentaje } from '../src/datos/numeros'
import { evolucionArriendos, opcionesPorDefecto } from '../src/indicadores/evolucionArriendos/datos'

// Copia fija de la hoja Evolución de Tomás Moro (oct-26 a oct-29).
const filas = Papa.parse<Fila>(readFileSync(new URL('./datos/tm_evolucion.csv', import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data

describe('fechas y números de la hoja', () => {
  it('lee meses abreviados, incluido "sept"', () => {
    expect(claveDeFecha('oct-26')).toBe('2026-10')
    expect(claveDeFecha('sept-29')).toBe('2029-09')
    expect(claveDeFecha('15/03/2026')).toBe('2026-03')
    expect(claveDeFecha('-')).toBeNull()
  })
  it('lee % como texto o como fracción', () => {
    expect(porcentaje('96%')).toBe(96)
    expect(porcentaje('1%')).toBe(1) // el visor anterior lo leía como 100%
    expect(porcentaje('0,96')).toBe(96)
    expect(porcentaje(' -')).toBeNull()
  })
})

describe('evolución de arriendos de Tomás Moro', () => {
  const opciones = opcionesPorDefecto(filas, new Date(2026, 10, 9))! // nov-26

  it('por defecto toma todo el horizonte con corte en el mes actual', () => {
    expect(opciones).toEqual({ desde: '2026-10', hasta: '2029-10', corte: '2026-11' })
  })

  const { puntos, totalUnidades } = evolucionArriendos(filas, opciones)

  it('separa real (antes del corte) de proyección', () => {
    expect(puntos).toHaveLength(37)
    expect(puntos[0]).toMatchObject({ etiqueta: 'oct-26', real: 5, proyectado: null, presupuesto: 6 })
    expect(puntos[1]).toMatchObject({ etiqueta: 'nov-26', real: null, proyectado: 17, presupuesto: 18, pct: 6 })
    expect(puntos.at(-1)).toMatchObject({ etiqueta: 'oct-29', proyectado: 279, pct: 96 })
  })

  it('estima el total de unidades del edificio (291 según Estatus actual)', () => {
    expect(totalUnidades).toBe(291)
  })

  it('respeta el rango desde-hasta', () => {
    const r = evolucionArriendos(filas, { desde: '2027-01', hasta: '2027-03', corte: '2026-11' })
    expect(r.puntos.map((p) => p.etiqueta)).toEqual(['ene-27', 'feb-27', 'mar-27'])
  })
})
