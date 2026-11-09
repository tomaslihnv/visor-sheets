import type { Edificio } from '../edificios'

// Botón de edificio. Seleccionado toma la forma del logo INSITU ("IN" | nombre) con sus colores.
// Al abrirse: (1) el "IN" sale hacia la izquierda con un leve rebote; (2) se dibuja el contorno alrededor mientras
// los fondos se pintan. Al cerrarse, con efecto "pop": (1) el contorno se borra rápido mientras se despinta;
// (2) el "IN" se mete hacia la derecha bajo el nombre, más lento, tomando impulso hacia atrás antes de caer.
// Sin seleccionar es solo el nombre. Se anima aunque el sistema pida "reducir movimiento" (Windows lo activa al
// apagar los efectos de animación): es un cambio corto de ancho y color.
// El que se cierra termina antes de que el nuevo empiece a abrirse.
const CERRAR = { despintar: 140, in: 220 } // ms
const FIN_CIERRE = CERRAR.despintar - 20 + CERRAR.in // ms: el "IN" parte cuando el contorno está por borrarse
const ABRIR = { in: 240, pintar: 380 } // ms, después del cierre
const REBOTE = 'cubic-bezier(0.34, 1.56, 0.64, 1)' // se pasa un poco y vuelve
const IMPULSO = 'cubic-bezier(0.36, 0, 0.66, -0.56)' // retrocede un poco y acelera
const BORDE = '#24282d'

export function Pildora({ e, activa }: { e: Edificio; activa: boolean }) {
  const p = e.pildora
  // Cerrando: el contorno se borra y el "IN" parte cuando está por terminar. Abriendo (después del cierre del
  // anterior): el "IN" va primero y el pintado espera a que termine.
  const tiempoIN = activa
    ? { transitionDuration: `${ABRIR.in}ms`, transitionDelay: `${FIN_CIERRE}ms`, transitionTimingFunction: REBOTE }
    : { transitionDuration: `${CERRAR.in}ms`, transitionDelay: `${CERRAR.despintar - 20}ms`, transitionTimingFunction: IMPULSO }
  const tiempoPintar = activa
    ? { transitionDuration: `${ABRIR.pintar}ms`, transitionDelay: `${FIN_CIERRE + ABRIR.in - 20}ms`, transitionTimingFunction: 'ease-in-out' }
    : { transitionDuration: `${CERRAR.despintar}ms`, transitionDelay: '0ms', transitionTimingFunction: 'ease-in' }
  const barrido = (color: string) => ({
    ...tiempoPintar,
    backgroundImage: `linear-gradient(${color}, ${color})`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left center',
    backgroundSize: activa ? '100% 100%' : '0% 100%',
  })
  return (
    <span className="relative flex">
      <span className={`flex h-8 items-stretch overflow-hidden rounded-full text-sm transition-all ${activa ? 'font-light tracking-[0.18em]' : 'font-medium'}`} style={barrido(p.izq)}>
        <span className="flex items-center justify-end overflow-hidden whitespace-nowrap transition-all"
          style={{ ...tiempoIN, color: p.textoIzq, maxWidth: activa ? 48 : 0, paddingLeft: activa ? 14 : 0, paddingRight: activa ? 10 : 0, opacity: activa ? 1 : 0 }}>
          IN
        </span>
        <span className={`flex items-center rounded-full px-3.5 whitespace-nowrap transition-all ${activa ? 'tracking-[0.08em]' : 'tracking-normal text-gris hover:bg-slate-100'}`}
          style={{ ...barrido(p.der), ...(activa && { color: p.textoDer, paddingLeft: 12, paddingRight: 16 }) }}>
          {e.corto}
        </span>
      </span>
      {/* Contorno: un trazo que recorre el borde de la píldora (pathLength 1 → dashoffset de 1 a 0). */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <rect x="0.75" y="0.75" rx="15.25" fill="none" stroke={BORDE} strokeWidth="1.5" pathLength={1}
          className="transition-[stroke-dashoffset,opacity]"
          style={{ ...tiempoPintar, width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)', strokeDasharray: 1, strokeDashoffset: activa ? 0 : 1, opacity: activa ? 1 : 0 }} />
      </svg>
    </span>
  )
}
