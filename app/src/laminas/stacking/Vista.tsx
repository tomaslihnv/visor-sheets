import { useEffect, useMemo } from 'react'
import type { Edificio } from '../../edificios'
import { useHoja } from '../../datos/hojas'
import { useUnidades } from '../../datos/useUnidades'
import { bodegasPorPiso, construirBodegas, construirEstacionamientos, pisosSubterraneo } from '../../dominio/subterraneo'
import { cambiosDeOrientacion, infoColumnas } from '../../dominio/encabezados'
import { FILTROS_INICIALES } from '../../dominio/filtros'
import { Mensaje } from '../../ui/Tarjeta'
import { Bloque } from '../../ui/Esqueleto'
import { Grilla } from '../../stacking/Grilla'
import { CRITERIO_DIFICULTAD, laminaStacking, type LaminaStacking, type Linea } from './datos'

const sinFicha = { mostrar: () => {}, ocultar: () => {} }

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <h3 className="border-b-2 border-burdeo pb-1.5 text-sm font-bold">{titulo}</h3>
      <div className="pt-3">{children}</div>
    </div>
  )
}

const Analisis = ({ lineas }: { lineas: Linea[] }) => (
  <ul className="space-y-2 border-2 border-[#d9d9d9] bg-[#f2f2f2] p-4 text-sm leading-snug">
    {lineas.map((l, i) => (
      <li key={i} className={`flex gap-2 ${l.sub ? 'pl-5 text-[13px]' : ''}`}>
        <span className={`mt-2 h-1 w-1 shrink-0 rounded-full ${l.sub ? 'ring-1 ring-oscuro' : 'bg-oscuro'}`} />
        <span>{l.destacado && <b>{l.destacado}</b>}{l.texto}</span>
      </li>
    ))}
  </ul>
)

// Vista previa de la lámina "Stacking plan": el plano del visor y los mismos textos de la lámina de PowerPoint.
export function LaminaStackingVista({ edificio, onLamina }: { edificio: Edificio; onLamina: (l: LaminaStacking | null) => void }) {
  const { estatus, unidades } = useUnidades(edificio)
  const est = useHoja(edificio, 'est')
  const bod = useHoja(edificio, 'bod')
  const evol = useHoja(edificio, 'evolucion')
  const cargando = estatus.cargando || est.cargando || bod.cargando || evol.cargando
  const lamina = useMemo(() => cargando || 'error' in estatus ? null : laminaStacking(edificio, unidades,
    construirEstacionamientos('datos' in est ? est.datos : []), construirBodegas('datos' in bod ? bod.datos : []), 'datos' in evol ? evol.datos : []),
  [cargando, estatus, edificio, unidades, est, bod, evol])
  useEffect(() => onLamina(lamina), [lamina, onLamina])

  if ('error' in estatus) return <Mensaje>No se pudo leer la hoja Estatus actual: {estatus.error}</Mensaje>
  if (!lamina) return <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><Bloque className="h-7 w-2/3 max-w-xl" /><Bloque className="mt-6 h-96 w-full" /></div>

  const columnas = infoColumnas(edificio.layout, lamina.unidades)
  return (
    <article className="aparecer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
      <header className="mb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold sm:text-2xl">{edificio.nombre} | Stacking plan</h2>
          <p className="text-sm text-gris">Al {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="mt-2 flex h-1.5"><div className="w-[49%] bg-burdeo" /><div className="flex-1 bg-gris-claro" /></div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[2.2fr_1fr]">
        <Seccion titulo="Stacking Plan">
          <div className="overflow-x-auto pb-2">
            <div className="w-max" style={{ zoom: 0.8 }}>
              <Grilla layout={edificio.layout} unidades={lamina.unidades} columnas={columnas} divisorias={cambiosDeOrientacion(edificio.layout.maxCol, columnas)}
                bodegasArriba={bodegasPorPiso(lamina.bodegas)} subterraneo={pisosSubterraneo(lamina.estac, lamina.bodegas)}
                filtros={FILTROS_INICIALES} conTipologia={false} conCabecera eventos={sinFicha} cargando={{ unidades: false, subterraneo: false }} />
            </div>
          </div>
        </Seccion>
        <div className="space-y-6">
          <Seccion titulo="Ocupación"><Analisis lineas={lamina.analisisOcupacion} /></Seccion>
          <Seccion titulo="Análisis de vacancia"><Analisis lineas={lamina.analisisVacancia} /></Seccion>
        </div>
      </div>
      <p className="mt-4 text-[11px] text-gris">Fuente: hojas Estatus actual, EST, BOD y Evolución. Ocupación neta de pilotos. {CRITERIO_DIFICULTAD}</p>
    </article>
  )
}
