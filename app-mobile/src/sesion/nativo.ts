import type { crearApi } from './api'

/**
 * Lo que pasa DESPUÉS de entrar con Apple o Google: `POST /api/auth/nativo`,
 * que corre `trasEntrar()` en el servidor (la misma que `/auth/callback` de
 * la web) y devuelve en qué punto del embudo está la persona.
 *
 * El contrato (acordado con el agente de la web, 29-09):
 *   → 200 { paso, otroCorreo?, relay? } · 401 sin sesión · 409 { error }
 * Idempotente: si la app muere entre el login y esta llamada, se repite al
 * arrancar y responde el mismo `paso`, nunca «ya estaba hecho».
 *
 * Para saber que hay que repetirla existe la MARCA: se pone antes de llamar
 * y se quita con el 200. Si al arrancar hay sesión y marca, la entrada no
 * terminó.
 */

export type Paso = 'preguntas' | 'contacto' | 'cuenta' | 'verificacion' | 'listo'
export type RespuestaNativo = { paso: Paso; otroCorreo?: string | null; relay?: boolean }

export const MARCA = 'aro.nativo.pendiente'

type Almacen = { getItem: (k: string) => Promise<string | null>; setItem: (k: string, v: string) => Promise<void>; removeItem: (k: string) => Promise<void> }
type Api = ReturnType<typeof crearApi>

export type Resultado = { ok: true; datos: RespuestaNativo } | { ok: false; status?: number; error: string }

/**
 * A dónde lleva cada `paso`. Los decide `embudo.ts` en el servidor: la app
 * no lleva su propia lista de qué falta, solo el camino a la pantalla.
 * `cuenta` no debería salir aquí (ya hay cuenta): si sale, es un fallo y se
 * trata como tal.
 */
export function destinoDePaso(paso: Paso | string): string | null {
  switch (paso) {
    case 'preguntas':
      return '/puerta'
    case 'contacto':
      return '/datos'
    case 'verificacion':
      return '/verificacion'
    case 'listo':
      return '/cuenta'
    default:
      return null
  }
}

/** La llamada, con su marca. */
export async function terminarEntrada(api: Api, almacen: Almacen, textoFallo: string): Promise<Resultado> {
  await almacen.setItem(MARCA, String(Date.now())).catch(() => {})
  let r: Response
  try {
    r = await api.pedir('/auth/nativo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
  } catch {
    // Sin red: la marca se queda, y al próximo arranque se reintenta.
    return { ok: false, error: textoFallo }
  }
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok && j?.paso) {
    await almacen.removeItem(MARCA).catch(() => {})
    return { ok: true, datos: { paso: j.paso, otroCorreo: j.otroCorreo ?? null, relay: !!j.relay } }
  }
  // 401: la sesión no vale; no hay nada que reintentar con ella.
  if (r.status === 401) await almacen.removeItem(MARCA).catch(() => {})
  return { ok: false, status: r.status, error: j?.error || textoFallo }
}

/** ¿Quedó una entrada a medias? */
export const hayPendiente = async (almacen: Almacen) => !!(await almacen.getItem(MARCA).catch(() => null))
