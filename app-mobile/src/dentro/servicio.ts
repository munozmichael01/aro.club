import AsyncStorage from '@react-native-async-storage/async-storage'

import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/dentro'
import * as M from './maquina'

/** «Estás dentro» solo LEE: la reserva viva de /api/mi-cuenta y las zonas y la revelación de /api/mi-mesa. */
type Api = ReturnType<typeof crearApi>
export type Resultado<D> = { ok: true; datos: D } | { ok: false; error: string; status?: number }

export type Datos = { reservaId: string; plan: M.Plan; pendiente: boolean }

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
    leer: async (): Promise<Resultado<Datos | null>> => {
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
    /** Si ya se vio la B de esta reserva: se ve una vez (HANDOFF). */
    yaVista: async (reservaId: string) => (await AsyncStorage.getItem(M.claveVista(reservaId)).catch(() => null)) === '1',
    marcarVista: (reservaId: string) => AsyncStorage.setItem(M.claveVista(reservaId), '1').catch(() => undefined),
  }
}
