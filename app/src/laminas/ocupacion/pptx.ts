// Lámina de ocupación en PowerPoint: tabla nativa y gráfico de líneas nativo (editables).
import type PptxGenJS from 'pptxgenjs'
import type { Edificio } from '../../edificios'
import { etiquetaMesLarga } from '../../datos/fechas'
import { ANCHO_UTIL, FUENTE, GRIS, GRIS_CLARO, MARGEN, OSCURO, cabecera, ejesEstandar, hex, pie } from '../estilo'
import { ubicarEtiquetas } from '../etiquetas'
import { etiquetasOcupacion } from './etiquetas'
import { META_OCUPACION, formatoNumero, formatoVariacion, type LaminaOcupacion } from './datos'

export const COLOR_PRESUPUESTO = 'C4C9CE'
export const COLOR_META = '1F2A44' // azul marino
export const COLOR_POSITIVO = '1A8F55'
export const COLOR_NEGATIVO = 'B42318'

// Área del gráfico y del trazado fijas: las etiquetas se ubican a mano (ubicarEtiquetas) para que nunca se tapen,
// cosa que PowerPoint no hace con las suyas.
const GRAFICO = { x: MARGEN, y: 3.3, w: ANCHO_UTIL, h: 3.7 }
// Deja espacio arriba para la leyenda, a la izquierda para el título del eje Y y abajo para meses y título del eje X.
const TRAZADO = { x: 0.075, y: 0.13, w: 0.875, h: 0.66 } // a la derecha queda lugar para la etiqueta de la meta

export function agregarLaminaOcupacion(pptx: PptxGenJS, edificio: Edificio, l: LaminaOcupacion, n: number) {
  const s = pptx.addSlide()
  cabecera(s, `${edificio.nombre} | Ocupación y arriendos netos`, `Mes del reporte: ${etiquetaMesLarga(l.mesReporte)}`)
  const color = hex(edificio.color.linea)
  const colorTexto = hex(edificio.color.base)

  // Tabla: una columna por mes, el mes del reporte al final.
  // Meses proyectados (forecast) con encabezado gris y cifras en cursiva, para no confundirlos con los reales.
  const cab = (t: string, proyectado = false, align: 'left' | 'center' = 'center'): PptxGenJS.TableCell => ({ text: t, options: { bold: true, color: 'FFFFFF', fill: { color: proyectado ? GRIS_CLARO : OSCURO }, align } })
  const celda = (v: number | null, proyectado: boolean, opc: PptxGenJS.TableCellProps = {}): PptxGenJS.TableCell => ({ text: formatoNumero(v), options: { align: 'center', ...(proyectado && { italic: true, color: GRIS }), ...opc } })
  const linea = { type: 'solid' as const, pt: 1.5, color: OSCURO }
  const filas: PptxGenJS.TableRow[] = [
    [cab('', false, 'left'), ...l.tabla.map((m) => cab(m.etiqueta, m.proyectado))],
    [{ text: 'Ingresos', options: { bold: true } }, ...l.tabla.map((m) => celda(m.ingresos, m.proyectado))],
    [{ text: 'Salidas', options: { bold: true } }, ...l.tabla.map((m) => celda(m.salidas, m.proyectado))],
    [{ text: 'Neto', options: { bold: true } }, ...l.tabla.map((m) => celda(m.neto, m.proyectado, { bold: true }))],
    [{ text: 'Presupuesto (neto)', options: { bold: true } }, ...l.tabla.map((m) => celda(m.presupuesto, m.proyectado, { color: GRIS }))],
    [
      { text: 'Var. neto vs. ppto.', options: { bold: true, border: [linea, { type: 'none' }, { type: 'none' }, { type: 'none' }] } },
      ...l.tabla.map((m): PptxGenJS.TableCell => ({
        text: formatoVariacion(m.variacion),
        options: { align: 'center', bold: true, italic: m.proyectado, color: m.variacion === null ? GRIS : m.variacion >= 0 ? COLOR_POSITIVO : COLOR_NEGATIVO, border: [linea, { type: 'none' }, { type: 'none' }, { type: 'none' }] },
      })),
    ],
  ]
  const anchoEtiqueta = 2.4
  const anchoMes = (ANCHO_UTIL - anchoEtiqueta) / Math.max(1, l.tabla.length) // la tabla ocupa todo el ancho
  s.addTable(filas, {
    x: MARGEN, y: 1.3, w: anchoEtiqueta + anchoMes * l.tabla.length, colW: [anchoEtiqueta, ...l.tabla.map(() => anchoMes)], rowH: 0.3,
    fontFace: FUENTE, fontSize: 11, color: OSCURO, valign: 'middle', border: { type: 'solid', color: 'E5E7EB', pt: 0.5 },
  })

  // Gráfico: cuatro series, cada una con su propio estilo (gráfico combinado de líneas).
  const etiquetas = l.puntos.map((p) => p.etiqueta)
  const serie = (name: string, values: (number | null)[]) => [{ name, labels: etiquetas, values: values as number[] }]
  const base = { lineDataSymbol: 'none' as const, lineSize: 2 }
  s.addChart(
    [
      { type: pptx.ChartType.line, data: serie('Presupuesto', l.puntos.map((p) => p.presupuesto)), options: { ...base, chartColors: [COLOR_PRESUPUESTO] } },
      { type: pptx.ChartType.line, data: serie(`Meta ${META_OCUPACION}%`, l.puntos.map(() => META_OCUPACION)), options: { ...base, lineSize: 1.5, chartColors: [COLOR_META] } },
      { type: pptx.ChartType.line, data: serie('Forecast', l.puntos.map((p) => p.forecast)), options: { ...base, lineDash: 'dash', chartColors: [color] } },
      {
        type: pptx.ChartType.line, data: serie('Ocupación real', l.puntos.map((p) => p.real)),
        options: {
          lineSize: 2.5, lineDataSymbol: 'circle', lineDataSymbolSize: 6, chartColors: [color],
        },
      },
    ],
    // En los combinados pptxgenjs toma las opciones del segundo argumento si viene; un [] vacío las taparía.
    null as unknown as [],
    {
      ...GRAFICO,
      layout: TRAZADO,
      displayBlanksAs: 'gap',
      valAxisMinVal: 0, valAxisMaxVal: 100, valAxisMajorUnit: 20,
      ...ejesEstandar({ tituloX: 'Mes', tituloY: 'Ocupación (%)', formatoY: '0"%"' }),
      valAxisTitleRotate: 270,
    },
  )

  // Etiquetas: ubicadas para no taparse entre ellas ni tapar puntos; fondo blanco para leerse sobre las líneas.
  const ancho = GRAFICO.w * TRAZADO.w
  const alto = GRAFICO.h * TRAZADO.h
  const origen = { x: GRAFICO.x + GRAFICO.w * TRAZADO.x, y: GRAFICO.y + GRAFICO.h * TRAZADO.y }
  const { etiquetas: lista, puntos } = etiquetasOcupacion(l, { texto: '#' + colorTexto, presupuesto: '#' + GRIS })
  const ubicadas = ubicarEtiquetas(lista, puntos, { meses: l.puntos.length, ancho, alto, max: 100 },
    { anchoTexto: (t) => 0.075 * t.length + 0.08, alto: 0.19, separacion: 0.07 })
  for (const e of ubicadas) {
    s.addText(e.texto, {
      x: origen.x + e.x - e.w / 2, y: origen.y + e.y - e.h / 2, w: e.w, h: e.h, align: 'center', valign: 'middle', margin: 0,
      fontFace: FUENTE, fontSize: 8, bold: true, color: hex(e.color), fill: { color: 'FFFFFF', transparency: 10 },
    })
  }
  // Meta: a la derecha, al final de su línea.
  s.addText(`${META_OCUPACION}%`, {
    x: origen.x + ancho + 0.05, y: origen.y + alto * (1 - META_OCUPACION / 100) - 0.1, w: 0.5, h: 0.2, margin: 0,
    fontFace: FUENTE, fontSize: 9, bold: true, color: COLOR_META,
  })

  pie(s, `Fuente: hoja Evolución. Ocupación = arriendos acumulados / ${l.totalUnidades ?? '—'} unidades. Neto = ingresos − salidas. Columnas en gris: proyección (forecast).`, n)
}
