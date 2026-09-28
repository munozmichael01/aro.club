import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/perfil'
import type { Aviso, DeServidor, Valor } from './maquina'

/**
 * Las llamadas de Perfil. La baja BORRA la cuenta: contra producción solo
 * con la cuenta del banco, nunca con otra.
 */
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

const con = (method: string, cuerpo: object): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

export type Exclusion = { id: string; nombre: string; porQue: string; sePuedeQuitar: boolean }

export function crearServicioPerfil(api: Api) {
  return {
    perfil: () => intentar<DeServidor>(() => api.pedir('/mi-perfil'), T.sinRespuesta.cargar),
    guardar: (clave: string, valor: Valor) => intentar<{ ok?: boolean }>(() => api.pedir('/mi-perfil', con('POST', { clave, valor })), T.campo.noGuardado),
    avisos: () => intentar<{ avisos: Aviso[]; whatsappDesde: string | null }>(() => api.pedir('/mis-avisos'), T.avisos.noGuardado),
    aviso: (clave: string, valor: boolean) => intentar<{ estado: string }>(() => api.pedir('/mis-avisos', con('POST', { [clave]: valor })), T.avisos.noGuardado),
    exclusiones: () => intentar<{ exclusiones: Exclusion[] }>(() => api.pedir('/mis-exclusiones'), T.sinRespuesta.cargar),
    quitarExclusion: (aQuien: string) => intentar<{ ok?: boolean }>(() => api.pedir('/mis-exclusiones', con('DELETE', { aQuien })), T.exclusiones.noQuitado),
    baja: () => intentar<{ estado: string }>(() => api.pedir('/baja', con('POST', { confirmacion: 'BAJA' })), T.baja.noPudimos),
  }
}
