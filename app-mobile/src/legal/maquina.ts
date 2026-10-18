/**
 * El legal, sin React. TODO el texto viene de `/api/legal` (30b0c3d), que lo
 * lee de `public/legal.js`, el mismo fichero que pinta la web: aquí no hay
 * ni una frase legal propia, solo la forma.
 */

export type Doc = 'reglas' | 'terminos' | 'privacidad'
export const DOCS: Doc[] = ['reglas', 'terminos', 'privacidad']

export type Parte = { titulo: string; cuerpo: string }
export type Dato = { dato: string; para: string; plazo: string }
export type Seccion = { cinta: string; titulo: string; intro: string }

export type DeServidor = {
  version: string
  reglas: Parte[]
  terminos: Parte[]
  privacidad: Parte[]
  datos: Dato[]
  nunca: string[]
  cabecera: { titulo: string; bajada: string; actualizado: string }
  secciones: Record<Doc, Seccion>
  mesa: { titulo: string; fuerte: string; cuerpo: string }
  nuncaTitulo: string
  nuncaNota: string
  derechos: { titulo: string; cuerpo: string; correo: string }
  pie: string
}

/** El documento al que se llega: `?doc=` válido, o el principio. */
export const doc = (x: unknown): Doc | null => (DOCS.includes(x as Doc) ? (x as Doc) : null)

/** Que llegó entero: sin esto se pintaría media página legal sin avisar. */
export const completo = (d: Partial<DeServidor> | null): d is DeServidor =>
  !!d && Array.isArray(d.reglas) && Array.isArray(d.terminos) && Array.isArray(d.privacidad) && !!d.cabecera && !!d.secciones && !!d.mesa && !!d.derechos

/** «01» … «11», como la web. */
export const numero = (i: number) => String(i + 1).padStart(2, '0')
