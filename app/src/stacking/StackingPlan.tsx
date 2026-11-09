import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import type { Edificio } from '../edificios'
import { useHoja } from '../datos/hojas'
import { useUnidades } from '../datos/useUnidades'
import { DRIVE } from '../drive'
import { bodegasPorPiso, construirBodegas, construirEstacionamientos, pisosSubterraneo } from '../dominio/subterraneo'
import { cambiosDeOrientacion, infoColumnas } from '../dominio/encabezados'
import { metricasDeptos, metricasSimple, proyeccionDelMes } from '../dominio/metricas'
import { FILTROS_INICIALES, opcionesTipologia, rangoUF, rangoVencimiento, type Filtros } from '../dominio/filtros'
import { Mensaje } from '../ui/Tarjeta'
import { Grilla } from './Grilla'
import { Leyenda, type Pestana } from './Leyenda'
import { PanelFiltros, filtrosActivos } from './PanelFiltros'
import { Tooltip, type Ficha, type PosicionFicha } from './Tooltip'

const PESTANAS: [Pestana, string][] = [['unidades', 'Unidades'], ['bodegas', 'Bodegas'], ['estac', 'Estac.']]

function Interruptor({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: string }) {
  return (
    <button onClick={onClick} className={`rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors ${activo ? 'bg-acento-suave text-acento ring-acento/40' : 'text-gris ring-slate-200 hover:bg-slate-50'}`}>
      {children}
    </button>
  )
}

// Escala del plano para que el edificio completo quepa en el ancho disponible. Entre 0,6 y 1,4: más chico no se
// lee (en el celular se desliza de lado) y más grande no aporta.
function useAjusteAlAncho(activo: boolean) {
  const contenedor = useRef<HTMLDivElement>(null)
  const contenido = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(1)
  useLayoutEffect(() => {
    const c = contenedor.current, g = contenido.current
    if (!c || !g) return
    const medir = () => {
      if (!activo) return setZoom(1)
      // Ancho visual (con zoom) / zoom actual = ancho real del plano; scrollWidth en Chrome ya viene sin zoom.
      const natural = g.getBoundingClientRect().width / (parseFloat(g.style.zoom) || 1)
      const cs = getComputedStyle(c)
      const disponible = c.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      setZoom(Math.min(1.4, Math.max(0.6, disponible / natural)))
    }
    medir()
    // Se mide de nuevo si cambia el contenedor o el plano (p. ej. al pasar del esqueleto a los datos).
    const ro = new ResizeObserver(medir)
    ro.observe(c)
    ro.observe(g)
    return () => ro.disconnect()
  }, [activo])
  return { contenedor, contenido, zoom }
}

export function StackingPlan({ edificio }: { edificio: Edificio }) {
  const layout = edificio.layout
  const { estatus, unidades } = useUnidades(edificio)
  const est = useHoja(edificio, 'est')
  const bod = useHoja(edificio, 'bod')
  const evol = useHoja(edificio, 'evolucion')
  const estac = useMemo(() => construirEstacionamientos('datos' in est ? est.datos : []), [est])
  const bodegas = useMemo(() => construirBodegas('datos' in bod ? bod.datos : []), [bod])
  const columnas = useMemo(() => infoColumnas(layout, unidades), [layout, unidades])

  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIALES)
  const cambiar = (f: Partial<Filtros>) => setFiltros((x) => ({ ...x, ...f }))
  const [pestanaElegida, setPestana] = useState<Pestana>('unidades')
  // La leyenda sigue al filtro "Tipo de bien", como en el visor anterior.
  const pestana: Pestana = filtros.bien === 'estacionamientos' ? 'estac' : filtros.bien === 'bodegas' ? 'bodegas' : pestanaElegida
  const [conTipologia, setConTipologia] = useState(false)
  const [conCabecera, setConCabecera] = useState(true)
  const [conFiltros, setConFiltros] = useState(false)
  const [ajustar, setAjustar] = useState(true)
  const { contenedor, contenido, zoom } = useAjusteAlAncho(ajustar)
  const activos = filtrosActivos(filtros)

  const [ficha, setFicha] = useState<PosicionFicha | null>(null)
  const eventos = useMemo(() => ({
    mostrar: (f: Ficha, e: MouseEvent) => setFicha({ ...f, x: e.clientX, y: e.clientY }),
    ocultar: () => setFicha(null),
  }), [])

  if ('error' in estatus) return <Mensaje>No se pudo leer la hoja Estatus actual: {estatus.error}</Mensaje>

  return (
    <div className="flex items-start gap-6">
      <section className="min-w-0 flex-1 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4">
          <div className="mr-auto flex rounded-full bg-slate-100 p-0.5">
            {PESTANAS.map(([id, nombre]) => (
              <button key={id} onClick={() => setPestana(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${pestana === id ? 'bg-white text-oscuro shadow-sm' : 'text-gris hover:text-oscuro'}`}>
                {nombre}
              </button>
            ))}
          </div>
          <Interruptor activo={conTipologia} onClick={() => setConTipologia((v) => !v)}>Tipología</Interruptor>
          <Interruptor activo={conCabecera} onClick={() => setConCabecera((v) => !v)}>Cabecera</Interruptor>
          <Interruptor activo={ajustar} onClick={() => setAjustar((v) => !v)}>Ajustar al ancho</Interruptor>
          <button onClick={() => setConFiltros((v) => !v)}
            className={`rounded-full px-3.5 py-1 text-xs font-medium transition-colors ${conFiltros || activos ? 'bg-oscuro text-white' : 'bg-slate-100 text-oscuro hover:bg-slate-200'}`}>
            Filtros{activos > 0 && <span className="ml-1.5 rounded-full bg-acento px-1.5 text-[10px]">{activos}</span>}
          </button>
        </div>

        <div className="mb-5">
          <Leyenda pestana={pestana} deptos={metricasDeptos(layout, unidades)} estac={metricasSimple(estac)} bodegas={metricasSimple(bodegas)}
            proyeccion={'datos' in evol ? proyeccionDelMes(evol.datos) : null}
            cargando={{ deptos: estatus.cargando, estac: est.cargando, bod: bod.cargando, evol: evol.cargando }} />
        </div>

        <div ref={contenedor} className="-mx-3 overflow-x-auto px-3 pb-2 sm:-mx-5 sm:px-5">
          <div ref={contenido} className="w-max" style={{ zoom }}>
            <Grilla layout={layout} unidades={unidades} columnas={columnas} divisorias={cambiosDeOrientacion(layout.maxCol, columnas)}
              bodegasArriba={bodegasPorPiso(bodegas)} subterraneo={pisosSubterraneo(estac, bodegas)}
              filtros={filtros} conTipologia={conTipologia} conCabecera={conCabecera} eventos={eventos} drive={DRIVE[edificio.id]}
              cargando={{ unidades: estatus.cargando, subterraneo: est.cargando || bod.cargando }} />
          </div>
        </div>
      </section>

      {/* Filtros: panel al costado en pantallas grandes; en el celular, cajón sobre el contenido. */}
      {conFiltros && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setConFiltros(false)} />
          <aside className="fixed inset-y-0 right-0 z-50 w-[min(20rem,90vw)] overflow-y-auto bg-white shadow-2xl lg:sticky lg:top-28 lg:z-0 lg:max-h-[calc(100vh-8rem)] lg:w-72 lg:shrink-0 lg:rounded-2xl lg:shadow-sm lg:ring-1 lg:ring-slate-200">
            <PanelFiltros filtros={filtros} cambiar={cambiar} cerrar={() => setConFiltros(false)} tipologias={opcionesTipologia(unidades.values())}
              rangoVenc={rangoVencimiento(unidades.values())} rangoUF={rangoUF(unidades.values(), filtros)} />
          </aside>
        </>
      )}

      <Tooltip ficha={ficha} />
    </div>
  )
}
