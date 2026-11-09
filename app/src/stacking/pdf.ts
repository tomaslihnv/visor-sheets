// Stacking plan en PDF (A3 horizontal), como el del visor anterior: página 1 con el edificio (panel de métricas,
// orientación, pisos y bodegas sobre el suelo) y página 2 con el subterráneo. Opcional: cada celda enlaza a la
// carpeta de Drive con sus contratos. Mismo lenguaje del plano web: los grupos de orientación se separan con un
// espacio y no con líneas.
import { jsPDF } from 'jspdf'
import type { Edificio } from '../edificios'
import { ESTILO, type Categoria } from '../dominio/categorias'
import { cambiosDeOrientacion, infoColumnas } from '../dominio/encabezados'
import { NOMBRE_ORIENTACION, metricasDeptos, metricasSimple } from '../dominio/metricas'
import { bodegasPorPiso, pisosSubterraneo, type Bodega, type Estacionamiento } from '../dominio/subterraneo'
import type { Unidad } from '../dominio/unidades'
import { DRIVE, urlDrive } from '../drive'

type RGB = [number, number, number]
const rgb = (hex: string): RGB => { const h = hex.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)] }
const OSCURO: RGB = [26, 35, 50]
const GRIS: RGB = [120, 110, 95]
const GRIS_SUAVE: RGB = [154, 144, 128]

const LEYENDA: { cat: Categoria; nombre: string }[] = [
  { cat: 'contrato', nombre: 'Arrendado' }, { cat: 'rc', nombre: 'Renta corta' }, { cat: 'vacante', nombre: 'Vacante' },
  { cat: 'piloto', nombre: 'Piloto' }, { cat: 'visita', nombre: 'Visita' }, { cat: 'inhabilitado', nombre: 'Inhabilitado' },
]

export interface DatosPdf {
  edificio: Edificio
  unidades: Map<string, Unidad>
  estac: Estacionamiento[]
  bodegas: Bodega[]
  conLinks: boolean
}

export function generarStackingPdf({ edificio, unidades, estac, bodegas, conLinks }: DatosPdf): jsPDF {
  const { layout } = edificio
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
  const pageW = doc.internal.pageSize.getWidth() // 420
  const pageH = doc.internal.pageSize.getHeight() // 297
  const margen = 10, altoCabecera = 25, altoLeyenda = 14, anchoPanel = 48, sepPanel = 5, anchoEtiqueta = 11, gap = 0.5, altoOrient = 6
  const drive = conLinks ? DRIVE[edificio.id] : undefined
  const enlace = (mapa: Record<string, string> | undefined, n: string) => { const id = mapa?.[n] ?? mapa?.[String(parseInt(n))]; return id ? urlDrive(id) : null }
  const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

  const cabecera = (titulo: string) => {
    doc.setDrawColor(...rgb(edificio.color.linea)); doc.setLineWidth(0.8); doc.line(margen, 8, pageW - margen, 8)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...OSCURO); doc.text(`${edificio.nombre}  —  ${titulo}`, margen, 15)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(138, 155, 176); doc.text(fecha, margen, 21)
  }
  const leyenda = () => {
    const y = pageH - margen - 4, lado = 3.5
    let x = margen
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5)
    for (const { cat, nombre } of LEYENDA) {
      const s = ESTILO[cat]
      doc.setFillColor(...rgb(s.bg)); doc.setDrawColor(...rgb(s.borde)); doc.setLineWidth(0.15)
      doc.roundedRect(x, y - lado, lado, lado, 0.4, 0.4, 'FD')
      doc.setTextColor(60, 60, 60); doc.text(nombre, x + lado + 1.2, y - 0.3)
      x += lado + doc.getTextWidth(nombre) + 5
    }
    if (drive) { doc.setFontSize(5.5); doc.setTextColor(138, 155, 176); doc.text('· Celdas clickeables: abren la carpeta de contratos en Google Drive', x + 6, y - 0.3) }
  }
  // Celda: rectángulo redondeado con el número (y una segunda línea opcional, p. ej. la tipología).
  const celda = (x: number, y: number, w: number, h: number, cat: Categoria, n: string, linea2: string, tam: number, url: string | null) => {
    const s = ESTILO[cat] ?? ESTILO.default
    doc.setFillColor(...rgb(s.bg)); doc.setDrawColor(...rgb(s.borde)); doc.setLineWidth(0.18)
    doc.roundedRect(x, y, w, h, 0.7, 0.7, 'FD')
    doc.setTextColor(...rgb(s.texto)); doc.setFont('helvetica', 'bold'); doc.setFontSize(tam)
    if (linea2) {
      doc.text(n, x + w / 2, y + h * 0.42 + tam * 0.18, { align: 'center' })
      const t2 = Math.max(3, tam * 0.66)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(t2); doc.text(linea2, x + w / 2, y + h * 0.78 + t2 * 0.18, { align: 'center' })
    } else doc.text(n, x + w / 2, y + h / 2 + tam * 0.18, { align: 'center' })
    if (url) doc.link(x, y, w, h, { url })
  }

  // ── Página 1: edificio ──────────────────────────────────────────────────────────
  cabecera('Stacking Plan')
  const d = metricasDeptos(layout, unidades)
  const m = metricasSimple(estac), b = metricasSimple(bodegas)
  const pct = (v: number | null) => (v === null ? '—' : `${Math.round(v * 100)}%`)

  // Panel de métricas.
  let my = altoCabecera + 2
  doc.setFillColor(249, 245, 238); doc.setDrawColor(227, 219, 208); doc.setLineWidth(0.3)
  doc.roundedRect(margen, my - 1, anchoPanel, pageH - my - margen - altoLeyenda + 1, 2, 2, 'FD')
  const fila = (etiqueta: string, valor: string, negrita = false) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(...GRIS); doc.text(etiqueta, margen + 3, my)
    doc.setFont('helvetica', negrita ? 'bold' : 'normal'); doc.setFontSize(negrita ? 9 : 7.5); doc.setTextColor(...OSCURO)
    doc.text(valor, margen + anchoPanel - 3, my, { align: 'right' }); my += 6
  }
  const titulo = (t: string) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 165, 140); doc.text(t.toUpperCase(), margen + 3, my); my += 4.5 }
  const separador = () => { doc.setDrawColor(220, 212, 200); doc.setLineWidth(0.2); doc.line(margen + 3, my - 1, margen + anchoPanel - 3, my - 1); my += 2 }
  my += 2
  titulo('Departamentos')
  fila('Contratos', String(d.contratos), true); fila('Renta corta', String(d.rentaCorta)); fila('Vacantes', String(d.vacantes)); fila('Pilotos', String(d.pilotos))
  separador(); titulo('Ocupación')
  fila('Deptos.', `${pct(d.ocupacion)} (${d.enRenta} un.)`, true); fila('Estacionamientos', pct(m.ocupacion)); fila('Bodegas', pct(b.ocupacion))
  separador(); titulo('Tipología')
  for (const t of d.tipologias) fila(t.tipo, `${t.arrendadas}/${t.total} · ${t.total ? Math.round((t.arrendadas / t.total) * 100) : 0}%`)
  separador(); titulo('Orientación')
  for (const o of d.orientaciones) fila(NOMBRE_ORIENTACION[o.orientacion] ?? o.orientacion, `${o.arrendadas}/${o.total} · ${o.total ? Math.round((o.arrendadas / o.total) * 100) : 0}%`)

  // Geometría del plano: espacio extra entre grupos de orientación y bodegas sobre el suelo a la derecha.
  const columnas = infoColumnas(layout, unidades)
  const cambios = cambiosDeOrientacion(layout.maxCol, columnas)
  const sepOrient = 1.6
  const bodArriba = bodegasPorPiso(bodegas)
  const maxBod = Math.max(0, ...[...bodArriba.values()].map((l) => l.length))
  const stackX = margen + anchoPanel + sepPanel
  const altoDisp = pageH - margen - altoCabecera - altoOrient - altoLeyenda - margen
  const anchoTotal = pageW - stackX - margen - anchoEtiqueta - gap
  const pisos = layout.pisos.length
  const extra = cambios.size * sepOrient
  const proporcion = 34 / 28
  const estimado = Math.min((anchoTotal - extra - (layout.maxCol - 1) * gap) / layout.maxCol, ((altoDisp - (pisos - 1) * gap) / pisos) * proporcion)
  const reservaBod = maxBod ? 7 + maxBod * (estimado + gap) : 0
  const anchoDisp = anchoTotal - reservaBod
  const w = Math.min((anchoDisp - extra - (layout.maxCol - 1) * gap) / layout.maxCol, ((altoDisp - (pisos - 1) * gap) / pisos) * proporcion)
  const h = w / proporcion
  const xCol: number[] = []
  let x = 0
  for (let c = 1; c <= layout.maxCol; c++) { if (cambios.has(c)) x += sepOrient; xCol[c] = x; x += w + gap }
  const anchoGrilla = x - gap
  const altoGrilla = pisos * h + (pisos - 1) * gap
  const x0 = stackX + anchoEtiqueta + gap + (anchoDisp - anchoGrilla) / 2
  const y0 = altoCabecera + altoOrient + (altoDisp - altoGrilla) / 2

  // Orientación: un rótulo por grupo de columnas.
  const tramos: { desde: number; hasta: number; o: string }[] = []
  for (let c = 1; c <= layout.maxCol; c++) {
    const o = columnas.get(c)?.orientacion
    if (!o) continue
    const ultimo = tramos.at(-1)
    if (ultimo && ultimo.o === o && ultimo.hasta === c - 1 && !cambios.has(c)) ultimo.hasta = c
    else tramos.push({ desde: c, hasta: c, o })
  }
  for (const t of tramos) {
    const tx = x0 + xCol[t.desde], tw = xCol[t.hasta] + w - xCol[t.desde]
    doc.setFillColor(236, 231, 222); doc.roundedRect(tx, altoCabecera + 1, tw, altoOrient - 1.5, 0.8, 0.8, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(Math.max(5, Math.min(6.5, tw * 0.15))); doc.setTextColor(74, 64, 48)
    doc.text(tw > 12 ? NOMBRE_ORIENTACION[t.o] ?? t.o : t.o, tx + tw / 2, altoCabecera + 1 + (altoOrient - 1.5) / 2 + 1, { align: 'center' })
  }

  // Pisos.
  const tamNum = Math.max(4.5, Math.min(7.5, w * 0.42))
  const tamEtiqueta = Math.max(4, Math.min(6.5, h * 0.52))
  layout.pisos.forEach((piso, i) => {
    const y = y0 + i * (h + gap)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(tamEtiqueta); doc.setTextColor(...GRIS_SUAVE)
    doc.text(`P${piso.p}`, stackX + anchoEtiqueta - 1, y + h / 2 + tamEtiqueta * 0.18, { align: 'right' })
    for (const c of piso.celdas) {
      const u = unidades.get(c.n)
      celda(x0 + xCol[c.c], y, w, h, u?.categoria ?? 'default', c.n, u?.tipo ?? '', tamNum, enlace(drive?.depto, c.n))
    }
    // Bodegas del piso, a la derecha.
    ;(bodArriba.get(piso.p) ?? []).forEach((bo, j) => celda(x0 + anchoGrilla + 7 + j * (w + gap), y, w, h, bo.categoria, bo.n, '', tamNum, enlace(drive?.bod, bo.n)))
  })
  if (maxBod) {
    const sx = x0 + anchoGrilla + 3.5
    doc.setDrawColor(...GRIS_SUAVE); doc.setLineWidth(0.4); doc.line(sx, y0, sx, y0 + altoGrilla)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...GRIS_SUAVE); doc.text('Bodegas', sx + 2, y0 - 1.5)
  }
  leyenda()

  // ── Página 2: subterráneo ───────────────────────────────────────────────────────
  const sub = pisosSubterraneo(estac, bodegas).filter((p) => p.autos.length || p.motos.length || p.bodegas.length)
  if (sub.length) {
    doc.addPage()
    cabecera('Subterráneo')
    const sw = 9, sh = 7.5, sg = 1, etiqueta = 10
    const sx = margen + etiqueta + sg
    const util = pageW - margen - sx
    // Estacionamientos a la izquierda y bodegas a la derecha; cada lado pasa a la fila siguiente al llenarse.
    const hayBod = sub.some((p) => p.bodegas.length)
    const anchoEstac = hayBod ? util * 0.62 : util
    const porFila = Math.max(1, Math.floor(anchoEstac / (sw + sg)))
    const porFilaBod = Math.max(1, Math.floor((util - anchoEstac - 6) / (sw + sg)))
    const sepX = sx + porFila * (sw + sg) + 2
    let y = altoCabecera + 4
    const bloque = (lista: Estacionamiento[], etiquetaPrimera: string, bods: Bodega[]) => {
      const filas = Math.max(1, Math.ceil(lista.length / porFila), Math.ceil(bods.length / porFilaBod))
      for (let k = 0; k < filas; k++) {
        if (y + sh + sg > pageH - margen - altoLeyenda) { doc.addPage(); y = margen + 4 }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...GRIS_SUAVE)
        doc.text(k === 0 ? etiquetaPrimera : '', margen + etiqueta - 1, y + sh / 2 + 1, { align: 'right' })
        lista.slice(k * porFila, (k + 1) * porFila).forEach((e, j) => celda(sx + j * (sw + sg), y, sw, sh, e.categoria, e.n, '', 5, enlace(drive?.estac, e.n)))
        const bodFila = bods.slice(k * porFilaBod, (k + 1) * porFilaBod)
        if (bodFila.length) {
          doc.setDrawColor(...GRIS_SUAVE); doc.setLineWidth(0.3); doc.line(sepX, y, sepX, y + sh)
          bodFila.forEach((bo, j) => celda(sepX + 3 + j * (sw + sg), y, sw, sh, bo.categoria, bo.n, '', 5, enlace(drive?.bod, bo.n)))
        }
        y += sh + sg
      }
    }
    if (hayBod) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...GRIS_SUAVE)
      doc.text('ESTACIONAMIENTOS', sx, y - 1); doc.text('BODEGAS', sepX + 3, y - 1); y += 1.5
    }
    for (const p of sub) {
      bloque(p.autos, String(p.piso), p.bodegas)
      if (p.motos.length) bloque(p.motos, p.autos.length ? 'Moto' : String(p.piso), [])
      y += 3
    }
    leyenda()
  }
  return doc
}
