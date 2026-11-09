// Estado de cada unidad, estacionamiento y bodega. Mismas reglas del visor anterior (categories.js).

export type Categoria = 'contrato' | 'rc' | 'vacante' | 'piloto' | 'visita' | 'inhabilitado' | 'local' | 'default'

// Colores del visor anterior (CAT_STYLE): el equipo ya los conoce.
export const ESTILO: Record<Categoria, { bg: string; borde: string; texto: string; nombre: string }> = {
  contrato:     { bg: '#d1fae5', borde: '#6ee7b7', texto: '#065f46', nombre: 'Contratos' },
  rc:           { bg: '#ede9fe', borde: '#c4b5fd', texto: '#5b21b6', nombre: 'Renta corta' },
  vacante:      { bg: '#fee2e2', borde: '#fca5a5', texto: '#991b1b', nombre: 'Vacantes' },
  piloto:       { bg: '#ffedd5', borde: '#fdba74', texto: '#9a3412', nombre: 'Pilotos' },
  visita:       { bg: '#e0f2fe', borde: '#7dd3fc', texto: '#0369a1', nombre: 'Visita' },
  inhabilitado: { bg: '#e2e8f0', borde: '#94a3b8', texto: '#334155', nombre: 'Inhabilitado' },
  local:        { bg: '#fef9c3', borde: '#fde047', texto: '#854d0e', nombre: 'Local' },
  default:      { bg: '#f0f4f8', borde: '#d1dae3', texto: '#3a4f63', nombre: 'Sin datos' },
}

const destino = (v: string | undefined) => (v ?? '').trim().replace('−', '-')

// Departamento: Destino RC / P / "-" (con Estatus 1 = contrato vigente).
export function categoriaUnidad(destinoHoja: string | undefined, estatus: string | undefined): Categoria {
  const d = destino(destinoHoja)
  if (d === 'RC') return 'rc'
  if (d === 'P') return 'piloto'
  if (d === '-') return (estatus ?? '').trim() === '1' ? 'contrato' : 'vacante'
  return 'default'
}

export function categoriaEstacionamiento(e: { n: string; estatus: string; titular: string; destino: string }): Categoria {
  if (e.n.toUpperCase().startsWith('ELC')) return 'local'
  if (e.estatus === '2') return 'inhabilitado'
  const titular = e.titular.toLowerCase()
  if (titular === 'visita') return 'visita'
  if (e.estatus === '1' || titular === 'ford') return 'contrato' // Ford arrienda sin contrato individual
  const d = destino(e.destino).toUpperCase()
  if (d === 'RC' || d === 'FORD') return 'contrato'
  return 'vacante'
}

export const categoriaBodega = (estatus: string): Categoria => (estatus === '1' ? 'contrato' : 'vacante')

export const enRenta = (c: Categoria) => c === 'contrato' || c === 'rc'
