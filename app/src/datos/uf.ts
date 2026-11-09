// Valor de la UF por fecha (mindicador.cl). Es lenta (4–20 s por consulta) y a veces no responde:
// timeout y caché en IndexedDB, que nunca se invalida porque la UF de una fecha pasada no cambia.

// 'dd-mm-aaaa', el formato de la API.
export const fechaAPI = (d: Date) => `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`

// UF de referencia: último día del mes anterior.
export const fechaReferencia = (hoy = new Date()) => new Date(hoy.getFullYear(), hoy.getMonth(), 0)

export const ultimoDiaDelMes = (mes: number, año: number) => new Date(año, mes, 0)

let db: Promise<IDBDatabase> | undefined
function almacen(modo: IDBTransactionMode) {
  db ??= new Promise((res, rej) => {
    const rq = indexedDB.open('visor-uf', 1) // misma base que el visor anterior: comparten caché
    rq.onupgradeneeded = () => rq.result.createObjectStore('uf')
    rq.onsuccess = () => res(rq.result)
    rq.onerror = () => rej(rq.error)
  })
  return db.then((d) => d.transaction('uf', modo).objectStore('uf'))
}
const pedido = <T,>(rq: IDBRequest<T>) => new Promise<T>((res, rej) => { rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error) })
const leer = (k: string) => almacen('readonly').then((s) => pedido<number | undefined>(s.get(k))).catch(() => undefined)
const guardar = (k: string, v: number) => almacen('readwrite').then((s) => pedido(s.put(v, k))).catch(() => {})

export async function valorUF(fecha: string): Promise<number | null> {
  const guardado = await leer(fecha)
  if (guardado) return guardado
  try {
    const r = await fetch(`https://mindicador.cl/api/uf/${fecha}`, { signal: AbortSignal.timeout(15000) })
    const v: number | null = (await r.json())?.serie?.[0]?.valor ?? null
    if (v) guardar(fecha, v)
    return v
  } catch {
    return null
  }
}

export async function valoresUF(fechas: string[]): Promise<Record<string, number | null>> {
  const unicas = [...new Set(fechas)]
  return Object.fromEntries(await Promise.all(unicas.map(async (f) => [f, await valorUF(f)] as const)))
}
