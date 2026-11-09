import { useEffect, useMemo, useState } from 'react'
import { Customized, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Edificio } from '../../edificios'
import { useHoja } from '../../datos/hojas'
import { etiquetaMesLarga, mesActual, sumarMeses } from '../../datos/fechas'
import { Mensaje } from '../../ui/Tarjeta'
import { Bloque, EsqueletoGrafico } from '../../ui/Esqueleto'
import { SelectorMes, SelectorRangoMeses, Segmentado, atajosDeRango } from '../../ui/SelectorMes'
import { mesesDisponibles } from '../../indicadores/evolucionArriendos/datos'
import { META_OCUPACION, formatoNumero, formatoPct, formatoVariacion, laminaOcupacion, opcionesPorDefecto, type LaminaOcupacion, type Opciones } from './datos'
import { COLOR_META, COLOR_NEGATIVO, COLOR_POSITIVO, COLOR_PRESUPUESTO } from './pptx'
import { ubicarEtiquetas } from '../etiquetas'
import { etiquetasOcupacion } from './etiquetas'

const PRESUPUESTO = '#' + COLOR_PRESUPUESTO
const META = '#' + COLOR_META

// Vista previa de la lámina en la web: mismo contenido que la de PowerPoint, adaptada al ancho de la pantalla.
export function LaminaOcupacionVista({ edificio, onLamina }: { edificio: Edificio; onLamina: (l: LaminaOcupacion | null) => void }) {
  const hoja = useHoja(edificio, 'evolucion')
  const filas = 'datos' in hoja ? hoja.datos : null
  const [elegidas, setElegidas] = useState<Partial<Opciones>>({})

  const base = useMemo(() => (filas ? opcionesPorDefecto(filas) : null), [filas])
  const meses = useMemo(() => (filas ? mesesDisponibles(filas) : []), [filas])
  const opciones: Opciones | null = base && { ...base, ...elegidas }
  const lamina = useMemo(() => (filas && opciones ? laminaOcupacion(filas, opciones) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filas, opciones?.mesReporte, opciones?.mesesTabla, opciones?.desde, opciones?.hasta])
  useEffect(() => onLamina(lamina), [lamina, onLamina])

  // Esqueleto con la forma de la lámina: controles, título, tabla y gráfico.
  if (hoja.cargando) return (
    <div className="space-y-4" role="status" aria-label="Cargando lámina">
      <div className="flex flex-wrap gap-3"><Bloque className="h-10 w-36" /><Bloque className="h-10 w-40" /><Bloque className="h-10 w-48" /><Bloque className="ml-auto h-10 w-44" /></div>
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <Bloque className="h-7 w-2/3 max-w-xl" />
        <Bloque className="mt-3 h-1.5 w-full" />
        <div className="mt-6 space-y-2">{Array.from({ length: 6 }, (_, i) => <Bloque key={i} className="h-6 w-full" style={{ opacity: 1 - i * 0.08 }} />)}</div>
        <div className="mt-6"><EsqueletoGrafico tipo="lineas" alto="h-72 sm:h-96" /></div>
      </div>
    </div>
  )
  if ('error' in hoja) return <Mensaje>No se pudo leer la hoja Evolución: {hoja.error}</Mensaje>
  if (!opciones || !lamina) return <Mensaje>La hoja Evolución no tiene meses.</Mensaje>



  const { color } = edificio
  const { etiquetas, puntos } = etiquetasOcupacion(lamina, { texto: color.base, presupuesto: '#5b6670' })
  // Mismas reglas de la lámina: ninguna etiqueta tapa a otra ni a un punto; las que no caben se omiten.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Etiquetas = ({ offset, xAxisMap }: any) => {
    if (!offset || !xAxisMap) return null
    const eje = Object.values(xAxisMap)[0] as { scale: ((v: string) => number) & { bandwidth?: () => number } }
    const mitad = eje.scale.bandwidth ? eje.scale.bandwidth() / 2 : 0
    const ubicadas = ubicarEtiquetas(etiquetas, puntos,
      { meses: lamina!.puntos.length, ancho: offset.width, alto: offset.height, max: 100, xDe: (i) => eje.scale(lamina!.puntos[i].etiqueta) + mitad - offset.left },
      { anchoTexto: (t) => t.length * 6.5 + 6, alto: 14, separacion: 5 })
    return (
      <g transform={`translate(${offset.left},${offset.top})`}>
        {ubicadas.map((e) => (
          <text key={e.id} x={e.x} y={e.y} dy="0.35em" textAnchor="middle" fontSize={10} fontWeight={700} fill={e.color}
            stroke="#fff" strokeWidth={3} paintOrder="stroke">{e.texto}</text>
        ))}
      </g>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <SelectorMes etiqueta="Mes del reporte" valor={opciones.mesReporte} min={meses[0]} max={meses.at(-1)!}
          atajos={[{ nombre: 'Último mes con datos', mes: base!.mesReporte }, { nombre: 'Mes pasado', mes: sumarMeses(mesActual(), -1) }, { nombre: 'Este mes', mes: mesActual() }]}
          onChange={(mesReporte) => setElegidas((o) => ({ ...o, mesReporte }))} />
        <Segmentado etiqueta="Meses reales en la tabla" valor={opciones.mesesTabla} opciones={[1, 3, 6, 12]} onChange={(mesesTabla) => setElegidas((o) => ({ ...o, mesesTabla }))} />
        <SelectorRangoMeses etiqueta="Período del gráfico" desde={opciones.desde} hasta={opciones.hasta} min={meses[0]}
          atajos={atajosDeRango(opciones.mesReporte, meses[0], meses.at(-1)!)} onChange={(desde, hasta) => setElegidas((o) => ({ ...o, desde, hasta }))} />
      </div>

      <article className="aparecer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <header className="mb-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold sm:text-2xl">{edificio.nombre} | Ocupación y arriendos netos</h2>
            <p className="text-sm text-gris">Mes del reporte: {etiquetaMesLarga(lamina.mesReporte)}</p>
          </div>
          <div className="mt-2 flex h-1.5"><div className="w-[49%] bg-burdeo" /><div className="flex-1 bg-gris-claro" /></div>
        </header>

        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-sm tabular-nums">
            <thead>
              <tr className="text-white">
                <th className="bg-oscuro px-3 py-1.5 text-left font-medium" />
                {/* Meses proyectados en gris: valores de forecast, no reales. */}
                {lamina.tabla.map((m) => <th key={m.mes} className={`min-w-16 px-2 py-1.5 font-medium ${m.proyectado ? 'bg-gris-claro' : 'bg-oscuro'}`}>{m.etiqueta}</th>)}
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-slate-100 [&_td]:px-3 [&_td]:py-1.5 [&_td]:text-center [&_th]:border-b [&_th]:border-slate-100 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:whitespace-nowrap">
              <tr><th>Ingresos</th>{lamina.tabla.map((m) => <td key={m.mes} className={m.proyectado ? 'italic text-gris' : ''}>{formatoNumero(m.ingresos)}</td>)}</tr>
              <tr><th>Salidas</th>{lamina.tabla.map((m) => <td key={m.mes} className={m.proyectado ? 'italic text-gris' : ''}>{formatoNumero(m.salidas)}</td>)}</tr>
              <tr><th>Neto</th>{lamina.tabla.map((m) => <td key={m.mes} className={`font-bold ${m.proyectado ? 'italic text-gris' : ''}`}>{formatoNumero(m.neto)}</td>)}</tr>
              <tr><th>Presupuesto (neto)</th>{lamina.tabla.map((m) => <td key={m.mes} className="text-gris">{formatoNumero(m.presupuesto)}</td>)}</tr>
              <tr className="border-t-2 border-oscuro">
                <th>Var. neto vs. ppto.</th>
                {lamina.tabla.map((m) => (
                  <td key={m.mes} className={`font-bold ${m.proyectado ? 'italic' : ''}`} style={{ color: m.variacion === null ? undefined : '#' + (m.variacion >= 0 ? COLOR_POSITIVO : COLOR_NEGATIVO) }}>
                    {formatoVariacion(m.variacion)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 h-72 sm:h-96">
          <ResponsiveContainer>
            <LineChart data={lamina.puntos} margin={{ top: 8, right: 40, bottom: 16, left: 0 }}>
              {/* Sin grilla; ejes marcados y con título (X horizontal, Y vertical). */}
              <XAxis dataKey="etiqueta" tick={{ fontSize: 10, fill: '#5b6670' }} tickLine={{ stroke: '#2d3334' }} axisLine={{ stroke: '#2d3334' }} minTickGap={6}
                label={{ value: 'Mes', position: 'insideBottom', offset: -4, fontSize: 11, fill: '#2d3334', fontWeight: 600 }} />
              <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#5b6670' }} tickLine={{ stroke: '#2d3334' }} axisLine={{ stroke: '#2d3334' }} width={56}
                label={{ value: 'Ocupación (%)', angle: -90, position: 'insideLeft', offset: 4, style: { textAnchor: 'middle' }, fontSize: 11, fill: '#2d3334', fontWeight: 600 }} />
              <Tooltip formatter={(v) => formatoPct(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Legend verticalAlign="top" iconType="plainline" wrapperStyle={{ fontSize: 12, paddingBottom: 12 }} />
              <ReferenceLine y={META_OCUPACION} stroke={META} strokeWidth={1.5}
                label={{ value: `${META_OCUPACION}%`, position: 'right', fill: META, fontSize: 10, fontWeight: 700 }} />
              <Line dataKey="presupuesto" name="Presupuesto" stroke={PRESUPUESTO} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="forecast" name="Forecast" stroke={color.linea} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls={false} isAnimationActive={false} />
              <Line dataKey="real" name="Ocupación real" stroke={color.linea} strokeWidth={2.5} dot={{ r: 3, fill: color.linea }} connectNulls={false} isAnimationActive={false} />
              <Customized component={Etiquetas} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-2 text-[11px] text-gris">Fuente: hoja Evolución. Ocupación = arriendos acumulados / {lamina.totalUnidades ?? '—'} unidades. Neto = ingresos − salidas. Columnas en gris: proyección (forecast).</p>
      </article>
    </div>
  )
}
