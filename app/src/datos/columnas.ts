// Los encabezados de las hojas varían entre edificios ("N°", "n°", "Nº", "Canon Estac. " con espacio...):
// se buscan por su forma normalizada (sin tildes, mayúsculas, sin espacios en los bordes).

export const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()

export function buscarColumna(encabezados: string[], ...pruebas: ((k: string) => boolean)[]): string | null {
  for (const prueba of pruebas) {
    const h = encabezados.find((x) => prueba(normalizar(x)))
    if (h) return h
  }
  return null
}

export const texto = (v: string | undefined) => (v ?? '').trim()
