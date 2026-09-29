/**
 * El alta de la app, sin React. Las respuestas viven en el celular hasta que
 * hay cuenta (borrador guardado, para que cerrar la app no las pierda), y
 * entonces van una por una a `POST /api/cuestionario`, por CÓDIGO.
 *
 * La puerta de los 18 va ANTES de crear la cuenta: no se crea un usuario que
 * luego haya que borrar. El cliente guía; el servidor lo vuelve a comprobar.
 */

import { edad } from '../datos/maquina'

export type Borrador = {
  respuestas: Record<string, string[]>
  nacimiento: { dia: string; mes: number; anio: string }
}

export const vacio = (): Borrador => ({ respuestas: {}, nacimiento: { dia: '', mes: 0, anio: '' } })

export const CLAVE_BORRADOR = 'aro.puerta.borrador'

/** «AAAA-MM-DD», o '' si la fecha está a medias o no existe. */
export function nacimientoISO(b: Borrador, hoy: Date): string {
  if (edad(b.nacimiento, hoy) == null) return ''
  const { dia, mes, anio } = b.nacimiento
  return `${anio}-${String(mes).padStart(2, '0')}-${dia.padStart(2, '0')}`
}

export type EstadoFecha = 'incompleta' | 'rara' | 'menor' | 'ok'

export function estadoFecha(b: Borrador, hoy: Date): EstadoFecha {
  const { dia, mes, anio } = b.nacimiento
  if (!dia || !mes || anio.length !== 4) return 'incompleta'
  const n = edad(b.nacimiento, hoy)
  if (n == null || n > 110) return 'rara'
  return n < 18 ? 'menor' : 'ok'
}

/**
 * Lo que va a `/api/cuestionario`, una llamada por respuesta: `arraigo` es de
 * una sola (va suelto), las otras tres son listas; y el nacimiento, que el
 * servidor además copia a `profiles.birthdate`.
 */
export function envios(b: Borrador, hoy: Date): { clave: string; valor: string | string[] }[] {
  const r = b.respuestas
  const lista: { clave: string; valor: string | string[] }[] = []
  if (r.arraigo?.[0]) lista.push({ clave: 'arraigo', valor: r.arraigo[0] })
  for (const k of ['zonas', 'dias', 'temas']) if (r[k]?.length) lista.push({ clave: k, valor: r[k] })
  const n = nacimientoISO(b, hoy)
  if (n) lista.push({ clave: 'nacimiento', valor: n })
  return lista
}

/** A dónde sigue, según el estado que da el servidor en `/api/mi-cuenta` (lo decide `embudo.ts`). */
export function destinoDeEstado(estado: string | null | undefined): string {
  if (estado === 'datos') return '/datos'
  if (estado === 'perfil') return '/cuestionario'
  if (estado === 'verificar') return '/verificacion'
  return '/cuenta'
}
