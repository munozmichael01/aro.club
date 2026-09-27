import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'
import Constants from 'expo-constants'
import { AppState, Platform } from 'react-native'

import { almacenSeguro, vaciarSiEsInstalacionNueva } from './almacen'
import { crearApi, type Sesion } from './api'

/**
 * La sesión de la app. El SDK de Supabase es su único dueño: la abre (con
 * contraseña, o con Google y Apple nativos), la guarda en el llavero, la
 * refresca y la cierra. Las rutas de `aro.club/api` la reciben como cookie
 * (ver `cookie.ts`), sin el refresh token.
 */

const extra = Constants.expoConfig?.extra as { api: string; supabaseUrl: string }
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!ANON) throw new Error('Falta EXPO_PUBLIC_SUPABASE_ANON_KEY (ver App/.env.example).')

const CLAVE_SESION = 'aro.sesion'

export const supabase = createClient(extra.supabaseUrl, ANON, {
  auth: {
    storage: almacenSeguro,
    storageKey: CLAVE_SESION,
    autoRefreshToken: true,
    persistSession: true,
    // En el celular no hay URL de vuelta que leer: los proveedores dan un
    // ID token y se entra con `signInWithIdToken`.
    detectSessionInUrl: false,
  },
})

/**
 * El refresco automático del SDK corre con un temporizador, y en segundo
 * plano el sistema lo congela. Se enciende al volver y se apaga al salir, que
 * es lo que pide Supabase para React Native.
 */
AppState.addEventListener('change', (estado) => {
  if (estado === 'active') supabase.auth.startAutoRefresh()
  else supabase.auth.stopAutoRefresh()
})

/** Antes de enseñar nada: deshace la sesión que iOS deja tras reinstalar. */
export const listo = vaciarSiEsInstalacionNueva([CLAVE_SESION])

const version = `${Platform.OS}/${Constants.expoConfig?.version ?? '0'}`

export const api = crearApi({
  base: extra.api,
  urlSupabase: extra.supabaseUrl,
  version,
  async obtenerSesion() {
    await listo
    const { data } = await supabase.auth.getSession()
    return (data.session as Sesion | null) ?? null
  },
  async refrescar() {
    const { data, error } = await supabase.auth.refreshSession()
    return error ? null : ((data.session as Sesion | null) ?? null)
  },
})
