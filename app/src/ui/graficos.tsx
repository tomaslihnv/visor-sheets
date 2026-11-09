// Piezas comunes de los gráficos web: mismos ejes en todos (sin grilla, ejes marcados y con título),
// etiquetas que no se tapan y selectores con el mismo estilo del selector de meses.
import type { ReactNode } from 'react'
import { ubicarEtiquetas, type Etiqueta } from '../laminas/etiquetas'
import { mesActual, type ClaveMes } from '../datos/fechas'
import { SelectorRangoMeses, atajosDeRango } from './SelectorMes'
import type { Rango } from '../indicadores/evolucion/datos'

const OSCURO = '#2d3334'
const GRIS = '#5b6670'

export const ejeX = { tick: { fontSize: 10, fill: GRIS }, tickLine: { stroke: OSCURO }, axisLine: { stroke: OSCURO }, minTickGap: 6 }

export const ejeY = (titulo: string) => ({
  tick: { fontSize: 10, fill: GRIS }, tickLine: { stroke: OSCURO }, axisLine: { stroke: OSCURO }, width: 52, allowDecimals: false,
  label: { value: titulo, angle: -90, position: 'insideLeft' as const, offset: 6, style: { textAnchor: 'middle' as const }, fontSize: 11, fill: OSCURO, fontWeight: 600 },
})

export const leyendaArriba = { verticalAlign: 'top' as const, wrapperStyle: { fontSize: 12, paddingBottom: 10 } }

// Etiquetas sobre un gráfico de Recharts, ubicadas para no taparse (ubicarEtiquetas).
// `dominio` debe ser el mismo del eje Y.
export function etiquetasRecharts(etiquetas: Etiqueta[], puntos: { i: number; v: number }[], categorias: string[], dominio: [number, number]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function Etiquetas({ offset, xAxisMap }: any) {
    if (!offset || !xAxisMap) return null
    const eje = Object.values(xAxisMap)[0] as { scale: ((v: string) => number) & { bandwidth?: () => number } }
    const mitad = eje.scale.bandwidth ? eje.scale.bandwidth() / 2 : 0
    const ubicadas = ubicarEtiquetas(etiquetas, puntos,
      { meses: categorias.length, ancho: offset.width, alto: offset.height, min: dominio[0], max: dominio[1], xDe: (i) => eje.scale(categorias[i]) + mitad - offset.left },
      { anchoTexto: (t) => t.length * 6.2 + 6, alto: 13, separacion: 5 })
    return (
      <g transform={`translate(${offset.left},${offset.top})`} pointerEvents="none">
        {ubicadas.map((e) => (
          <text key={e.id} x={e.x} y={e.y} dy="0.35em" textAnchor="middle" fontSize={9.5} fontWeight={700} fill={e.color} stroke="#fff" strokeWidth={3} paintOrder="stroke">{e.texto}</text>
        ))}
      </g>
    )
  }
}

// Dominio redondeado hacia afuera, con aire arriba para las etiquetas.
export function dominio(valores: number[], aire = 0.18): [number, number] {
  const min = Math.min(0, ...valores), max = Math.max(1, ...valores)
  const paso = (max - min) * aire
  return [min < 0 ? Math.floor(min - paso) : 0, Math.ceil(max + paso)]
}

export { Desplegable } from './Desplegable'

export function ControlRango({ rango, meses, onChange }: { rango: Rango; meses: ClaveMes[]; onChange: (r: Rango) => void }) {
  const min = meses[0] && meses[0] < rango.desde ? meses[0] : rango.desde
  const finDatos = [meses.at(-1) ?? rango.hasta, mesActual()].sort().at(-1)!
  return <SelectorRangoMeses etiqueta="Período" desde={rango.desde} hasta={rango.hasta} min={min}
    atajos={atajosDeRango(mesActual(), min, finDatos)} onChange={(desde, hasta) => onChange({ desde, hasta })} />
}

export const Grupo = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-end gap-2">{children}</div>
