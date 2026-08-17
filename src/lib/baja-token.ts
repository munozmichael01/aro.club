import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { serverEnv } from '@/lib/env'

/**
 * La firma del enlace de baja que va en el pie de cada correo.
 *
 * Hace falta porque la pantalla de baja **no tiene sesión** —quien recibe la
 * bienvenida no tiene cuenta todavía— y sin firma bastaría con poner el correo
 * de cualquiera en la URL para darlo de baja. Con esto, solo puede darse de
 * baja quien tenga el enlace, y el enlace solo llega por correo a esa
 * dirección.
 *
 * ## Por qué no reutilizo el token del lead
 *
 * `lead-token` firma exactamente lo mismo —un correo— con el mismo secreto.
 * Si compartieran firma, el token que va en el enlace de baja de CADA correo
 * serviría también para abrir `/datos` con los datos de esa persona: nombre,
 * edad y teléfono. Un enlace pensado para renunciar a algo se convertiría en
 * un enlace de acceso.
 *
 * El prefijo `baja:` es lo que los separa. Es una línea y evita que dos usos
 * con permisos muy distintos compartan llave.
 *
 * ## Caduca
 *
 * Treinta días. Un enlace de baja no debería vivir para siempre en un correo
 * archivado, pero tampoco puede caducar en horas: la gente se da de baja
 * cuando le molesta el correo, que puede ser semanas después. Cuando caduca
 * hay pantalla que lo dice —el tercer estado— y no un fallo mudo: un enlace de
 * baja que falla en silencio es el problema legal, no el feo.
 */

const DIAS = 30
const VENTANA = DIAS * 24 * 3600 * 1000

function secreto(): string {
  return process.env.LEAD_TOKEN_SECRET || serverEnv().SUPABASE_SERVICE_ROLE_KEY
}

function firma(correo: string, caduca: number): string {
  return createHmac('sha256', secreto())
    .update(`baja:${correo.trim().toLowerCase()}:${caduca}`)
    .digest('base64url')
}

/** El token que va en la URL: cuándo caduca y su firma. */
export function firmarBaja(correo: string): string {
  const caduca = Date.now() + VENTANA
  return `${caduca}.${firma(correo, caduca)}`
}

export type Baja = { vale: true } | { vale: false; motivo: 'caducado' | 'invalido' }

/**
 * Comprueba el token. Distingue caducado de inválido porque la pantalla dice
 * cosas distintas: uno se arregla pidiendo otro correo y el otro no se
 * arregla.
 */
export function verificarBaja(correo: string, token: string | undefined | null): Baja {
  if (!token) return { vale: false, motivo: 'invalido' }

  const corte = token.indexOf('.')
  if (corte < 1) return { vale: false, motivo: 'invalido' }

  const caduca = Number(token.slice(0, corte))
  const recibida = token.slice(corte + 1)
  if (!Number.isFinite(caduca)) return { vale: false, motivo: 'invalido' }

  // La firma se comprueba ANTES de mirar la fecha. Al revés, cualquiera podría
  // saber si una fecha inventada está dentro de la ventana, y sobre todo:
  // decirle «caducado» a quien trae un token falso sugiere que el token era
  // bueno y solo le pilló tarde.
  const esperada = Buffer.from(firma(correo, caduca))
  const dada = Buffer.from(recibida)
  if (esperada.length !== dada.length || !timingSafeEqual(esperada, dada)) {
    return { vale: false, motivo: 'invalido' }
  }

  if (Date.now() > caduca) return { vale: false, motivo: 'caducado' }
  return { vale: true }
}
