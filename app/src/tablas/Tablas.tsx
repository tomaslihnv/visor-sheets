import type { ReactNode } from 'react'
import type { Edificio, Hoja } from '../edificios'
import { useHoja, type Fila } from '../datos/hojas'
import { useUnidades } from '../datos/useUnidades'
import { texto } from '../datos/columnas'
import { numero } from '../datos/numeros'
import type { Unidad } from '../dominio/unidades'
import { pesos } from '../stacking/fichas'
import { Mensaje } from '../ui/Tarjeta'
import { Bloque, EsqueletoTabla } from '../ui/Esqueleto'

interface Columna { nombre: string; calculada?: boolean; celda: (f: Fila) => { valor: ReactNode; alerta?: boolean; color?: string } }

// Tabla de una hoja: encabezado y primera columna fijos para no perderse al desplazarse en el celular.
function Tabla({ columnas, filas, aviso }: { columnas: Columna[]; filas: Fila[]; aviso?: ReactNode }) {
  return (
    <section className="aparecer overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-2.5 text-xs text-gris">
        <span>{filas.length} filas</span>
        {aviso}
      </div>
      <div className="max-h-[calc(100vh-11rem)] overflow-auto">
        <table className="w-max min-w-full text-xs tabular-nums">
          <thead className="sticky top-0 z-10">
            <tr>
              {columnas.map((c, i) => (
                <th key={c.nombre} className={`border-b border-slate-200 px-3 py-2 text-left font-semibold whitespace-nowrap ${c.calculada ? 'bg-acento-suave text-acento' : 'bg-slate-50 text-oscuro'} ${i === 0 ? 'sticky left-0 z-10' : ''}`}>
                  {c.nombre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, r) => (
              <tr key={r} className="hover:bg-slate-50/80">
                {columnas.map((c, i) => {
                  const { valor, alerta, color } = c.celda(f)
                  return (
                    <td key={c.nombre} style={color ? { color } : undefined}
                      className={`border-b border-slate-100 px-3 py-1.5 whitespace-nowrap ${alerta ? 'bg-red-50 font-bold text-red-800' : c.calculada ? 'bg-acento-suave/40' : ''} ${i === 0 ? 'sticky left-0 bg-white font-semibold' : ''}`}>
                      {valor}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const columnasDe = (filas: Fila[]): Columna[] =>
  Object.keys(filas[0] ?? {}).filter((k) => k.trim()).map((k) => ({ nombre: k.trim(), celda: (f) => ({ valor: f[k] }) }))

// Cualquier hoja tal cual viene: Evolución, EST, BOD, Vencimientos, Salidas.
export function TablaHoja({ edificio, hoja }: { edificio: Edificio; hoja: Hoja }) {
  const estado = useHoja(edificio, hoja)
  if (estado.cargando) return <EsqueletoTabla />
  if ('error' in estado) return <Mensaje>{estado.error}</Mensaje>
  if (!estado.datos.length) return <Mensaje>La hoja está vacía.</Mensaje>
  return <Tabla columnas={columnasDe(estado.datos)} filas={estado.datos} />
}

const vacio = (v: string | undefined) => ['', '-', '—'].includes(texto(v))
const CAMPOS_HISTORICO = ['Titular', 'Nacionalidad', 'Sexo', 'Edad', 'Salario', 'Descripción', 'Canon Deptos.', 'GGCC Deptos.']

// Estatus actual: la hoja más las columnas calculadas, y en rojo los datos que faltan en contratos vigentes
// (mismas reglas del visor anterior).
export function TablaEstatus({ edificio }: { edificio: Edificio }) {
  const { estatus, unidades, conUF } = useUnidades(edificio)
  if (estatus.cargando) return <EsqueletoTabla columnas={12} />
  if ('error' in estatus) return <Mensaje>{estatus.error}</Mensaje>

  const deFila = new Map<Fila, Unidad>([...unidades.values()].map((u) => [u.fila, u]))
  const u = (f: Fila) => deFila.get(f)
  const contrato = (f: Fila) => u(f)?.categoria === 'contrato'

  const originales: Columna[] = Object.keys(estatus.datos[0] ?? {}).filter((k) => k.trim()).map((k) => ({
    nombre: k.trim(),
    celda: (f) => {
      if (!contrato(f) || !vacio(f[k])) return { valor: f[k], alerta: contrato(f) && /^VENCIMIENTO$/i.test(k.trim()) && u(f)?.diasRemanentes === 0 }
      const nombre = k.trim()
      const alerta =
        ((numero(f['Contrato']) ?? 0) > 1 && CAMPOS_HISTORICO.includes(nombre)) ||
        ((numero(f['Estac. '] ?? f['Estac.']) ?? 0) > 0 && nombre.includes('Estac') && nombre !== 'Estac.') ||
        ((numero(f['Bod.']) ?? 0) > 0 && nombre.includes('Bod') && nombre !== 'Bod.')
      return { valor: f[k] || '—', alerta }
    },
  }))

  // Las que dependen de la UF muestran un esqueleto por celda hasta que la API responde.
  const calc = (nombre: string, valor: (x: Unidad) => ReactNode, color?: (x: Unidad) => string | undefined, conUFNecesaria = false): Columna => ({
    nombre, calculada: true,
    celda: (f) => {
      const x = u(f)
      if (!x) return { valor: '—' }
      if (conUFNecesaria && !conUF) return { valor: <Bloque className="h-3 w-16" /> }
      return { valor: valor(x) ?? '—', color: color?.(x) }
    },
  })
  const calculadas = [
    calc('Ajuste x IPC', (x) => (x.ipc === null ? '—' : `${x.ipc >= 0 ? '+' : ''}${(x.ipc * 100).toFixed(2)}%`), (x) => (x.ipc === null ? undefined : x.ipc >= 0 ? '#065f46' : '#991b1b'), true),
    calc('Canon CLP', (x) => pesos(x.canonCLP), undefined, true),
    calc('Canon UF', (x) => (x.canonUF === null ? '—' : `${x.canonUF.toFixed(2)} UF`), undefined, true),
    calc('Canon UF/m²', (x) => (x.canonUFm2 === null ? '—' : `${x.canonUFm2.toFixed(2)} UF/m²`), undefined, true),
    calc('Salario/arriendo', (x) => (x.categoria === 'contrato' && x.salarioArriendo !== null ? `${x.salarioArriendo.toFixed(1).replace('.', ',')}x` : '—')),
    calc('Días Remanentes', (x) => (x.categoria === 'contrato' && x.diasRemanentes !== null ? x.diasRemanentes : '—')),
  ]

  return <Tabla columnas={[...originales, ...calculadas]} filas={estatus.datos}
    aviso={!conUF && <span className="text-acento">Consultando la UF: las columnas que dependen de ella se completan al llegar.</span>} />
}
