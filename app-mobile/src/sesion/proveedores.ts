import Constants from 'expo-constants'
import * as Crypto from 'expo-crypto'
import { Platform } from 'react-native'

import { supabase } from '.'

/**
 * Entrar con Apple o con Google, de forma nativa: el SDK del proveedor da un
 * ID token y `signInWithIdToken` abre la sesión de Supabase sin pasar por la
 * web (PROPUESTA §g). La app no guarda ni manda tokens de Google o Apple a
 * nuestra API: después de esto va `terminarEntrada` (`nativo.ts`), con la
 * cookie de siempre.
 *
 * `no-disponible` es honesto, no un error: en Expo Go no hay módulo nativo de
 * Google, sin los *client ID* no hay nada que configurar, y en Android no hay
 * Apple nativo. La pantalla lo dice y ofrece el correo.
 */

export type Proveedor = 'apple' | 'google'
export type ResultadoProveedor = { ok: true } | { ok: false; motivo: 'cancelado' | 'no-disponible' | 'fallo'; error?: string }

/**
 * En Expo Go los tokens salen a nombre de Expo Go y no de `club.aro.app`, y
 * Supabase los rechaza: ahí los dos botones dicen que aún no funcionan, en
 * vez de abrir la hoja de Apple para fallar después.
 */
const enExpoGo = Constants.executionEnvironment === 'storeClient'

const extra = Constants.expoConfig?.extra as { google?: { webClientId?: string; iosClientId?: string } }

/** ¿Se enseña el botón? Apple solo en iOS (en Android no hay inicio nativo); Google en los dos. */
export const disponible = (p: Proveedor) => (p === 'apple' ? Platform.OS === 'ios' : true)

export async function entrarCon(p: Proveedor): Promise<ResultadoProveedor> {
  if (enExpoGo) return { ok: false, motivo: 'no-disponible' }
  try {
    return p === 'apple' ? await conApple() : await conGoogle()
  } catch (e) {
    if (__DEV__) console.warn(`[entrar con ${p}]`, String(e))
    return { ok: false, motivo: 'fallo', error: String((e as Error)?.message ?? e) }
  }
}

async function conApple(): Promise<ResultadoProveedor> {
  if (Platform.OS !== 'ios') return { ok: false, motivo: 'no-disponible' }
  const AA = await import('expo-apple-authentication')
  if (!(await AA.isAvailableAsync())) return { ok: false, motivo: 'no-disponible' }
  // El nonce: a Apple va su SHA-256, a Supabase el original, y Supabase
  // comprueba que casan. Sin esto un token robado se podría reutilizar.
  const bruto = Crypto.randomUUID()
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, bruto)
  let c
  try {
    c = await AA.signInAsync({ requestedScopes: [AA.AppleAuthenticationScope.FULL_NAME, AA.AppleAuthenticationScope.EMAIL], nonce: hash })
  } catch (e) {
    if ((e as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return { ok: false, motivo: 'cancelado' }
    throw e
  }
  if (!c.identityToken) return { ok: false, motivo: 'fallo' }
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: c.identityToken, nonce: bruto })
  if (error) return { ok: false, motivo: 'fallo', error: error.message }
  // Apple da el nombre SOLO la primera vez y no va dentro del token: se
  // guarda en los metadatos del usuario para que `trasEntrar()` lo encuentre.
  const nombre = [c.fullName?.givenName, c.fullName?.familyName].filter(Boolean).join(' ')
  if (nombre) await supabase.auth.updateUser({ data: { full_name: nombre, name: nombre } }).catch(() => {})
  return { ok: true }
}

async function conGoogle(): Promise<ResultadoProveedor> {
  const ids = extra?.google
  if (!ids?.webClientId) return { ok: false, motivo: 'no-disponible' }
  // Se carga aquí y no arriba: en Expo Go el módulo nativo no existe y
  // importarlo al principio tumbaría la app entera, no solo este botón.
  let mod: typeof import('@react-native-google-signin/google-signin')
  try {
    mod = require('@react-native-google-signin/google-signin')
  } catch {
    return { ok: false, motivo: 'no-disponible' }
  }
  const { GoogleSignin, isSuccessResponse } = mod
  GoogleSignin.configure({ webClientId: ids.webClientId, iosClientId: ids.iosClientId || undefined })
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
  const r = await GoogleSignin.signIn()
  if (!isSuccessResponse(r)) return { ok: false, motivo: 'cancelado' }
  if (!r.data.idToken) return { ok: false, motivo: 'fallo' }
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: r.data.idToken })
  if (error) return { ok: false, motivo: 'fallo', error: error.message }
  return { ok: true }
}
