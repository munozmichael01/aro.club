import { SinSesion, type crearApi } from '../sesion/api'

/**
 * Las llamadas del alta de la app. Las respuestas van con la sesión de
 * cuenta a `/api/cuestionario` (acepta sesión sin lead ni token: «la cuenta
 * primero»). La cuenta con contraseña, a `/api/cuenta` sin lead —la abre el
 * agente de la web; hasta entonces responde 403—.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

async function intentar<T>(f: () => Promise<Response>, porDefecto: string): Promise<Resultado<T>> {
  let r: Response
  try {
    r = await f()
  } catch (e) {
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: porDefecto }
  }
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok) return { ok: true, datos: (j ?? {}) as T }
  return { ok: false, error: j?.error || porDefecto, status: r.status }
}

const json = (cuerpo: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

export function crearServicioPuerta(api: Api) {
  return {
    /** Una por una: si una falla, se para y se dice cuál (el servidor valida cada una contra el catálogo). */
    async guardar(envios: { clave: string; valor: string | string[] }[], porDefecto: string): Promise<Resultado<true>> {
      for (const e of envios) {
        const r = await intentar(() => api.pedir('/cuestionario', json({ clave: e.clave, valor: e.valor })), porDefecto)
        if (!r.ok) return r
      }
      return { ok: true, datos: true }
    },
    crearCuenta: (correo: string, clave: string, porDefecto: string) =>
      intentar<{ ok?: boolean }>(() => api.pedir('/cuenta', json({ correo, clave, origen: 'app' })), porDefecto),
    /** En qué punto está: lo decide el embudo del servidor. */
    estado: () => intentar<{ estado: string }>(() => api.pedir('/mi-cuenta'), ''),
  }
}
