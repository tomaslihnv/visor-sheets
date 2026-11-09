import { readFileSync, writeFileSync } from 'node:fs'
import Papa from 'papaparse'
import PptxGenJS from 'pptxgenjs'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { numero } from '../src/datos/numeros'
import { COLUMNAS_TABLA, laminaOcupacion, opcionesPorDefecto } from '../src/laminas/ocupacion/datos'
import { agregarLaminaOcupacion } from '../src/laminas/ocupacion/pptx'
import type { Edificio } from '../src/edificios'
import { ubicarEtiquetas } from '../src/laminas/etiquetas'
import { etiquetasOcupacion } from '../src/laminas/ocupacion/etiquetas'

const leer = (f: string) => Papa.parse<Fila>(readFileSync(new URL(`./datos/${f}`, import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data
const hoy = new Date(2026, 10, 9) // nov-26

it('lee negativos en formato contable', () => {
  expect(numero('(3)')).toBe(-3)
  expect(numero(' (1.234) ')).toBe(-1234)
})

describe('lámina de ocupación · Tomás Moro', () => {
  const filas = leer('tm_evolucion.csv')
  const o = opcionesPorDefecto(filas, hoy)!
  const l = laminaOcupacion(filas, o)

  it('el mes del reporte es el último con datos reales (nov-26 todavía viene vacío)', () => {
    expect(o.mesReporte).toBe('2026-10')
  })

  it('tabla: el mes real y luego proyección hasta llenar las columnas', () => {
    expect(l.tabla).toHaveLength(COLUMNAS_TABLA)
    expect(l.tabla[0]).toMatchObject({ etiqueta: 'oct-26', ingresos: 5, salidas: 0, neto: 5, presupuesto: 6, proyectado: false })
    expect(l.tabla[0].variacion).toBe(-1)
    expect(l.tabla[1]).toMatchObject({ etiqueta: 'nov-26', ingresos: 12, neto: 12, presupuesto: 12, proyectado: true, variacion: 0 })
    expect(l.tabla[3]).toMatchObject({ etiqueta: 'ene-27', ingresos: 18, salidas: 1, neto: 17 })
  })

  it('ocupación calculada con las unidades (la hoja la redondea a 0%)', () => {
    expect(l.totalUnidades).toBe(291)
    const oct = l.puntos.find((p) => p.mes === '2026-10')!
    expect(oct.real).toBeCloseTo((5 / 291) * 100)
    expect(oct.forecast).toBeCloseTo(oct.real!) // la proyección parte del último real
    expect(l.puntos.find((p) => p.mes === '2026-11')!.real).toBeNull()
  })
})

describe('lámina de ocupación · Irarrázaval', () => {
  const filas = leer('irr_evolucion.csv')
  const l = laminaOcupacion(filas, { mesReporte: '2025-09', mesesTabla: 6, desde: '2025-01', hasta: '2026-12' })

  it('neto negativo y variación contra presupuesto', () => {
    const sep = l.tabla.find((m) => m.mes === '2025-09')!
    expect(sep).toMatchObject({ ingresos: 5, salidas: 8, neto: -3, presupuesto: 4, proyectado: false })
    expect(sep.variacion).toBe(-7)
    expect(l.tabla.filter((m) => !m.proyectado)).toHaveLength(6)
  })
})

it('arma la lámina de PowerPoint', async () => {
  const filas = leer('tm_evolucion.csv')
  const l = laminaOcupacion(filas, opcionesPorDefecto(filas, hoy)!)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  agregarLaminaOcupacion(pptx, { nombre: 'INSITU Tomás Moro', color: { linea: '#c9ac80', base: '#956e37' } } as unknown as Edificio, l, 1)
  const archivo = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
  expect(archivo.length).toBeGreaterThan(10_000)
  if (process.env.SALIDA_LAMINAS) writeFileSync(`${process.env.SALIDA_LAMINAS}/ocupacion.pptx`, archivo)
})

describe('etiquetas inteligentes', () => {
  const filas = leer('irr_evolucion.csv')
  // Oct-26 en Irarrázaval: real, presupuesto y meta casi en el mismo punto.
  const l = laminaOcupacion(filas, { mesReporte: '2026-10', mesesTabla: 6, desde: '2025-11', hasta: '2026-12' })
  const { etiquetas, puntos } = etiquetasOcupacion(l, { texto: '#000', presupuesto: '#666' })
  const ubicadas = ubicarEtiquetas(etiquetas, puntos, { meses: l.puntos.length, ancho: 10.8, alto: 2.44, max: 100 },
    { anchoTexto: (t) => 0.075 * t.length + 0.08, alto: 0.19, separacion: 0.07 })

  it('ninguna etiqueta se superpone con otra', () => {
    for (const a of ubicadas) for (const b of ubicadas) {
      if (a === b) continue
      const tapan = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2
      expect(tapan, `${a.id} tapa a ${b.id}`).toBe(false)
    }
  })

  it('las del mes del reporte y el presupuesto siempre aparecen', () => {
    const ids = ubicadas.map((e) => e.id)
    expect(ids).toContain('ppto')
    expect(ids).toContain(`real-${l.puntos.findIndex((p) => p.mes === '2026-10')}`)
    expect(ids).toContain('forecast')
  })
})

it('el período del gráfico se puede extender más allá de la hoja (meses vacíos)', () => {
  const filas = leer('tm_evolucion.csv') // termina en oct-29
  const l = laminaOcupacion(filas, { ...opcionesPorDefecto(filas, hoy)!, hasta: '2030-06' })
  expect(l.puntos.at(-1)).toMatchObject({ mes: '2030-06', real: null, presupuesto: null, forecast: null })
  expect(l.puntos.find((p) => p.mes === '2029-10')!.forecast).not.toBeNull()
})
