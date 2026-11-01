import AsyncStorage from '@react-native-async-storage/async-storage'

import type { crearApi } from './api'

type Api = ReturnType<typeof crearApi>

/**
 * Lo que la persona trae de un enlace antes de tener cuenta: el código de
 * quien la invitó (`/i/<código>`) y la invitación de un +1 acompañante
 * (`/m/<token>`). En la web lo guarda una cookie; aquí, el teléfono.
 *
 * El código va en el alta (`/api/cuenta` y `/api/auth/nativo`, campo
 * `codigoReferido`) y el servidor solo lo apunta si el perfil se crea en esa
 * llamada. El token se acepta en cada entrada (`tokenMasUno`) y, con sesión,
 * con `POST /api/mas-uno { accion: 'aceptar' }`. Mandarlos dos veces no repite
 * nada (contrato del agente, 26485ff).
 */

const CODIGO = 'aro.traido.codigo'
const TOKEN = 'aro.traido.masUno'

/** `/i/ANDREA7KQ` → código; `/m/<22 caracteres>` → token. Null si no es ninguno. */
export function deEnlace(ruta: string): { codigo: string } | { token: string } | null {
  const i = /^\/i\/([A-Za-z0-9_-]{1,40})\/?$/.exec(ruta)
  if (i) return { codigo: i[1] }
  const m = /^\/m\/([A-Za-z0-9_-]{10,64})\/?$/.exec(ruta)
  if (m) return { token: m[1] }
  return null
}

export function guardar(t: { codigo: string } | { token: string }) {
  return 'codigo' in t ? AsyncStorage.setItem(CODIGO, t.codigo) : AsyncStorage.setItem(TOKEN, t.token)
}

/** Los campos para el alta. Vacío si no trae nada. */
export async function paraElAlta(): Promise<{ codigoReferido?: string; tokenMasUno?: string }> {
  const [codigo, token] = await Promise.all([AsyncStorage.getItem(CODIGO).catch(() => null), AsyncStorage.getItem(TOKEN).catch(() => null)])
  return { ...(codigo ? { codigoReferido: codigo } : {}), ...(token ? { tokenMasUno: token } : {}) }
}

/** Tras un alta que respondió bien: el código ya cumplió (solo vale al crear el perfil). */
export const olvidarCodigo = () => AsyncStorage.removeItem(CODIGO).catch(() => undefined)

/**
 * Con sesión: acepta la invitación guardada, si hay. Se olvida cuando el
 * servidor dice algo definitivo (aceptada, confirmada, o un 409/404 que no va
 * a cambiar); con un fallo de red se queda para la próxima.
 */
export async function aceptarMasUno(api: Api): Promise<string | null> {
  const token = await AsyncStorage.getItem(TOKEN).catch(() => null)
  if (!token) return null
  try {
    const r = await api.pedir('/mas-uno', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'aceptar', token }) })
    if (r.status >= 500 || r.status === 401) return null
    const j = await r.json().catch(() => null)
    await AsyncStorage.removeItem(TOKEN).catch(() => undefined)
    return (j?.estado as string | undefined) ?? null
  } catch {
    return null
  }
}
