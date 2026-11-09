import { useLayoutEffect, useRef, useState } from 'react'

export interface Ficha {
  titulo: string
  filas: [string, string][]
}

export interface PosicionFicha extends Ficha {
  x: number
  y: number
}

// Ficha flotante junto al cursor; se da vuelta si no cabe en la ventana.
export function Tooltip({ ficha }: { ficha: PosicionFicha | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: 0, top: 0 })

  useLayoutEffect(() => {
    if (!ficha || !ref.current) return
    const pad = 14
    const { offsetWidth: w, offsetHeight: h } = ref.current
    let left = ficha.x + pad
    let top = ficha.y + pad
    if (left + w > innerWidth - pad) left = ficha.x - w - pad
    if (top + h > innerHeight - pad) top = ficha.y - h - pad
    setPos({ left, top })
  }, [ficha])

  if (!ficha) return null
  return (
    <div ref={ref} style={pos} className="pointer-events-none fixed z-50 min-w-52 rounded-xl bg-oscuro px-3.5 py-2.5 text-xs text-white shadow-xl">
      <p className="mb-1.5 text-sm font-bold">{ficha.titulo}</p>
      {ficha.filas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-6 py-0.5">
          <span className="text-white/60">{k}</span>
          <span className="font-medium">{v}</span>
        </div>
      ))}
    </div>
  )
}
