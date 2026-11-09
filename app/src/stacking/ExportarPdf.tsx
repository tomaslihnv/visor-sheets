import { useState } from 'react'
import type { DatosPdf } from './pdf'

// Botón "Exportar PDF" del stacking, con la ventana de opciones del visor anterior (links a Drive).
// jsPDF se carga solo al exportar.
export function ExportarPdf({ datos, listo }: { datos: Omit<DatosPdf, 'conLinks'>; listo: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [conLinks, setConLinks] = useState(false)
  const [generando, setGenerando] = useState(false)

  async function generar() {
    setGenerando(true)
    try {
      const { generarStackingPdf } = await import('./pdf')
      generarStackingPdf({ ...datos, conLinks }).save(`Stacking ${datos.edificio.nombre} ${new Date().toISOString().slice(0, 10)}.pdf`)
      setAbierto(false)
    } catch (e) {
      console.error('Error generando el PDF:', e)
      alert('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <button onClick={() => setAbierto(true)} disabled={!listo} title={listo ? undefined : 'Espera a que carguen los datos'}
        className="flex items-center gap-1.5 rounded-full bg-oscuro px-3.5 py-1 text-xs font-medium text-white transition-colors hover:bg-black disabled:opacity-40">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        Exportar PDF
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && setAbierto(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="titulo-pdf" className="aparecer w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="titulo-pdf" className="text-base font-bold">Exportar stacking en PDF</h2>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-full text-lg text-gris hover:bg-slate-100">×</button>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gris">A3 horizontal: el edificio con sus métricas en la primera página y el subterráneo en la segunda.</p>
              <label className="mt-4 flex cursor-pointer items-start gap-4 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                <span className="flex-1">
                  <span className="block text-sm font-semibold">Links a contratos (Drive)</span>
                  <span className="mt-0.5 block text-xs text-gris">Cada celda abre la carpeta de contratos de su unidad. Solo para uso interno.</span>
                </span>
                <input type="checkbox" checked={conLinks} onChange={(e) => setConLinks(e.target.checked)} className="peer sr-only" />
                <span className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-acento peer-focus-visible:ring-2 peer-focus-visible:ring-acento/40 after:absolute after:top-0.5 after:left-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" aria-hidden />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button onClick={() => setAbierto(false)} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium hover:bg-slate-50">Cancelar</button>
              <button onClick={generar} disabled={generando} className="rounded-lg bg-acento px-4 py-1.5 text-sm font-medium text-white hover:bg-acento-fuerte disabled:opacity-60">
                {generando ? 'Generando…' : 'Generar PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
