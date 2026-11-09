// Lámina "Análisis de salidas" en PowerPoint: dos gráficos nativos (editables) a la izquierda y el análisis a la derecha.
import type PptxGenJS from 'pptxgenjs'
import type { Edificio } from '../../edificios'
import { etiquetaMesLarga } from '../../datos/fechas'
import { COLORES, colorMotivo } from '../../dominio/colores'
import { FUENTE, GRIS, MARGEN, OSCURO, cabecera, cuadroAnalisis, ejesEstandar, hex, pie, seccion } from '../estilo'
import type { LaminaSalidas } from './datos'

// Columnas: gráficos a la izquierda, análisis a la derecha. Filas: evolución arriba, motivos abajo.
const IZQ = { x: MARGEN, w: 8.45 }
const DER = { x: 9.2, w: 3.63 }
const FILA1 = { y: 1.2, h: 2.75 }
const FILA2 = { y: 4.2, h: 2.75 }
const ALTO_TITULO = 0.45

// Área de trazado fija del gráfico de evolución: permite poner el total sobre cada barra.
const TRAZADO_EVOL = { x: 0.075, y: 0.17, w: 0.91, h: 0.6 }

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function agregarLaminaSalidas(pptx: PptxGenJS, edificio: Edificio, l: LaminaSalidas, n: number) {
  const s = pptx.addSlide()
  const mes = capital(etiquetaMesLarga(l.mesReporte))
  cabecera(s, `${edificio.nombre} | Análisis de salidas`, `Mes del reporte: ${etiquetaMesLarga(l.mesReporte)}`)

  // ── Evolución de salidas ──
  seccion(s, 'Evolución de salidas', IZQ.x, FILA1.y, IZQ.w)
  const g1 = { x: IZQ.x, y: FILA1.y + ALTO_TITULO, w: IZQ.w, h: FILA1.h - ALTO_TITULO }
  const etiquetas = l.evolucion.map((p) => p.etiqueta)
  const tope = Math.max(2, Math.ceil(Math.max(...l.evolucion.map((p) => p.total), 0) * 1.25))
  if (l.evolucion.some((p) => p.total > 0)) {
    s.addChart(pptx.ChartType.bar, [
      { name: 'No renovación', labels: etiquetas, values: l.evolucion.map((p) => p.noRenovacion) },
      { name: 'Salida anticipada', labels: etiquetas, values: l.evolucion.map((p) => p.anticipada) },
    ], {
      ...g1,
      layout: TRAZADO_EVOL,
      barDir: 'col', barGrouping: 'stacked', barGapWidthPct: 45,
      chartColors: [hex(COLORES.noRenovacion), hex(COLORES.salidaAnticipada)],
      valAxisMinVal: 0, valAxisMaxVal: tope, valAxisMajorUnit: Math.max(1, Math.ceil(tope / 5)),
      ...ejesEstandar({ tituloX: 'Mes', tituloY: 'Salidas (un.)', formatoY: '0' }),
      valAxisTitleRotate: 270,
      // Cantidad dentro de cada tramo; los ceros no se escriben.
      showValue: true, dataLabelPosition: 'ctr', dataLabelFormatCode: '0;;;', dataLabelFontFace: FUENTE, dataLabelFontSize: 8, dataLabelColor: 'FFFFFF',
    })
    // Total sobre cada barra.
    const ancho = g1.w * TRAZADO_EVOL.w
    l.evolucion.forEach((p, i) => {
      if (!p.total) return
      const x = g1.x + g1.w * TRAZADO_EVOL.x + (ancho * (i + 0.5)) / l.evolucion.length
      const y = g1.y + g1.h * (TRAZADO_EVOL.y + TRAZADO_EVOL.h * (1 - p.total / tope))
      s.addText(String(p.total), { x: x - 0.25, y: y - 0.22, w: 0.5, h: 0.2, align: 'center', fontFace: FUENTE, fontSize: 9, bold: true, color: OSCURO, margin: 0 })
    })
  } else {
    s.addText('Sin salidas registradas en este período.', { ...g1, align: 'center', valign: 'middle', fontFace: FUENTE, fontSize: 12, color: GRIS })
  }

  // ── Motivos de salida ──
  seccion(s, `Motivos de salida · últimos ${l.evolucion.length} meses`, IZQ.x, FILA2.y, IZQ.w)
  const g2 = { x: IZQ.x, y: FILA2.y + ALTO_TITULO, w: IZQ.w, h: FILA2.h - ALTO_TITULO }
  if (l.motivos.length) {
    // PowerPoint dibuja la primera categoría abajo: se invierte el orden para dejar el motivo más frecuente arriba.
    const motivos = [...l.motivos].reverse()
    s.addChart(pptx.ChartType.bar, [{ name: 'Salidas', labels: motivos.map((m) => m.motivo), values: motivos.map((m) => m.pct) }], {
      ...g2,
      barDir: 'bar', barGapWidthPct: 35,
      chartColors: motivos.map((m) => hex(colorMotivo(m.motivo))), // un color por motivo, el mismo de la web
      valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20,
      ...ejesEstandar({ tituloX: 'Motivo', tituloY: '% de las salidas', formatoY: '0"%"', leyenda: false }),
      catAxisLabelFontSize: 9, catAxisLabelColor: OSCURO,
      showValue: true, dataLabelPosition: 'outEnd', dataLabelFormatCode: '0.0"%"', dataLabelFontFace: FUENTE, dataLabelFontSize: 9, dataLabelColor: OSCURO,
    })
  } else {
    s.addText('Sin motivos registrados en este período.', { ...g2, align: 'center', valign: 'middle', fontFace: FUENTE, fontSize: 12, color: GRIS })
  }

  // ── Análisis ──
  seccion(s, `Evolución | ${mes}`, DER.x, FILA1.y, DER.w)
  cuadroAnalisis(s, l.analisisEvolucion, DER.x, FILA1.y + ALTO_TITULO, DER.w, FILA1.h - ALTO_TITULO)
  seccion(s, `Motivos | ${mes}`, DER.x, FILA2.y, DER.w)
  cuadroAnalisis(s, l.analisisMotivos.length ? l.analisisMotivos : ['Sin motivos registrados en este período.'], DER.x, FILA2.y + ALTO_TITULO, DER.w, FILA2.h - ALTO_TITULO)

  pie(s, `Fuente: hoja Salidas. Motivos: % de las salidas con motivo registrado entre ${etiquetaMesLarga(l.evolucion[0]?.mes ?? l.mesReporte)} y ${etiquetaMesLarga(l.mesReporte)}.`, n)
}
