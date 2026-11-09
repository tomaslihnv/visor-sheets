// Arma la presentación del edificio con todas sus láminas. pptxgenjs pesa ~400 kB: se carga solo al exportar.
import type { Edificio } from '../edificios'
import type { LaminaOcupacion } from './ocupacion/datos'
import type { LaminaSalidas } from './salidas/datos'

export interface Laminas { ocupacion: LaminaOcupacion | null; salidas: LaminaSalidas | null }

export async function descargarPresentacion(edificio: Edificio, l: Laminas) {
  const [{ default: PptxGenJS }, { agregarLaminaOcupacion }, { agregarLaminaSalidas }] = await Promise.all([
    import('pptxgenjs'), import('./ocupacion/pptx'), import('./salidas/pptx'),
  ])
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 in, 16:9
  pptx.title = `${edificio.nombre} · Reporte`
  let n = 0
  if (l.ocupacion) agregarLaminaOcupacion(pptx, edificio, l.ocupacion, ++n)
  if (l.salidas) agregarLaminaSalidas(pptx, edificio, l.salidas, ++n)
  const mes = l.ocupacion?.mesReporte ?? l.salidas?.mesReporte ?? ''
  await pptx.writeFile({ fileName: `${edificio.nombre} ${mes}.pptx` })
}
