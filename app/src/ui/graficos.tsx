// Piezas comunes de los gráficos web: mismos ejes en todos (sin grilla, ejes marcados y con título),
// etiquetas que no se tapan y selectores con el mismo estilo del selector de meses.
import type { ReactNode } from 'react'
import { puntoEnTrazado, ubicarEtiquetas, type Caja, type Etiqueta } from '../laminas/etiquetas'
import { mesActual, type ClaveMes } from '../datos/fechas'
import { tintaSobre } from '../dominio/colores'
import { SelectorRangoMeses, atajosDeRango } from './SelectorMes'
import type { Rango } from '../indicadores/evolucion/datos'

const OSCURO = '#2d3334'
const GRIS = '#5b6670'

export const ejeX = { tick: { fontSize: 12, fill: GRIS }, tickLine: { stroke: OSCURO }, axisLine: { stroke: OSCURO }, minTickGap: 10, tickMargin: 4 }

export const ejeY = (titulo: string) => ({
  tick: { fontSize: 12, fill: GRIS }, tickLine: { stroke: OSCURO }, axisLine: { stroke: OSCURO }, width: 58, allowDecimals: false,
  label: { value: titulo, angle: -90, position: 'insideLeft' as const, offset: 6, style: { textAnchor: 'middle' as const }, fontSize: 12, fill: OSCURO, fontWeight: 600 },
})

// Leyenda arriba, centrada, con el nombre en tinta (no en el color de la serie). Regla: las barras se muestran
// como un cuadrado y las líneas como una línea (punteada si la serie lo es).
// Las series auxiliares (legendType="none", p. ej. la línea invisible del total) no aparecen.
export const nombreLeyenda = (v: string) => <span style={{ color: OSCURO }}>{v}</span>
interface Entrada { value: string; color?: string; type?: string; payload?: { legendType?: string; strokeDasharray?: string; fillOpacity?: number } }
const esLinea = (e: Entrada) => e.type === 'line' || e.type === 'plainline'
export function Muestra({ e }: { e: Entrada }) {
  if (!esLinea(e)) return <span className="h-[11px] w-[11px] shrink-0" style={{ background: e.color, opacity: e.payload?.fillOpacity }} />
  return <svg width="18" height="11" className="shrink-0" aria-hidden><line x1="0" y1="5.5" x2="18" y2="5.5" stroke={e.color} strokeWidth="2.5" strokeDasharray={e.payload?.strokeDasharray} /></svg>
}
function Leyenda({ payload }: { payload?: Entrada[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pb-3.5 text-[13px]">
      {payload?.filter((e) => e.payload?.legendType !== 'none' && e.type !== 'none').map((e) => (
        <span key={e.value} className="flex items-center gap-1.5"><Muestra e={e} />{nombreLeyenda(e.value)}</span>
      ))}
    </div>
  )
}
export const leyendaArriba = { verticalAlign: 'top' as const, align: 'center' as const, content: <Leyenda /> }

// Cifra dentro de un tramo de barra, en blanco o tinta según el relleno; se omite si el tramo es muy bajo.
export function cifraInterior(fill: string, texto: (v: number, i: number) => string = String) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ x, y, width, height, value, index }: any) =>
    !value || height < 15 ? null : <text x={x + width / 2} y={y + height / 2} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={tintaSobre(fill)}>{texto(Number(value), index)}</text>
}
export const cifraArriba = { position: 'top' as const, style: { fontSize: 12, fontWeight: 700, fill: OSCURO } }

// Etiquetas sobre un gráfico de Recharts, ubicadas para no taparse (ubicarEtiquetas).
// `dominio` debe ser el mismo del eje Y. `fijas`: cifras de barras, siempre pegadas arriba (o abajo) de su valor;
// las demás etiquetas las esquivan.
export interface CifraFija { i: number; v: number; texto: string; color: string; abajo?: boolean }
export function etiquetasRecharts(etiquetas: Etiqueta[], puntos: { i: number; v: number }[], categorias: string[], dominio: [number, number], fijas: CifraFija[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function Etiquetas({ offset, xAxisMap }: any) {
    if (!offset || !xAxisMap) return null
    const eje = Object.values(xAxisMap)[0] as { scale: ((v: string) => number) & { bandwidth?: () => number } }
    const mitad = eje.scale.bandwidth ? eje.scale.bandwidth() / 2 : 0
    const trazado = { meses: categorias.length, ancho: offset.width, alto: offset.height, min: dominio[0], max: dominio[1], xDe: (i: number) => eje.scale(categorias[i]) + mitad - offset.left }
    const medidas = { anchoTexto: (t: string) => t.length * 7 + 6, alto: 15, separacion: 5 }
    const colocadas = fijas.map((f) => {
      const p = puntoEnTrazado(trazado, f.i, f.v)
      return { ...f, x: p.x, y: f.abajo ? p.y + 3 + medidas.alto / 2 : p.y - 3 - medidas.alto / 2, w: medidas.anchoTexto(f.texto) }
    })
    const cajas: Caja[] = colocadas.map((f) => ({ x0: f.x - f.w / 2, y0: f.y - medidas.alto / 2, x1: f.x + f.w / 2, y1: f.y + medidas.alto / 2 }))
    const ubicadas = ubicarEtiquetas(etiquetas, puntos, trazado, medidas, cajas)
    return (
      <g transform={`translate(${offset.left},${offset.top})`} pointerEvents="none">
        {colocadas.map((f, k) => (
          <text key={`f${k}`} x={f.x} y={f.y} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={f.color}>{f.texto}</text>
        ))}
        {ubicadas.map((e) => (
          <text key={e.id} x={e.x} y={e.y} dy="0.35em" textAnchor="middle" fontSize={11.5} fontWeight={700} fill={e.color} stroke="#fff" strokeWidth={3} paintOrder="stroke">{e.texto}</text>
        ))}
      </g>
    )
  }
}

// Escala del eje Y con marcas redondas (1, 2, 5 × 10ⁿ) y aire arriba para las etiquetas.
export function escala(valores: number[], aire = 0.18): { dominio: [number, number]; marcas: number[] } {
  const min = Math.min(0, ...valores), max = Math.max(1, ...valores)
  const rango = (max - min) * (1 + aire)
  const p = 10 ** Math.floor(Math.log10(rango / 5))
  const paso = Math.max(1, [1, 2, 5, 10].map((m) => m * p).find((x) => rango / x <= 6)!)
  const bajo = min < 0 ? Math.floor((min - (max - min) * aire * 0.5) / paso) * paso : 0
  const alto = Math.ceil((max + (max - min) * aire) / paso) * paso
  return { dominio: [bajo, alto], marcas: Array.from({ length: Math.round((alto - bajo) / paso) + 1 }, (_, i) => bajo + i * paso) }
}

export { Desplegable } from './Desplegable'

export function ControlRango({ rango, meses, onChange }: { rango: Rango; meses: ClaveMes[]; onChange: (r: Rango) => void }) {
  const min = meses[0] && meses[0] < rango.desde ? meses[0] : rango.desde
  const finDatos = [meses.at(-1) ?? rango.hasta, mesActual()].sort().at(-1)!
  return <SelectorRangoMeses etiqueta="Período" desde={rango.desde} hasta={rango.hasta} min={min}
    atajos={atajosDeRango(mesActual(), min, finDatos)} onChange={(desde, hasta) => onChange({ desde, hasta })} />
}

export const Grupo = ({ children }: { children: ReactNode }) => <div className="flex flex-wrap items-end gap-2">{children}</div>
