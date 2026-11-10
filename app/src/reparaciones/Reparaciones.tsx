import { useMemo, useState } from 'react'
import { Bar, BarChart, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { Edificio } from '../edificios'
import { useHoja } from '../datos/hojas'
import { etiquetaMesLarga, type ClaveMes } from '../datos/fechas'
import { unidadesDelLayout } from '../dominio/layout'
import {
  ESTILO_REPARACION, detalleDelMes, estadoReparacion, reparacionesPorUnidad, unidadesQueVencen, vencimientosConReparaciones, type EstadoReparacion,
} from '../dominio/reparaciones'
import { Mensaje, Tarjeta } from '../ui/Tarjeta'
import { Bloque, EsqueletoGrafico, EsqueletoTabla } from '../ui/Esqueleto'
import { ejeX, ejeY, leyendaArriba } from '../ui/graficos'
import { ALTO, ANCHO, ANCHO_ETIQUETA, SEPARACION } from '../stacking/Celda'

const ORDEN: (EstadoReparacion | 'sinDatos')[] = ['danado', 'revisar', 'proceso', 'reparado', 'sinDatos']
const interior = { position: 'center' as const, style: { fontSize: 9, fontWeight: 700 }, formatter: (v: unknown) => (Number(v) > 0 ? String(v) : '') }

// Pestaña Reparaciones: estado de reparación de cada unidad, y contratos que vencen en los próximos 12 meses
// con reparaciones pendientes. Al elegir un mes se resaltan esas unidades en el plano y se listan abajo.
export function Reparaciones({ edificio }: { edificio: Edificio }) {
  const rep = useHoja(edificio, 'reparacion')
  const con = useHoja(edificio, 'contratos')
  const [mes, setMes] = useState<ClaveMes | null>(null)

  const filasRep = useMemo(() => ('datos' in rep ? rep.datos : []), [rep])
  const filasCon = useMemo(() => ('datos' in con ? con.datos : []), [con])
  const estados = useMemo(() => reparacionesPorUnidad(filasRep), [filasRep])
  const vencen = useMemo(() => (mes ? unidadesQueVencen(filasCon, mes) : null), [filasCon, mes])
  const meses = useMemo(() => vencimientosConReparaciones(filasRep, filasCon), [filasRep, filasCon])
  const detalle = useMemo(() => (mes ? detalleDelMes(filasRep, filasCon, mes) : []), [filasRep, filasCon, mes])

  if (!edificio.hojas.reparacion) return <Mensaje>{edificio.nombre} todavía no tiene hoja de Reparación.</Mensaje>
  if ('error' in rep) return <Mensaje>No se pudo leer la hoja Reparación: {rep.error}</Mensaje>

  const conteo = Object.fromEntries(ORDEN.map((e) => [e, 0])) as Record<(typeof ORDEN)[number], number>
  for (const n of unidadesDelLayout(edificio.layout)) conteo[estadoReparacion(estados.get(n)) ?? 'sinDatos']++

  return (
    <div className="space-y-6">
      <Tarjeta titulo="Estado de reparaciones por unidad" subtitulo={mes ? `Resaltadas: unidades cuyo contrato vence en ${etiquetaMesLarga(mes)}` : 'Elige un mes en el gráfico de abajo para resaltar las unidades que vencen'}
        controles={mes && <button onClick={() => setMes(null)} className="rounded-full bg-slate-100 px-3 py-1 font-medium text-oscuro hover:bg-slate-200">Quitar mes ×</button>}>
        <div className="mb-5 flex flex-wrap gap-2">
          {ORDEN.map((e) => {
            const s = ESTILO_REPARACION[e]
            return (
              <div key={e} className="min-w-24 flex-1 rounded-xl border-[1.5px] px-3.5 py-2.5 sm:flex-none" style={{ background: s.bg, borderColor: s.borde, color: s.texto }}>
                <p className="text-[11px] font-semibold">{s.nombre}</p>
                {rep.cargando ? <Bloque className="mt-1 h-6 w-10 opacity-70" /> : <p className="aparecer text-2xl leading-tight font-bold tabular-nums">{conteo[e]}</p>}
              </div>
            )
          })}
        </div>
        <div className="-mx-5 overflow-x-auto px-5 pb-2">
          <div className="w-max space-y-[2px]">
            {edificio.layout.pisos.map((piso) => {
              const porCol = new Map(piso.celdas.map((c) => [c.c, c.n]))
              return (
                <div key={piso.p} className="flex items-center" style={{ gap: SEPARACION }}>
                  <div className="shrink-0 pr-2 text-right text-[9.5px] font-bold text-gris-claro" style={{ width: ANCHO_ETIQUETA }}>P{piso.p}</div>
                  {Array.from({ length: edificio.layout.maxCol }, (_, i) => {
                    const n = porCol.get(i + 1)
                    if (!n) return <div key={i} className="shrink-0" style={{ width: ANCHO, height: ALTO }} />
                    if (rep.cargando) return <Bloque key={n} className="shrink-0 rounded-[5px]" style={{ width: ANCHO, height: ALTO }} />
                    const fila = estados.get(n)
                    const estado = estadoReparacion(fila) ?? 'sinDatos'
                    const resaltada = !vencen || vencen.has(n)
                    const s = ESTILO_REPARACION[estado]
                    return (
                      <div key={n} title={fila ? `${n} · ${fila['Estado'] ?? ''} · ${fila['Arreglo'] ?? ''}` : n}
                        className={`flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-[9px] font-bold transition-opacity ${resaltada ? '' : 'opacity-15'}`}
                        style={{ width: ANCHO, height: ALTO, background: s.bg, borderColor: s.borde, color: s.texto }}>
                        {n}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </Tarjeta>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Tarjeta exportable titulo="Vencimientos con reparaciones pendientes" subtitulo="Contratos que vencen en los próximos 12 meses, según el estado de su unidad · haz clic en un mes">
          {rep.cargando || con.cargando ? <EsqueletoGrafico /> : 'error' in con ? <Mensaje>No se pudo leer la hoja I. Contratos: {con.error}</Mensaje> : (
            <div className="aparecer h-80">
              <ResponsiveContainer>
                <BarChart data={meses} margin={{ top: 8, right: 8, bottom: 16, left: 0 }} onClick={(e) => { const p = e?.activePayload?.[0]?.payload as { mes?: string } | undefined; if (p?.mes) setMes(p.mes) }}>
                  <XAxis dataKey="etiqueta" {...ejeX} label={{ value: 'Mes de vencimiento', position: 'insideBottom', offset: -10, fontSize: 11, fill: '#2d3334', fontWeight: 600 }} />
                  <YAxis {...ejeY('Contratos')} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ fill: '#2d33340d' }} />
                  <Legend {...leyendaArriba} />
                  {(['danado', 'revisar', 'reparado'] as const).map((e) => (
                    <Bar key={e} dataKey={e} name={ESTILO_REPARACION[e].nombre} stackId="r" fill={ESTILO_REPARACION[e].borde} className="cursor-pointer" isAnimationActive={false}>
                      <LabelList dataKey={e} {...interior} style={{ ...interior.style, fill: ESTILO_REPARACION[e].texto }} />
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Detalle de unidades" subtitulo={mes ? `Contratos que vencen en ${etiquetaMesLarga(mes)}` : 'Elige un mes en el gráfico'}>
          {con.cargando ? <EsqueletoTabla filas={6} columnas={5} /> : !mes ? <Mensaje>Haz clic en un mes del gráfico para ver el detalle.</Mensaje> : !detalle.length ? <Mensaje>Sin unidades con reparaciones registradas que venzan ese mes.</Mensaje> : (
            <div className="aparecer max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white text-left text-xs text-gris">
                  <tr className="border-b border-slate-200">{['Depto', 'Titular', 'Renta', 'Término', 'Estado'].map((h) => <th key={h} className="px-2 py-2 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {detalle.map((d) => {
                    const s = ESTILO_REPARACION[d.estado]
                    return (
                      <tr key={d.unidad} className="border-b border-slate-100">
                        <td className="px-2 py-1.5 font-semibold">{d.unidad}</td>
                        <td className="px-2 py-1.5">{d.titular}</td>
                        <td className="px-2 py-1.5 tabular-nums">{d.renta}</td>
                        <td className="px-2 py-1.5 tabular-nums">{d.termino?.toLocaleDateString('es-CL') ?? '—'}</td>
                        <td className="px-2 py-1.5"><span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: s.bg, color: s.texto }}>{s.nombre}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Tarjeta>
      </div>
    </div>
  )
}
