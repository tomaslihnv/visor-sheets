// Formato de casa de las láminas, el mismo de "Seguimiento Puesta a Punto" y del Tablero comercial:
// 16:9, Roboto, título "Edificio | Lámina" con línea burdeo y gris, pie con texto y número de lámina.
import type PptxGenJS from 'pptxgenjs'

export const ROJO = '96323C'
export const GRIS = '5B6670'
export const GRIS_CLARO = 'A5ACB2'
export const OSCURO = '2D3334'
export const FUENTE = 'Roboto'

// Medidas de LAYOUT_WIDE (pulgadas).
export const ANCHO_LAMINA = 13.33
export const MARGEN = 0.5
export const ANCHO_UTIL = 12.33

export const hex = (c: string) => c.replace('#', '').toUpperCase()

export function cabecera(s: PptxGenJS.Slide, titulo: string, subtitulo?: string) {
  s.addText(titulo, { x: MARGEN, y: 0.25, w: ANCHO_UTIL, h: 0.6, fontFace: FUENTE, fontSize: 26, bold: true, color: OSCURO, margin: 0 })
  if (subtitulo) s.addText(subtitulo, { x: MARGEN, y: 0.25, w: ANCHO_UTIL, h: 0.6, fontFace: FUENTE, fontSize: 12, color: GRIS, align: 'right', margin: 0 })
  s.addShape('rect', { x: MARGEN, y: 0.95, w: 6.0, h: 0.07, fill: { color: ROJO }, line: { color: ROJO, width: 0 } })
  s.addShape('rect', { x: 6.5, y: 0.95, w: 6.33, h: 0.07, fill: { color: GRIS_CLARO }, line: { color: GRIS_CLARO, width: 0 } })
}

export function pie(s: PptxGenJS.Slide, texto: string, n: number) {
  s.addText(texto, { x: MARGEN, y: 7.1, w: 10, h: 0.25, fontFace: FUENTE, fontSize: 8, color: GRIS, margin: 0 })
  s.addText(`| ${n}`, { x: 11.8, y: 7.1, w: 1.03, h: 0.25, align: 'right', fontFace: FUENTE, fontSize: 9, bold: true, color: ROJO, margin: 0 })
}

// Ejes y leyenda iguales en todos los gráficos de las láminas: sin líneas de grilla (nunca), ejes marcados con su
// línea y su título, leyenda arriba. Cada lámina agrega solo lo propio (escala, formatos).
export function ejesEstandar(o: { tituloX: string; tituloY: string; formatoY?: string; leyenda?: boolean }) {
  return {
    valGridLine: { style: 'none' as const }, catGridLine: { style: 'none' as const },
    valAxisLineShow: true, valAxisLineColor: OSCURO, valAxisLineSize: 1,
    catAxisLineShow: true, catAxisLineColor: OSCURO, catAxisLineSize: 1,
    valAxisLabelFontFace: FUENTE, valAxisLabelFontSize: 9, valAxisLabelColor: GRIS, ...(o.formatoY && { valAxisLabelFormatCode: o.formatoY }),
    // Meses siempre en horizontal: si no caben, PowerPoint salta etiquetas en vez de girarlas. pptxgenjs ignora
    // un 0 (lo toma como "sin valor" y PowerPoint gira solo); un valor ínfimo se redondea a rot="0".
    catAxisLabelFontFace: FUENTE, catAxisLabelFontSize: 8, catAxisLabelColor: GRIS, catAxisLabelRotate: 0.000001,
    showValAxisTitle: true, valAxisTitle: o.tituloY, valAxisTitleFontFace: FUENTE, valAxisTitleFontSize: 10, valAxisTitleColor: OSCURO,
    showCatAxisTitle: true, catAxisTitle: o.tituloX, catAxisTitleFontFace: FUENTE, catAxisTitleFontSize: 10, catAxisTitleColor: OSCURO,
    showLegend: o.leyenda ?? true, legendPos: 't' as const, legendFontFace: FUENTE, legendFontSize: 9,
  }
}

// Título de una sección dentro de la lámina, con una línea burdeo de 2 pt debajo.
export function seccion(s: PptxGenJS.Slide, titulo: string, x: number, y: number, w: number) {
  s.addText(titulo, { x, y, w, h: 0.3, fontFace: FUENTE, fontSize: 12, bold: true, color: OSCURO, margin: 0, valign: 'bottom' })
  s.addShape('line', { x, y: y + 0.34, w, h: 0, line: { color: ROJO, width: 2 } })
}

// Cuadro de análisis: esquinas rectas, fondo gris claro, contorno gris de 2 pt y viñetas.
export const FONDO_ANALISIS = 'F2F2F2'
export const BORDE_ANALISIS = 'D9D9D9'
export function cuadroAnalisis(s: PptxGenJS.Slide, lineas: string[], x: number, y: number, w: number, h: number) {
  s.addShape('rect', { x, y, w, h, fill: { color: FONDO_ANALISIS }, line: { color: BORDE_ANALISIS, width: 2 } })
  s.addText(lineas.map((t) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: true } })), {
    x: x + 0.15, y: y + 0.12, w: w - 0.3, h: h - 0.24, fontFace: FUENTE, fontSize: 10.5, color: OSCURO, valign: 'top', paraSpaceAfter: 8, margin: 0,
  })
}
