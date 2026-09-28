import { SinSesion, type crearApi } from '../sesion/api'
import * as T from '../texto/mesa'
import type { DeServidor, Valoracion } from './maquina'
import { cuerpoValorar } from './maquina'

/**
 * Las llamadas de Mi mesa. «Voy tarde» y lo de después MANDAN cosas a gente
 * real (un correo a los otros cinco, un bloqueo, un reporte que lee una
 * persona): contra producción solo se prueban con la cuenta del banco.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

async function intentar<T>(f: () => Promise<Response>, porDefecto: string, sinRed = T.sinRespuesta.cargar): Promise<Resultado<T>> {
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
  return { ok: false, error: j?.error || porDefecto, status: r.status }
}

const json = (cuerpo: object): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(cuerpo),
})

export function crearServicioMesa(api: Api) {
  const despues = (cuerpo: object, porDefecto: string) => intentar<{ ok?: boolean }>(() => api.pedir('/despues', json(cuerpo)), porDefecto, porDefecto)
  return {
    mesa: () => intentar<DeServidor>(() => api.pedir('/mi-mesa'), T.sinRespuesta.cargar),

    tarde: (minutos: number) =>
      intentar<{ avisado?: boolean; minutos?: number; repetido?: boolean }>(
        () => api.pedir('/mi-mesa/tarde', json({ minutos })),
        T.tarde.noPudimos,
        T.tarde.sinRed,
      ),

    /** Valorar y, si marcó a alguien, bloquear. El acuse solo cuando el servidor confirma las dos. */
    async valorar(mesaId: string, v: Valoracion): Promise<Resultado<true>> {
      const r = await despues(cuerpoValorar(mesaId, v), T.pasada.noGuardado)
      if (!r.ok) return r
      if (v.bloqueados.length) {
        const b = await despues({ accion: 'bloquear', mesaId, aQuien: v.bloqueados }, T.pasada.noGuardado)
        if (!b.ok) return b
      }
      return { ok: true, datos: true }
    },

    reportar: (mesaId: string, aQuien: string, motivo: string) =>
      despues({ accion: 'reportar', mesaId, aQuien, motivo }, T.reporte.noRegistrado),
  }
}
