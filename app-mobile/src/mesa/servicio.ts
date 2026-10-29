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
  const despues = (cuerpo: object, porDefecto: string) =>
    intentar<{ ok?: boolean; estado?: string; sitioNoGuardado?: { motivo?: string; texto?: string } | null }>(
      () => api.pedir('/despues', json(cuerpo)),
      porDefecto,
      porDefecto,
    )
  return {
    mesa: () => intentar<DeServidor>(() => api.pedir('/mi-mesa'), T.sinRespuesta.cargar),

    tarde: (minutos: number) =>
      intentar<{ avisado?: boolean; minutos?: number; repetido?: boolean }>(
        () => api.pedir('/mi-mesa/tarde', json({ minutos })),
        T.tarde.noPudimos,
        T.tarde.sinRed,
      ),

    /**
     * Valorar y, si marcó a alguien, bloquear. El acuse solo cuando el
     * servidor confirma las dos. Si el veto del sitio no cupo (ya tiene dos),
     * la valoración SÍ se guardó: vuelve el texto para enseñarlo dentro del
     * acuse, no como error (15a918c).
     */
    async valorar(mesaId: string, v: Valoracion): Promise<Resultado<{ avisoSitio: string | null }>> {
      const r = await despues(cuerpoValorar(mesaId, v), T.pasada.noGuardado)
      if (!r.ok) return r
      const avisoSitio = r.datos.sitioNoGuardado?.texto || null
      if (v.bloqueados.length) {
        const b = await despues({ accion: 'bloquear', mesaId, aQuien: v.bloqueados }, T.pasada.noGuardado)
        if (!b.ok) return b
      }
      // ¿Faltó alguien? y el contacto (e4fb1c6): las dos REEMPLAZAN la lista.
      // «Vinimos todos» es `[]` y se manda; sin contestar, no se manda nada.
      if (v.falto !== null) {
        const f = await despues({ accion: 'falto', mesaId, aQuien: v.falto }, T.pasada.noGuardado)
        if (!f.ok) return f
      }
      if (v.contacto.length) {
        const c = await despues({ accion: 'contacto', mesaId, aQuien: v.contacto }, T.pasada.noGuardado)
        if (!c.ok) return c
      }
      return { ok: true, datos: { avisoSitio } }
    },

    /** Sí, no, o `null` para volver a «no he contestado». Se puede cambiar siempre. */
    grabacion: (eventoId: string, permite: boolean | null) =>
      intentar<{ estado?: string; permite?: boolean | null }>(
        () => api.pedir('/grabacion', json({ eventoId, permite })),
        T.grabacion.noGuardado,
        T.grabacion.noGuardado,
      ),

    /** «Ahora no»: deja constancia de que la saltó, y no vuelve a salir (8dc6b47). */
    saltar: (mesaId: string) => despues({ accion: 'saltar', mesaId }, T.pasada.noGuardado),

    reportar: (mesaId: string, aQuien: string, motivo: string) =>
      despues({ accion: 'reportar', mesaId, aQuien, motivo }, T.reporte.noRegistrado),
  }
}
