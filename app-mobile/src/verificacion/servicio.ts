import type { crearApi } from '../sesion/api'
import * as T from '../texto/verificacion'
import { TIPOS, type DeServidor, type Toma } from './maquina'

/**
 * Las llamadas de la verificación. Pide sesión de cuenta: se verifica
 * después de crearla. La foto va como la manda la web: multipart con `tipo`
 * y `archivo`, JPEG.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

/**
 * Dos fallos distintos, dos mensajes distintos: no llegar al servidor es la
 * conexión; llegar y que responda mal (un 413 de Vercel, un 500 sin JSON) es
 * cosa nuestra. Echarle la culpa a la conexión de la persona cuando falla el
 * servidor la manda a revisar el wifi en vano (la web lo aprendió así).
 */
async function intentar<T>(f: () => Promise<Response>, sinRed: string, deNuestro: string, que: string): Promise<Resultado<T>> {
  let r: Response
  try {
    r = await f()
  } catch (err) {
    if (__DEV__) console.warn(`[verificación] ${que}: no llegó al servidor`, String(err))
    return { ok: false, error: sinRed }
  }
  const texto = await r.text().catch(() => '')
  let j: any = null
  try {
    j = JSON.parse(texto)
  } catch {
    /* no era JSON */
  }
  if (r.ok && j) return { ok: true, datos: j as T }
  if (__DEV__) console.warn(`[verificación] ${que}: ${r.status}`, texto.slice(0, 200))
  return { ok: false, error: j?.error || deNuestro, status: r.status }
}

export function crearServicioVerificacion(api: Api) {
  return {
    estado: () => intentar<DeServidor>(() => api.pedir('/verificacion'), T.sinRespuesta.cargar, T.sinRespuesta.cargar, 'estado'),

    subir: (toma: Toma, uri: string) => {
      const cuerpo = new FormData()
      cuerpo.append('tipo', TIPOS[toma])
      // La forma de React Native para adjuntar un fichero local. El nombre
      // lleva la extensión: el servidor decide la ruta, pero mira el tipo.
      cuerpo.append('archivo', { uri, name: `${TIPOS[toma]}.jpg`, type: 'image/jpeg' } as unknown as Blob)
      return intentar<{ estado: string }>(
        () => api.pedir('/verificacion', { method: 'POST', body: cuerpo }),
        T.sinRespuesta.subir,
        T.sinRespuesta.subirServidor,
        `subir ${TIPOS[toma]}`,
      )
    },
  }
}
