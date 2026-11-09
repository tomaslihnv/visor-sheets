// Esqueletos de carga: muestran la forma de lo que viene mientras llega cada hoja, para que la pantalla no salte
// ni se vea vacía. Cada parte se completa por separado a medida que llegan sus datos.
import type { CSSProperties } from 'react'

export const Bloque = ({ className = '', style }: { className?: string; style?: CSSProperties }) => (
  <div className={`esqueleto rounded-md ${className}`} style={style} aria-hidden />
)

// Alturas fijas (no aleatorias): el esqueleto no cambia entre renders.
const ALTURAS = [38, 52, 45, 63, 58, 71, 66, 49, 74, 81, 69, 86, 78, 90]

export function EsqueletoGrafico({ tipo = 'barras', alto = 'h-80' }: { tipo?: 'barras' | 'lineas' | 'dona'; alto?: string }) {
  return (
    <div className={`${alto} flex flex-col`} role="status" aria-label="Cargando gráfico">
      <div className="mb-3 flex gap-4"><Bloque className="h-3 w-24" /><Bloque className="h-3 w-20" /><Bloque className="h-3 w-28" /></div>
      {tipo === 'dona' ? (
        <div className="grid flex-1 place-items-center">
          <div className="esqueleto aspect-square h-4/5 rounded-full [mask:radial-gradient(circle,transparent_52%,#000_53%)]" />
        </div>
      ) : (
        <div className="flex flex-1 gap-2 border-b-2 border-l-2 border-slate-200 pb-0 pl-2">
          {tipo === 'barras'
            ? ALTURAS.map((h, i) => <div key={i} className="flex flex-1 items-end"><Bloque className="w-full rounded-b-none" style={{ height: `${h}%` }} /></div>)
            : (
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <path d="M0 78 C 12 70, 18 60, 28 62 S 45 48, 55 44 S 72 30, 82 26 S 95 18, 100 14" fill="none" stroke="#e2e7ec" strokeWidth="3" vectorEffect="non-scaling-stroke" className="animate-pulse" />
              </svg>
            )}
        </div>
      )}
      <div className="mt-2 flex justify-between pl-2">{Array.from({ length: 7 }, (_, i) => <Bloque key={i} className="h-2.5 w-8" />)}</div>
    </div>
  )
}

export function EsqueletoTabla({ filas = 12, columnas = 9 }: { filas?: number; columnas?: number }) {
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200" role="status" aria-label="Cargando tabla">
      <div className="border-b border-slate-100 px-4 py-3"><Bloque className="h-3 w-20" /></div>
      <div className="divide-y divide-slate-100">
        <div className="flex gap-4 bg-slate-50 px-4 py-2.5">{Array.from({ length: columnas }, (_, i) => <Bloque key={i} className="h-3 flex-1" />)}</div>
        {Array.from({ length: filas }, (_, r) => (
          <div key={r} className="flex gap-4 px-4 py-2.5">
            {Array.from({ length: columnas }, (_, i) => <Bloque key={i} className="h-3 flex-1" style={{ opacity: 1 - r * 0.05 }} />)}
          </div>
        ))}
      </div>
    </section>
  )
}
