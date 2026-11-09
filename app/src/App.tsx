import { useEffect, useState } from 'react'
import type { User } from 'firebase/auth'
import { EDIFICIOS, urlVisorAnterior } from './edificios'
import { Pildora } from './ui/Pildora'
import { salir } from './auth'
import { EvolucionArriendos } from './indicadores/evolucionArriendos/Grafico'
import { StackingPlan } from './stacking/StackingPlan'
import { GraficoAntiguedad, GraficoDesglose, GraficoEntrada, GraficoFlujo, GraficoMotivo, GraficoNetos, GraficoRenewal, GraficoSalidas, GraficoVencimientos } from './indicadores/evolucion/Graficos'
import { PestanaLaminas } from './laminas/PestanaLaminas'
import { TablaEstatus, TablaHoja } from './tablas/Tablas'
import { Mensaje } from './ui/Tarjeta'
import { Reparaciones } from './reparaciones/Reparaciones'


// Pestañas a nivel de edificio: las mismas del visor anterior, más Láminas.
const PESTANAS = [
  { id: 'stacking', nombre: 'Stacking Plan' },
  { id: 'evolucion', nombre: 'Evolución' },
  { id: 'estatus', nombre: 'Estatus Actual' },
  { id: 'arriendos', nombre: 'Evolución de Arriendos' },
  { id: 'estac', nombre: 'Estacionamientos' },
  { id: 'bodegas', nombre: 'Bodegas' },
  { id: 'venc', nombre: 'Vencimientos' },
  { id: 'sal', nombre: 'Salidas' },
  { id: 'reparaciones', nombre: 'Reparaciones' },
  { id: 'caracterizacion', nombre: 'Caracterización' },
  { id: 'laminas', nombre: 'Láminas' },
] as const
type IdPestana = (typeof PESTANAS)[number]['id']

// La pestaña vive en el #hash: sobrevive a recargar y se puede compartir el link.
const pestanaDelHash = (): IdPestana => PESTANAS.find((p) => '#' + p.id === location.hash)?.id ?? 'stacking'

export function App({ usuario }: { usuario: User }) {
  const [id, setId] = useState(() => {
    const pedido = new URLSearchParams(location.search).get('b')
    return EDIFICIOS.find((e) => e.id === pedido)?.id ?? EDIFICIOS[0].id
  })
  const edificio = EDIFICIOS.find((e) => e.id === id)!

  // El edificio queda en la URL (?b=) para recargar o compartir, y su color pasa a ser el acento de toda la
  // interfaz. Se fija en <html> y no en un div: los paneles flotantes se dibujan fuera del árbol de la app.
  useEffect(() => {
    const url = new URL(location.href)
    url.searchParams.set('b', id)
    history.replaceState(null, '', url)
    const raiz = document.documentElement.style
    raiz.setProperty('--color-acento', edificio.color.base)
    raiz.setProperty('--color-acento-suave', edificio.color.suave)
    raiz.setProperty('--color-acento-fuerte', edificio.color.fuerte)
  }, [id, edificio])

  const [pestana, setPestana] = useState<IdPestana>(pestanaDelHash)
  useEffect(() => {
    const alCambiar = () => setPestana(pestanaDelHash())
    addEventListener('hashchange', alCambiar)
    return () => removeEventListener('hashchange', alCambiar)
  }, [])

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
          <span className="hidden text-sm font-bold tracking-widest text-burdeo sm:inline">INSITU</span>
          <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {EDIFICIOS.map((e) => (
              <button key={e.id} onClick={() => setId(e.id)} aria-pressed={e.id === id} className="shrink-0 rounded-full">
                <Pildora e={e} activa={e.id === id} />
              </button>
            ))}
          </nav>
          <h1 className="shrink-0"><img src={edificio.logo} alt={edificio.nombre} className="h-7 w-auto sm:h-9" /></h1>
          <span className="hidden text-xs text-gris lg:inline">{usuario.email}</span>
          <button onClick={salir} className="shrink-0 text-xs font-medium text-gris hover:text-oscuro">Salir</button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-slate-100 px-3 [scrollbar-width:none] sm:px-6">
          {PESTANAS.map((p) => (
            <a key={p.id} href={'#' + p.id}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${pestana === p.id ? 'border-acento text-acento' : 'border-transparent text-gris hover:text-oscuro'}`}>
              {p.nombre}
            </a>
          ))}
        </nav>
      </header>

      <main className="px-3 py-4 sm:px-6 sm:py-6">
        {pestana === 'stacking' && <StackingPlan key={edificio.id} edificio={edificio} />}
        {pestana === 'evolucion' && (
          // Mismo orden del visor anterior; en pantallas anchas, de a dos.
          <div key={edificio.id} className="grid gap-6 2xl:grid-cols-2">
            <EvolucionArriendos edificio={edificio} />
            <GraficoNetos edificio={edificio} />
            <GraficoVencimientos edificio={edificio} />
            <GraficoRenewal edificio={edificio} />
            <GraficoEntrada edificio={edificio} />
            <GraficoFlujo edificio={edificio} />
            <GraficoSalidas edificio={edificio} />
            <GraficoDesglose edificio={edificio} />
            <GraficoMotivo edificio={edificio} />
            <GraficoAntiguedad edificio={edificio} />
          </div>
        )}
        {pestana === 'estatus' && <TablaEstatus key={edificio.id} edificio={edificio} />}
        {pestana === 'arriendos' && <TablaHoja key={edificio.id} edificio={edificio} hoja="evolucion" />}
        {pestana === 'estac' && <TablaHoja key={edificio.id} edificio={edificio} hoja="est" />}
        {pestana === 'bodegas' && <TablaHoja key={edificio.id} edificio={edificio} hoja="bod" />}
        {pestana === 'venc' && <TablaHoja key={edificio.id} edificio={edificio} hoja="venc" />}
        {pestana === 'sal' && <TablaHoja key={edificio.id} edificio={edificio} hoja="sal" />}
        {pestana === 'reparaciones' && <Reparaciones key={edificio.id} edificio={edificio} />}
        {pestana === 'caracterizacion' && (
          <Mensaje>
            <span className="text-center">
              Esta pestaña todavía no está en la versión nueva.{' '}
              <a href={`${urlVisorAnterior(edificio.id)}`} className="font-medium text-acento underline">Verla en el visor anterior</a>
            </span>
          </Mensaje>
        )}
        {pestana === 'laminas' && <PestanaLaminas key={edificio.id} edificio={edificio} />}
      </main>
    </div>
  )
}
