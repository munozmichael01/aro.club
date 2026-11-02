import { SinSesion, type crearApi } from '../sesion/api'
import { olvidarCodigo, paraElAlta } from '../sesion/traido'

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
    /**
     * Menor de 18 con sesión, tras «Sí, es mi fecha» (contrato 35ff9bc): el
     * servidor da de baja la cuenta y responde 403 `motivo: 'menor'`. `true` si
     * quedó cerrada.
     */
    async cerrarMenor(valor: string): Promise<boolean> {
      const r = await intentar(() => api.pedir('/cuestionario', json({ clave: 'nacimiento', valor, confirmaMenor: true })), '')
      return !r.ok && r.status === 403
    },
    /** `estado`: `creada`, `creada_sin_sesion` o `ya_existe` (un 200 también). */
    // Con el código de quien la invitó y el +1, si llegó por un enlace (26485ff).
    async crearCuenta(correo: string, clave: string, porDefecto: string) {
      const r = await intentar<{ estado?: 'creada' | 'creada_sin_sesion' | 'ya_existe' }>(async () => api.pedir('/cuenta', json({ correo, clave, origen: 'app', ...(await paraElAlta()) })), porDefecto)
      if (r.ok) await olvidarCodigo()
      return r
    },
    /** Las ciudades, de la tabla `cities` (agente de la web, 07-10-2026). */
    ciudades: () => intentar<{ ciudades: { slug: string; nombre: string; abierta: boolean }[] }>(() => api.pedir('/ciudades'), ''),
    /** Su ciudad, en el perfil. Con la sesión ya abierta, sea cual sea la puerta (correo, Apple o Google). */
    ponerCiudad: (slug: string, porDefecto: string) => intentar<{ ok?: boolean }>(() => api.pedir('/mi-perfil', json({ clave: 'ciudad', valor: slug })), porDefecto),
    /** En qué punto está: lo decide el embudo del servidor. */
    /** `paso` lo decide `embudo.ts`: con `preguntas`, le faltan las de la puerta. */
    estado: () => intentar<{ estado: string; paso?: string }>(() => api.pedir('/mi-cuenta'), ''),
  }
}
