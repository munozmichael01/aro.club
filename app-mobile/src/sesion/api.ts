import { cookieDeSesion, type SesionMinima } from './cookie'

/**
 * El único sitio por donde la app habla con `aro.club/api`.
 *
 * No sabe de dónde sale la sesión: se la dan. Así corre igual con el cliente
 * del celular y con el de las pruebas en Node, que es como se comprueba
 * contra la API de verdad sin simulador.
 */

/**
 * Cuánta vida le exigimos al access token antes de mandarlo.
 *
 * El servidor (`auth-js`, `EXPIRY_MARGIN_MS`) da por caducado el que vence en
 * menos de 90 s e intenta refrescarlo — con el refresh vacío que le
 * mandamos, así que fallaría con un 401 que no es culpa de nadie. Con cinco
 * minutos de margen, el servidor nunca ve uno «a punto de caducar».
 */
const MARGEN_S = 5 * 60

export type Sesion = SesionMinima & { refresh_token: string }

export type Dependencias = {
  base: string
  urlSupabase: string
  /** `ios/0.1.0 (1)`: el servidor lo ignora hoy; mañana dice qué versiones siguen vivas. */
  version: string
  obtenerSesion: () => Promise<Sesion | null>
  refrescar: () => Promise<Sesion | null>
}

export class SinSesion extends Error {
  constructor() {
    super('Sin sesión.')
  }
}

export function crearApi(d: Dependencias) {
  async function vigente(): Promise<Sesion | null> {
    const s = await d.obtenerSesion()
    if (!s) return null
    const quedan = (s.expires_at ?? 0) - Math.floor(Date.now() / 1000)
    return quedan > MARGEN_S ? s : d.refrescar()
  }

  async function lanzar(ruta: string, init: RequestInit, sesion: Sesion | null) {
    const cabeceras = new Headers(init.headers)
    cabeceras.set('X-Aro-App', d.version)
    if (sesion) cabeceras.set('Cookie', cookieDeSesion(sesion, d.urlSupabase))
    return fetch(d.base + ruta, {
      ...init,
      headers: cabeceras,
      // Que el sistema no guarde ni reenvíe cookies por su cuenta. `/cuenta`
      // y `/entrar` responden con `Set-Cookie` de una sesión completa —con
      // su refresh token— y si el almacén del sistema la guardara, iría en
      // cada petición junto a la nuestra.
      credentials: 'omit',
    })
  }

  /**
   * Una petición. Con 401 y sesión, refresca UNA vez y reintenta: el caso
   * normal es un token que caducó entre la comprobación y la llegada.
   */
  async function pedir(ruta: string, init: RequestInit = {}): Promise<Response> {
    const sesion = await vigente()
    const r = await lanzar(ruta, init, sesion)
    if (r.status !== 401 || !sesion) return r

    const nueva = await d.refrescar()
    if (!nueva) throw new SinSesion()
    return lanzar(ruta, init, nueva)
  }

  async function json<T>(ruta: string, init: RequestInit = {}): Promise<{ status: number; datos: T }> {
    const r = await pedir(ruta, init)
    return { status: r.status, datos: (await r.json()) as T }
  }

  function enviar<T>(ruta: string, cuerpo: unknown) {
    return json<T>(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    })
  }

  return { pedir, json, enviar }
}
