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
 * ## Por qué se comprueba contra varios secretos
 *
 * Esto NO caduca: es `HMAC(correo)` y nada más. Así que un token solo puede
 * dejar de valer por una razón —que cambie el secreto— y eso pasó: el 15 de
 * agosto se añadió `LEAD_TOKEN_SECRET` en producción y hasta entonces el
 * secreto era la clave de servicio, por el fallback de aquí abajo. De golpe,
 * todos los enlaces emitidos antes murieron.
 *
 * No se vio, y así es como se ve desde dentro: Michael contestó las catorce
 * preguntas, cada guardado devolvió 403, la pantalla se los tragó y le dijo
 * «COMPLETO» sobre una base vacía. Nadie escribe para contar que un
 * formulario no guardó.
 *
 * Se FIRMA con el secreto de ahora y se COMPRUEBA contra los que ha habido.
 * Rotar la llave deja de tirar a la basura lo que la gente ya tenía a medias,
 * que es lo único que un cambio de configuración no debería poder hacer.
 * No hace falta ninguna variable nueva: el secreto viejo es la clave de
 * servicio, que ya está aquí.
 */

/** El de ahora: con este se firma. */
function secreto(): string {
  return process.env.LEAD_TOKEN_SECRET || serverEnv().SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Todos los que han valido, sin repetir. El de ahora primero.
 *
 * Cuando `LEAD_TOKEN_SECRET` no está, los dos son el mismo y la lista tiene
 * un elemento: en local nada cambia.
 */
function secretos(): string[] {
  const ahora = secreto()
  const antes = serverEnv().SUPABASE_SERVICE_ROLE_KEY
  return ahora === antes ? [ahora] : [ahora, antes]
}

const con = (llave: string, correo: string) =>
  createHmac('sha256', llave).update(correo.trim().toLowerCase()).digest('base64url')

export function firmar(correo: string): string {
  return con(secreto(), correo)
}

export function verificar(correo: string, token: string | undefined | null): boolean {
  if (!token) return false
  const recibido = Buffer.from(token)

  // Se prueban todos y NO se corta al primero que falla: comparar en tiempo
  // constante y luego salir antes con unos y no con otros contaría lo mismo
  // que no compararlo así.
  let vale = false
  for (const llave of secretos()) {
    const esperado = Buffer.from(con(llave, correo))
    if (esperado.length === recibido.length && timingSafeEqual(esperado, recibido)) vale = true
  }
  return vale
}
