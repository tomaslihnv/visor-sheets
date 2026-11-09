import type { ReactNode } from 'react'
import { FILTROS_INICIALES, type EstadoFiltro, type Filtros, type TipoBien } from '../dominio/filtros'
import { NOMBRE_ORIENTACION } from '../dominio/metricas'
import { Desplegable } from '../ui/Desplegable'

const Seccion = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="border-t border-slate-100 py-4 first:border-0 first:pt-0">
    <p className="mb-2 text-[10px] font-bold tracking-widest text-gris-claro uppercase">{titulo}</p>
    {children}
  </div>
)

function Opciones<T extends string>({ valor, opciones, onChange }: { valor: T; opciones: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {opciones.map(([v, nombre]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${v === valor ? 'bg-oscuro text-white' : 'bg-slate-100 text-gris hover:bg-slate-200'}`}>
          {nombre}
        </button>
      ))}
    </div>
  )
}

// Cuántos filtros se apartan de los iniciales: se muestra en el botón que abre el panel.
export const filtrosActivos = (f: Filtros) =>
  (Object.keys(FILTROS_INICIALES) as (keyof Filtros)[]).filter((k) => JSON.stringify(f[k]) !== JSON.stringify(FILTROS_INICIALES[k])).length

export function PanelFiltros({ filtros, cambiar, cerrar, tipologias, rangoVenc, rangoUF }: {
  filtros: Filtros
  cambiar: (f: Partial<Filtros>) => void
  cerrar: () => void
  tipologias: { tipo: string[]; sub1: string[]; sub2: string[] }
  rangoVenc: [number, number] | null
  rangoUF: [number, number] | null
}) {
  const uf = filtros.uf ?? rangoUF
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="mr-auto text-sm font-bold">Filtros</h2>
        <button onClick={() => cambiar(FILTROS_INICIALES)} className="text-xs font-medium text-gris hover:text-acento">Limpiar</button>
        <button onClick={cerrar} aria-label="Cerrar filtros" className="grid h-8 w-8 place-items-center rounded-full text-lg text-gris hover:bg-slate-100">×</button>
      </div>

      <Seccion titulo="Tipo de bien">
        <Opciones<TipoBien> valor={filtros.bien} onChange={(bien) => cambiar({ bien })}
          opciones={[['todos', 'Todos'], ['departamentos', 'Departamentos'], ['estacionamientos', 'Estacionamientos'], ['bodegas', 'Bodegas']]} />
      </Seccion>

      <Seccion titulo="Unidades">
        <Opciones<EstadoFiltro> valor={filtros.estado} onChange={(estado) => cambiar({ estado })}
          opciones={[['todas', 'Todas'], ['contratos', 'Contratos'], ['en-renta', 'En renta'], ['vacantes', 'Vacantes'], ['inhabilitadas', 'Inhabilitadas']]} />
      </Seccion>

      <Seccion titulo="Tipología">
        <div className="space-y-2">
          <Desplegable etiqueta="Tipo" valor={filtros.tipo} opciones={tipologias.tipo} onChange={(tipo) => cambiar({ tipo })} todos="Todos" ancho="w-full" />
          <Desplegable etiqueta="Sub Tip. (1)" valor={filtros.sub1} opciones={tipologias.sub1} onChange={(sub1) => cambiar({ sub1 })} todos="Todos" ancho="w-full" />
          <Desplegable etiqueta="Sub Tip. (2)" valor={filtros.sub2} opciones={tipologias.sub2} onChange={(sub2) => cambiar({ sub2 })} todos="Todos" ancho="w-full" />
        </div>
      </Seccion>

      <Seccion titulo="Orientación">
        <div className="grid grid-cols-2 gap-1.5">
          {Object.entries(NOMBRE_ORIENTACION).map(([o, nombre]) => {
            const activa = filtros.orientaciones.includes(o)
            return (
              <button key={o} onClick={() => cambiar({ orientaciones: activa ? filtros.orientaciones.filter((x) => x !== o) : [...filtros.orientaciones, o] })}
                className={`rounded-lg px-2 py-1.5 text-xs font-medium ring-1 transition-colors ${activa ? 'bg-acento text-white ring-acento' : 'text-gris ring-slate-200 hover:bg-slate-50'}`}>
                {nombre} ({o})
              </button>
            )
          })}
        </div>
      </Seccion>

      {rangoVenc && (
        <Seccion titulo="Vencimiento">
          <p className="mb-1 text-xs font-medium">{filtros.vencHasta === null ? 'Sin filtro' : `Hasta ${filtros.vencHasta} días`}</p>
          <input type="range" min={rangoVenc[0]} max={rangoVenc[1]} step={1} value={filtros.vencHasta ?? rangoVenc[1]} className="w-full accent-acento"
            onChange={(e) => { const v = +e.target.value; cambiar({ vencHasta: v >= rangoVenc[1] ? null : v }) }} />
        </Seccion>
      )}

      {rangoUF && uf && (
        <Seccion titulo="Canon UF/m²">
          <div className="space-y-1">
            {(['desde', 'hasta'] as const).map((lado, i) => (
              <label key={lado} className="flex items-center gap-2 text-xs text-gris">
                <span className="w-10">{lado === 'desde' ? 'Desde' : 'Hasta'}</span>
                <input type="range" min={rangoUF[0]} max={rangoUF[1]} step={0.01} value={uf[i]} className="flex-1 accent-acento"
                  onChange={(e) => {
                    const v = +e.target.value
                    const nuevo: [number, number] = i === 0 ? [Math.min(v, uf[1]), uf[1]] : [uf[0], Math.max(v, uf[0])]
                    cambiar({ uf: nuevo[0] <= rangoUF[0] && nuevo[1] >= rangoUF[1] ? null : nuevo })
                  }} />
                <span className="w-9 text-right font-medium text-oscuro tabular-nums">{uf[i].toFixed(2)}</span>
              </label>
            ))}
          </div>
        </Seccion>
      )}
    </div>
  )
}
