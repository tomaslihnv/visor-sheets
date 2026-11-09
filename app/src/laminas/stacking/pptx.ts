// Lámina "Stacking plan" en PowerPoint: el plano (cabecera de columnas, pisos y subterráneo) a la izquierda,
// y los cuadros de ocupación y de vacancia a la derecha. Cada celda es una forma editable.
import type PptxGenJS from 'pptxgenjs'
import type { Edificio } from '../../edificios'
import { etiquetaMesLarga } from '../../datos/fechas'
import { ESTILO, type Categoria } from '../../dominio/categorias'
import { cambiosDeOrientacion, infoColumnas, type InfoColumna } from '../../dominio/encabezados'
import { bodegasPorPiso, pisosSubterraneo, type Bodega, type Estacionamiento } from '../../dominio/subterraneo'
import { BORDE_ANALISIS, FONDO_ANALISIS, FUENTE, GRIS, MARGEN, OSCURO, cabecera, hex, pie, seccion } from '../estilo'
import { CRITERIO_DIFICULTAD, type LaminaStacking, type Linea } from './datos'

const IZQ = { x: MARGEN, w: 8.3 }
const DER = { x: 9.05, w: 3.78 }
const ARRIBA = 1.2, ABAJO = 6.95, ALTO_TITULO = 0.45
const ETIQUETA = 0.55 // columna de rótulos (P12, Tipología…)
const G = 0.02 // separación entre celdas
const SEP_ORIENT = 0.07 // espacio extra entre grupos de orientación
const SEP_BLOQUE = 0.1 // antes de las bodegas en altura y entre edificio y subterráneo

const LEYENDA: Categoria[] = ['contrato', 'rc', 'vacante', 'piloto', 'visita', 'inhabilitado']
const NOMBRE: Partial<Record<Categoria, string>> = { contrato: 'Arrendado', vacante: 'Vacante', piloto: 'Piloto' }

// Ocupación de la columna: verde mezclado con gris claro según el % (como la pastilla del plano web).
function tinte(p: number) {
  const a = [0x34, 0xd3, 0x99], b = [0xf1, 0xf5, 0xf9], t = Math.max(p, 0.04)
  return a.map((v, i) => Math.round(v * t + b[i] * (1 - t)).toString(16).padStart(2, '0')).join('').toUpperCase()
}

interface FilaSub { etiqueta: string; estac: Estacionamiento[]; bodegas: Bodega[]; primera: boolean }

export function agregarLaminaStacking(pptx: PptxGenJS, edificio: Edificio, l: LaminaStacking, n: number) {
  const s = pptx.addSlide()
  const { layout } = edificio
  cabecera(s, `${edificio.nombre} | Stacking plan`, `Al ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}`)

  // ── Plano ──
  seccion(s, 'Stacking Plan', IZQ.x, ARRIBA, IZQ.w)
  // Leyenda en la línea del título, a la derecha.
  let lx = IZQ.x + IZQ.w
  for (const c of [...LEYENDA].reverse()) {
    const nombre = NOMBRE[c] ?? ESTILO[c].nombre
    const ancho = 0.2 + nombre.length * 0.06
    lx -= ancho + 0.08
    s.addShape('rect', { x: lx, y: ARRIBA + 0.13, w: 0.11, h: 0.11, fill: { color: hex(ESTILO[c].bg) }, line: { color: hex(ESTILO[c].borde), width: 0.75 } })
    s.addText(nombre, { x: lx + 0.14, y: ARRIBA + 0.08, w: ancho - 0.14, h: 0.2, fontFace: FUENTE, fontSize: 7, color: GRIS, margin: 0, valign: 'middle' })
  }

  const columnas = infoColumnas(layout, l.unidades)
  const cambios = cambiosDeOrientacion(layout.maxCol, columnas)
  const arriba = bodegasPorPiso(l.bodegas)
  const maxBod = Math.max(0, ...[...arriba.values()].map((b) => b.length))
  const sub = pisosSubterraneo(l.estac, l.bodegas).filter((p) => p.autos.length || p.motos.length || p.bodegas.length)
  const conTorres = [...columnas.values()].some((c) => c.torre)
  const rotulos: [string, (c: InfoColumna) => string][] = [
    ...(conTorres ? [['Torre', (c: InfoColumna) => c.torre] as [string, (c: InfoColumna) => string]] : []),
    ['Columna', (c) => String(c.numero)], ['Tipología', (c) => c.tipo], ['Sub-Tipología', (c) => c.sub2],
  ]

  // Tamaño de celda: el mayor que deja caber edificio + subterráneo en el área. Las filas del subterráneo
  // dependen del ancho de celda (más chicas = más por fila), por eso se busca bajando de a poco.
  const alto = ABAJO - (ARRIBA + ALTO_TITULO)
  const geometria = (w: number) => {
    const h = w * 0.72, hh = Math.max(0.1, h * 0.62)
    const porFilaTotal = Math.floor((IZQ.w - ETIQUETA) / (w + G))
    const hayBod = sub.some((p) => p.bodegas.length)
    const porFila = hayBod ? Math.max(1, Math.round(porFilaTotal * 0.62)) : porFilaTotal
    const porFilaBod = Math.max(1, porFilaTotal - porFila - 1)
    const filasSub: FilaSub[] = []
    for (const p of sub) {
      const grupos = [p.autos, p.motos].filter((g) => g.length)
      let bods = p.bodegas, primera = true
      for (const g of grupos.length ? grupos : [[]]) {
        const k = Math.max(1, Math.ceil(g.length / porFila), g === grupos.at(-1) ? Math.ceil(bods.length / porFilaBod) : 0)
        for (let i = 0; i < k; i++) {
          filasSub.push({ etiqueta: primera ? String(p.piso) : '', estac: g.slice(i * porFila, (i + 1) * porFila), bodegas: bods.slice(0, porFilaBod), primera })
          bods = bods.slice(porFilaBod); primera = false
        }
      }
    }
    const altoTotal = (rotulos.length + 2) * (hh + G) + 0.05 + layout.pisos.length * (h + G)
      + (filasSub.length ? SEP_BLOQUE * 2 + filasSub.length * (h + G) + sub.length * 0.04 : 0)
    return { w, h, hh, porFila, filasSub, altoTotal }
  }
  let w = Math.min(0.42, (IZQ.w - ETIQUETA - cambios.size * SEP_ORIENT - (maxBod ? SEP_BLOQUE : 0)) / (layout.maxCol + maxBod) - G)
  let geo = geometria(w)
  while (geo.altoTotal > alto && w > 0.08) geo = geometria((w *= 0.97))
  const { h, hh, porFila, filasSub } = geo
  const x0 = IZQ.x
  const xCol: number[] = []
  for (let c = 1, x = x0 + ETIQUETA; c <= layout.maxCol; c++) { if (cambios.has(c)) x += SEP_ORIENT; xCol[c] = x; x += w + G }
  const finCols = xCol[layout.maxCol] + w

  const tam = (texto: string, ww: number, hh2: number) => Math.max(3.5, Math.min(8, hh2 * 72 * 0.5, (ww * 72) / (texto.length * 0.62 + 0.4)))
  const rotulo = (t: string, y: number, alto2: number) =>
    s.addText(t, { x: x0, y, w: ETIQUETA - 0.05, h: alto2, align: 'right', valign: 'middle', fontFace: FUENTE, fontSize: Math.min(6, tam(t, ETIQUETA, alto2)), bold: true, color: GRIS, margin: 0 })
  // Mismo tamaño en todas las celdas, el que deja caber el número más largo ("1005B" en Tomás Moro).
  const tamCelda = tam('8'.repeat(Math.max(4, ...layout.pisos.flatMap((p) => p.celdas.map((c) => c.n.length)))), w, h)
  const celda = (x: number, y: number, cat: Categoria, texto: string) => {
    const e = ESTILO[cat] ?? ESTILO.default
    s.addText(texto, {
      x, y, w, h, align: 'center', valign: 'middle', margin: 0, fontFace: FUENTE, bold: true, fontSize: tamCelda, color: hex(e.texto),
      fill: { color: hex(e.bg) }, line: { color: hex(e.borde), width: 0.5 },
    })
  }

  // Cabecera de columnas.
  let y = ARRIBA + ALTO_TITULO
  const filaCabecera = (t: string, dibujar: (c: number, info: InfoColumna) => void) => {
    rotulo(t, y, hh)
    for (let c = 1; c <= layout.maxCol; c++) { const info = columnas.get(c); if (info) dibujar(c, info) }
    y += hh + G
  }
  for (const [t, valor] of rotulos) filaCabecera(t, (c, info) =>
    s.addText(valor(info), { x: xCol[c], y, w, h: hh, align: 'center', valign: 'middle', margin: 0, fontFace: FUENTE, fontSize: tam(valor(info), w, hh), color: OSCURO }))
  filaCabecera('Ocupación (%)', (c, info) => {
    const t = info.ocupacion === null ? '—' : `${Math.round(info.ocupacion * 100)}%`
    s.addText(t, { x: xCol[c], y, w, h: hh, align: 'center', valign: 'middle', margin: 0, fontFace: FUENTE, fontSize: tam('100%', w, hh), bold: true, color: OSCURO, fill: { color: tinte(info.ocupacion ?? 0) } })
  })
  // Orientación: una barra por grupo.
  rotulo('Orientación', y, hh)
  for (let c = 1; c <= layout.maxCol; c++) {
    const o = columnas.get(c)?.orientacion
    if (!o || (c > 1 && columnas.get(c - 1)?.orientacion === o && !cambios.has(c))) continue
    let fin = c
    while (fin < layout.maxCol && columnas.get(fin + 1)?.orientacion === o && !cambios.has(fin + 1)) fin++
    s.addText(o, { x: xCol[c], y, w: xCol[fin] + w - xCol[c], h: hh, align: 'center', valign: 'middle', margin: 0, fontFace: FUENTE, fontSize: tam('N', w, hh), bold: true, color: OSCURO, fill: { color: BORDE_ANALISIS } })
  }
  y += hh + G + 0.05

  // Pisos, con sus bodegas en altura a la derecha.
  for (const piso of layout.pisos) {
    rotulo(`P${piso.p}`, y, h)
    for (const c of piso.celdas) celda(xCol[c.c], y, l.unidades.get(c.n)?.categoria ?? 'default', c.n)
    ;(arriba.get(piso.p) ?? []).forEach((b, j) => celda(finCols + SEP_BLOQUE + j * (w + G), y, b.categoria, b.n))
    y += h + G
  }

  // Subterráneo: estacionamientos a la izquierda, bodegas a la derecha de una línea.
  if (filasSub.length) {
    y += SEP_BLOQUE - G
    s.addShape('line', { x: x0, y, w: IZQ.w, h: 0, line: { color: GRIS, width: 0.75, dashType: 'dash' } })
    y += SEP_BLOQUE
    const xe = x0 + ETIQUETA
    const xb = xe + porFila * (w + G) + 0.08
    for (const f of filasSub) {
      if (f.primera && f !== filasSub[0]) y += 0.04
      if (f.etiqueta) rotulo(f.etiqueta, y, h)
      f.estac.forEach((e, j) => celda(xe + j * (w + G), y, e.categoria, e.n))
      if (f.bodegas.length) {
        s.addShape('line', { x: xb - 0.05, y, w: 0, h, line: { color: GRIS, width: 0.75 } })
        f.bodegas.forEach((b, j) => celda(xb + j * (w + G), y, b.categoria, b.n))
      }
      y += h + G
    }
  }

  // ── Análisis ──
  const yVac = 3.75
  seccion(s, 'Ocupación', DER.x, ARRIBA, DER.w)
  cuadro(s, l.analisisOcupacion, DER.x, ARRIBA + ALTO_TITULO, DER.w, yVac - 0.2 - (ARRIBA + ALTO_TITULO))
  seccion(s, 'Análisis de vacancia', DER.x, yVac, DER.w)
  cuadro(s, l.analisisVacancia, DER.x, yVac + ALTO_TITULO, DER.w, ABAJO - (yVac + ALTO_TITULO))

  pie(s, `Fuente: hojas Estatus actual, EST, BOD y Evolución (${etiquetaMesLarga(l.mesReporte)}). Ocupación neta de pilotos. ${CRITERIO_DIFICULTAD}`, n)
}

// Cuadro de análisis con partes en negrita y sub-viñetas (mismo formato que `cuadroAnalisis`).
function cuadro(s: PptxGenJS.Slide, lineas: Linea[], x: number, y: number, w: number, h: number) {
  s.addShape('rect', { x, y, w, h, fill: { color: FONDO_ANALISIS }, line: { color: BORDE_ANALISIS, width: 2 } })
  const largo = lineas.reduce((t, l) => t + (l.destacado?.length ?? 0) + l.texto.length, 0)
  const base = largo > 450 ? 9 : largo > 300 ? 10 : 10.5
  const runs: PptxGenJS.TextProps[] = []
  for (const l of lineas) {
    const parrafo = { bullet: l.sub ? { indent: 12, characterCode: '25E6' } : { indent: 12 }, indentLevel: l.sub ? 1 : 0 }
    const fontSize = l.sub ? base - 1 : base
    if (l.destacado) runs.push({ text: l.destacado, options: { ...parrafo, bold: true, fontSize } })
    runs.push({ text: l.texto, options: { ...(l.destacado ? {} : parrafo), fontSize, breakLine: true } })
  }
  s.addText(runs, { x: x + 0.15, y: y + 0.12, w: w - 0.3, h: h - 0.24, fontFace: FUENTE, color: OSCURO, valign: 'top', paraSpaceAfter: 6, margin: 0 })
}
