import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/cuenta'
import type { MiCuenta, MiMesa } from './maquina'

/**
 * Las llamadas del Inicio. Todas con la sesión de cuenta. Recibe la `api`
 * para que la prueba contra el servidor use este mismo código.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

async function intentar<T>(f: () => Promise<Response>, porDefecto: string): Promise<Resultado<T>> {
  let r: Response
  try {
    r = await f()
  } catch (e) {
    // La sesión caducó y no se pudo refrescar: es un 401, no la conexión.
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: T.sinRespuesta.cargar }
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

export function crearServicioCuenta(api: Api) {
  return {
    cuenta: () => intentar<MiCuenta>(() => api.pedir('/mi-cuenta'), T.sinRespuesta.cargar),
    /** La mesa, de la MISMA fuente que Mi mesa: dos sitios calculando «cuál es mi mesa» acaban discrepando. */
    mesa: () => intentar<MiMesa>(() => api.pedir('/mi-mesa'), T.sinRespuesta.cargar),
    exclusiones: () => intentar<{ exclusiones: unknown[] }>(() => api.pedir('/mis-exclusiones'), T.sinRespuesta.cargar),
    reservar: (eventoId: string) =>
      intentar<{ ok?: boolean }>(
        () =>
          api.pedir('/reservar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventoId }),
          }),
        T.agenda.noPudimos,
      ),
  }
}
