import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/cancelar'
import type { DeServidor } from './maquina'

/** Las llamadas de Cancelar. Cancelar suelta un puesto de verdad: contra producción, solo con la cuenta del banco. */
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
  if (r.ok && j) return { ok: true, datos: j as T }
  return { ok: false, error: j?.error || porDefecto, status: r.status }
}

export function crearServicioCancelar(api: Api) {
  return {
    leer: (reserva?: string | null) =>
      intentar<DeServidor>(() => api.pedir('/cancelar' + (reserva ? `?reserva=${encodeURIComponent(reserva)}` : '')), T.sinRespuesta.cargar),
    cancelar: (reservaId: string, motivo: string | null) =>
      intentar<{ estado: string; creditoDevuelto: boolean; horasQueFaltaban: number }>(
        () =>
          api.pedir('/cancelar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservaId, ...(motivo ? { motivo } : {}) }),
          }),
        T.preguntar.noPudimos,
      ),
    /** Los créditos de verdad, de la misma fuente que el Inicio. */
    creditos: async (): Promise<number | null> => {
      const r = await intentar<{ creditos: number }>(() => api.pedir('/mi-cuenta'), '')
      return r.ok ? r.datos.creditos : null
    },
  }
}
