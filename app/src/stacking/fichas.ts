// Contenido del tooltip de cada unidad, estacionamiento y bodega (mismos campos del visor anterior).
import type { Unidad } from '../dominio/unidades'
import type { Bodega, Estacionamiento } from '../dominio/subterraneo'
import type { Ficha } from './Tooltip'

export const pesos = (v: number | null) => (v === null ? '—' : '$' + Math.round(v).toLocaleString('es-CL'))

export function fichaUnidad(n: string, u: Unidad | undefined): Ficha {
  const filas: [string, string][] = [
    ['Titular', u?.titular && u.titular !== '-' ? u.titular : '—'],
    ['Tipología', u?.tipo || '—'],
    ['Orientación', u?.orientacion || '—'],
    ['Canon CLP', pesos(u?.canonCLP ?? null)],
    ['GGCC', pesos(u?.ggccCLP ?? null)],
    ['Canon UF/m²', u?.canonUFm2 != null ? `${u.canonUFm2.toFixed(2)} UF/m²` : '—'],
    ['Sal/arriendo', u?.salarioArriendo != null ? `${u.salarioArriendo.toFixed(1).replace('.', ',')}x` : '—'],
  ]
  if (u?.categoria === 'contrato') filas.push(['Días remanentes', u.diasRemanentes != null ? `${u.diasRemanentes} días` : '—'])
  else if (u?.categoria === 'vacante') filas.push(['Días vacante', u.diasVacante != null ? `${u.diasVacante} días` : '—'])
  return { titulo: `Unidad ${n}`, filas }
}

export function fichaEstacionamiento(e: Estacionamiento): Ficha {
  const filas: [string, string][] = [
    ['Titular', e.titular || '—'],
    ['Canon', pesos(e.canon)],
    ['GGCC', pesos(e.ggcc)],
    ['Tándem', e.tandem ? 'Sí' : 'No'],
  ]
  if (e.depto) filas.push(['Depto.', e.depto])
  if (e.destino) filas.push(['Destino', e.destino])
  return { titulo: `${e.categoria === 'local' ? 'Local' : 'Estac.'} ${e.n}`, filas }
}

export function fichaBodega(b: Bodega): Ficha {
  const filas: [string, string][] = [
    ['Titular', b.titular || '—'],
    ['Canon', pesos(b.canon)],
    ['GGCC', pesos(b.ggcc)],
  ]
  if (b.depto) filas.push(['Depto.', b.depto])
  return { titulo: `Bodega ${b.n}`, filas }
}
