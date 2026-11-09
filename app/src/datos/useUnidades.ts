import { useEffect, useMemo, useState } from 'react'
import type { Edificio } from '../edificios'
import { useHoja, type Estado, type Fila } from './hojas'
import { valoresUF } from './uf'
import { construirUnidades, fechasUFNecesarias, type Unidad } from '../dominio/unidades'

// Unidades de "Estatus actual" con sus valores calculados. La UF tarda: las unidades llegan altiro y el canon
// en UF (y el ajuste por IPC) se completa cuando responde la API.
export function useUnidades(edificio: Edificio): { estatus: Estado<Fila[]>; unidades: Map<string, Unidad>; conUF: boolean } {
  const estatus = useHoja(edificio, 'estatus')
  const filas = 'datos' in estatus ? estatus.datos : null
  const [uf, setUF] = useState<Record<string, number | null>>({})
  useEffect(() => {
    if (!filas) return
    let vigente = true
    valoresUF(fechasUFNecesarias(filas)).then((v) => vigente && setUF(v))
    return () => { vigente = false }
  }, [filas])
  const unidades = useMemo(() => construirUnidades(filas ?? [], uf), [filas, uf])
  return { estatus, unidades, conUF: Object.keys(uf).length > 0 }
}
