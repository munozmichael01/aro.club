import type { crearApi } from '../sesion/api'
import type { Lead } from '../sesion/lead'
import type { PreguntaCatalogo, Zona } from '../entrada/preguntas'
import { sinRespuesta } from '../texto/cuestionario'
import type { DeServidor } from './maquina'

/**
 * Las llamadas del cuestionario. Dos identidades, y la cuenta manda (igual
 * que el servidor): sin lead se manda igual y la ruta mira la sesión.
 */
type Api = ReturnType<typeof crearApi>
export type Resultado<T> = { ok: true; datos: T } | { ok: false; error: string; status?: number }

async function intentar<T>(f: () => Promise<Response>, sinRed: string): Promise<Resultado<T>> {
  try {
    const r = await f()
    let j: any = null
    try {
      j = JSON.parse(await r.text())
    } catch {
      /* no era JSON */
    }
    if (r.ok && j) return { ok: true, datos: j as T }
    return { ok: false, error: j?.error || sinRed, status: r.status }
  } catch {
    return { ok: false, error: sinRed }
  }
}

export type CatalogoCompleto = {
  version: string
  preguntas: (PreguntaCatalogo & { layout?: string | null; obligatoria?: boolean; exclusiva?: string | null; autocomplete?: unknown; pantalla?: number })[]
}

export function crearServicioCuestionario(api: Api) {
  return {
    catalogo: () => intentar<CatalogoCompleto>(() => api.pedir('/questions'), sinRespuesta.cargar),
    zonas: () => intentar<{ zonas: Zona[] }>(() => api.pedir('/zonas'), sinRespuesta.cargar),

    cargar: (lead: Lead | null) =>
      intentar<DeServidor>(
        () => api.pedir('/cuestionario' + (lead ? `?correo=${encodeURIComponent(lead.correo)}&token=${encodeURIComponent(lead.token)}` : '')),
        sinRespuesta.cargar,
      ),

    /** Una respuesta. Devuelve lo que el servidor dice que falta: eso manda. */
    enviar: (lead: Lead | null, clave: string, valor: unknown, pantalla: number) =>
      intentar<{ completo?: boolean; faltan?: string[] }>(
        () =>
          api.pedir('/cuestionario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ correo: lead?.correo ?? null, token: lead?.token ?? null, clave, valor, pantalla }),
          }),
        sinRespuesta.guardar,
      ),
  }
}
