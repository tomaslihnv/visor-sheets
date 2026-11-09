import { useMemo, useState, type ReactNode } from 'react'
import { Area, Bar, BarChart, Cell, ComposedChart, Customized, LabelList, Legend, Line, LineChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Edificio, Hoja } from '../../edificios'
import { useHoja, type Fila } from '../../datos/hojas'
import { useUnidades } from '../../datos/useUnidades'
import { mesActual } from '../../datos/fechas'
import { COLORES, colorMotivo, colorSerie } from '../../dominio/colores'
import type { Etiqueta } from '../../laminas/etiquetas'
import { Casilla, Mensaje, Tarjeta } from '../../ui/Tarjeta'
import { EsqueletoGrafico } from '../../ui/Esqueleto'
import { ControlRango, Desplegable, dominio, ejeX, ejeY, etiquetasRecharts, leyendaArriba } from '../../ui/graficos'
import {
  analisisSalidas, antiguedad, desgloseSalidas, eventosEntrada, flujoContratos, mesesConDatos, mesesFirma, motivosSalida,
  netosMensuales, rangoPorDefecto, renewalRate, tipologiasDe, tiposSalida, vencimientos, type Rango,
} from './datos'

const ALTO = 'h-80'
const tooltip = { contentStyle: { fontSize: 12, borderRadius: 8 }, cursor: { fill: '#2d33340a' } }

// Carga las hojas que usa un gráfico y muestra "cargando" o el error en la misma tarjeta.
function useHojas(edificio: Edificio, hojas: Hoja[]) {
  const estados = hojas.map((h) => useHoja(edificio, h)) // eslint-disable-line react-hooks/rules-of-hooks -- la lista es fija por gráfico
  const cargando = estados.some((e) => e.cargando)
  const error = estados.find((e): e is { cargando: false; error: string } => 'error' in e)?.error
  const datos = estados.map((e) => ('datos' in e ? e.datos : [])) as Fila[][]
  return { cargando, error, datos }
}

// Mientras llegan las hojas, un esqueleto con la forma del gráfico; al llegar, el gráfico entra con un fundido.
function Cuerpo({ cargando, error, vacio, forma = 'barras', children }: { cargando: boolean; error?: string; vacio: string | false; forma?: 'barras' | 'lineas' | 'dona'; children: ReactNode }) {
  if (cargando) return <EsqueletoGrafico tipo={forma} alto={ALTO} />
  if (error) return <Mensaje>{error}</Mensaje>
  if (vacio) return <Mensaje>{vacio}</Mensaje>
  return <div className={`${ALTO} aparecer`}><ResponsiveContainer>{children as React.ReactElement}</ResponsiveContainer></div>
}

function useRango(meses: string[]) {
  const [elegido, setRango] = useState<Rango | null>(null)
  const base = useMemo(() => rangoPorDefecto(meses), [meses])
  return [elegido ?? base, setRango] as const
}

const signo = (v: number) => (v > 0 ? `+${v}` : String(v))

// Etiqueta numérica sobre un total de barras apiladas.
const etiquetaTotal = { position: 'top' as const, style: { fontSize: 10, fontWeight: 700, fill: '#1a2332' } }
const etiquetaInterior = { position: 'center' as const, style: { fontSize: 9, fontWeight: 700, fill: '#fff' }, formatter: (v: unknown) => (Number(v) > 0 ? String(v) : '') }

// ── Nuevos arriendos netos ─────────────────────────────────────────────────────
export function GraficoNetos({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [evol] } = useHojas(edificio, ['evolucion'])
  const meses = useMemo(() => mesesConDatos(evol), [evol])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => netosMensuales(evol, rango, mesActual()), [evol, rango])
  const color = (p: (typeof puntos)[number]) => ((p.neto ?? 0) >= 0 ? (p.real ? COLORES.real : COLORES.proyectadoPositivo) : p.real ? COLORES.netoNegativo : COLORES.proyectadoNegativo)

  return (
    <Tarjeta titulo="Nuevos arriendos netos" subtitulo="Ingresos menos salidas por mes · real hasta el mes pasado, luego proyección"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.length && 'Sin datos en este período.'}>
        <BarChart data={puntos} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dominio(puntos.map((p) => p.neto ?? 0), 0.25)} />
          <Tooltip {...tooltip} formatter={(v) => [`${signo(Number(v))} un.`, 'Netos']} />
          <ReferenceLine y={0} stroke="#1a1810" strokeWidth={1.5} />
          <Bar dataKey="neto" radius={[3, 3, 3, 3]} isAnimationActive={false}>
            {puntos.map((p) => <Cell key={p.mes} fill={color(p)} />)}
            {conEtiquetas && <LabelList dataKey="neto" position="top" style={{ fontSize: 9, fontWeight: 700, fill: COLORES.real }} formatter={(v: unknown) => (v == null || v === 0 ? '' : signo(Number(v)))} />}
          </Bar>
        </BarChart>
      </Cuerpo>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-gris">
        {[['Positivo real', COLORES.real], ['Negativo real', COLORES.netoNegativo], ['Positivo proyectado', COLORES.proyectadoPositivo], ['Negativo proyectado', COLORES.proyectadoNegativo]].map(([n, c]) => (
          <span key={n} className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm" style={{ background: c }} />{n}</span>
        ))}
      </div>
    </Tarjeta>
  )
}

// ── Vencimientos ───────────────────────────────────────────────────────────────
export function GraficoVencimientos({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [venc] } = useHojas(edificio, ['venc'])
  const meses = useMemo(() => mesesConDatos(venc), [venc])
  const [rango, setRango] = useRango(meses)
  const [tipologia, setTipologia] = useState('')
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => vencimientos(venc, rango, tipologia), [venc, rango, tipologia])
  const hayPorDefinir = puntos.some((p) => p.porDefinir > 0)

  return (
    <Tarjeta titulo="Vencimientos" subtitulo="Contratos que vencen cada mes y qué pasó con ellos"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(venc)} onChange={setTipologia} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.some((p) => p.total) && 'Sin vencimientos en este período.'}>
        <ComposedChart data={puntos} margin={{ top: 18, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dominio(puntos.map((p) => p.total), 0.12)} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          <Bar dataKey="noRenovacion" name="No renovación" stackId="v" fill={COLORES.noRenovacion} isAnimationActive={false}>{conEtiquetas && <LabelList dataKey="noRenovacion" {...etiquetaInterior} />}</Bar>
          <Bar dataKey="renovacion" name="Renovación" stackId="v" fill={COLORES.renovacion} isAnimationActive={false}>{conEtiquetas && <LabelList dataKey="renovacion" {...etiquetaInterior} />}</Bar>
          {hayPorDefinir && <Bar dataKey="porDefinir" name="Por definir" stackId="v" fill={COLORES.porDefinir} isAnimationActive={false}>{conEtiquetas && <LabelList dataKey="porDefinir" {...etiquetaInterior} style={{ ...etiquetaInterior.style, fill: '#64748b' }} />}</Bar>}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...etiquetaTotal} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} /></Line>
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Renewal rate ───────────────────────────────────────────────────────────────
export function GraficoRenewal({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [venc] } = useHojas(edificio, ['venc'])
  const meses = useMemo(() => mesesConDatos(venc), [venc])
  const [rango, setRango] = useRango(meses)
  const [tipologia, setTipologia] = useState('')
  const [conEtiquetas, setEtiquetas] = useState(true)
  const [conPromedio, setPromedio] = useState(true)
  const { puntos, promedio } = useMemo(() => renewalRate(venc, rango, tipologia), [venc, rango, tipologia])
  const etiquetas: Etiqueta[] = puntos.flatMap((p, i) => (p.pct === null ? [] : [{ id: `r${i}`, i, v: p.pct, texto: `${p.pct.toFixed(1)}%`, color: COLORES.real, prioridad: 1 }]))

  return (
    <Tarjeta titulo="Renewal rate" subtitulo={promedio === null ? '% de contratos que vencieron y se renovaron' : `% de contratos que vencieron y se renovaron · promedio ${promedio.toFixed(1)}%`}
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(venc)} onChange={setTipologia} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /><Casilla etiqueta="Promedio" valor={conPromedio} onChange={setPromedio} /></>}>
      <Cuerpo forma="lineas" cargando={cargando} error={error} vacio={!puntos.some((p) => p.pct !== null) && 'Sin vencimientos con resultado en este período.'}>
        <ComposedChart data={puntos} margin={{ top: 16, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Renewal rate (%)')} domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...tooltip} formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% (${item.payload.renovados} de ${item.payload.total})`, 'Renewal rate']} />
          <Area dataKey="pct" name="Renewal rate" stroke={COLORES.real} strokeWidth={2.5} fill={COLORES.real} fillOpacity={0.07} dot={{ r: 2.5, fill: COLORES.real }} connectNulls type="monotone" isAnimationActive={false} />
          {conPromedio && promedio !== null && <ReferenceLine y={promedio} stroke="#ef4444" strokeOpacity={0.6} strokeDasharray="6 5" label={{ value: `Promedio ${promedio.toFixed(1)}%`, position: 'insideTopRight', fontSize: 10, fill: '#b91c1c' }} />}
          {conEtiquetas && <Customized component={etiquetasRecharts(etiquetas, etiquetas.map((e) => ({ i: e.i, v: e.v })), puntos.map((p) => p.etiqueta), [0, 120])} />}
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Eventos de entrada ─────────────────────────────────────────────────────────
export function GraficoEntrada({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [contratos] } = useHojas(edificio, ['contratos'])
  const meses = useMemo(() => mesesFirma(contratos), [contratos])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const { tipos, puntos } = useMemo(() => eventosEntrada(contratos, rango), [contratos, rango])
  const dom = dominio(puntos.flatMap((p) => tipos.map((t) => Number(p[t]))), 0.2)
  const etiquetas: Etiqueta[] = tipos.flatMap((t, s) => puntos.flatMap((p, i) => (Number(p[t]) > 0 ? [{ id: `${t}${i}`, i, v: Number(p[t]), texto: String(p[t]), color: colorSerie(s), prioridad: 1 }] : [])))

  return (
    <Tarjeta titulo="Eventos de entrada" subtitulo="Contratos firmados cada mes, por tipo de entrada"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo forma="lineas" cargando={cargando} error={error} vacio={!tipos.length && 'La hoja I. Contratos no tiene eventos de entrada.'}>
        <LineChart data={puntos} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dom} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} iconType="circle" />
          {tipos.map((t, s) => <Line key={t} dataKey={t} stroke={colorSerie(s)} strokeWidth={2} dot={{ r: 2.5, fill: colorSerie(s) }} type="monotone" isAnimationActive={false} />)}
          {conEtiquetas && <Customized component={etiquetasRecharts(etiquetas, etiquetas.map((e) => ({ i: e.i, v: e.v })), puntos.map((p) => p.etiqueta), dom)} />}
        </LineChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Contratos, salidas y netos ─────────────────────────────────────────────────
export function GraficoFlujo({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [contratos, sal] } = useHojas(edificio, ['contratos', 'sal'])
  const meses = useMemo(() => [...new Set([...mesesFirma(contratos), ...mesesConDatos(sal)])].sort(), [contratos, sal])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => flujoContratos(contratos, sal, rango), [contratos, sal, rango])
  const series = [
    { clave: 'nuevos', nombre: 'Nuevos contratos', color: COLORES.nuevosContratos },
    { clave: 'salidas', nombre: 'Salidas', color: COLORES.salidas },
    { clave: 'netos', nombre: 'Netos', color: COLORES.netos },
  ] as const
  const dom = dominio(puntos.flatMap((p) => [p.nuevos, p.salidas, p.netos]), 0.2)
  const etiquetas: Etiqueta[] = series.flatMap((s) => puntos.flatMap((p, i) => (p[s.clave] !== 0 ? [{ id: `${s.clave}${i}`, i, v: p[s.clave], texto: s.clave === 'netos' ? signo(p.netos) : String(p[s.clave]), color: s.color, prioridad: s.clave === 'netos' ? 1 : 2 }] : [])))

  return (
    <Tarjeta titulo="Contratos, salidas y netos" subtitulo="Firmas (I. Contratos) y salidas (hoja Salidas) por mes"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo forma="lineas" cargando={cargando} error={error} vacio={!puntos.length && 'Sin datos en este período.'}>
        <LineChart data={puntos} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dom} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} iconType="circle" />
          <ReferenceLine y={0} stroke="#1a1810" />
          {series.map((s) => <Line key={s.clave} dataKey={s.clave} name={s.nombre} stroke={s.color} strokeWidth={2} dot={{ r: 2.5, fill: s.color }} type="monotone" isAnimationActive={false} />)}
          {conEtiquetas && <Customized component={etiquetasRecharts(etiquetas, etiquetas.map((e) => ({ i: e.i, v: e.v })), puntos.map((p) => p.etiqueta), dom)} />}
        </LineChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Análisis de salidas ────────────────────────────────────────────────────────
export function GraficoSalidas({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [sal] } = useHojas(edificio, ['sal'])
  const meses = useMemo(() => mesesConDatos(sal), [sal])
  const [rango, setRango] = useRango(meses)
  const [tipo, setTipo] = useState('')
  const [conEtiquetas, setEtiquetas] = useState(true)
  const [enPct, setPct] = useState(false)
  const { motivos, puntos } = useMemo(() => analisisSalidas(sal, rango, tipo), [sal, rango, tipo])
  const interior = (m: string) => ({
    ...etiquetaInterior,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: ({ x, y, width, height, value, index }: any) => {
      if (!value || height < 11) return null
      const t = enPct ? `${Math.round((value / Number(puntos[index].total)) * 100)}%` : String(value)
      return <text x={x + width / 2} y={y + height / 2} dy="0.35em" textAnchor="middle" fontSize={9} fontWeight={700} fill="#fff">{t}</text>
    },
    dataKey: m,
  })

  return (
    <Tarjeta titulo="Análisis de salidas" subtitulo="Salidas por mes según motivo"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipo" valor={tipo} opciones={tiposSalida(sal)} onChange={setTipo} todos="Todos" /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /><Casilla etiqueta="% del total" valor={enPct} onChange={setPct} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!motivos.length && 'Sin salidas registradas en este período.'}>
        <ComposedChart data={puntos} margin={{ top: 18, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dominio(puntos.map((p) => Number(p.total)), 0.15)} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          {motivos.map((m) => <Bar key={m} dataKey={m} stackId="s" fill={colorMotivo(m)} isAnimationActive={false}>{conEtiquetas && <LabelList {...interior(m)} />}</Bar>)}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...etiquetaTotal} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} /></Line>
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Desglose de salidas ────────────────────────────────────────────────────────
export function GraficoDesglose({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [sal] } = useHojas(edificio, ['sal'])
  const meses = useMemo(() => mesesConDatos(sal), [sal])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => desgloseSalidas(sal, rango), [sal, rango])

  return (
    <Tarjeta titulo="Desglose de salidas" subtitulo="No renovación frente a salida anticipada"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.some((p) => p.total) && 'Sin salidas registradas en este período.'}>
        <ComposedChart data={puntos} margin={{ top: 18, right: 8, bottom: 4, left: 0 }}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={dominio(puntos.map((p) => p.total), 0.12)} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          <Bar dataKey="noRenovacion" name="No renovación" stackId="d" fill={COLORES.noRenovacion} isAnimationActive={false}>{conEtiquetas && <LabelList dataKey="noRenovacion" {...etiquetaInterior} />}</Bar>
          <Bar dataKey="anticipada" name="Salida anticipada" stackId="d" fill={COLORES.salidaAnticipada} isAnimationActive={false}>{conEtiquetas && <LabelList dataKey="anticipada" {...etiquetaInterior} />}</Bar>
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...etiquetaTotal} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} /></Line>
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Motivo de salida ───────────────────────────────────────────────────────────
export function GraficoMotivo({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [sal] } = useHojas(edificio, ['sal'])
  const meses = useMemo(() => mesesConDatos(sal), [sal])
  const [rango, setRango] = useRango(meses)
  const [tipologia, setTipologia] = useState('')
  const [tipo, setTipo] = useState('')
  const [conEtiquetas, setEtiquetas] = useState(true)
  const filas = useMemo(() => motivosSalida(sal, rango, { tipologia, tipo }), [sal, rango, tipologia, tipo])

  return (
    <Tarjeta titulo="Motivo de salida" subtitulo="% de las salidas del período"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(sal)} onChange={setTipologia} /><Desplegable etiqueta="Tipo" valor={tipo} opciones={tiposSalida(sal)} onChange={setTipo} todos="Todos" /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!filas.length && 'Sin salidas registradas en este período.'}>
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 8 }}>
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...ejeX} />
          <YAxis type="category" dataKey="motivo" width={170} tick={{ fontSize: 11, fill: '#2d3334' }} tickLine={false} axisLine={{ stroke: '#2d3334' }} />
          <Tooltip {...tooltip} formatter={(v, _n, item) => [`${v}% (${item.payload.n})`, 'Salidas']} />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
            {filas.map((f) => <Cell key={f.motivo} fill={colorMotivo(f.motivo)} />)}
            {conEtiquetas && <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${v}%`} style={{ fontSize: 10, fontWeight: 600, fill: '#3a4f63' }} />}
          </Bar>
        </BarChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Antigüedad de contratos ────────────────────────────────────────────────────
export function GraficoAntiguedad({ edificio }: { edificio: Edificio }) {
  const { estatus, unidades } = useUnidades(edificio)
  const [tipo, setTipo] = useState('')
  const [conEtiquetas, setEtiquetas] = useState(true)
  const tipos = useMemo(() => [...new Set([...unidades.values()].map((u) => u.tipo).filter(Boolean))].sort(), [unidades])
  const a = useMemo(() => antiguedad(unidades.values(), tipo), [unidades, tipo])
  const chip = (t: string) => <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-gris">{t}</span>

  return (
    <Tarjeta titulo="Antigüedad de contratos" subtitulo="Contratos vigentes según el tiempo desde su firma"
      controles={<><Desplegable etiqueta="Tipología" valor={tipo} opciones={tipos} onChange={setTipo} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} />{chip(`Perm. anual (>12m): ${a.anual}%`)}{chip(`Perm. semestral (>6m): ${a.semestral}%`)}</>}>
      <Cuerpo forma="dona" cargando={estatus.cargando} error={'error' in estatus ? estatus.error : undefined} vacio={!a.total && 'Sin contratos vigentes con fecha de firma.'}>
        <PieChart>
          <Pie data={a.tramos} dataKey="n" nameKey="nombre" innerRadius="55%" outerRadius="85%" stroke="#fff" strokeWidth={2} isAnimationActive={false}
            label={conEtiquetas ? ({ pct, n }: { pct: number; n: number }) => (n ? `${pct}% (${n})` : '') : false} labelLine={false}>
            {a.tramos.map((t) => <Cell key={t.nombre} fill={t.color} />)}
          </Pie>
          <Tooltip {...tooltip} formatter={(v, n) => [`${v} unidades`, n]} />
          <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} formatter={(n: string) => { const t = a.tramos.find((x) => x.nombre === n)!; return `${n} — ${t.n} un. (${t.pct}%)` }} />
        </PieChart>
      </Cuerpo>
    </Tarjeta>
  )
}
