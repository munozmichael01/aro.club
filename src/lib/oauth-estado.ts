import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { serverEnv } from '@/lib/env'

/**
 * El `state` de OAuth: firmado, y con el destino dentro.
 *
 * El destino va AQUÍ y no como parámetro de la redirección. Un parámetro
 * obliga a listar cada variante en la consola de Supabase, y es por donde se
 * cuelan los redirects abiertos: `?next=https://otro-sitio` en una URL que
 * nadie valida. La redirección registrada es una sola —`/auth/callback`— y a
 * dónde ir después viaja firmado por nosotros.
 *
 * Lleva también el correo del lead cuando se sabe, que es lo único que
 * permite cruzar a alguien que se apuntó con una dirección y entra con otra.
 * Google puede llegar desde un dispositivo sin llave de lead: entonces no va,
 * y no hay nada que comparar.
 *
 * Se firma con el mismo secreto que los demás enlaces nuestros. Sin firma,
 * cualquiera podría mandarse a sí mismo a `/auth/callback` con el correo de
 * otro dentro y quedarse con su lead.
 */

function secreto(): string {
  return process.env.LEAD_TOKEN_SECRET || serverEnv().SUPABASE_SERVICE_ROLE_KEY
}

/** Diez minutos: lo que tarda una vuelta por Google, y ni un minuto más. */
const VENTANA = 10 * 60 * 1000

export type Estado = {
  /** A dónde volver. SIEMPRE una ruta nuestra, nunca una URL. */
  destino: string
  /** El correo con el que se apuntó, si lo sabemos. */
  lead?: string
}

/**
 * Solo rutas internas. Un destino que empiece por `//` es una URL absoluta
 * disfrazada —`//evil.com` es un host, no una ruta— y es el fallo clásico de
 * quien valida con `startsWith('/')` a secas.
 */
function destinoLimpio(d: string | null | undefined): string {
  const v = (d ?? '').trim()
  if (!v.startsWith('/') || v.startsWith('//')) return '/cuenta'
  return v
}

export function firmarEstado(e: Estado): string {
  const cuerpo = JSON.stringify({
    d: destinoLimpio(e.destino),
    l: e.lead?.trim().toLowerCase() || undefined,
    x: Date.now() + VENTANA,
  })
  const dato = Buffer.from(cuerpo).toString('base64url')
  const firma = createHmac('sha256', secreto()).update(dato).digest('base64url')
  return `${dato}.${firma}`
}

export function leerEstado(state: string | null | undefined): Estado | null {
  if (!state) return null
  const corte = state.lastIndexOf('.')
  if (corte < 1) return null

  const dato = state.slice(0, corte)
  const dada = Buffer.from(state.slice(corte + 1))
  const esperada = Buffer.from(createHmac('sha256', secreto()).update(dato).digest('base64url'))
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) return null

  try {
    const c = JSON.parse(Buffer.from(dato, 'base64url').toString('utf8')) as {
      d?: string
      l?: string
      x?: number
    }
    if (!c.x || Date.now() > c.x) return null
    return { destino: destinoLimpio(c.d), lead: c.l }
  } catch {
    return null
  }
}
