// Ubicación de etiquetas de un gráfico de líneas sin que se tapen entre ellas ni tapen los puntos.
// Se usa igual en la web (píxeles) y en PowerPoint (pulgadas): todo se mide en las unidades del área de trazado.

export interface Etiqueta {
  id: string
  i: number // índice del mes
  v: number // valor (eje Y)
  texto: string
  color: string
  prioridad: number // menor = se ubica primero; las de prioridad 0 se muestran siempre
}

export interface EtiquetaUbicada extends Etiqueta {
  x: number // centro
  y: number
  w: number
  h: number
}

export interface Trazado {
  meses: number
  ancho: number
  alto: number
  max: number // tope del eje Y
  min?: number // piso del eje Y (0 si se omite; negativo en gráficos de netos)
  // Posición X del mes i. Por defecto, al centro de su franja (como PowerPoint); Recharts entrega su propia escala.
  xDe?: (i: number) => number
}

export interface Medidas {
  anchoTexto: (t: string) => number
  alto: number
  separacion: number // entre el punto y la etiqueta
}

type Caja = { x0: number; y0: number; x1: number; y1: number }

const choca = (a: Caja, b: Caja) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1

export function puntoEnTrazado(t: Trazado, i: number, v: number) {
  return { x: t.xDe ? t.xDe(i) : ((i + 0.5) / t.meses) * t.ancho, y: (1 - (v - (t.min ?? 0)) / (t.max - (t.min ?? 0))) * t.alto }
}

// `puntos`: marcadores que ninguna etiqueta debe tapar (los de todas las series dibujadas).
export function ubicarEtiquetas(etiquetas: Etiqueta[], puntos: { i: number; v: number }[], t: Trazado, m: Medidas): EtiquetaUbicada[] {
  // Menor que la separación: si no, cada etiqueta chocaría con el marcador de su propio punto.
  const radio = m.separacion * 0.8
  const ocupadas: Caja[] = puntos.map(({ i, v }) => {
    const p = puntoEnTrazado(t, i, v)
    return { x0: p.x - radio, y0: p.y - radio, x1: p.x + radio, y1: p.y + radio }
  })
  const ubicadas: EtiquetaUbicada[] = []

  for (const e of [...etiquetas].sort((a, b) => a.prioridad - b.prioridad)) {
    const p = puntoEnTrazado(t, e.i, e.v)
    const w = m.anchoTexto(e.texto)
    const h = m.alto
    const d = m.separacion
    // En orden de preferencia: pegada al punto, luego en diagonal (corrida un ancho completo, para no tapar
    // a la que ya está arriba o abajo del mismo punto) y, por último, más lejos.
    const candidatos = [
      { x: p.x, y: p.y - d - h / 2 }, // arriba
      { x: p.x, y: p.y + d + h / 2 }, // abajo
      { x: p.x + d + w / 2, y: p.y }, // derecha
      { x: p.x - d - w / 2, y: p.y }, // izquierda
      { x: p.x + w, y: p.y - d - h / 2 }, // arriba a la derecha
      { x: p.x - w, y: p.y - d - h / 2 }, // arriba a la izquierda
      { x: p.x + w, y: p.y + d + h / 2 }, // abajo a la derecha
      { x: p.x - w, y: p.y + d + h / 2 }, // abajo a la izquierda
      { x: p.x, y: p.y - 2 * (d + h) },
      { x: p.x, y: p.y + 2 * (d + h) },
    ]
    const caja = (c: { x: number; y: number }): Caja => ({ x0: c.x - w / 2, y0: c.y - h / 2, x1: c.x + w / 2, y1: c.y + h / 2 })
    // Puede asomar un poco sobre el borde superior (hay aire bajo la leyenda), no bajo el eje X.
    const dentro = (c: Caja) => c.x0 >= -w / 4 && c.x1 <= t.ancho + w / 4 && c.y0 >= -h && c.y1 <= t.alto
    const libre = candidatos.find((c) => { const k = caja(c); return dentro(k) && !ocupadas.some((o) => choca(k, o)) })
    // Sin lugar libre: las imprescindibles van arriba igual; el resto se omite para no ensuciar.
    const elegido = libre ?? (e.prioridad === 0 ? candidatos.find((c) => dentro(caja(c))) ?? candidatos[0] : null)
    if (!elegido) continue
    ocupadas.push(caja(elegido))
    ubicadas.push({ ...e, ...elegido, w, h })
  }
  return ubicadas
}
