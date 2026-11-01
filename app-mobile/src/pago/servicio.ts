import type { MasUno } from '../masuno/maquina'
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
    cupon: (eventoId: string, codigo: string, permiteGrabacion?: boolean, aceptaCondiciones?: boolean) =>
      intentar<RespuestaCupon>(
        () => api.pedir('/cupon', json({ eventoId, codigo, acepta: ['descuento'], ...(permiteGrabacion ? { permiteGrabacion } : {}), ...(aceptaCondiciones ? { aceptaCondiciones } : {}) })),
        T.cupon.noPudimos,
        T.cupon.sinRed,
      ),

    /**
     * La captura se sube ANTES de reportar y el servidor devuelve la RUTA,
     * que viaja en el reporte. El fichero lo arma la pantalla (`File` de
     * expo-file-system, no `{ uri, name, type }`: el fetch de Expo 57 lo
     * rechaza); aquí no, para que este servicio corra también en las pruebas.
     */
    /**
     * Ya vio «Estás dentro» aquí mismo (al reportar, con cupón o confirmado al
     * instante): se le dice al servidor, para que el Inicio no la vuelva a
     * abrir. Reportar ES estar dentro (Michael, 31-10): no se repite al confirmarse.
     */
    /** Devuelve el +1 de esa reserva, si es una fecha +1: «Estás dentro» enseña la invitación. */
    marcarDentro: async (eventoId: string): Promise<MasUno | null> => {
      try {
        const r = await api.pedir('/estas-dentro?evento=' + encodeURIComponent(eventoId))
        const j = await r.json().catch(() => null)
        if (r.ok && j?.reserva?.id) await api.pedir('/estas-dentro', json({ reservaId: j.reserva.id }))
        return (j?.masUno as MasUno | undefined) ?? null
      } catch {
        // Si no se pudo, el Inicio la enseña una vez más: no es grave.
        return null
      }
    },

    captura: (archivo: Blob, nombre: string) => {
      const cuerpo = new FormData()
      cuerpo.append('archivo', archivo, nombre)
      return intentar<{ ruta: string }>(() => api.pedir('/pago/captura', { method: 'POST', body: cuerpo }), T.reporte.noSubida, T.reporte.noSubidaRed)
    },
  }
}
