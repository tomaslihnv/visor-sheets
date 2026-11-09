import { useMemo, useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts'
import type { Edificio } from '../../edificios'
import { useHoja } from '../../datos/hojas'
import { Casilla, Mensaje, Tarjeta } from '../../ui/Tarjeta'
import { EsqueletoGrafico } from '../../ui/Esqueleto'
import { SelectorMes, SelectorRangoMeses, atajosDeRango } from '../../ui/SelectorMes'
import { mesActual, sumarMeses } from '../../datos/fechas'
import { evolucionArriendos, mesesDisponibles, opcionesPorDefecto, type Opciones, type PuntoEvolucion } from './datos'

// Los mismos colores de las láminas (exportarPptx.ts de los otros proyectos).
const C = { real: '#96323c', proyectado: '#d7a1a7', linea: '#2d3334', lineaProy: '#a5acb2', presupuesto: '#5b6670', grilla: '#eef0f2', eje: '#5b6670' }

type PuntoGrafico = PuntoEvolucion & { pctReal: number | null; pctProy: number | null; lblReal: string; lblProy: string }

export function EvolucionArriendos({ edificio }: { edificio: Edificio }) {
  const hoja = useHoja(edificio, 'evolucion')
  const filas = 'datos' in hoja ? hoja.datos : null
  const [elegidas, setElegidas] = useState<Partial<Opciones>>({})
  const [etiquetas, setEtiquetas] = useState(true)
  const [presupuesto, setPresupuesto] = useState(false)

  const base = useMemo(() => (filas ? opcionesPorDefecto(filas) : null), [filas])
  const meses = useMemo(() => (filas ? mesesDisponibles(filas) : []), [filas])
  const opciones: Opciones | null = base && { ...base, ...elegidas }
  const evolucion = useMemo(
    () => (filas && opciones && opciones.desde <= opciones.hasta ? evolucionArriendos(filas, opciones) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filas, opciones?.desde, opciones?.hasta, opciones?.corte],
  )

  const datos: PuntoGrafico[] = useMemo(() => {
    if (!evolucion) return []
    const ultimoReal = evolucion.puntos.reduce((i, p, j) => (p.real !== null ? j : i), -1)
    const pct = (v: number | null) => (v === null ? '' : `${Math.round(v)}%`)
    return evolucion.puntos.map((p, i) => ({
      ...p,
      pctReal: i <= ultimoReal ? p.pct : null,
      pctProy: i >= ultimoReal ? p.pct : null, // comparte el punto del corte para que la línea no quede cortada
      lblReal: p.real !== null ? pct(p.pct) : '',
      lblProy: p.proyectado !== null ? pct(p.pct) : '',
    }))
  }, [evolucion])

  const controles = opciones && (
    <>
      <SelectorRangoMeses etiqueta="Período" desde={opciones.desde} hasta={opciones.hasta} min={meses[0]}
        atajos={atajosDeRango(opciones.corte, meses[0], meses.at(-1)!)} onChange={(desde, hasta) => setElegidas((o) => ({ ...o, desde, hasta }))} />
      <SelectorMes etiqueta="Corte (real / proyección)" valor={opciones.corte} min={meses[0]} max={meses.at(-1)!}
        atajos={[{ nombre: 'Este mes', mes: mesActual() }, { nombre: 'Mes pasado', mes: sumarMeses(mesActual(), -1) }]}
        onChange={(corte) => setElegidas((o) => ({ ...o, corte }))} />
      <Casilla etiqueta="Etiquetas" valor={etiquetas} onChange={setEtiquetas} />
      <Casilla etiqueta="Presupuesto" valor={presupuesto} onChange={setPresupuesto} />
    </>
  )

  const total = evolucion?.totalUnidades
  const subtitulo = 'Unidades arrendadas acumuladas y % de ocupación' + (total ? ` · ${total} unidades` : '')

  let cuerpo
  if (hoja.cargando) cuerpo = <EsqueletoGrafico alto="h-96" />
  else if ('error' in hoja) cuerpo = <Mensaje>No se pudo leer la hoja Evolución: {hoja.error}</Mensaje>
  else if (opciones && opciones.desde > opciones.hasta) cuerpo = <Mensaje>“Desde” es posterior a “Hasta”.</Mensaje>
  else if (!datos.length) cuerpo = <Mensaje>Sin datos en este período.</Mensaje>
  else cuerpo = (
    <div className="h-96 aparecer">
      <ResponsiveContainer>
        <ComposedChart data={datos} margin={{ top: 20, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={C.grilla} />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={{ stroke: C.grilla }} interval="preserveStartEnd" minTickGap={8} />
          {/* Ejes alineados: el 100% del eje izquierdo cae a la altura del total de unidades del derecho. */}
          <YAxis yAxisId="pct" domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={false} width={44} />
          <YAxis yAxisId="un" orientation="right" domain={[0, total ? Math.ceil(total * 1.2) : 'auto']} tick={{ fontSize: 11, fill: C.eje }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip content={<Detalle />} cursor={{ fill: '#96323c0d' }} />
          <Legend verticalAlign="top" align="left" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: C.eje }} />
          <Bar yAxisId="un" dataKey="real" name="Arrendadas (real)" stackId="u" fill={C.real} radius={[3, 3, 0, 0]} maxBarSize={28}>
            {etiquetas && <LabelList dataKey="lblReal" position="top" style={{ fontSize: 9, fill: C.real, fontWeight: 600 }} />}
          </Bar>
          <Bar yAxisId="un" dataKey="proyectado" name="Arrendadas (proyección)" stackId="u" fill={C.proyectado} radius={[3, 3, 0, 0]} maxBarSize={28}>
            {etiquetas && <LabelList dataKey="lblProy" position="top" style={{ fontSize: 9, fill: C.eje, fontWeight: 600 }} />}
          </Bar>
          <Line yAxisId="pct" dataKey="pctReal" name="Ocupación %" stroke={C.linea} strokeWidth={2.5} dot={{ r: 2.5, fill: C.linea }} type="monotone" connectNulls={false} />
          <Line yAxisId="pct" dataKey="pctProy" name="Ocupación % (proyección)" stroke={C.lineaProy} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2, fill: C.lineaProy }} type="monotone" connectNulls={false} legendType="plainline" />
          {presupuesto && <Line yAxisId="un" dataKey="presupuesto" name="Presupuesto (un.)" stroke={C.presupuesto} strokeWidth={1.5} strokeDasharray="2 3" dot={false} type="monotone" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )

  return <Tarjeta titulo="Evolución de arriendos" subtitulo={subtitulo} controles={controles}>{cuerpo}</Tarjeta>
}

function Detalle({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload as PuntoGrafico
  const u = p.real ?? p.proyectado
  const fila = (k: string, v: string) => (
    <div className="flex justify-between gap-6"><span className="text-gris">{k}</span><span className="font-medium">{v}</span></div>
  )
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-md ring-1 ring-slate-200">
      <p className="mb-1 font-bold">{p.etiqueta} · {p.real !== null ? 'real' : 'proyección'}</p>
      {fila('Arrendadas', u === null ? '—' : `${u} un.`)}
      {fila('Ocupación', p.pct === null ? '—' : `${p.pct}%`)}
      {fila('Presupuesto', p.presupuesto === null ? '—' : `${p.presupuesto} un.`)}
    </div>
  )
}
