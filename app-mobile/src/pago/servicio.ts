import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/pago'
import { normalizar, type DeServidor, type RespuestaCupon } from './maquina'

/**
 * Las llamadas de Pago. Reportar APARTA un puesto de verdad y le llega a
 * operación: contra producción solo con la cuenta del banco.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number; motivo?: string; idioma?: string }

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
  return { ok: false, error: j?.error || porDefecto, status: r.status, motivo: j?.motivo, idioma: j?.idioma }
}

const json = (cuerpo: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

export function crearServicioPago(api: Api) {
  return {
    cargar: async (evento: string): Promise<Resultado<DeServidor>> => {
      const r = await intentar<DeServidor>(() => api.pedir('/pago?evento=' + encodeURIComponent(evento)), T.sinRespuesta.cargar, T.sinRespuesta.cargar)
      return r.ok ? { ok: true, datos: normalizar(r.datos) } : r
    },

    reportar: (cuerpo: object) =>
      intentar<{ estado: 'reportado' | 'confirmado'; puestoApartado?: boolean; montoUsd?: number }>(() => api.pedir('/pago', json(cuerpo)), T.reporte.noRegistrado, T.reporte.noRegistrado),

    /**
     * El cupón del 100% aparta puesto: en una fecha con grabación requerida,
     * sin `permiteGrabacion` responde 409 (48f5823). `acepta: ['descuento']`
     * dice que esta pantalla sabe leer un código parcial (98b3728).
     */
    cupon: (eventoId: string, codigo: string, permiteGrabacion?: boolean) =>
      intentar<RespuestaCupon>(
        () => api.pedir('/cupon', json({ eventoId, codigo, acepta: ['descuento'], ...(permiteGrabacion ? { permiteGrabacion } : {}) })),
        T.cupon.noPudimos,
        T.cupon.sinRed,
      ),

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
