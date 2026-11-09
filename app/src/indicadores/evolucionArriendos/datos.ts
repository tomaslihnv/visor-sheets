// Evolución de arriendos: unidades arrendadas acumuladas por mes (real hasta el corte, proyección después)
// y % de ocupación. Lógica pura: la usan el gráfico de la web y la lámina, y se prueba sin navegador.
import type { Fila } from '../../datos/hojas'
import { claveDeFecha, etiquetaMes, mesActual, mesesEntre, type ClaveMes } from '../../datos/fechas'
import { numero, porcentaje } from '../../datos/numeros'

export const COLUMNAS = {
  fecha: 'Fecha',
  unidades: 'Arriendos acumulados (reales + forecast) (un.)',
  pct: 'Arriendos acumulados (reales + forecast) (%)',
  presupuesto: 'Arriendos acumulados presupuesto (un.)',
}

export interface PuntoEvolucion {
  mes: ClaveMes
  etiqueta: string
  real: number | null // unidades, meses antes del corte
  proyectado: number | null // unidades, desde el corte
  presupuesto: number | null
  pct: number | null
}

export interface Opciones {
  desde: ClaveMes
  hasta: ClaveMes
  corte: ClaveMes // primer mes que se considera proyección
}

export interface Evolucion {
  puntos: PuntoEvolucion[]
  // Unidades del edificio estimadas de la hoja (unidades / %): alinea el eje de unidades con el de %.
  totalUnidades: number | null
}

// Meses disponibles en la hoja, ordenados.
export function mesesDisponibles(filas: Fila[]): ClaveMes[] {
  return [...new Set(filas.map((f) => claveDeFecha(f[COLUMNAS.fecha] ?? '')).filter((m): m is ClaveMes => !!m))].sort()
}

// Por defecto: todo el horizonte de la hoja, con el corte en el mes actual.
export function opcionesPorDefecto(filas: Fila[], hoy = new Date()): Opciones | null {
  const meses = mesesDisponibles(filas)
  if (!meses.length) return null
  return { desde: meses[0], hasta: meses[meses.length - 1], corte: mesActual(hoy) }
}

export function evolucionArriendos(filas: Fila[], { desde, hasta, corte }: Opciones): Evolucion {
  const puntos: PuntoEvolucion[] = []
  for (const f of filas) {
    const mes = claveDeFecha(f[COLUMNAS.fecha] ?? '')
    if (!mes || mes < desde || mes > hasta) continue
    const unidades = numero(f[COLUMNAS.unidades])
    const pasado = mes < corte
    puntos.push({
      mes,
      etiqueta: etiquetaMes(mes),
      real: pasado ? unidades : null,
      proyectado: pasado ? null : unidades,
      presupuesto: numero(f[COLUMNAS.presupuesto]),
      pct: porcentaje(f[COLUMNAS.pct]),
    })
  }
  // Todos los meses del período, aunque se extienda más allá de la hoja (esos meses quedan vacíos).
  const porMes = new Map(puntos.map((p) => [p.mes, p]))
  const completos = mesesEntre({ desde, hasta }).map((mes) => porMes.get(mes) ?? { mes, etiqueta: etiquetaMes(mes), real: null, proyectado: null, presupuesto: null, pct: null })

  // El % de la hoja viene redondeado: se estima el total con el punto de mayor %, donde el error relativo es menor.
  let totalUnidades: number | null = null
  let mejor = 0
  for (const p of completos) {
    const u = p.real ?? p.proyectado
    if (u && p.pct && p.pct > mejor) { mejor = p.pct; totalUnidades = Math.round(u / (p.pct / 100)) }
  }
  return { puntos: completos, totalUnidades }
}
