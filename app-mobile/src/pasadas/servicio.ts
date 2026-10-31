import type { Accion, DeContacto } from '../contacto/maquina'
import type { DeServidor } from '../mesa/maquina'
import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/mesa'
import type { DePasadas } from './maquina'

/**
 * Las llamadas de Pasadas y «Seguir en contacto». Compartir manda un
 * teléfono a otra persona de verdad: contra producción, solo con el banco.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<D> = { ok: true; datos: D } | { ok: false; error: string; status?: number; campo?: string }

async function intentar<D>(f: () => Promise<Response>, porDefecto: string): Promise<Resultado<D>> {
  let r: Response
  try {
    r = await f()
  } catch (e) {
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: T.sinRespuesta.cargar }
  }
  const j = await r.json().catch(() => null)
  if (r.ok && j) return { ok: true, datos: j as D }
  return { ok: false, error: j?.error || porDefecto, status: r.status, campo: j?.campo }
}

const json = (cuerpo: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

export function crearServicioPasadas(api: Api) {
  return {
    lista: () => intentar<DePasadas>(() => api.pedir('/pasadas'), T.sinRespuesta.cargar),
    /** Una cena pasada con la forma de Mi mesa, para reusar «Con quién cenaste» y la encuesta. 404: no estuvo, o aún no terminó. */
    cena: (mesaId: string) => intentar<DeServidor>(() => api.pedir('/mi-mesa?mesa=' + encodeURIComponent(mesaId)), T.sinRespuesta.cargar),
    contacto: (mesaId: string) => intentar<DeContacto>(() => api.pedir('/contacto?mesa=' + encodeURIComponent(mesaId)), T.sinRespuesta.cargar),
    /** Responde el mismo objeto del GET: la pantalla se pinta con lo que devuelve. */
    accion: (mesaId: string, a: Accion) => intentar<DeContacto>(() => api.pedir('/contacto', json({ mesa: mesaId, ...a })), T.sinRespuesta.cargar),
  }
}
