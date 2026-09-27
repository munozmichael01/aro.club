import type { crearApi } from '../sesion/api'
import type { Lead } from '../sesion/lead'
import { CIUDAD_PRODUCTO } from '../texto/zona'
import { sinRespuesta } from '../texto/datos'
import type { PreguntaCatalogo } from '../entrada/preguntas'
import type { DeServidor } from './maquina'

/**
 * Las llamadas de los datos personales. Como en la entrada, recibe la `api`
 * para que las pruebas contra el servidor usen este mismo código.
 *
 * Dos identidades posibles, y la sesión manda (igual que el servidor): con
 * cuenta, la cookie de la sesión; sin ella, el lead con su token firmado.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

async function leer<T>(r: Response, porDefecto: string): Promise<Resultado<T>> {
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok && j) return { ok: true, datos: j as T }
  return { ok: false, error: j?.error || porDefecto, status: r.status }
}

async function intentar<T>(f: () => Promise<Response>, porDefecto: string): Promise<Resultado<T>> {
  try {
    return await leer<T>(await f(), porDefecto)
  } catch {
    return { ok: false, error: sinRespuesta.conexion }
  }
}

const json = (cuerpo: object): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

export function crearServicioDatos(api: Api) {
  return {
    cargar: (lead: Lead | null) =>
      intentar<DeServidor>(
        () => api.pedir('/datos-base' + (lead ? `?correo=${encodeURIComponent(lead.correo)}&token=${encodeURIComponent(lead.token)}` : '')),
        sinRespuesta.servidor,
      ),

    /** Quien llega sin nada deja aquí su correo: la misma puerta que la entrada. */
    dejarCorreo: (correo: string) =>
      intentar<{ estado: string; token?: string }>(
        () => api.pedir('/lead', json({ correo: correo.trim(), ciudad: CIUDAD_PRODUCTO.slug, origen: 'app' })),
        sinRespuesta.servidor,
      ),

    guardar: (lead: Lead | null, cuerpo: object) =>
      intentar<{ ok?: boolean }>(
        () => api.pedir('/datos-base', json({ ...(lead ? { correo: lead.correo, token: lead.token } : {}), ...cuerpo })),
        sinRespuesta.guardar,
      ),

    /**
     * Crea la cuenta. El servidor abre la sesión en SU cookie, que en el
     * celular no sirve: la app entra después con el SDK con las mismas
     * credenciales, y es el SDK quien la guarda (ver src/sesion).
     */
    crearCuenta: (lead: Lead, clave: string) =>
      intentar<{ estado: 'creada' | 'creada_sin_sesion' | 'ya_existe' }>(
        () => api.pedir('/cuenta', json({ correo: lead.correo, token: lead.token, clave })),
        sinRespuesta.cuenta,
      ),

    catalogo: () => intentar<{ version: string; preguntas: PreguntaCatalogo[] }>(() => api.pedir('/questions'), sinRespuesta.servidor),

    /** La fecha abierta: de ella sale el día (y, cuando el servidor la dé, la hora) de las frases. */
    proxima: () =>
      intentar<{ hay: boolean; empiezaEn?: string; revelaEn?: string; zonaHoraria?: string }>(() => api.pedir('/proxima'), sinRespuesta.servidor),
  }
}
