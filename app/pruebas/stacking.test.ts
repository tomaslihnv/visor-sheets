import { readFileSync } from 'node:fs'
import Papa from 'papaparse'
import { describe, expect, it } from 'vitest'
import type { Fila } from '../src/datos/hojas'
import { LAYOUT_TM } from '../src/layouts'
import { unidadesDelLayout } from '../src/dominio/layout'
import { construirUnidades, fechasUFNecesarias } from '../src/dominio/unidades'
import { construirBodegas, construirEstacionamientos, pisosSubterraneo } from '../src/dominio/subterraneo'
import { metricasDeptos, metricasSimple } from '../src/dominio/metricas'
import { cambiosDeOrientacion, infoColumnas } from '../src/dominio/encabezados'
import { FILTROS_INICIALES, unidadVisible } from '../src/dominio/filtros'
import { categoriaEstacionamiento, categoriaUnidad } from '../src/dominio/categorias'

// Copias fijas de Tomás Moro con titulares y salarios anonimizados.
const leer = (f: string) => Papa.parse<Fila>(readFileSync(new URL(`./datos/${f}`, import.meta.url), 'utf8').trim(), { header: true, skipEmptyLines: true }).data
const hoy = new Date(2026, 10, 9)
const estatus = leer('tm_estatus.csv')

describe('categorías (mismas reglas del visor anterior)', () => {
  it('departamentos', () => {
    expect(categoriaUnidad('-', ' 1')).toBe('contrato')
    expect(categoriaUnidad('-', '-')).toBe('vacante')
    expect(categoriaUnidad('RC', '1')).toBe('rc')
    expect(categoriaUnidad('P', '-')).toBe('piloto')
    expect(categoriaUnidad('', '')).toBe('default')
  })
  it('estacionamientos', () => {
    const e = (o: Partial<{ n: string; estatus: string; titular: string; destino: string }>) => categoriaEstacionamiento({ n: '1', estatus: '', titular: '', destino: '', ...o })
    expect(e({ estatus: '2', titular: 'visita' })).toBe('inhabilitado')
    expect(e({ titular: 'Visita', estatus: '1' })).toBe('visita')
    expect(e({ titular: 'Ford' })).toBe('contrato')
    expect(e({ n: 'ELC1' })).toBe('local')
    expect(e({})).toBe('vacante')
  })
})

describe('stacking de Tomás Moro', () => {
  // UF fija: referencia (31-10-2026) y firmas de oct-26 → IPC 0.
  const uf = Object.fromEntries(fechasUFNecesarias(estatus, hoy).map((f) => [f, 40000]))
  const unidades = construirUnidades(estatus, uf, hoy)

  it('cada celda del layout tiene su fila en Estatus actual', () => {
    const faltan = unidadesDelLayout(LAYOUT_TM).filter((n) => !unidades.has(n))
    expect(faltan).toEqual([])
    expect(unidades.size).toBe(291)
  })

  it('conteos y ocupación', () => {
    const m = metricasDeptos(LAYOUT_TM, unidades)
    expect(m).toMatchObject({ contratos: 5, rentaCorta: 0, pilotos: 5, vacantes: 281, enRenta: 5, base: 286 })
    expect(m.tipologias.map((t) => t.tipo).sort()).toEqual(['1D-1B', '2D-2B', 'S'])
  })

  it('un contrato vigente tiene días remanentes y canon', () => {
    const u = [...unidades.values()].find((x) => x.categoria === 'contrato')!
    expect(u.diasRemanentes).toBeGreaterThan(300)
    expect(u.ipc).toBe(0)
  })

  it('cabecera: torres B y A, separadas por orientación', () => {
    const cols = infoColumnas(LAYOUT_TM, unidades)
    expect(cols.get(1)?.torre).toBe('B')
    expect(cols.get(20)?.torre).toBe('A')
    expect(cols.has(19)).toBe(false) // separador entre torres
    expect(cambiosDeOrientacion(LAYOUT_TM.maxCol, cols).size).toBeGreaterThan(3)
  })

  it('subterráneo: estacionamientos y bodegas en -1 y -2', () => {
    const e = construirEstacionamientos(leer('tm_est.csv'))
    const b = construirBodegas(leer('tm_bod.csv'))
    const sub = pisosSubterraneo(e, b)
    expect(sub.map((s) => s.piso)).toEqual([-1, -2])
    expect(sub.reduce((a, s) => a + s.autos.length + s.motos.length + s.inhab.length, 0)).toBe(e.length)
    expect(metricasSimple(b).total).toBe(b.length)
  })

  it('subterráneo: un estacionamiento movido al piso 1 en EST aparece arriba, sin arrastrar bodegas', () => {
    const e = construirEstacionamientos(leer('tm_est.csv')).map((x, i) => (i === 0 ? { ...x, piso: 1 } : x))
    const sub = pisosSubterraneo(e, construirBodegas(leer('tm_bod.csv')))
    expect(sub.map((s) => s.piso)).toEqual([1, -1, -2])
    expect(sub[0].autos.map((x) => x.n)).toEqual([e[0].n])
    expect(sub[0].bodegas).toEqual([])
  })

  it('filtro "Vacantes" atenúa los contratos', () => {
    const contrato = [...unidades.values()].find((x) => x.categoria === 'contrato')!
    expect(unidadVisible(contrato, FILTROS_INICIALES)).toBe(true)
    expect(unidadVisible(contrato, { ...FILTROS_INICIALES, estado: 'vacantes' })).toBe(false)
  })
})
