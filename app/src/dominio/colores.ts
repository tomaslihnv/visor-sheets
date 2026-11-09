// Colores semánticos de los gráficos (los del visor anterior, CHART_COLORS en state.js).
// Una etiqueta que aparece en más de un gráfico usa siempre el mismo color.
export const COLORES = {
  noRenovacion: '#fb923c',
  renovacion: '#34d399',
  salidaAnticipada: '#a855f7',
  porDefinir: '#cbd5e1',
  nuevosContratos: '#3b82f6',
  salidas: '#f43f5e',
  netos: '#10b981',
  real: '#44546a',
  netoNegativo: '#c0674d',
  proyectadoPositivo: '#a8b8c8',
  proyectadoNegativo: '#e8a898',
}

// Motivos de salida en el orden de config.js; cada uno con su color fijo.
export const MOTIVOS = [
  'Cambio de domicilio', 'Compra de vivienda', 'Conflicto con vecino', 'Fin de contrato', 'Motivos económicos',
  'Motivos familiares', 'Motivos laborales', 'No renueva', 'Problemas con la propiedad', 'Término anticipado',
  'Desconformidad financiera', 'Desconformidad por servicio', 'Abandono', 'Asuntos personales', 'Comportamiento',
  'Disconformidad', 'Déficit financiero', 'Mora',
]
const PALETA_MOTIVOS = [
  '#60a5fa', '#4ade80', '#fbbf24', '#94a3b8', '#f87171', '#fde047', '#2dd4bf', '#fb923c', '#a3e635', '#a855f7',
  '#be123c', '#9f1239', '#fb7185', '#b45309', '#7c3aed', '#dc2626', '#0891b2', '#6b7280',
]
const sinTildes = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/^dis/, 'des')

export function colorMotivo(motivo: string): string {
  let i = MOTIVOS.indexOf(motivo)
  if (i < 0) i = MOTIVOS.findIndex((m) => sinTildes(m) === sinTildes(motivo)) // "Disconformidad" = "Desconformidad"
  if (i >= 0) return PALETA_MOTIVOS[i % PALETA_MOTIVOS.length]
  let h = 0
  for (const c of motivo) h = (h * 31 + c.charCodeAt(0)) >>> 0 // motivo nuevo: color estable según el nombre
  return PALETA_MOTIVOS[h % PALETA_MOTIVOS.length]
}

const PALETA_GENERAL = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6']
export const colorSerie = (i: number) => PALETA_GENERAL[i % PALETA_GENERAL.length]
