// Departamentos de la hoja "Estatus actual", con los valores calculados que muestra el visor
// (ajuste por IPC, canon en CLP/UF/UF por m², salario/arriendo, días remanentes y vacantes).
// Mismos cálculos del visor anterior (data.js). Lógica pura: la UF entra como parámetro.
import type { Fila } from '../datos/hojas'
import { buscarColumna, texto } from '../datos/columnas'
import { numero } from '../datos/numeros'
import { fechaAPI, fechaReferencia, ultimoDiaDelMes } from '../datos/uf'
import { categoriaUnidad, type Categoria } from './categorias'

export interface Unidad {
  n: string
  fila: Fila
  categoria: Categoria
  tipo: string
  sub1: string
  sub2: string
  orientacion: string
  titular: string
  firma: Date | null // firma del contrato vigente
  ipc: number | null // ajuste acumulado desde la firma (UF ref / UF firma − 1)
  ufFirma: number | null
  canonCLP: number | null
  ggccCLP: number | null
  canonUF: number | null
  canonUFm2: number | null
  salarioArriendo: number | null
  diasRemanentes: number | null // contratos: días hasta el vencimiento (0 si ya venció)
  diasVacante: number | null // vacantes: días desde el término del último contrato
}

interface Columnas { unidad: string; util: string; termino: string | null; firma: string; salario: string | null; titular: string | null; ggcc: string; sub2: string }

export function columnasEstatus(encabezados: string[]): Columnas {
  const b = (...p: ((k: string) => boolean)[]) => buscarColumna(encabezados, ...p)
  return {
    unidad: b((k) => k === 'UNIDAD') ?? 'Unidad',
    util: b((k) => k === 'UTIL') ?? 'Útil',
    termino: b((k) => k === 'TERMINO' || k === 'VENCIMIENTO' || k.startsWith('TERMINO') || k.includes('VENCIMIENT')),
    firma: b((k) => k === 'FIRMA' || k.includes('FIRMA')) ?? 'Firma',
    salario: b((k) => k === 'SALARIO'),
    titular: b((k) => k === 'TITULAR' || k === 'ARRENDATARIO' || k === 'NOMBRE'),
    ggcc: b((k) => k.includes('GGCC') && k.includes('DEPTO')) ?? 'GGCC Deptos.',
    sub2: b((k) => k.includes('SUB') && k.includes('2')) ?? 'Sub. Tip (2)',
  }
}

// "dd/mm/aaaa"
export function leerFecha(v: string | undefined): Date | null {
  const p = texto(v).split('/')
  if (p.length !== 3) return null
  const [d, m, a] = p.map((x) => parseInt(x))
  if (!d || !m || !a) return null
  return new Date(a, m - 1, d)
}

const esContrato = (f: Fila) => categoriaUnidad(f['Destino'], f['Estatus']) === 'contrato'

// Fechas de UF que hay que consultar: la de referencia y la del último día del mes de cada firma vigente.
export function fechasUFNecesarias(filas: Fila[], hoy = new Date()): string[] {
  const firma = filas.length ? columnasEstatus(Object.keys(filas[0])).firma : 'Firma'
  const fechas = new Set([fechaAPI(fechaReferencia(hoy))])
  for (const f of filas) {
    const d = esContrato(f) ? leerFecha(f[firma]) : null
    if (d) fechas.add(fechaAPI(ultimoDiaDelMes(d.getMonth() + 1, d.getFullYear())))
  }
  return [...fechas]
}

const DIA = 86_400_000
const diasEntre = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DIA)

export function construirUnidades(filas: Fila[], uf: Record<string, number | null>, hoy = new Date()): Map<string, Unidad> {
  const mapa = new Map<string, Unidad>()
  if (!filas.length) return mapa
  const col = columnasEstatus(Object.keys(filas[0]))
  const refUF = uf[fechaAPI(fechaReferencia(hoy))] ?? null
  const hoyDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())

  for (const f of filas) {
    const n = texto(f[col.unidad]) // string: en Tomás Moro las unidades son alfanuméricas (901A)
    if (!n) continue
    const categoria = categoriaUnidad(f['Destino'], f['Estatus'])
    const contrato = categoria === 'contrato'

    let ipc: number | null = null
    let ufFirma: number | null = null
    const firma = contrato ? leerFecha(f[col.firma]) : null
    if (firma && refUF) {
      ufFirma = uf[fechaAPI(ultimoDiaDelMes(firma.getMonth() + 1, firma.getFullYear()))] ?? null
      if (ufFirma) ipc = refUF / ufFirma - 1
    }

    const canonHoja = numero(f['Canon Deptos.'])
    const canonCLP = canonHoja === null ? null : ipc !== null ? canonHoja * (1 + ipc) : canonHoja
    const canonUF = canonCLP !== null && refUF ? canonCLP / refUF : null
    const util = numero(f[col.util])
    const salario = contrato && col.salario ? numero(f[col.salario]) : null

    const termino = col.termino ? leerFecha(f[col.termino]) : null
    const vacante = texto(f['Destino']).replace('−', '-') === '-' && !contrato

    mapa.set(n, {
      n,
      fila: f,
      categoria,
      tipo: texto(f['Tipo']),
      sub1: texto(f['Sub Tip. (1)']),
      sub2: texto(f[col.sub2]),
      orientacion: texto(f['Orientación']).toUpperCase(),
      titular: col.titular ? texto(f[col.titular]) : '',
      firma,
      ipc,
      ufFirma,
      canonCLP,
      ggccCLP: numero(f[col.ggcc]),
      canonUF,
      canonUFm2: canonUF !== null && util ? canonUF / util : null,
      salarioArriendo: salario !== null && canonCLP ? salario / canonCLP : null,
      diasRemanentes: contrato && termino ? Math.max(0, diasEntre(hoyDia, termino)) : null,
      diasVacante: vacante && termino ? diasEntre(termino, hoyDia) : null,
    })
  }
  return mapa
}
