import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/reembolso'
import type { Reembolso } from './maquina'

type Api = ReturnType<typeof crearApi>
export type Resultado<D> =
  | { ok: true; datos: D }
  | { ok: false; error: string; status?: number; motivo?: string; tasa?: number; montoBs?: number }

async function intentar<D>(f: () => Promise<Response>, porDefecto: string): Promise<Resultado<D>> {
  let r: Response
  try {
    r = await f()
  } catch (e) {
    if (e instanceof SinSesion) return { ok: false, error: e.message, status: 401 }
    return { ok: false, error: T.sinRespuesta }
  }
  let j: any = null
  try {
    j = JSON.parse(await r.text())
  } catch {
    /* no era JSON */
  }
  if (r.ok && j) return { ok: true, datos: j as D }
  return { ok: false, error: j?.error || porDefecto, status: r.status, motivo: j?.motivo, tasa: j?.tasa, montoBs: j?.montoBs }
}

/** El reembolso MUEVE dinero de verdad: contra producción solo con la cuenta del banco. */
export function crearServicioReembolso(api: Api) {
  return {
    leer: () => intentar<{ reembolso?: Reembolso }>(() => api.pedir('/mi-cuenta'), T.sinRespuesta),
    pedir: (cuerpo: object) =>
      intentar<{ estado: string; montoBs: number; tasa: number; hasta: string }>(
        () => api.pedir('/reembolso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }),
        T.noPudimos,
      ),
  }
}
