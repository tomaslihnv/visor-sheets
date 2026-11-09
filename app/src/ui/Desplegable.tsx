// Lista desplegable con el mismo estilo del selector de meses (en vez del <select> nativo, que se ve distinto en
// cada navegador). Radix Popover se encarga de posición, teclado (Escape) y clic afuera.
import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'

export function Desplegable({ etiqueta, valor, opciones, onChange, todos = 'Todas', ancho = 'w-auto' }: {
  etiqueta: string
  valor: string
  opciones: string[]
  onChange: (v: string) => void
  todos?: string // texto de la opción "sin filtro" (valor '')
  ancho?: string
}) {
  const [abierto, setAbierto] = useState(false)
  const lista = [{ v: '', nombre: todos }, ...opciones.map((o) => ({ v: o, nombre: o }))]
  const elegir = (v: string) => { onChange(v); setAbierto(false) }

  return (
    <Popover.Root open={abierto} onOpenChange={setAbierto}>
      <Popover.Trigger asChild>
        <button className={`group flex items-center justify-between gap-3 rounded-lg border bg-white px-3 py-1.5 text-left shadow-sm transition-colors hover:border-slate-300 data-[state=open]:border-acento data-[state=open]:ring-2 data-[state=open]:ring-acento/15 ${valor ? 'border-acento/50' : 'border-slate-200'} ${ancho}`}>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-[10px] font-medium text-gris">{etiqueta}</span>
            <span className={`truncate text-xs font-semibold ${valor ? 'text-acento' : 'text-oscuro'}`}>{valor || todos}</span>
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0 text-gris transition-transform group-data-[state=open]:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()}
          className="z-50 max-h-72 min-w-[var(--radix-popover-trigger-width)] overflow-y-auto rounded-xl bg-white p-1.5 shadow-2xl ring-1 ring-slate-200 outline-none">
          {lista.map(({ v, nombre }) => (
            <button key={v || '__todos'} onClick={() => elegir(v)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-nowrap transition-colors outline-none focus-visible:bg-slate-100 ${v === valor ? 'bg-acento-suave font-medium text-oscuro' : 'text-gris hover:bg-slate-50'}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`shrink-0 text-acento ${v === valor ? '' : 'invisible'}`} aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
              {nombre}
            </button>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
