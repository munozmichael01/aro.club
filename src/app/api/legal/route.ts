import { NextResponse } from 'next/server'

import legal from '../../../../public/legal.js'

/**
 * El texto legal, para quien no puede leer un `<script>`.
 *
 * Michael, 18-10: los Términos y la Privacidad tienen que poder leerse
 * DENTRO de la app, como «Seguridad y normas», sin mandar a nadie al
 * navegador. Lo pidió el agente de la app con una condición que es la
 * buena: sin una segunda copia del texto que se quede vieja.
 *
 * Así que la fuente es `public/legal.js` —el mismo fichero que carga la
 * pantalla de la web con un `<script>`— y esto solo lo sirve en JSON. Si
 * mañana cambia una coma, cambia en un sitio y cambian las dos a la vez.
 *
 *   GET /api/legal              → todo
 *   GET /api/legal?doc=terminos → solo esa parte
 *
 * Partes: `reglas` (las seis de la mesa), `terminos`, `privacidad`, `datos`
 * (qué dato, para qué, cuánto se guarda) y `nunca` (lo que los otros cinco
 * no ven de ti).
 *
 * Sin sesión a propósito: es público y está en aro.club/terminos para
 * cualquiera. Pedir cuenta para leer los términos sería pedir que acepten a
 * ciegas.
 */

type Seccion = { cinta: string; titulo: string; intro: string }

type Legal = {
  version: string
  cabecera: { titulo: string; bajada: string; actualizado: string }
  secciones: { reglas: Seccion; terminos: Seccion; privacidad: Seccion }
  mesa: { titulo: string; fuerte: string; cuerpo: string }
  nuncaTitulo: string
  nuncaNota: string
  derechos: { titulo: string; cuerpo: string; correo: string }
  pie: string
  reglas: [string, string][]
  terminos: [string, string][]
  nunca: string[]
  datos: [string, string, string][]
  privacidad: [string, string][]
}

const L = legal as unknown as Legal

/** Cada parte, con la forma en que se lee: título y cuerpo. */
const DOCS = {
  reglas: () => L.reglas.map(([titulo, cuerpo]) => ({ titulo, cuerpo })),
  terminos: () => L.terminos.map(([titulo, cuerpo]) => ({ titulo, cuerpo })),
  privacidad: () => L.privacidad.map(([titulo, cuerpo]) => ({ titulo, cuerpo })),
  // Estas dos no son párrafos: son una tabla y una lista. Se devuelven con
  // su forma y no aplanadas, porque la pantalla las pinta distinto.
  datos: () => L.datos.map(([dato, para, plazo]) => ({ dato, para, plazo })),
  nunca: () => L.nunca,
} as const

export async function GET(request: Request) {
  const pedido = new URL(request.url).searchParams.get('doc')

  /**
   * Y lo que NO es una lista: los títulos, las entradillas y los dos
   * bloques sueltos.
   *
   * Va en todas las respuestas, también en las de un solo documento, porque
   * sin la cinta y el título de su sección la app tendría que escribirlos, y
   * entonces volveríamos a tener dos textos legales.
   */
  const marco = {
    cabecera: L.cabecera,
    secciones: L.secciones,
    mesa: L.mesa,
    nuncaTitulo: L.nuncaTitulo,
    nuncaNota: L.nuncaNota,
    derechos: L.derechos,
    pie: L.pie,
  }

  if (pedido) {
    const parte = DOCS[pedido as keyof typeof DOCS]
    if (!parte) {
      return NextResponse.json(
        { error: 'Ese documento no existe.', hay: Object.keys(DOCS) },
        { status: 404 },
      )
    }
    return NextResponse.json({ version: L.version, doc: pedido, partes: parte(), ...marco })
  }

  return NextResponse.json({
    version: L.version,
    ...marco,
    reglas: DOCS.reglas(),
    terminos: DOCS.terminos(),
    privacidad: DOCS.privacidad(),
    datos: DOCS.datos(),
    nunca: DOCS.nunca(),
  })
}
