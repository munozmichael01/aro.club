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

async function intentar<T>(f: () => Promise<Response>, sinRed: string): Promise<Resultado<T>> {
  try {
    const r = await f()
    let j: any = null
    try {
      j = JSON.parse(await r.text())
    } catch {
      /* no era JSON */
    }
    if (r.ok && j) return { ok: true, datos: j as T }
    return { ok: false, error: j?.error || sinRed, status: r.status }
  } catch {
    return { ok: false, error: sinRed }
  }
}

export function crearServicioVerificacion(api: Api) {
  return {
    estado: () => intentar<DeServidor>(() => api.pedir('/verificacion'), T.sinRespuesta.cargar),

    subir: (toma: Toma, uri: string) => {
      const cuerpo = new FormData()
      cuerpo.append('tipo', TIPOS[toma])
      // La forma de React Native para adjuntar un fichero local. El nombre
      // lleva la extensión: el servidor decide la ruta, pero mira el tipo.
      cuerpo.append('archivo', { uri, name: `${TIPOS[toma]}.jpg`, type: 'image/jpeg' } as unknown as Blob)
      return intentar<{ estado: string }>(() => api.pedir('/verificacion', { method: 'POST', body: cuerpo }), T.sinRespuesta.subir)
    },
  }
}
