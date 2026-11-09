import { useCallback, useState } from 'react'
import type { Edificio } from '../edificios'
import type { Laminas } from './exportar'
import type { LaminaOcupacion } from './ocupacion/datos'
import type { LaminaSalidas } from './salidas/datos'
import { LaminaOcupacionVista } from './ocupacion/Vista'
import { LaminaSalidasVista } from './salidas/Vista'
import type { LaminaStacking } from './stacking/datos'
import { LaminaStackingVista } from './stacking/Vista'

// Pestaña Láminas: la vista previa de cada lámina con sus controles, y un botón que descarga todas juntas
// en una presentación, tal como se ven.
export function PestanaLaminas({ edificio }: { edificio: Edificio }) {
  const [laminas, setLaminas] = useState<Laminas>({ ocupacion: null, salidas: null, stacking: null })
  const [exportando, setExportando] = useState(false)
  const alOcupacion = useCallback((ocupacion: LaminaOcupacion | null) => setLaminas((l) => ({ ...l, ocupacion })), [])
  const alSalidas = useCallback((salidas: LaminaSalidas | null) => setLaminas((l) => ({ ...l, salidas })), [])
  const alStacking = useCallback((stacking: LaminaStacking | null) => setLaminas((l) => ({ ...l, stacking })), [])
  const cuantas = Number(!!laminas.ocupacion) + Number(!!laminas.salidas) + Number(!!laminas.stacking)

  async function exportar() {
    setExportando(true)
    try {
      const { descargarPresentacion } = await import('./exportar')
      await descargarPresentacion(edificio, laminas)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
        <div>
          <h2 className="text-base font-bold">Presentación de {edificio.corto}</h2>
          <p className="text-sm text-gris">Revisa y ajusta cada lámina abajo; se descargan juntas, tal como se ven.</p>
        </div>
        <button onClick={exportar} disabled={exportando || !cuantas}
          className="rounded-lg bg-acento px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-acento-fuerte disabled:opacity-60">
          {exportando ? 'Generando…' : `Descargar PowerPoint · ${cuantas} ${cuantas === 1 ? 'lámina' : 'láminas'}`}
        </button>
      </div>
      <section className="space-y-3">
        <p className="text-[11px] font-bold tracking-widest text-gris-claro uppercase">Lámina 1 · Ocupación y arriendos netos</p>
        <LaminaOcupacionVista edificio={edificio} onLamina={alOcupacion} />
      </section>
      <section className="space-y-3">
        <p className="text-[11px] font-bold tracking-widest text-gris-claro uppercase">Lámina 2 · Análisis de salidas</p>
        <LaminaSalidasVista edificio={edificio} onLamina={alSalidas} />
      </section>
      <section className="space-y-3">
        <p className="text-[11px] font-bold tracking-widest text-gris-claro uppercase">Lámina 3 · Stacking plan</p>
        <LaminaStackingVista edificio={edificio} onLamina={alStacking} />
      </section>
    </div>
  )
}
