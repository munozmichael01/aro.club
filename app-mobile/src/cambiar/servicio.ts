import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/cambiar'
import type { Bloque } from './maquina'

/** Las llamadas de Cambiar de fecha. Cambiar MANDA un correo de verdad: contra producción, solo con la cuenta del banco. */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number; motivo?: string }

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
  return { ok: false, error: j?.error || porDefecto, status: r.status, motivo: j?.motivo }
}

/** Lo que pinta la pantalla: la fecha de ahora y el bloque, con el id de la reserva ya resuelto. */
export type Datos = { bloque: Bloque; reservaId: string; empiezaEn: string | null; zonaHoraria: string | null; formato: string | null; zonas: string[] }

export function crearServicioCambiar(api: Api) {
  return {
    leer: async (): Promise<Resultado<Datos>> => {
      const m = await intentar<any>(() => api.pedir('/mi-mesa'), T.sinRespuesta.cargar)
      if (!m.ok) return m
      const bloque: Bloque = m.datos.cambiarFecha ?? { puede: false, motivo: 'sin-destinos', destinos: [] }
      const reservaId = bloque.reservaId ?? ''
      return {
        ok: true,
        datos: { bloque, reservaId, empiezaEn: m.datos.empiezaEn ?? null, zonaHoraria: m.datos.zonaHoraria ?? null, formato: m.datos.formato ?? null, zonas: m.datos.zonas ?? [] },
      }
    },
    cambiar: (reservaId: string, aEventoId: string) =>
      intentar<{ estado: string; aEventoId: string; cambioDeDia?: boolean }>(
        () =>
          api.pedir('/mi-mesa/cambiar-fecha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reservaId, aEventoId }),
          }),
        T.sinRespuesta.cambiar,
      ),
  }
}
