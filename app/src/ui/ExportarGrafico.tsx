// Exportar un gráfico a PNG (descargar o copiar), con las opciones del visor anterior: proporción, fondo y tamaño
// del texto. La vista previa es el mismo gráfico dibujado de nuevo al tamaño de salida, así que lo que se ve es lo
// que se exporta. El texto se agranda dibujando el gráfico más angosto y escalándolo a 2560 px.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const PROPORCIONES = { Auto: null, '6:1': 6, '4:1': 4, '3:1': 3, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1 } as const
type Proporcion = keyof typeof PROPORCIONES
const ANCHO_SALIDA = 2560
const BASE = 1280 // ancho de dibujo con texto al 100 %

const ICONO_DESCARGA = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
const ICONO_COPIA = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>

function Segmentos<T extends string>({ etiqueta, valor, opciones, onChange }: { etiqueta: string; valor: T; opciones: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-gris">{etiqueta}</p>
      <div className="flex flex-wrap gap-1">
        {opciones.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-sm transition-colors ${o === valor ? 'border-acento/50 bg-acento-suave text-acento' : 'border-slate-200 bg-white text-oscuro hover:border-slate-300'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function BotonExportar({ titulo, grafico, children }: { titulo: string; grafico: React.RefObject<HTMLDivElement | null>; children: ReactNode }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <>
      <button onClick={() => setAbierto(true)} title="Exportar gráfico" aria-label="Exportar gráfico"
        className="grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-gris shadow-sm transition-colors hover:border-slate-300 hover:text-oscuro">
        {ICONO_DESCARGA}
      </button>
      {abierto && <Ventana titulo={titulo} aspecto={aspectoDe(grafico.current)} onCerrar={() => setAbierto(false)}>{children}</Ventana>}
    </>
  )
}

// Proporción "Auto": la del gráfico en pantalla.
function aspectoDe(el: HTMLDivElement | null) {
  const caja = el?.firstElementChild?.getBoundingClientRect()
  return caja && caja.height ? caja.width / caja.height : 3
}

function Ventana({ titulo, aspecto, onCerrar, children }: { titulo: string; aspecto: number; onCerrar: () => void; children: ReactNode }) {
  const [proporcion, setProporcion] = useState<Proporcion>('Auto')
  const [fondo, setFondo] = useState<'Blanco' | 'Transparente'>('Blanco')
  const [texto, setTexto] = useState(100)
  const [estado, setEstado] = useState<{ msg: string; ok: boolean } | null>(null)
  const [anchoEscenario, setAnchoEscenario] = useState(800)
  const escenario = useRef<HTMLDivElement>(null)
  const lienzo = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => { if (escenario.current) setAnchoEscenario(escenario.current.clientWidth) }, [])
  useLayoutEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    document.addEventListener('keydown', k)
    return () => document.removeEventListener('keydown', k)
  }, [onCerrar])

  const ancho = Math.round(BASE / (texto / 100))
  const alto = Math.round(ancho / (PROPORCIONES[proporcion] ?? aspecto))
  const escala = Math.min(1, anchoEscenario / ancho, 440 / alto)

  async function png() {
    const { toBlob } = await import('html-to-image')
    const blob = await toBlob(lienzo.current!, { pixelRatio: ANCHO_SALIDA / ancho, backgroundColor: fondo === 'Blanco' ? '#ffffff' : undefined, width: ancho, height: alto })
    if (!blob) throw new Error('No se pudo generar el PNG')
    return blob
  }
  async function accion(tipo: 'descargar' | 'copiar') {
    setEstado({ msg: 'Generando…', ok: true })
    try {
      const blob = await png()
      if (tipo === 'copiar') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setEstado({ msg: '✓ Copiado al portapapeles', ok: true })
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `grafico-${titulo.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${proporcion.replace(':', 'x').toLowerCase()}.png`
        a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        setEstado({ msg: '✓ PNG descargado', ok: true })
      }
    } catch (e) {
      const err = e as Error
      setEstado({ msg: err.name === 'NotAllowedError' ? 'El navegador no permitió copiar' : err.message || 'Error al exportar', ok: false })
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby="titulo-exportar" className="aparecer flex max-h-full w-full max-w-5xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 id="titulo-exportar" className="text-base font-bold">Exportar gráfico · {titulo}</h2>
          <button onClick={onCerrar} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-lg text-gris hover:bg-slate-100">×</button>
        </div>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 px-5 pt-4">
          <Segmentos etiqueta="Proporción de salida" valor={proporcion} opciones={Object.keys(PROPORCIONES) as Proporcion[]} onChange={setProporcion} />
          <Segmentos etiqueta="Fondo" valor={fondo} opciones={['Blanco', 'Transparente'] as const} onChange={setFondo} />
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium text-gris">Texto</span>
            <span className="flex items-center gap-2 text-xs font-semibold">
              <input type="range" min={60} max={250} step={10} value={texto} onChange={(e) => setTexto(Number(e.target.value))} className="w-32 accent-acento" />
              <span className="w-10 tabular-nums">{texto}%</span>
            </span>
          </label>
        </div>
        <div ref={escenario} className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="mx-auto overflow-hidden rounded-lg ring-1 ring-slate-200"
            style={{ width: ancho * escala, height: alto * escala, background: fondo === 'Blanco' ? '#fff' : 'repeating-conic-gradient(#e2e8f0 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' }}>
            <div style={{ transform: `scale(${escala})`, transformOrigin: 'top left', pointerEvents: 'none' }}>
              <div ref={lienzo} data-exportando style={{ width: ancho, height: alto, padding: Math.round(ancho * 0.0125) }}>{children}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
          {estado && <span className={`mr-auto text-xs ${estado.ok ? 'text-gris' : 'text-red-700'}`}>{estado.msg}</span>}
          <button onClick={() => accion('copiar')} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-50">{ICONO_COPIA} Copiar</button>
          <button onClick={() => accion('descargar')} className="flex items-center gap-1.5 rounded-lg bg-acento px-4 py-1.5 text-sm font-medium text-white hover:bg-acento-fuerte">{ICONO_DESCARGA} Descargar</button>
        </div>
      </div>
    </div>
  )
}
