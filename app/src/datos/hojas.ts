import { useEffect, useState } from 'react'
import Papa from 'papaparse'
import type { Edificio, Hoja } from '../edificios'

export type Fila = Record<string, string>

// Una descarga por hoja y sesión: varios componentes que piden la misma hoja comparten la promesa.
const cache = new Map<string, Promise<Fila[]>>()

// "I. Contratos" trae títulos arriba: los encabezados están en la fila 5. Además repite nombres de columna
// (Nombre, Sexo, Edad, Estatus del titular y de cada residente): se numeran ("Nombre (2)") para no perder datos.
export function leerContratos(csv: string): Fila[] {
  const filas = Papa.parse<string[]>(csv.trim(), { header: false, skipEmptyLines: false }).data
  const vistos: Record<string, number> = {}
  const encabezados = (filas[4] ?? []).map((h) => {
    const nombre = h.trim()
    vistos[nombre] = (vistos[nombre] ?? 0) + 1
    return vistos[nombre] > 1 ? `${nombre} (${vistos[nombre]})` : nombre
  })
  return filas.slice(5)
    .filter((f) => f.some((c) => c && c.trim()))
    .map((f) => Object.fromEntries(encabezados.map((h, i) => [h, f[i] ?? ''])))
}

export function cargarHoja(url: string, leer: (csv: string) => Fila[] = (csv) => Papa.parse<Fila>(csv.trim(), { header: true, skipEmptyLines: true }).data): Promise<Fila[]> {
  if (!cache.has(url)) {
    const p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`La hoja respondió ${r.status}`)
        return r.text()
      })
      .then(leer)
    p.catch(() => cache.delete(url)) // un error no queda guardado: se reintenta la próxima vez
    cache.set(url, p)
  }
  return cache.get(url)!
}

export type Estado<T> = { cargando: true } | { cargando: false; error: string } | { cargando: false; datos: T }

export function useHoja(edificio: Edificio, hoja: Hoja): Estado<Fila[]> {
  const url = edificio.hojas[hoja]
  const [estado, setEstado] = useState<Estado<Fila[]>>({ cargando: true })
  useEffect(() => {
    if (!url) return setEstado({ cargando: false, error: `${edificio.nombre} no tiene la hoja "${hoja}" configurada` })
    let vigente = true
    setEstado({ cargando: true })
    cargarHoja(url, hoja === 'contratos' ? leerContratos : undefined).then(
      (datos) => vigente && setEstado({ cargando: false, datos }),
      (e: Error) => vigente && setEstado({ cargando: false, error: e.message }),
    )
    return () => { vigente = false }
  }, [url, edificio.nombre, hoja])
  return estado
}
