// Plano de pisos de un edificio: qué unidad va en qué columna de cada piso.
export interface Celda { c: number; n: string }
export interface Piso { p: number; celdas: Celda[] }
export interface Layout { maxCol: number; pisos: Piso[] }

export const unidadesDelLayout = (l: Layout) => l.pisos.flatMap((p) => p.celdas.map((c) => c.n))
