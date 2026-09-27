import type { crearApi } from '../sesion/api'
import { CIUDAD_PRODUCTO } from '../texto/zona'
import { sinRespuesta } from '../texto/entrada'
import type { PreguntaCatalogo } from './preguntas'

/**
 * Las llamadas de la entrada. Recibe la `api` en vez de importarla para que
 * las pruebas contra el servidor de verdad usen este mismo código.
 */
type Api = ReturnType<typeof crearApi>

export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string }

/**
 * Lee la respuesta sin fiarse de que sea JSON. Si el servidor falla con una
 * página de error, no se le echa la culpa a la conexión de la persona (la
 * web aprendió eso): se dice que es cosa nuestra.
 */
async function leer<T>(r: Response): Promise<Resultado<T>> {
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok && j) return { ok: true, datos: j as T }
  // El mensaje del servidor, tal cual: la app no tiene copia de ellos.
  return { ok: false, error: j?.error || sinRespuesta.servidor }
}

async function intentar<T>(f: () => Promise<Response>, sinRed: string): Promise<Resultado<T>> {
  try {
    return await leer<T>(await f())
  } catch {
    return { ok: false, error: sinRed }
  }
}

export type RespuestaLead = { estado: 'nuevo' | 'repetido' | 'completado'; token?: string }

export function crearServicio(api: Api) {
  return {
    /** Paso 1: el correo. Guarda el puesto antes de la primera pregunta. */
    dejarCorreo: (correo: string) =>
      intentar<RespuestaLead>(
        () =>
          api.pedir('/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: correo.trim(), ciudad: CIUDAD_PRODUCTO.slug }),
          }),
        sinRespuesta.conexion,
      ),

    /** Paso 2: las cuatro respuestas, por código. */
    guardarRespuestas: (cuerpo: object) =>
      intentar<RespuestaLead>(
        () =>
          api.pedir('/lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...cuerpo, ciudad: CIUDAD_PRODUCTO.slug }),
          }),
        sinRespuesta.respuestas,
      ),

    catalogo: () => intentar<{ version: string; preguntas: PreguntaCatalogo[] }>(() => api.pedir('/questions'), sinRespuesta.preguntas),

    proxima: () =>
      intentar<{ hay: boolean; empiezaEn?: string; cierraEn?: string; zonaHoraria?: string }>(
        () => api.pedir('/proxima'),
        sinRespuesta.conexion,
      ),
  }
}
