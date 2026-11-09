// Selectores de mes con el diseño de los de Meta Ads: atajos a la izquierda, calendario a la derecha y
// Cancelar / Actualizar. Los datos son mensuales, así que se elige por mes (no por día).
import { useState, type ReactNode } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { clave, sumarMeses, type ClaveMes } from '../datos/fechas'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const texto = (m: ClaveMes) => { const [a, mm] = m.split('-'); return `${MESES[+mm - 1]} ${a}` }
const año = (m: ClaveMes) => +m.slice(0, 4)

export interface Atajo { nombre: string; desde: ClaveMes; hasta: ClaveMes }

function Disparador({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <Popover.Trigger asChild>
      <button className="group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-left shadow-sm transition-colors hover:border-slate-300 data-[state=open]:border-acento data-[state=open]:ring-2 data-[state=open]:ring-acento/15">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gris" aria-hidden>
          <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="flex flex-col leading-tight">
          <span className="text-[10px] font-medium text-gris">{etiqueta}</span>
          <span className="text-xs font-semibold text-oscuro">{children}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gris transition-transform group-data-[state=open]:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
      </button>
    </Popover.Trigger>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <Popover.Portal>
      {/* Sin foco automático en el primer atajo: con mouse se ve como un recuadro suelto. */}
      <Popover.Content align="start" sideOffset={6} collisionPadding={12} onOpenAutoFocus={(e) => e.preventDefault()}
        className="z-50 w-[calc(100vw-24px)] overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200 outline-none sm:w-auto">
        {children}
      </Popover.Content>
    </Popover.Portal>
  )
}

function Atajos({ atajos, elegido, onElegir }: { atajos: Atajo[]; elegido: (a: Atajo) => boolean; onElegir: (a: Atajo) => void }) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 sm:w-56 sm:flex-col sm:overflow-y-auto sm:border-r sm:border-b-0">
      {atajos.map((a) => (
        <button key={a.nombre} onClick={() => onElegir(a)}
          className={`flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-acento/40 ${elegido(a) ? 'bg-slate-100 font-medium text-oscuro' : 'text-gris hover:bg-slate-50'}`}>
          <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${elegido(a) ? 'border-acento' : 'border-slate-300'}`}>
            {elegido(a) && <span className="h-2 w-2 rounded-full bg-acento" />}
          </span>
          {a.nombre}
        </button>
      ))}
    </div>
  )
}

// Un año: 12 meses en grilla de 3 × 4. `estado` dice cómo pintar cada mes.
function Año({ a, estado, onClick, onHover }: {
  a: number
  estado: (m: ClaveMes) => { deshabilitado: boolean; borde: boolean; dentro: boolean }
  onClick: (m: ClaveMes) => void
  onHover?: (m: ClaveMes | null) => void
}) {
  return (
    <div className="w-56">
      <div className="grid grid-cols-3 gap-y-1.5" onMouseLeave={() => onHover?.(null)}>
        {MESES.map((nombre, i) => {
          const m = clave(a, i)
          const e = estado(m)
          return (
            <button key={m} disabled={e.deshabilitado} onClick={() => onClick(m)} onMouseEnter={() => onHover?.(m)}
              className={`h-9 text-sm capitalize transition-colors disabled:cursor-not-allowed disabled:text-slate-300
                ${e.borde ? 'rounded-lg bg-acento font-semibold text-white' : e.dentro ? 'bg-acento-suave text-oscuro' : 'rounded-lg text-oscuro hover:bg-slate-100'}`}>
              {nombre}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Flecha({ dir, onClick, disabled }: { dir: 'izq' | 'der'; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={dir === 'izq' ? 'Año anterior' : 'Año siguiente'}
      className="grid h-8 w-8 place-items-center rounded-full text-oscuro hover:bg-slate-100 disabled:opacity-25">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={dir === 'izq' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
    </button>
  )
}

function Pie({ resumen, onCancelar, onActualizar, listo }: { resumen: string; onCancelar: () => void; onActualizar: () => void; listo: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3">
      <div className="mr-auto">
        <p className="text-sm font-medium text-oscuro">{resumen}</p>
        <p className="text-[11px] text-gris">Meses según la hoja de cada edificio</p>
      </div>
      <Popover.Close asChild>
        <button onClick={onCancelar} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-oscuro hover:bg-slate-50">Cancelar</button>
      </Popover.Close>
      <button onClick={onActualizar} disabled={!listo} className="rounded-lg bg-acento px-4 py-1.5 text-sm font-medium text-white hover:bg-acento-fuerte disabled:opacity-40">Actualizar</button>
    </div>
  )
}

// Rango de meses. Primer clic = inicio, segundo = fin (si es anterior, se invierten).
// Sin `max`, el rango se puede extender hacia adelante todo lo que se quiera (meses sin datos quedan vacíos).
export function SelectorRangoMeses({ etiqueta, desde, hasta, min, max, atajos, onChange }: {
  etiqueta: string
  desde: ClaveMes
  hasta: ClaveMes
  min: ClaveMes
  max?: ClaveMes
  atajos: Atajo[]
  onChange: (desde: ClaveMes, hasta: ClaveMes) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState<{ desde: ClaveMes; hasta: ClaveMes | null }>({ desde, hasta })
  const [sobre, setSobre] = useState<ClaveMes | null>(null)
  const [añoIzq, setAñoIzq] = useState(año(desde))

  const abrir = (v: boolean) => {
    setAbierto(v)
    if (v) { setBorrador({ desde, hasta }); setAñoIzq(max ? Math.min(año(desde), año(max) - 1) : año(desde)) }
  }
  const fin = borrador.hasta ?? sobre ?? borrador.desde
  const [a, b] = borrador.desde <= fin ? [borrador.desde, fin] : [fin, borrador.desde]
  const estado = (m: ClaveMes) => ({ deshabilitado: m < min || (!!max && m > max), borde: m === a || m === b, dentro: m > a && m < b })
  const clic = (m: ClaveMes) => setBorrador((x) => (x.hasta === null ? { desde: x.desde <= m ? x.desde : m, hasta: x.desde <= m ? m : x.desde } : { desde: m, hasta: null }))
  const elegir = (d: ClaveMes, h: ClaveMes) => { onChange(d, h); setAbierto(false) }

  return (
    <Popover.Root open={abierto} onOpenChange={abrir}>
      <Disparador etiqueta={etiqueta}>{texto(desde)} – {texto(hasta)}</Disparador>
      <Panel>
        <div className="flex flex-col sm:flex-row">
          <Atajos atajos={atajos} elegido={(x) => x.desde === borrador.desde && x.hasta === borrador.hasta}
            onElegir={(x) => { setBorrador({ desde: x.desde, hasta: x.hasta }); setAñoIzq(max ? Math.min(año(x.desde), año(max) - 1) : año(x.desde)) }} />
          <div className="p-4">
            {/* Dos años: lado a lado en pantallas anchas, uno bajo el otro en el celular. */}
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:gap-6">
              {[añoIzq, añoIzq + 1].map((y, i) => (
                <div key={y}>
                  <div className="mb-2 flex items-center justify-between">
                    {i === 0 ? <Flecha dir="izq" onClick={() => setAñoIzq((v) => v - 1)} disabled={y <= año(min)} /> : <span className="w-8" />}
                    <span className="text-sm font-semibold">{y}</span>
                    {i === 1 ? <Flecha dir="der" onClick={() => setAñoIzq((v) => v + 1)} disabled={!!max && añoIzq + 1 >= año(max)} /> : <span className="w-8" />}
                  </div>
                  <Año a={y} estado={estado} onClick={clic} onHover={borrador.hasta === null ? setSobre : undefined} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <Pie resumen={borrador.hasta === null ? `${texto(borrador.desde)} – elige el mes final` : `${texto(a)} – ${texto(b)}`}
          listo={borrador.hasta !== null} onCancelar={() => setAbierto(false)} onActualizar={() => elegir(a, b)} />
      </Panel>
    </Popover.Root>
  )
}

// Un solo mes.
export function SelectorMes({ etiqueta, valor, min, max, atajos = [], onChange }: {
  etiqueta: string
  valor: ClaveMes
  min: ClaveMes
  max: ClaveMes
  atajos?: { nombre: string; mes: ClaveMes }[]
  onChange: (m: ClaveMes) => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [borrador, setBorrador] = useState(valor)
  const [y, setY] = useState(año(valor))
  const abrir = (v: boolean) => { setAbierto(v); if (v) { setBorrador(valor); setY(año(valor)) } }

  return (
    <Popover.Root open={abierto} onOpenChange={abrir}>
      <Disparador etiqueta={etiqueta}>{texto(valor)}</Disparador>
      <Panel>
        <div className="flex flex-col sm:flex-row">
          {atajos.length > 0 && (
            <Atajos atajos={atajos.map((x) => ({ nombre: x.nombre, desde: x.mes, hasta: x.mes }))} elegido={(x) => x.desde === borrador}
              onElegir={(x) => { setBorrador(x.desde); setY(año(x.desde)) }} />
          )}
          <div className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <Flecha dir="izq" onClick={() => setY((v) => v - 1)} disabled={y <= año(min)} />
              <span className="text-sm font-semibold">{y}</span>
              <Flecha dir="der" onClick={() => setY((v) => v + 1)} disabled={y >= año(max)} />
            </div>
            <Año a={y} estado={(m) => ({ deshabilitado: m < min || m > max, borde: m === borrador, dentro: false })} onClick={setBorrador} />
          </div>
        </div>
        <Pie resumen={texto(borrador)} listo onCancelar={() => setAbierto(false)} onActualizar={() => { onChange(borrador); setAbierto(false) }} />
      </Panel>
    </Popover.Root>
  )
}

// Atajos habituales para un rango, acotados a los meses que tiene la hoja.
export function atajosDeRango(referencia: ClaveMes, min: ClaveMes, max: ClaveMes): Atajo[] {
  const acotar = (m: ClaveMes) => (m < min ? min : m > max ? max : m)
  const r = (nombre: string, d: ClaveMes, h: ClaveMes): Atajo => ({ nombre, desde: acotar(d), hasta: acotar(h) })
  const a = año(referencia)
  return [
    r('Últimos 6 meses', sumarMeses(referencia, -5), referencia),
    r('Últimos 12 meses', sumarMeses(referencia, -11), referencia),
    r('Este año', clave(a, 0), clave(a, 11)),
    r('El año pasado', clave(a - 1, 0), clave(a - 1, 11)),
    r('12 meses con proyección', sumarMeses(referencia, -5), sumarMeses(referencia, 6)),
    r('Desde el reporte al final', referencia, max),
    r('Todo el horizonte', min, max),
  ]
}

// Control segmentado para pocas opciones fijas (p. ej. 1 · 3 · 6 · 12 meses).
export function Segmentado<T extends string | number>({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: T; opciones: T[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium text-gris">{etiqueta}</span>
      <div className="flex rounded-lg bg-slate-100 p-0.5">
        {opciones.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`min-w-9 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${o === valor ? 'bg-white text-oscuro shadow-sm' : 'text-gris hover:text-oscuro'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}
