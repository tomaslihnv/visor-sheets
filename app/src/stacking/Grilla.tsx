import type { ReactNode } from 'react'
import type { Layout } from '../dominio/layout'
import type { Unidad } from '../dominio/unidades'
import type { Bodega, Estacionamiento, PisoSubterraneo } from '../dominio/subterraneo'
import type { InfoColumna } from '../dominio/encabezados'
import { bodegaVisible, estacVisible, unidadVisible, type Filtros } from '../dominio/filtros'
import { NOMBRE_ORIENTACION } from '../dominio/metricas'
import { fichaBodega, fichaEstacionamiento, fichaUnidad } from './fichas'
import { urlDrive, type CarpetasDrive } from '../drive'
import { ANCHO, ANCHO_ETIQUETA, ALTO, Celda, Hueco, SEPARACION, anchoTramo, margenDivisoria, type EventosFicha } from './Celda'
import { Bloque } from '../ui/Esqueleto'

// Estacionamientos por fila en el subterráneo: con más, la fila no cabe en pantallas normales.
const POR_FILA = 20

interface Props {
  layout: Layout
  unidades: Map<string, Unidad>
  columnas: Map<number, InfoColumna>
  divisorias: Set<number>
  bodegasArriba: Map<number, Bodega[]>
  subterraneo: PisoSubterraneo[]
  filtros: Filtros
  conTipologia: boolean
  conCabecera: boolean
  eventos: EventosFicha
  drive?: CarpetasDrive
  // Qué falta por llegar: mientras tanto se muestra la forma (el plano se conoce sin esperar ninguna hoja).
  cargando: { unidades: boolean; subterraneo: boolean }
}

function Fila({ etiqueta, tono, children }: { etiqueta: string; tono?: string; children: ReactNode }) {
  return (
    <div className="flex items-center" style={{ gap: SEPARACION }}>
      <div className={`shrink-0 truncate pr-2 text-right text-[9.5px] ${tono ?? 'font-bold text-gris-claro'}`} style={{ width: ANCHO_ETIQUETA }}>{etiqueta}</div>
      {children}
    </div>
  )
}

const Separador = () => <div className="mx-2 h-5 w-px shrink-0 bg-slate-300" />

function Cabecera({ maxCol, columnas, divisorias }: Pick<Props, 'columnas' | 'divisorias'> & { maxCol: number }) {
  const conTorres = [...columnas.values()].some((c) => c.torre)
  const filas: [string, (c: InfoColumna) => string][] = [
    ...(conTorres ? [['Torre', (c: InfoColumna) => c.torre] as [string, (c: InfoColumna) => string]] : []),
    ['Tipología', (c) => c.tipo.split('-')[0]],
    ['Subtipo', (c) => c.sub2],
    ['Columna', (c) => String(c.numero)],
  ]

  // Orientación: un rótulo por cada grupo de columnas con la misma orientación, sobre el grupo.
  const tramos: { desde: number; largo: number; o: string | null }[] = []
  for (let c = 1; c <= maxCol; c++) {
    const o = columnas.has(c) ? columnas.get(c)!.orientacion : null
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.o === o && (o !== null || !columnas.has(c))) ultimo.largo++
    else tramos.push({ desde: c, largo: 1, o })
  }
  const celda = (i: number, contenido: ReactNode, clase = '') => (
    <div key={i} className={`shrink-0 truncate text-center ${clase}`} style={{ width: ANCHO, ...margenDivisoria(divisorias.has(i + 1)) }}>{contenido}</div>
  )

  return (
    <div className="mb-3 space-y-1 border-b border-slate-100 pb-3">
      <Fila etiqueta="">
        {tramos.map((t) => (
          <div key={t.desde} className="shrink-0" style={{ width: anchoTramo(t.largo), ...margenDivisoria(divisorias.has(t.desde)) }}>
            {t.o !== null && (
              <div className="border-b-2 border-slate-300 pb-1 text-center text-[10px] font-semibold tracking-wide text-oscuro" title={NOMBRE_ORIENTACION[t.o] ?? t.o}>
                {t.largo > 1 ? NOMBRE_ORIENTACION[t.o] ?? t.o : t.o || '—'}
              </div>
            )}
          </div>
        ))}
      </Fila>
      {filas.map(([nombre, valor]) => (
        <Fila key={nombre} etiqueta={nombre} tono="text-gris-claro font-medium">
          {Array.from({ length: maxCol }, (_, i) => {
            const info = columnas.get(i + 1)
            return celda(i, info ? <span title={valor(info)}>{valor(info)}</span> : '', 'text-[8.5px] text-gris')
          })}
        </Fila>
      ))}
      {/* Ocupación de cada columna: pastilla que se tiñe de verde según el %. */}
      <Fila etiqueta="Ocupación" tono="text-gris-claro font-medium">
        {Array.from({ length: maxCol }, (_, i) => {
          const o = columnas.get(i + 1)?.ocupacion
          if (o === undefined) return celda(i, '')
          const p = o === null ? 0 : Math.round(o * 100)
          return celda(i, (
            <span className="block rounded py-0.5 text-[8.5px] font-semibold text-oscuro tabular-nums" style={{ background: `color-mix(in srgb, #34d399 ${Math.max(p, 4)}%, #f1f5f9)` }}>
              {o === null ? '—' : `${p}%`}
            </span>
          ))
        })}
      </Fila>
    </div>
  )
}

export function Grilla(p: Props) {
  const { layout, unidades, filtros, eventos, conTipologia, drive } = p
  const enlace = (mapa: Record<string, string> | undefined, n: string) => { const id = mapa?.[n] ?? mapa?.[String(parseInt(n))]; return id ? urlDrive(id) : undefined }
  const celdaEstac = (e: Estacionamiento) => (
    <Celda key={'e' + e.n} n={e.n} categoria={e.categoria} visible={estacVisible(e, filtros)} detalle={conTipologia && e.tandem ? 'T' : undefined} ficha={fichaEstacionamiento(e)} eventos={eventos} enlace={enlace(drive?.estac, e.n)} />
  )
  const celdaBodega = (b: Bodega) => (
    <Celda key={'b' + b.n} n={b.n} categoria={b.categoria} visible={bodegaVisible(b, filtros)} ficha={fichaBodega(b)} eventos={eventos} enlace={enlace(drive?.bod, b.n)} />
  )

  // Un grupo de estacionamientos en filas de POR_FILA; las bodegas del piso se reparten a la derecha.
  function grupo(clave: string, lista: Estacionamiento[], bodegas: Bodega[], etiqueta: string, tono?: string) {
    if (!lista.length && !bodegas.length) return null
    const ancho = Math.min(POR_FILA, lista.length)
    const filas = Math.max(1, Math.ceil(lista.length / POR_FILA))
    const bodPorFila = Math.ceil(bodegas.length / filas)
    return Array.from({ length: filas }, (_, i) => (
      <Fila key={clave + i} etiqueta={i === 0 ? etiqueta : ''} tono={tono}>
        <div className="flex shrink-0" style={{ gap: SEPARACION, width: anchoTramo(ancho) }}>{lista.slice(i * POR_FILA, (i + 1) * POR_FILA).map(celdaEstac)}</div>
        {bodPorFila > 0 && <><Separador /><div className="flex" style={{ gap: SEPARACION }}>{bodegas.slice(i * bodPorFila, (i + 1) * bodPorFila).map(celdaBodega)}</div></>}
      </Fila>
    ))
  }

  return (
    <div className="w-max">
      {p.conCabecera && (p.cargando.unidades
        ? <div className="mb-3 space-y-1.5 border-b border-slate-100 pb-3">{Array.from({ length: 5 }, (_, i) => (
            <Fila key={i} etiqueta=""><Bloque className="h-3" style={{ width: anchoTramo(layout.maxCol) }} /></Fila>
          ))}</div>
        : <Cabecera maxCol={layout.maxCol} columnas={p.columnas} divisorias={p.divisorias} />)}

      <div className="space-y-[2px]">
        {layout.pisos.map((piso) => {
          const porCol = new Map(piso.celdas.map((c) => [c.c, c.n]))
          const bodegas = p.bodegasArriba.get(piso.p) ?? []
          return (
            <Fila key={piso.p} etiqueta={`P${piso.p}`}>
              {Array.from({ length: layout.maxCol }, (_, i) => {
                const n = porCol.get(i + 1)
                const div = p.divisorias.has(i + 1)
                if (!n) return <Hueco key={i} divisoria={div} />
                if (p.cargando.unidades) return <Bloque key={n} className="shrink-0 rounded-[5px]" style={{ width: ANCHO, height: ALTO, ...margenDivisoria(div) }} />
                const u = unidades.get(n)
                return <Celda key={n} n={n} categoria={u?.categoria ?? 'default'} visible={unidadVisible(u, filtros)} detalle={conTipologia ? u?.tipo : undefined} ficha={fichaUnidad(n, u)} eventos={eventos} divisoria={div} enlace={enlace(drive?.depto, n)} />
              })}
              {bodegas.length > 0 && <><Separador />{bodegas.map(celdaBodega)}</>}
            </Fila>
          )
        })}
      </div>

      {p.cargando.subterraneo && (
        <div className="mt-4 space-y-[2px]" style={{ paddingLeft: ANCHO_ETIQUETA + SEPARACION }}>
          <Bloque className="mb-3 h-3 w-24" />
          {Array.from({ length: 3 }, (_, i) => <div key={i} className="flex" style={{ gap: SEPARACION }}>{Array.from({ length: POR_FILA }, (_, j) => <Bloque key={j} className="shrink-0 rounded-[5px]" style={{ width: ANCHO, height: ALTO }} />)}</div>)}
        </div>
      )}
      {!p.cargando.subterraneo && p.subterraneo.length > 0 && (
        <>
          <div className="my-4 flex items-center gap-3" style={{ paddingLeft: ANCHO_ETIQUETA }}>
            <span className="text-[10px] font-bold tracking-widest text-gris-claro uppercase">Subterráneo</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>
          <div className="space-y-[2px]" style={{ minHeight: ALTO }}>
            {p.subterraneo.map((s) => {
              const otros = s.autos.length + s.motos.length > 0
              return [
                grupo(`a${s.piso}`, s.autos, s.bodegas, String(s.piso)),
                grupo(`m${s.piso}`, s.motos, [], s.autos.length ? 'MOTO' : String(s.piso), 'text-indigo-400'),
                // Inhabilitados: solo con el filtro "Inhabilitadas".
                filtros.estado === 'inhabilitadas' ? grupo(`i${s.piso}`, s.inhab, [], otros ? 'INHAB.' : String(s.piso), 'text-slate-400') : null,
              ]
            })}
          </div>
        </>
      )}
    </div>
  )
}
