import { useRef, type ReactNode } from 'react'
import { BotonExportar } from './ExportarGrafico'

// `exportable`: agrega el botón para bajar el gráfico (children) como PNG.
export function Tarjeta({ titulo, subtitulo, controles, exportable, children }: { titulo: string; subtitulo?: string; controles?: ReactNode; exportable?: boolean; children: ReactNode }) {
  const grafico = useRef<HTMLDivElement>(null)
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-base font-bold">{titulo}</h2>
          {subtitulo && <p className="mt-0.5 text-sm text-gris">{subtitulo}</p>}
        </div>
        {(controles || exportable) && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-gris">
            {controles}
            {exportable && <BotonExportar titulo={titulo} grafico={grafico}>{children}</BotonExportar>}
          </div>
        )}
      </header>
      {exportable ? <div ref={grafico}>{children}</div> : children}
    </section>
  )
}

export function Casilla({ etiqueta, valor, onChange }: { etiqueta: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 font-medium select-none">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} className="accent-acento" />
      {etiqueta}
    </label>
  )
}

export function Mensaje({ children }: { children: ReactNode }) {
  return <div className="grid h-80 place-items-center text-sm text-gris">{children}</div>
}
