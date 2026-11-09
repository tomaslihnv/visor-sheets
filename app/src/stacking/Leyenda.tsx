import type { ReactNode } from 'react'
import { ESTILO, type Categoria } from '../dominio/categorias'
import { Bloque as Esqueleto } from '../ui/Esqueleto'
import { NOMBRE_ORIENTACION, type MetricasDeptos, type MetricasSimple } from '../dominio/metricas'

export type Pestana = 'unidades' | 'bodegas' | 'estac'

const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

// Estado (contratos, vacantes...): cuadrado del color de la categoría, con el nombre arriba y el número abajo.
function Estado({ categoria, nombre, valor, cargando }: { categoria: Categoria; nombre?: string; valor: number; cargando?: boolean }) {
  const e = ESTILO[categoria]
  return (
    <div className="min-w-24 flex-1 rounded-xl border-[1.5px] px-3.5 py-2.5 sm:flex-none" style={{ background: e.bg, borderColor: e.borde, color: e.texto }}>
      <p className="text-[11px] font-semibold">{nombre ?? e.nombre}</p>
      {cargando ? <Esqueleto className="mt-1 h-6 w-10 opacity-70" /> : <p className="aparecer text-2xl leading-tight font-bold tabular-nums">{valor}</p>}
    </div>
  )
}

// Indicador neutro: etiqueta arriba, valor grande y un detalle chico.
function Metrica({ etiqueta, valor, detalle, cargando }: { etiqueta: string; valor: string; detalle?: string; cargando?: boolean }) {
  return (
    <div className="min-w-24 flex-1 rounded-xl bg-slate-50 px-3.5 py-2.5 ring-1 ring-slate-100 sm:flex-none">
      <p className="text-[11px] font-medium text-gris">{etiqueta}</p>
      {cargando ? <Esqueleto className="mt-1 h-6 w-14" /> : (
        <p className="aparecer text-2xl leading-tight font-bold tabular-nums">
          {valor}
          {detalle && <span className="ml-1.5 text-xs font-medium text-gris">{detalle}</span>}
        </p>
      )}
    </div>
  )
}

// Ocupación de un grupo (tipología, orientación, estacionamientos...): % grande, "n de total" y barra de avance.
function Ocupacion({ titulo, arrendadas, total, cargando }: { titulo: string; arrendadas: number; total: number; cargando?: boolean }) {
  const p = total ? arrendadas / total : 0
  return (
    <div className="min-w-32 flex-1 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold text-oscuro">{titulo}</p>
        {!cargando && <p className="text-[11px] text-gris tabular-nums">{arrendadas} de {total}</p>}
      </div>
      {cargando ? <Esqueleto className="mt-1.5 h-6 w-12" /> : <p className="aparecer text-2xl leading-tight font-bold tabular-nums">{Math.round(p * 100)}%</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-acento transition-[width] duration-700 ease-out" style={{ width: cargando ? 0 : `${Math.max(p * 100, p > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  )
}

const Grupo = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div>
    <p className="mb-2 text-[10px] font-bold tracking-widest text-gris-claro uppercase">{titulo}</p>
    <div className="flex flex-wrap gap-2">{children}</div>
  </div>
)

// Qué hojas faltan: mientras tanto, sus números se muestran como esqueleto.
export interface Faltan { deptos: boolean; estac: boolean; bod: boolean; evol: boolean }

export function Leyenda({ pestana, deptos, estac, bodegas, proyeccion, cargando: faltan }: {
  cargando: Faltan
  pestana: Pestana
  deptos: MetricasDeptos
  estac: MetricasSimple
  bodegas: MetricasSimple
  proyeccion: { pct: number | null; unidades: number | null; netos: number | null } | null
}) {
  if (pestana === 'estac' || pestana === 'bodegas') {
    const m = pestana === 'estac' ? estac : bodegas
    const cargando = pestana === 'estac' ? faltan.estac : faltan.bod
    const genero = pestana === 'estac' ? 'Arrendados' : 'Arrendadas'
    return (
      <div className="flex flex-wrap gap-2">
        <Estado categoria="contrato" nombre={genero} valor={m.arrendadas} cargando={cargando} />
        <Estado categoria="vacante" valor={m.vacantes} cargando={cargando} />
        <Metrica etiqueta="Total" valor={String(m.total)} cargando={cargando} />
        <Ocupacion titulo="Ocupación" arrendadas={m.arrendadas} total={m.total} cargando={cargando} />
      </div>
    )
  }

  const signo = (v: number) => (v > 0 ? '+' : '') + Math.round(v)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Estado categoria="contrato" valor={deptos.contratos} cargando={faltan.deptos} />
        <Estado categoria="rc" valor={deptos.rentaCorta} cargando={faltan.deptos} />
        <Estado categoria="vacante" valor={deptos.vacantes} cargando={faltan.deptos} />
        <Estado categoria="piloto" valor={deptos.pilotos} cargando={faltan.deptos} />
        <div className="hidden w-px self-stretch bg-slate-200 sm:block" />
        <Metrica etiqueta="Ocupación deptos." valor={pct(deptos.ocupacion)} detalle={deptos.base ? `${deptos.enRenta} un.` : undefined} cargando={faltan.deptos} />
        <Metrica etiqueta="Estac." valor={pct(estac.ocupacion)} cargando={faltan.estac} />
        <Metrica etiqueta="Bodegas" valor={pct(bodegas.ocupacion)} cargando={faltan.bod} />
        <Metrica etiqueta="Proyección del mes" valor={proyeccion?.pct != null ? `${Math.round(proyeccion.pct)}%` : '—'} detalle={proyeccion?.unidades != null ? `${Math.round(proyeccion.unidades)} un.` : undefined} cargando={faltan.evol} />
        <Metrica etiqueta="Netos proyectados" valor={proyeccion?.netos != null ? `${signo(proyeccion.netos)}` : '—'} detalle="un." cargando={faltan.evol} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Grupo titulo="Ocupación por tipología">
          {(faltan.deptos ? [{ tipo: '·', total: 0, arrendadas: 0 }, { tipo: '··', total: 0, arrendadas: 0 }, { tipo: '···', total: 0, arrendadas: 0 }] : deptos.tipologias).map((t) => (
            <Ocupacion key={t.tipo} titulo={faltan.deptos ? '' : t.tipo} arrendadas={t.arrendadas} total={t.total} cargando={faltan.deptos} />
          ))}
        </Grupo>
        <Grupo titulo="Ocupación por orientación">
          {(faltan.deptos ? [{ orientacion: '·', total: 0, arrendadas: 0 }, { orientacion: '··', total: 0, arrendadas: 0 }, { orientacion: '···', total: 0, arrendadas: 0 }] : deptos.orientaciones).map((o) => (
            <Ocupacion key={o.orientacion} titulo={faltan.deptos ? '' : NOMBRE_ORIENTACION[o.orientacion] ?? o.orientacion} arrendadas={o.arrendadas} total={o.total} cargando={faltan.deptos} />
          ))}
        </Grupo>
      </div>
    </div>
  )
}
