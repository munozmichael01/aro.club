import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/dentro'
import * as M from './maquina'

/**
 * «Estás dentro» lee `GET /api/estas-dentro` (31-10), lo mismo que la web. Si
 * el servidor aún no lo tiene, como antes: /api/mi-cuenta y /api/mi-mesa.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<D> = { ok: true; datos: D } | { ok: false; error: string; status?: number }

export type Datos = { reservaId: string; plan: M.Plan; pendiente: boolean }

const json = (cuerpo: object): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })

async function leerJson(api: Api, ruta: string): Promise<Resultado<any>> {
  try {
    const r = await api.pedir(ruta)
    const j = await r.json().catch(() => null)
    return r.ok && j ? { ok: true, datos: j } : { ok: false, error: j?.error || T.sinRespuesta.cargar, status: r.status }
  } catch (e) {
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: T.sinRespuesta.cargar }
  }
}

export function crearServicioDentro(api: Api) {
  return {
    leer: async (evento?: string | null): Promise<Resultado<Datos | null>> => {
      const e = await leerJson(api, '/estas-dentro' + (evento ? '?evento=' + encodeURIComponent(evento) : ''))
      if (e.ok) {
        const r = e.datos.reserva
        if (!r?.id || !e.datos.plan?.empiezaEn) return { ok: true, datos: null }
        return { ok: true, datos: { reservaId: r.id, pendiente: !!r.pendiente, plan: e.datos.plan } }
      }
      if (e.status === 401) return e
      const c = await leerJson(api, '/mi-cuenta')
      if (!c.ok) return c
      const reserva = c.datos.reserva
      if (!reserva?.id || !reserva.empiezaEn) return { ok: true, datos: null }
      // El estado del pago, del plan de esa misma fecha.
      const plan = (c.datos.planes ?? []).find((x: any) => x.empiezaEn === reserva.empiezaEn && !x.cancelada)
      const m = await leerJson(api, '/mi-mesa')
      const mesa = m.ok ? m.datos : {}
      return {
        ok: true,
        datos: {
          reservaId: reserva.id,
          pendiente: plan?.estado === 'pending_payment',
          plan: {
            empiezaEn: reserva.empiezaEn,
            zonaHoraria: reserva.zonaHoraria ?? mesa.zonaHoraria ?? null,
            formato: reserva.formato ?? mesa.formato ?? null,
            revelaEn: reserva.revelaEn ?? mesa.revelaEn ?? null,
            zonas: mesa.zonas ?? [],
          },
        },
      }
    },
    /**
     * La B se ve una vez, y «ya la vio» lo guarda el SERVIDOR (31-10), el
     * mismo para la app y la web. También con el pago en revisión: reportar
     * es estar dentro (Michael, 31-10).
     */
    marcarVista: (reservaId: string) => api.pedir('/estas-dentro', json({ reservaId })).catch(() => undefined),
  }
}
