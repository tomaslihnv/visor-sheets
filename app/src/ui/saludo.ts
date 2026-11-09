// Saludo de bienvenida en la barra superior: uno al azar entre los que calzan con la hora del día.
// `{n}` se reemplaza por el nombre de la persona.
type Franja = 'manana' | 'tarde' | 'noche' | 'siempre'

const SALUDOS: [Franja, string][] = [
  ['manana', 'Buenos días, {n}'],
  ['manana', 'Buen día, {n}'],
  ['manana', '¿Café listo, {n}?'],
  ['manana', 'Arrancamos, {n}'],
  ['manana', 'Partiendo el día, {n}'],
  ['tarde', 'Buenas tardes, {n}'],
  ['tarde', 'Buena tarde, {n}'],
  ['tarde', '¿Cómo va la tarde, {n}?'],
  ['tarde', 'A darle a la tarde, {n}'],
  ['noche', 'Buenas noches, {n}'],
  ['noche', 'Trabajando tarde, {n}'],
  ['noche', 'Último vistazo del día, {n}'],
  ['siempre', 'Hola, {n}'],
  ['siempre', '¿Qué hay de nuevo, {n}?'],
  ['siempre', 'Qué bueno verte, {n}'],
  ['siempre', 'De vuelta por aquí, {n}'],
  ['siempre', 'Bienvenido/a, {n}'],
  ['siempre', '¿Cómo estamos, {n}?'],
  ['siempre', 'Hola de nuevo, {n}'],
  ['siempre', 'Todo listo, {n}'],
]

const franja = (hora: number): Franja => (hora >= 5 && hora < 12 ? 'manana' : hora >= 12 && hora < 20 ? 'tarde' : 'noche')

export function saludo(nombre: string, ahora = new Date(), azar = Math.random()): string {
  const f = franja(ahora.getHours())
  const opciones = SALUDOS.filter(([x]) => x === f || x === 'siempre')
  return opciones[Math.floor(azar * opciones.length)][1].replace('{n}', nombre)
}

// Nombre de pila desde la cuenta de Google; si no viene, la parte del correo antes de la @.
export const nombreDe = (u: { displayName: string | null; email: string | null }) =>
  u.displayName?.trim().split(/\s+/)[0] || u.email?.split('@')[0] || ''
