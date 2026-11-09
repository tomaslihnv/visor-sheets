// Todo lo propio de cada edificio vive aquí. Ningún componente pregunta "¿es Tomás Moro?":
// lee esta configuración. Agregar un edificio = agregar su entrada (hojas, layout, colores) y su logo.
import type { Layout } from './dominio/layout'
import { LAYOUT_ECH, LAYOUT_IRR, LAYOUT_TM } from './layouts'
import logoTM from './assets/logos/tm.svg'
import logoIRR from './assets/logos/irr.svg'
import logoECH from './assets/logos/ech.svg'

export type Hoja = 'estatus' | 'evolucion' | 'est' | 'bod' | 'venc' | 'sal' | 'contratos' | 'reparacion'

export interface Edificio {
  id: string
  nombre: string // "INSITU Tomás Moro"
  corto: string // "Tomás Moro": va en la píldora de la barra
  logo: string // SVG recreado del logo de su sitio web (assets/logos)
  // Color del edificio en gráficos y láminas (linea), y acento de la interfaz: texto/botones (base),
  // fondos de selección (suave) y hover (fuerte). La base tiene contraste suficiente sobre blanco.
  color: { linea: string; base: string; suave: string; fuerte: string }
  // Colores del logo: "IN" a la izquierda y el nombre a la derecha, como la píldora INSITU.
  pildora: { izq: string; textoIzq: string; der: string; textoDer: string }
  hojas: Partial<Record<Hoja, string>>
  layout: Layout
}

const OSCURO = '#24282d'

export const EDIFICIOS: Edificio[] = [
  {
    id: 'irr',
    nombre: 'INSITU Irarrázaval',
    corto: 'Irarrázaval',
    logo: logoIRR,
    color: { linea: '#27cd7a', base: '#1a8f55', suave: '#e2f6ea', fuerte: '#147346' },
    pildora: { izq: OSCURO, textoIzq: '#27cd7a', der: '#27cd7a', textoDer: OSCURO },
    hojas: {
      estatus: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=822970761&single=true&output=csv',
      evolucion: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=777209700&single=true&output=csv',
      est: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=1386167013&single=true&output=csv',
      bod: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=1128968324&single=true&output=csv',
      venc: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=1256476780&single=true&output=csv',
      sal: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=1440415170&single=true&output=csv',
      contratos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=531179770&single=true&output=csv',
      reparacion: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_SrPMC9v_h6szyyZUjhqywYeyrwp8AwiguskyC7PzNt8CCE_W6HA_wUTrKA1PWew77AAC1qhVR88i/pub?gid=1828849230&single=true&output=csv',
    },
    layout: LAYOUT_IRR,
  },
  {
    id: 'ech',
    nombre: 'INSITU Echaurren',
    corto: 'Echaurren',
    logo: logoECH,
    color: { linea: '#34c1d6', base: '#1d8798', suave: '#dff3f7', fuerte: '#176d7b' },
    pildora: { izq: '#34c1d6', textoIzq: OSCURO, der: OSCURO, textoDer: '#34c1d6' },
    hojas: {
      estatus: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=826961382&single=true&output=csv',
      evolucion: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=1582918076&single=true&output=csv',
      est: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=1894857461&single=true&output=csv',
      bod: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=609925187&single=true&output=csv',
      venc: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=1032765337&single=true&output=csv',
      sal: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=1992855976&single=true&output=csv',
      contratos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRAuordQ35zGoq-VV0PTJYtoebha0PyUuWS1YTPLo69nTzytyNzg9AtOUMegCmhV1Q7_Ouiv8YGQCXv/pub?gid=1692181581&single=true&output=csv',
    },
    layout: LAYOUT_ECH,
  },
  {
    id: 'tm',
    nombre: 'INSITU Tomás Moro',
    corto: 'Tomás Moro',
    logo: logoTM,
    // El crema del logo (#ede0ce) casi no se ve sobre blanco: la línea usa un beige más profundo.
    color: { linea: '#c9ac80', base: '#956e37', suave: '#f3ebde', fuerte: '#7a5a2d' },
    pildora: { izq: '#ede0ce', textoIzq: OSCURO, der: OSCURO, textoDer: '#ede0ce' },
    hojas: {
      estatus: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=1862656755&single=true&output=csv',
      evolucion: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=1081809439&single=true&output=csv',
      est: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=548387695&single=true&output=csv',
      bod: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=5472402&single=true&output=csv',
      venc: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=60619886&single=true&output=csv',
      sal: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=1703237303&single=true&output=csv',
      contratos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSqKKkERKX-ZW4vWN6BV4eXhP-uJNbKaSvk2jlp8RnloNhWTNA_H0Z5MSkxURlv3JKXA2qLEW0Rmh7d/pub?gid=469977731&single=true&output=csv',
    },
    layout: LAYOUT_TM,
  },
]

// Visor anterior, publicado en /visor-sheets/anterior/: ahí siguen las pestañas aún no migradas.
export const urlVisorAnterior = (id: string) => `./anterior/?b=${id}`
