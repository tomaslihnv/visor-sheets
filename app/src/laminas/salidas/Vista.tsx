import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, Cell, ComposedChart, LabelList, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Edificio } from '../../edificios'
import { useHoja } from '../../datos/hojas'
import { etiquetaMesLarga, mesActual, sumarMeses } from '../../datos/fechas'
import { COLORES, colorMotivo } from '../../dominio/colores'
import { Mensaje } from '../../ui/Tarjeta'
import { Bloque, EsqueletoGrafico } from '../../ui/Esqueleto'
import { SelectorMes } from '../../ui/SelectorMes'
import { ejeX, ejeY, leyendaArriba } from '../../ui/graficos'
import { mesesConDatos } from '../../indicadores/evolucion/datos'
import { laminaSalidas, opcionesPorDefecto, type LaminaSalidas } from './datos'

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const interior = { position: 'center' as const, style: { fontSize: 9, fontWeight: 700, fill: '#fff' }, formatter: (v: unknown) => (Number(v) > 0 ? String(v) : '') }

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="border-b-2 border-burdeo pb-1.5 text-sm font-bold">{titulo}</h3>
      <div className="pt-3">{children}</div>
    </div>
  )
}

const Analisis = ({ lineas }: { lineas: string[] }) => (
  <ul className="h-full space-y-2.5 border-2 border-[#d9d9d9] bg-[#f2f2f2] p-4 text-sm leading-snug">
    {lineas.map((l) => <li key={l} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-oscuro" />{l}</li>)}
  </ul>
)

// Vista previa de la lámina "Análisis de salidas": mismo contenido que la de PowerPoint.
export function LaminaSalidasVista({ edificio, onLamina }: { edificio: Edificio; onLamina: (l: LaminaSalidas | null) => void }) {
  const hoja = useHoja(edificio, 'sal')
  const sal = useMemo(() => ('datos' in hoja ? hoja.datos : null), [hoja])
  const [mesElegido, setMes] = useState<string | null>(null)
  const base = useMemo(() => (sal ? opcionesPorDefecto(sal) : null), [sal])
  const meses = useMemo(() => (sal ? mesesConDatos(sal) : []), [sal])
  const lamina = useMemo(() => {
    if (!sal || !base) return null
    const mesReporte = mesElegido ?? base.mesReporte
    return laminaSalidas(sal, { mesReporte, desde: sumarMeses(mesReporte, -19) })
  }, [sal, base, mesElegido])
  useEffect(() => onLamina(lamina), [lamina, onLamina])

  if (hoja.cargando) return <div className="space-y-3"><Bloque className="h-10 w-40" /><div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200"><Bloque className="h-7 w-2/3 max-w-xl" /><div className="mt-6"><EsqueletoGrafico /></div></div></div>
  if ('error' in hoja) return <Mensaje>No se pudo leer la hoja Salidas: {hoja.error}</Mensaje>
  if (!lamina) return null

  const mes = capital(etiquetaMesLarga(lamina.mesReporte))
  const hayEvolucion = lamina.evolucion.some((p) => p.total > 0)
  return (
    <div className="space-y-3">
      <SelectorMes etiqueta="Mes del reporte" valor={lamina.mesReporte} min={meses[0] ?? lamina.mesReporte} max={mesActual()}
        atajos={[{ nombre: 'Último mes con salidas', mes: base!.mesReporte }, { nombre: 'Mes pasado', mes: sumarMeses(mesActual(), -1) }]} onChange={setMes} />

      <article className="aparecer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-8">
        <header className="mb-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-bold sm:text-2xl">{edificio.nombre} | Análisis de salidas</h2>
            <p className="text-sm text-gris">Mes del reporte: {etiquetaMesLarga(lamina.mesReporte)}</p>
          </div>
          <div className="mt-2 flex h-1.5"><div className="w-[49%] bg-burdeo" /><div className="flex-1 bg-gris-claro" /></div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[2.3fr_1fr]">
          <Seccion titulo="Evolución de salidas">
            {hayEvolucion ? (
              <div className="h-72">
                <ResponsiveContainer>
                  <ComposedChart data={lamina.evolucion} margin={{ top: 18, right: 8, bottom: 16, left: 0 }}>
                    <XAxis dataKey="etiqueta" {...ejeX} label={{ value: 'Mes', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#2d3334', fontWeight: 600 }} />
                    <YAxis {...ejeY('Salidas (un.)')} domain={[0, (max: number) => Math.max(2, Math.ceil(max * 1.25))]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: '#2d33340a' }} />
                    <Legend {...leyendaArriba} />
                    <Bar dataKey="noRenovacion" name="No renovación" stackId="s" fill={COLORES.noRenovacion} isAnimationActive={false}><LabelList dataKey="noRenovacion" {...interior} /></Bar>
                    <Bar dataKey="anticipada" name="Salida anticipada" stackId="s" fill={COLORES.salidaAnticipada} isAnimationActive={false}><LabelList dataKey="anticipada" {...interior} /></Bar>
                    <Line dataKey="total" stroke="none" dot={false} legendType="none" isAnimationActive={false}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 10, fontWeight: 700, fill: '#2d3334' }} formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} />
                    </Line>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : <Mensaje>Sin salidas registradas en este período.</Mensaje>}
          </Seccion>
          <Seccion titulo={`Evolución | ${mes}`}><Analisis lineas={lamina.analisisEvolucion} /></Seccion>

          <Seccion titulo={`Motivos de salida · últimos ${lamina.evolucion.length} meses`}>
            {lamina.motivos.length ? (
              <div style={{ height: Math.max(180, lamina.motivos.length * 30 + 50) }}>
                <ResponsiveContainer>
                  <BarChart data={lamina.motivos} layout="vertical" margin={{ top: 4, right: 48, bottom: 16, left: 8 }}>
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} {...ejeX}
                      label={{ value: '% de las salidas', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#2d3334', fontWeight: 600 }} />
                    <YAxis type="category" dataKey="motivo" width={170} tick={{ fontSize: 11, fill: '#2d3334' }} tickLine={{ stroke: '#2d3334' }} axisLine={{ stroke: '#2d3334' }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v, _n, item) => [`${v}% (${item.payload.n})`, 'Salidas']} />
                    <Bar dataKey="pct" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                      {lamina.motivos.map((m) => <Cell key={m.motivo} fill={colorMotivo(m.motivo)} />)}
                      <LabelList dataKey="pct" position="right" formatter={(v: unknown) => `${String(v).replace('.', ',')}%`} style={{ fontSize: 10, fill: '#2d3334' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <Mensaje>Sin motivos registrados en este período.</Mensaje>}
          </Seccion>
          <Seccion titulo={`Motivos | ${mes}`}><Analisis lineas={lamina.analisisMotivos.length ? lamina.analisisMotivos : ['Sin motivos registrados en este período.']} /></Seccion>
        </div>
        <p className="mt-4 text-[11px] text-gris">Fuente: hoja Salidas. Motivos: % de las salidas con motivo registrado en el período del gráfico.</p>
      </article>
    </div>
  )
}
