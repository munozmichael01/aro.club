import type { crearApi } from '../sesion/api'

/**
 * El token del teléfono, al servidor. Contrato propuesto al agente de la web
 * (02-10-2026), con la sesión de cuenta:
 *
 *   POST   /api/push/token  { token, plataforma: 'ios' | 'android', version }  → 200
 *   DELETE /api/push/token  { token }                                          → 200
 *
 * Mientras la ruta no exista responde 404, y eso NO es un fallo para quien
 * usa la app: no se le enseña nada. Las push son un extra del correo, que
 * sigue llegando igual.
 */
type Api = ReturnType<typeof crearApi>

export type Plataforma = 'ios' | 'android'

export function crearServicioPush(api: Api) {
  async function llamar(method: 'POST' | 'DELETE', cuerpo: object): Promise<boolean> {
    try {
      const r = await api.pedir('/push/token', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      })
      return r.ok
    } catch {
      // Sin red o sin sesión: se reintenta en el próximo arranque.
      return false
    }
  }
  return {
    registrar: (token: string, plataforma: Plataforma, version: string) => llamar('POST', { token, plataforma, version }),
    olvidar: (token: string) => llamar('DELETE', { token }),
  }
}
