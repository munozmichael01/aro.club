/**
 * La sesión del celular, vestida de cookie web.
 *
 * Las rutas de `aro.club/api` leen la sesión SOLO de la cookie que escribe
 * `@supabase/ssr` (`sb-<proyecto>-auth-token`); no aceptan `Authorization`.
 * La app no cambia eso: arma la misma cookie a partir de la sesión del SDK.
 *
 * **Sin el refresh token.** El servidor, si ve un access token a punto de
 * caducar, intenta refrescarlo con el refresh que venga en la cookie — y al
 * hacerlo lo ROTA, a espaldas de la app, que se quedaría con uno gastado y
 * acabaría fuera. Mandándolo vacío, el servidor no puede rotar nada: o el
 * access vale, o responde 401 y la app refresca por su cuenta. Probado
 * contra producción el 26-09 (ver PROPUESTA §0).
 *
 * Puro a propósito: sin `Buffer` ni nada de Node, para que corra igual en
 * Hermes y en las pruebas.
 */

/** Lo que `@supabase/ssr` corta por trozo. Por encima, la cookie va en `.0`, `.1`… */
const TROZO = 3180

export type SesionMinima = {
  access_token: string
  token_type: string
  expires_in: number
  expires_at?: number
  user: unknown
}

/** `https://qdydmklrbsdemzvjsldo.supabase.co` → `sb-qdydmklrbsdemzvjsldo-auth-token` */
export function nombreDeCookie(urlSupabase: string): string {
  const proyecto = new URL(urlSupabase).hostname.split('.')[0]
  return `sb-${proyecto}-auth-token`
}

export function cookieDeSesion(sesion: SesionMinima, urlSupabase: string): string {
  const cuerpo = JSON.stringify({ ...sesion, refresh_token: '' })
  const valor = 'base64-' + base64url(new TextEncoder().encode(cuerpo))
  const nombre = nombreDeCookie(urlSupabase)

  if (valor.length <= TROZO) return `${nombre}=${valor}`

  const partes: string[] = []
  for (let i = 0; i * TROZO < valor.length; i++) {
    partes.push(`${nombre}.${i}=${valor.slice(i * TROZO, (i + 1) * TROZO)}`)
  }
  return partes.join('; ')
}

const ABC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'

/** base64url sin relleno, que es lo que decodifica `@supabase/ssr`. */
export function base64url(bytes: Uint8Array): string {
  let s = ''
  let i = 0
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
    s += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63] + ABC[(n >> 6) & 63] + ABC[n & 63]
  }
  const resto = bytes.length - i
  if (resto === 1) {
    const n = bytes[i] << 16
    s += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63]
  } else if (resto === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8)
    s += ABC[(n >> 18) & 63] + ABC[(n >> 12) & 63] + ABC[(n >> 6) & 63]
  }
  return s
}
