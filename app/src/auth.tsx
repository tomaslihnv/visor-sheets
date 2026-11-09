import { useEffect, useState, type ReactNode } from 'react'
import { initializeApp } from 'firebase/app'
import fotoTM from './assets/portada-tm.webp'
import fotoECH from './assets/portada-ech.webp'
import fotoIRR from './assets/portada-irr.webp'
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'

// Mismo proyecto de Firebase que el visor anterior: la sesión se comparte entre los dos (mismo dominio).
const app = initializeApp({
  apiKey: 'AIzaSyBGWWznP2htQmHGc2s1MZ1bZpPdyNUGuQA',
  authDomain: 'visor-de-rent-roll-situ.firebaseapp.com',
  projectId: 'visor-de-rent-roll-situ',
  storageBucket: 'visor-de-rent-roll-situ.firebasestorage.app',
  messagingSenderId: '919455582844',
  appId: '1:919455582844:web:422bbb939426a8df0597f9',
})
const auth = getAuth(app)
const proveedor = new GoogleAuthProvider()
proveedor.setCustomParameters({ prompt: 'select_account' })

// ponytail: el dominio se valida solo en el navegador, igual que en el visor anterior. Pasa al servidor
// cuando las hojas se lean con la cuenta de servicio.
const DOMINIOS = ['situ.cl', 'insiturentas.cl']
const permitido = (email: string | null) => !!email && DOMINIOS.some((d) => email.endsWith('@' + d))

export const salir = () => signOut(auth)

export function ConLogin({ children }: { children: (usuario: User) => ReactNode }) {
  const [usuario, setUsuario] = useState<User | null | undefined>(undefined)
  const [error, setError] = useState('')

  useEffect(() => onAuthStateChanged(auth, (u) => {
    if (u && !permitido(u.email)) {
      setError('Acceso restringido a correos @situ.cl o @insiturentas.cl')
      signOut(auth)
      return
    }
    setUsuario(u)
  }), [])

  if (usuario === undefined) return null // Firebase todavía no responde: evita mostrar el login un instante
  if (usuario) return <>{children(usuario)}</>

  async function entrar() {
    setError('')
    try {
      await signInWithPopup(auth, proveedor)
    } catch (e) {
      if ((e as { code?: string }).code !== 'auth/popup-closed-by-user') setError('Error al iniciar sesión. Intenta de nuevo.')
    }
  }

  return <Portada onEntrar={entrar} error={error} />
}

// Pantalla de inicio, con referencias de sitios inmobiliarios premiados en Awwwards (Belgrade Arbor, LPAS):
// dos tonos (crema INSITU y carbón), intro animada, foto a gran formato que rota entre los tres edificios con un
// acercamiento lento, y tipografía editorial. Las fotos son de los sitios web de cada edificio.
const CREMA = '#f2ede4'
const CARBON = '#1c1917'
const FOTOS = [
  { src: fotoTM, edificio: 'INSITU Tomás Moro', lugar: 'Las Condes' },
  { src: fotoECH, edificio: 'INSITU Echaurren', lugar: 'Santiago Centro' },
  { src: fotoIRR, edificio: 'INSITU Irarrázaval', lugar: 'Ñuñoa' },
]
const CADA = 5500 // ms por foto

// Logo INSITU en blanco y negro; el contorno se dibuja al entrar.
function Logo({ retraso = 0 }: { retraso?: number }) {
  return (
    <span className="relative inline-flex">
      <span className="inline-flex h-8 items-stretch overflow-hidden rounded-full text-sm font-light tracking-[0.2em]">
        <span className="flex items-center pr-2.5 pl-3.5">IN</span>
        <span className="flex items-center rounded-full pr-4 pl-3 text-white" style={{ background: CARBON }}>SITU</span>
      </span>
      <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <rect x="0.75" y="0.75" rx="15.25" fill="none" stroke={CARBON} strokeWidth="1.5" pathLength={1} className="trazo"
          style={{ width: 'calc(100% - 1.5px)', height: 'calc(100% - 1.5px)', animationDelay: `${retraso}ms` }} />
      </svg>
    </span>
  )
}

// Una línea de titular que sube desde abajo, recortada por su propia caja.
const Linea = ({ children, retraso }: { children: ReactNode; retraso: number }) => (
  <span className="block overflow-hidden pb-[0.08em]"><span className="subir block" style={{ animationDelay: `${retraso}ms` }}>{children}</span></span>
)

function Fotos() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((x) => (x + 1) % FOTOS.length), CADA)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="telon relative h-full min-h-[46vh] overflow-hidden rounded-[28px] bg-[#2a2622]" style={{ animationDelay: '250ms' }}>
      {FOTOS.map((f, k) => (
        <img key={f.src} src={f.src} alt={f.edificio} aria-hidden={k !== i}
          // La activa se acerca lento; al cambiar, se funde con la siguiente.
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[1400ms] ease-out ${k === i ? 'acercar opacity-100' : 'opacity-0'}`} />
      ))}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/5" />
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-white sm:inset-x-7 sm:bottom-7">
        <div key={i} className="surgir">
          <p className="text-lg font-medium sm:text-xl">{FOTOS[i].edificio}</p>
          <p className="text-xs tracking-wide text-white/70">{FOTOS[i].lugar}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70 tabular-nums">{String(i + 1).padStart(2, '0')} / {String(FOTOS.length).padStart(2, '0')}</span>
          <div className="flex gap-1.5">
            {FOTOS.map((f, k) => (
              <button key={f.src} onClick={() => setI(k)} aria-label={`Ver ${f.edificio}`} className="h-[3px] w-8 overflow-hidden rounded-full bg-white/30 sm:w-10">
                {k === i && <span key={i} className="avance block h-full bg-white" style={{ animationDuration: `${CADA}ms` }} />}
                {k < i && <span className="block h-full bg-white" />}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Portada({ onEntrar, error }: { onEntrar: () => void; error: string }) {
  return (
    <main className="min-h-screen p-3 sm:p-4" style={{ background: CREMA, color: CARBON }}>
      <div className="grid min-h-[calc(100vh-1.5rem)] gap-3 sm:min-h-[calc(100vh-2rem)] sm:gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="flex flex-col px-3 pt-3 pb-6 sm:px-6 sm:pt-5 lg:order-1 lg:px-10 lg:py-8">
          <header className="flex items-center justify-between">
            <Logo />
            <span className="surgir text-[11px] tracking-[0.2em] text-[#8a8378] uppercase" style={{ animationDelay: '600ms' }}>Uso interno</span>
          </header>

          <div className="mt-10 lg:mt-auto">
            <p className="surgir text-xs font-medium tracking-[0.25em] text-[#8a8378] uppercase" style={{ animationDelay: '500ms' }}>Visor de arriendos</p>
            <h1 className="mt-4 text-[clamp(2.75rem,7vw,5.75rem)] leading-[0.95] font-medium tracking-[-0.03em]">
              <Linea retraso={650}>Tus edificios,</Linea>
              <Linea retraso={780}>en un solo lugar.</Linea>
            </h1>
            <p className="surgir mt-6 max-w-md text-[15px] leading-relaxed text-[#5b5650]" style={{ animationDelay: '1000ms' }}>
              Ocupación, contratos, vencimientos y reportes listos para presentar, en vivo desde las planillas de cada edificio.
            </p>
          </div>

          <div className="surgir mt-10 max-w-md lg:mt-auto" style={{ animationDelay: '1150ms' }}>
            <button onClick={onEntrar}
              className="group flex w-full items-center justify-between rounded-full py-2 pr-2 pl-6 text-sm font-medium text-white transition-transform active:scale-[0.99]"
              style={{ background: CARBON }}>
              <span>Continuar con Google</span>
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-rotate-45" style={{ color: CARBON }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </button>
            <p className="mt-3 pl-6 text-xs text-[#8a8378]">Solo correos @situ.cl o @insiturentas.cl.</p>
            {error && <p className="mt-4 ml-6 border-l-2 border-[#96323c] pl-3 text-sm text-[#96323c]">{error}</p>}
          </div>
        </section>

        <div className="order-first lg:order-2"><Fotos /></div>
      </div>
    </main>
  )
}
