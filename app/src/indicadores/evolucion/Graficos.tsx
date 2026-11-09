import { useMemo, useState, type ReactNode } from 'react'
import { Bar, BarChart, Cell, ComposedChart, Customized, LabelList, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Edificio, Hoja } from '../../edificios'
import { useHoja, type Fila } from '../../datos/hojas'
import { useUnidades } from '../../datos/useUnidades'
import { mesActual } from '../../datos/fechas'
import { COLORES, TINTA, colorMotivo, colorSerie } from '../../dominio/colores'
import type { Etiqueta } from '../../laminas/etiquetas'
import { Casilla, Mensaje, Tarjeta } from '../../ui/Tarjeta'
import { EsqueletoGrafico } from '../../ui/Esqueleto'
import { ControlRango, Desplegable, type CifraFija, cifraArriba, cifraInterior, ejeX, ejeY, escala, etiquetasRecharts, leyendaArriba, nombreLeyenda } from '../../ui/graficos'
import {
  analisisSalidas, antiguedad, desgloseSalidas, eventosEntrada, flujoContratos, mesesConDatos, mesesFirma, motivosSalida,
  netosMensuales, rangoPorDefecto, renewalRate, tipologiasDe, tiposSalida, vencimientos, type Rango,
} from './datos'

const ALTO = 'h-80'
const tooltip = { contentStyle: { fontSize: 13, borderRadius: 8 }, cursor: { fill: '#2d33340a' } }

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
const total = (v: unknown) => (Number(v) > 0 ? String(v) : '')
const margen = { top: 22, right: 12, bottom: 4, left: 0 }

// ── Nuevos arriendos netos ─────────────────────────────────────────────────────
export function GraficoNetos({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [evol] } = useHojas(edificio, ['evolucion'])
  const meses = useMemo(() => mesesConDatos(evol), [evol])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => netosMensuales(evol, rango, mesActual()), [evol, rango])
  // Gris SITU si suma, rojo SITU si resta; la proyección, del mismo color pero transparente.
  const color = (p: (typeof puntos)[number]) => ((p.neto ?? 0) >= 0 ? COLORES.real : COLORES.situ)
  const PROY = 0.35
  const e = escala(puntos.map((p) => p.neto ?? 0), 0.25)
  const leyenda = [['Positivo real', COLORES.real], ['Negativo real', COLORES.situ], ['Positivo proyectado', `${COLORES.real}59`], ['Negativo proyectado', `${COLORES.situ}59`]]
    .map(([value, color]) => ({ value, color, type: 'square' as const, id: value }))

  return (
    <Tarjeta titulo="Nuevos arriendos netos"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.length && 'Sin datos en este período.'}>
        <BarChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} formatter={(v) => [`${signo(Number(v))} un.`, 'Netos']} />
          <Legend {...leyendaArriba} payload={leyenda} />
          <ReferenceLine y={0} stroke={TINTA} strokeWidth={1.5} />
          <Bar dataKey="neto" radius={[3, 3, 3, 3]} maxBarSize={44} isAnimationActive={false}>
            {puntos.map((p) => <Cell key={p.mes} fill={color(p)} fillOpacity={p.real ? 1 : PROY} />)}
            {conEtiquetas && <LabelList dataKey="neto" position="top" style={cifraArriba.style} formatter={(v: unknown) => (v == null || v === 0 ? '' : signo(Number(v)))} />}
          </Bar>
        </BarChart>
      </Cuerpo>
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
  const e = escala(puntos.map((p) => p.total), 0.12)
  const tramo = (clave: 'noRenovacion' | 'renovacion' | 'porDefinir', nombre: string) => (
    <Bar dataKey={clave} name={nombre} stackId="v" fill={COLORES[clave]} stroke="#fff" strokeWidth={1} maxBarSize={44} isAnimationActive={false}>
      {conEtiquetas && <LabelList dataKey={clave} content={cifraInterior(COLORES[clave])} />}
    </Bar>
  )

  return (
    <Tarjeta titulo="Vencimientos"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(venc)} onChange={setTipologia} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.some((p) => p.total) && 'Sin vencimientos en este período.'}>
        <ComposedChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          {tramo('noRenovacion', 'No renovación')}
          {tramo('renovacion', 'Renovación')}
          {hayPorDefinir && tramo('porDefinir', 'Por definir')}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...cifraArriba} formatter={total} /></Line>
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
  const pct = (v: number) => `${Math.round(v)}%`
  const etiquetas: Etiqueta[] = puntos.flatMap((p, i) => (p.pct === null ? [] : [{ id: `r${i}`, i, v: p.pct, texto: pct(p.pct), color: TINTA, prioridad: 1 }]))

  return (
    <Tarjeta titulo="Renewal rate"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(venc)} onChange={setTipologia} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /><Casilla etiqueta="Promedio" valor={conPromedio} onChange={setPromedio} /></>}>
      <Cuerpo forma="lineas" cargando={cargando} error={error} vacio={!puntos.some((p) => p.pct !== null) && 'Sin vencimientos con resultado en este período.'}>
        <ComposedChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Renewal rate')} domain={[0, 120]} ticks={[0, 20, 40, 60, 80, 100, 120]} tickFormatter={(v) => `${v}%`} />
          <Tooltip {...tooltip} formatter={(v, _n, item) => [`${Number(v).toFixed(1)}% (${item.payload.renovados} de ${item.payload.total})`, 'Renewal rate']} />
          <Line dataKey="pct" name="Renewal rate" stroke={COLORES.real} strokeWidth={2.5} dot={{ r: 3, fill: COLORES.real, stroke: '#fff', strokeWidth: 1.5 }} connectNulls type="monotone" isAnimationActive={false} />
          {conPromedio && promedio !== null && <ReferenceLine y={promedio} stroke={COLORES.situ} strokeWidth={2} strokeDasharray="6 5" label={{ value: `Promedio ${pct(promedio)}`, position: 'insideTopRight', fontSize: 12, fontWeight: 700, fill: COLORES.situ }} />}
          {conEtiquetas && <Customized component={etiquetasRecharts(etiquetas, etiquetas.map((x) => ({ i: x.i, v: x.v })), puntos.map((p) => p.etiqueta), [0, 120])} />}
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
  const { tipos, puntos } = useMemo(() => {
    const r = eventosEntrada(contratos, rango)
    return { tipos: r.tipos, puntos: r.puntos.map((p) => ({ ...p, total: r.tipos.reduce((t, k) => t + Number(p[k] ?? 0), 0) })) }
  }, [contratos, rango])
  const e = escala(puntos.map((p) => p.total), 0.12)

  return (
    <Tarjeta titulo="Eventos de entrada"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!tipos.length && 'La hoja I. Contratos no tiene eventos de entrada.'}>
        <ComposedChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Contratos')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          {tipos.map((t, i) => (
            <Bar key={t} dataKey={t} stackId="e" fill={colorSerie(i)} stroke="#fff" strokeWidth={1} maxBarSize={44} isAnimationActive={false}>
              {conEtiquetas && <LabelList dataKey={t} content={cifraInterior(colorSerie(i))} />}
            </Bar>
          ))}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...cifraArriba} formatter={total} /></Line>
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// ── Contratos, salidas y netos ─────────────────────────────────────────────────
// Para que no se confundan: firmas como barras hacia arriba, salidas como barras hacia abajo y los netos como
// la única línea, encima.
export function GraficoFlujo({ edificio }: { edificio: Edificio }) {
  const { cargando, error, datos: [contratos, sal] } = useHojas(edificio, ['contratos', 'sal'])
  const meses = useMemo(() => [...new Set([...mesesFirma(contratos), ...mesesConDatos(sal)])].sort(), [contratos, sal])
  const [rango, setRango] = useRango(meses)
  const [conEtiquetas, setEtiquetas] = useState(true)
  const puntos = useMemo(() => flujoContratos(contratos, sal, rango).map((p) => ({ ...p, bajan: -p.salidas })), [contratos, sal, rango])
  const e = escala(puntos.flatMap((p) => [p.nuevos, p.bajan, p.netos]), 0.2)
  // Cifra azul sobre cada barra de contratos y roja bajo cada barra de salidas (sin signo).
  const cifras: CifraFija[] = puntos.flatMap((p, i) => [
    ...(p.nuevos ? [{ i, v: p.nuevos, texto: String(p.nuevos), color: COLORES.nuevosContratos }] : []),
    ...(p.salidas ? [{ i, v: p.bajan, texto: String(p.salidas), color: COLORES.salidas, abajo: true }] : []),
  ])

  return (
    <Tarjeta titulo="Contratos, salidas y netos"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.length && 'Sin datos en este período.'}>
        <ComposedChart data={puntos} margin={{ ...margen, top: 48 }} stackOffset="sign">
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} formatter={(v, n) => [Math.abs(Number(v)), n]} />
          <Legend {...leyendaArriba} wrapperStyle={{ top: 0 }} /> {/* arriba del todo: debajo va la fila de netos */}
          <ReferenceLine y={0} stroke={TINTA} />
          <Bar dataKey="nuevos" name="Nuevos contratos" stackId="f" fill={COLORES.nuevosContratos} fillOpacity={0.55} maxBarSize={30} isAnimationActive={false} />
          <Bar dataKey="bajan" name="Salidas" stackId="f" fill={COLORES.salidas} fillOpacity={0.55} maxBarSize={30} isAnimationActive={false} />
          <Line dataKey="netos" name="Netos" stroke={COLORES.netos} strokeWidth={2.5} dot={{ r: 3, fill: COLORES.netos, stroke: '#fff', strokeWidth: 1.5 }} type="monotone" isAnimationActive={false} />
          {conEtiquetas && <Customized component={etiquetasRecharts([], [], puntos.map((p) => p.etiqueta), e.dominio, cifras)} />}
          {conEtiquetas && <Customized component={filaNetos(puntos.map((p) => p.netos), puntos.map((p) => p.etiqueta))} />}
        </ComposedChart>
      </Cuerpo>
    </Tarjeta>
  )
}

// Netos de cada mes en una fila sobre el área del gráfico, alineados con su mes: la línea queda limpia.
function filaNetos(netos: number[], categorias: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function FilaNetos({ offset, xAxisMap }: any) {
    if (!offset || !xAxisMap) return null
    const eje = Object.values(xAxisMap)[0] as { scale: ((v: string) => number) & { bandwidth?: () => number } }
    const mitad = eje.scale.bandwidth ? eje.scale.bandwidth() / 2 : 0
    // Si los meses quedan muy juntos para el número más ancho, se alternan en dos alturas.
    const x = (i: number) => eje.scale(categorias[i]) + mitad
    const paso = netos.length > 1 ? x(1) - x(0) : Infinity
    const ancho = Math.max(...netos.map((v) => signo(v).length)) * 7 + 4
    const alterna = paso < ancho
    const y = (i: number) => offset.top - 12 - (alterna && i % 2 ? 14 : 0)
    return (
      <g pointerEvents="none">
        <text x={offset.left - 8} y={offset.top - (alterna ? 19 : 12)} dy="0.35em" textAnchor="end" fontSize={11} fontWeight={600} fill={TINTA}>Netos</text>
        {netos.map((v, i) => (
          <text key={i} x={x(i)} y={y(i)} dy="0.35em" textAnchor="middle" fontSize={11} fontWeight={700} fill={TINTA}>{v ? signo(v) : '0'}</text>
        ))}
      </g>
    )
  }
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
  const color = colorMotivo
  const e = escala(puntos.map((p) => Number(p.total)), 0.15)

  return (
    <Tarjeta titulo="Análisis de salidas"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipo" valor={tipo} opciones={tiposSalida(sal)} onChange={setTipo} todos="Todos" /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /><Casilla etiqueta="% del total" valor={enPct} onChange={setPct} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!motivos.length && 'Sin salidas registradas en este período.'}>
        <ComposedChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          {motivos.map((m) => (
            <Bar key={m} dataKey={m} stackId="s" fill={color(m)} stroke="#fff" strokeWidth={1} maxBarSize={44} isAnimationActive={false}>
              {conEtiquetas && <LabelList dataKey={m} content={cifraInterior(color(m), (v, i) => (enPct ? `${Math.round((v / Number(puntos[i].total)) * 100)}%` : String(v)))} />}
            </Bar>
          ))}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...cifraArriba} formatter={total} /></Line>
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
  const e = escala(puntos.map((p) => p.total), 0.12)
  const tramo = (clave: 'noRenovacion' | 'anticipada', nombre: string, fill: string) => (
    <Bar dataKey={clave} name={nombre} stackId="d" fill={fill} stroke="#fff" strokeWidth={1} maxBarSize={44} isAnimationActive={false}>
      {conEtiquetas && <LabelList dataKey={clave} content={cifraInterior(fill)} />}
    </Bar>
  )

  return (
    <Tarjeta titulo="Desglose de salidas"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!puntos.some((p) => p.total) && 'Sin salidas registradas en este período.'}>
        <ComposedChart data={puntos} margin={margen}>
          <XAxis dataKey="etiqueta" {...ejeX} />
          <YAxis {...ejeY('Unidades')} domain={e.dominio} ticks={e.marcas} />
          <Tooltip {...tooltip} />
          <Legend {...leyendaArriba} />
          {tramo('noRenovacion', 'No renovación', COLORES.noRenovacion)}
          {tramo('anticipada', 'Salida anticipada', COLORES.salidaAnticipada)}
          <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}><LabelList dataKey="total" {...cifraArriba} formatter={total} /></Line>
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
    <Tarjeta titulo="Motivo de salida (% de las salidas)"
      controles={<><ControlRango rango={rango} meses={meses} onChange={setRango} /><Desplegable etiqueta="Tipología" valor={tipologia} opciones={tipologiasDe(sal)} onChange={setTipologia} /><Desplegable etiqueta="Tipo" valor={tipo} opciones={tiposSalida(sal)} onChange={setTipo} todos="Todos" /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} /></>}>
      <Cuerpo cargando={cargando} error={error} vacio={!filas.length && 'Sin salidas registradas en este período.'}>
        <BarChart data={filas} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 8 }}>
          <XAxis type="number" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} {...ejeX} />
          <YAxis type="category" dataKey="motivo" width={190} tick={{ fontSize: 13, fill: TINTA }} tickLine={false} axisLine={{ stroke: TINTA }} />
          <Tooltip {...tooltip} formatter={(v, _n, item) => [`${v}% (${item.payload.n})`, 'Salidas']} />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false}>
            {filas.map((f) => <Cell key={f.motivo} fill={colorMotivo(f.motivo)} />)}
            {conEtiquetas && <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${String(v).replace('.', ',')}%`} style={{ fontSize: 12, fontWeight: 700, fill: TINTA }} />}
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
    <Tarjeta titulo="Antigüedad de contratos vigentes"
      controles={<><Desplegable etiqueta="Tipología" valor={tipo} opciones={tipos} onChange={setTipo} /><Casilla etiqueta="Etiquetas" valor={conEtiquetas} onChange={setEtiquetas} />{chip(`Perm. anual (>12m): ${a.anual}%`)}{chip(`Perm. semestral (>6m): ${a.semestral}%`)}</>}>
      <Cuerpo forma="dona" cargando={estatus.cargando} error={'error' in estatus ? estatus.error : undefined} vacio={!a.total && 'Sin contratos vigentes con fecha de firma.'}>
        <PieChart>
          <Pie data={a.tramos} dataKey="n" nameKey="nombre" innerRadius="55%" outerRadius="85%" stroke="#fff" strokeWidth={2} isAnimationActive={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={conEtiquetas ? ({ x, y, textAnchor, pct, n }: any) => (n ? <text x={x} y={y} textAnchor={textAnchor} dominantBaseline="central" fontSize={13} fontWeight={700} fill={TINTA}>{`${pct}% (${n})`}</text> : null) : false} labelLine={false}>
            {a.tramos.map((t) => <Cell key={t.nombre} fill={t.color} />)}
          </Pie>
          <Tooltip {...tooltip} formatter={(v, n) => [`${v} unidades`, n]} />
          <Legend verticalAlign="bottom" iconType="square" iconSize={11} wrapperStyle={{ fontSize: 13 }}
            formatter={(n: string) => { const t = a.tramos.find((x) => x.nombre === n)!; return nombreLeyenda(`${n}: ${t.n} un. (${t.pct}%)`) }} />
        </PieChart>
      </Cuerpo>
    </Tarjeta>
  )
}
