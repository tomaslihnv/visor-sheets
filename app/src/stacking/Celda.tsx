import type { MouseEvent } from 'react'
import { ESTILO, type Categoria } from '../dominio/categorias'
import type { Ficha } from './Tooltip'

// Medidas de la grilla, compartidas por cabecera, pisos y subterráneo para que todo quede alineado.
export const ANCHO = 34
export const ALTO = 28
export const SEPARACION = 2
export const ANCHO_ETIQUETA = 56
export const anchoTramo = (celdas: number) => celdas * ANCHO + Math.max(0, celdas - 1) * SEPARACION
// Espacio extra donde cambia la orientación: separa los grupos sin dibujar líneas.
export const ESPACIO_ORIENTACION = 10
export const margenDivisoria = (divisoria?: boolean) => (divisoria ? { marginLeft: ESPACIO_ORIENTACION } : undefined)

export interface EventosFicha {
  mostrar: (f: Ficha, e: MouseEvent) => void
  ocultar: () => void
}

export function Celda({ n, categoria, visible, detalle, ficha, eventos, divisoria, enlace }: {
  n: string
  categoria: Categoria
  visible: boolean
  detalle?: string // tipología o "T" de tándem, si se muestra
  ficha: Ficha
  eventos: EventosFicha
  divisoria?: boolean
  enlace?: string // carpeta de Drive con sus contratos: se abre al hacer clic
}) {
  const e = ESTILO[categoria]
  return (
    <div
      className={`relative flex shrink-0 flex-col ${enlace ? 'cursor-pointer' : 'cursor-default'} items-center justify-center rounded-[5px] border-[1.5px] leading-none transition-[opacity,transform] duration-150 select-none hover:z-10 hover:scale-110 ${visible ? '' : 'opacity-10'}`}
      style={{ width: ANCHO, height: ALTO, background: e.bg, borderColor: e.borde, color: e.texto, ...margenDivisoria(divisoria) }}
      onMouseEnter={(ev) => eventos.mostrar(ficha, ev)}
      onMouseMove={(ev) => eventos.mostrar(ficha, ev)}
      onMouseLeave={eventos.ocultar}
      // Con carpeta, el clic abre los contratos; sin carpeta muestra la ficha (en pantallas táctiles no hay hover).
      onClick={(ev) => (enlace ? window.open(enlace, '_blank', 'noopener') : eventos.mostrar(ficha, ev))}
      title={enlace ? 'Ver contratos en Drive' : undefined}
    >
      <span className="text-[9px] font-bold">{n}</span>
      {detalle && <span className="mt-px text-[6px] font-medium opacity-75">{detalle}</span>}
    </div>
  )
}

export function Hueco({ divisoria }: { divisoria?: boolean }) {
  return <div className="shrink-0" style={{ width: ANCHO, height: ALTO, ...margenDivisoria(divisoria) }} />
}
