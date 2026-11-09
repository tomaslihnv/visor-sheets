// Colores semánticos de los gráficos (los del visor anterior, CHART_COLORS en state.js).
// Una etiqueta que aparece en más de un gráfico usa siempre el mismo color.
// Paleta categórica validada (daltonismo y contraste, skill dataviz): orden fijo, nunca se cicla más allá de 5.
export const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4']
export const OTROS = '#b8bfc7'
export const TINTA = '#2d3334'

export const COLORES = {
  noRenovacion: '#fb923c',
  renovacion: '#1baf7a',
  salidaAnticipada: '#a855f7',
  porDefinir: '#c3c9d0',
  nuevosContratos: '#2a78d6',
  salidas: '#e34948',
  netos: TINTA,
  real: '#5b6670', // gris SITU
  situ: '#96323c', // rojo SITU
}

// Texto legible sobre un relleno: blanco en colores oscuros, tinta en los claros.
export function tintaSobre(fondo: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fondo.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.3 ? TINTA : '#fff'
}

// Motivos de salida en el orden de config.js; cada uno con su color fijo.
export const MOTIVOS = [
  'Cambio de domicilio', 'Compra de vivienda', 'Conflicto con vecino', 'Fin de contrato', 'Motivos económicos',
  'Motivos familiares', 'Motivos laborales', 'No renueva', 'Problemas con la propiedad', 'Término anticipado',
  'Desconformidad financiera', 'Desconformidad por servicio', 'Abandono', 'Asuntos personales', 'Comportamiento',
  'Disconformidad', 'Déficit financiero', 'Mora',
]
const PALETA_MOTIVOS = [
  '#60a5fa', '#4ade80', '#fbbf24', '#94a3b8', '#f87171', '#fde047', '#2dd4bf', COLORES.noRenovacion, '#a3e635', COLORES.salidaAnticipada,
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

// Serie i-ésima de un gráfico; desde la sexta, gris (agrupar en "Otros" antes de llegar ahí).
export const colorSerie = (i: number) => SERIES[i] ?? OTROS
