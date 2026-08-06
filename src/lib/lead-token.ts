import 'server-only'

import { createHmac, timingSafeEqual } from 'node:crypto'

import { serverEnv } from '@/lib/env'

/**
 * Firma que ata una sesión de cuestionario a un correo.
 *
 * Sin esto, un endpoint indexado solo por correo deja que cualquiera lea o
 * sobrescriba las respuestas de otro con solo saber su dirección —
 * incluida la de citas, que el contrato dice que no se muestra jamás.
 *
 * No es autenticación: no hay cuentas todavía. Es lo mínimo para que la
 * fila de un lead solo la toque quien pasó por el formulario.
 *
 * El secreto sale de la clave de servicio si no hay uno propio: es
 * server-only y de entropía alta, y evita tener que configurar otra
 * variable en Vercel para que el despliegue levante.
 */

function secreto(): string {
  return process.env.LEAD_TOKEN_SECRET || serverEnv().SUPABASE_SERVICE_ROLE_KEY
}

export function firmar(correo: string): string {
  return createHmac('sha256', secreto())
    .update(correo.trim().toLowerCase())
    .digest('base64url')
}

export function verificar(correo: string, token: string | undefined | null): boolean {
  if (!token) return false
  const esperado = Buffer.from(firmar(correo))
  const recibido = Buffer.from(token)
  if (esperado.length !== recibido.length) return false
  return timingSafeEqual(esperado, recibido)
}
