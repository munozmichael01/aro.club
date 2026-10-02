import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/pago'
import type { DeServidor } from './maquina'

/**
 * Las llamadas de Pago. Reportar APARTA un puesto de verdad y le llega a
 * operación: contra producción solo con la cuenta del banco.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number; motivo?: string }

async function intentar<T>(f: () => Promise<Response>, porDefecto: string, sinRed: string): Promise<Resultado<T>> {
  let r: Response
  try {
    r = await f()
  } catch (e) {
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: sinRed }
  }
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok && j) return { ok: true, datos: j as T }
  return { ok: false, error: j?.error || porDefecto, status: r.status, motivo: j?.motivo }
}

const json = (cuerpo: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

export function crearServicioPago(api: Api) {
  return {
    cargar: (evento: string) =>
      intentar<DeServidor>(() => api.pedir('/pago?evento=' + encodeURIComponent(evento)), T.sinRespuesta.cargar, T.sinRespuesta.cargar),

    reportar: (cuerpo: object) =>
      intentar<{ estado: 'reportado' | 'confirmado'; puestoApartado?: boolean }>(() => api.pedir('/pago', json(cuerpo)), T.reporte.noRegistrado, T.reporte.noRegistrado),

    cupon: (eventoId: string, codigo: string) =>
      intentar<{ ok?: boolean }>(() => api.pedir('/cupon', json({ eventoId, codigo })), T.cupon.noPudimos, T.cupon.sinRed),

    /**
     * La captura se sube ANTES de reportar y el servidor devuelve la RUTA,
     * que viaja en el reporte. El fichero lo arma la pantalla (`File` de
     * expo-file-system, no `{ uri, name, type }`: el fetch de Expo 57 lo
     * rechaza); aquí no, para que este servicio corra también en las pruebas.
     */
    captura: (archivo: Blob, nombre: string) => {
      const cuerpo = new FormData()
      cuerpo.append('archivo', archivo, nombre)
      return intentar<{ ruta: string }>(() => api.pedir('/pago/captura', { method: 'POST', body: cuerpo }), T.reporte.noSubida, T.reporte.noSubidaRed)
    },
  }
}
