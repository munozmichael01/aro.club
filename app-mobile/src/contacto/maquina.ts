/**
 * «Seguir en contacto» (entrega seguir-en-contacto y mi-mesa-pasadas, 31-10),
 * sin React. El estado de cada persona (A a E) lo decide el servidor
 * (`/api/contacto`); aquí se decide qué panel se pinta y qué se manda.
 */

import { reglas } from '../reglas'

export type Estado = 'A' | 'B' | 'C' | 'D' | 'E'

export type Datos = { telefono: string; instagram: string | null; tiktok: string | null }

export type Persona = {
  id: string
  coincidencia: string
  nombre: string
  estado: Estado
  cierraEn: string | null
  /** Lo que dejó la otra persona: solo en C. */
  suyos: Datos | null
  /**
   * Lo que YO le di a esta persona, congelado al confirmar (desde el 01-11): un
   * cambio posterior para otra no le llega. Sin él (servidor de antes), `misDatos`.
   */
  mios?: Datos | null
  nuevo: boolean
}

export type DeContacto = {
  mesaId: string
  eventoId: string
  cena: { empiezaEn: string; zonaHoraria: string | null; formato: string | null; zona: string | null }
  misDatos: Datos & { guardados: boolean }
  personas: Persona[]
}

export type Accion =
  | { accion: 'compartir'; con: string[]; sin?: string[]; telefono: string; instagram?: string; tiktok?: string }
  | { accion: 'no'; con?: string[] }
  | { accion: 'reabrir'; con: string[] }
  | { accion: 'visto' }

/** «@vale.gm», sin la arroba que la persona haya escrito. El servidor acepta las dos y la URL. */
export const sinArroba = (u: string | null | undefined) => (u ?? '').trim().replace(/^@+/, '')

/** Lo que va en «Lo que compartes»: «+58 412 555 0123 · @vale.gm». */
export function resumen(d: Datos): string {
  return [d.telefono, d.instagram ? '@' + sinArroba(d.instagram) : null, d.tiktok ? '@' + sinArroba(d.tiktok) : null].filter(Boolean).join(' · ')
}

/** El cuerpo de «Compartir»: los datos una vez para toda la cena, y a quién (las marcadas) y a quién no. */
export function cuerpoCompartir(f: { telefono: string; instagram: string; tiktok: string }, con: string[], sin: string[]): Accion {
  return {
    accion: 'compartir',
    con,
    ...(sin.length ? { sin } : {}),
    telefono: f.telefono.trim(),
    ...(sinArroba(f.instagram) ? { instagram: sinArroba(f.instagram) } : {}),
    ...(sinArroba(f.tiktok) ? { tiktok: sinArroba(f.tiktok) } : {}),
  }
}

/** El nombre a quien se le habla en el panel de una persona, o la lista en el de varias. */
export const nombres = (ps: Persona[]) => reglas.CONTACTO.nombres(ps.map((p) => p.nombre))

/**
 * Qué panel se pinta. Con una sola persona, su estado. Con varias: A si queda
 * alguna por confirmar y no hay nada guardado todavía; si ya compartió con
 * alguna, la vista de «cada quien a su ritmo» (V5).
 */
export function panel(d: DeContacto): { tipo: 'nada' } | { tipo: 'una'; p: Persona } | { tipo: 'varias'; formulario: boolean } {
  if (!d.personas.length) return { tipo: 'nada' }
  if (d.personas.length === 1) return { tipo: 'una', p: d.personas[0] }
  return { tipo: 'varias', formulario: d.personas.every((p) => p.estado === 'A') }
}

/** El plazo común de la cena: el de la primera que lo tenga (todas nacen juntas al responder la encuesta). */
export const cierraDe = (d: DeContacto) => d.personas.find((p) => p.cierraEn)?.cierraEn ?? null
