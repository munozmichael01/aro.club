import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

/**
 * Dónde vive la sesión: en el llavero del sistema, entera.
 *
 * La sesión de Supabase lleva el refresh token, que es la llave de la
 * cuenta. Va al llavero (Keychain / Keystore), no a un almacén en claro.
 *
 * Dos detalles del llavero que deciden cómo se escribe:
 *
 *  - **Tamaño.** Algunas versiones de iOS rechazan valores de más de ~2 KB,
 *    y una sesión con el usuario dentro los pasa. Se parte en trozos y se
 *    apunta cuántos hay.
 *  - **`AFTER_FIRST_UNLOCK`.** Con el valor por defecto (`WHEN_UNLOCKED`),
 *    una tarea de fondo con el teléfono bloqueado no puede leer la sesión, y
 *    los avisos se reprograman justo ahí. Tras el primer desbloqueo desde el
 *    arranque, sí. Es lo que pide el criterio 9.4: que la sesión sobreviva a
 *    reiniciar el teléfono.
 *
 * Y uno de iOS que hay que deshacer: el llavero **sobrevive a desinstalar**
 * la app. Quien la borra y la vuelve a instalar —a menudo para empezar de
 * cero, o porque el teléfono pasó a otra persona— no debería aparecer
 * dentro de la cuenta anterior. La primera vez que arranca una instalación,
 * se vacía. La marca va en AsyncStorage precisamente porque ese SÍ se borra
 * al desinstalar.
 */

const TROZO = 1800
const OPCIONES: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
}
const MARCA_INSTALACION = 'aro.instalacion'

/** Las claves del llavero solo aceptan `[A-Za-z0-9._-]`. */
const limpia = (k: string) => k.replace(/[^A-Za-z0-9._-]/g, '_')

async function borrarTrozos(k: string) {
  const n = Number((await SecureStore.getItemAsync(`${k}.n`, OPCIONES)) ?? 0)
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${k}.${i}`, OPCIONES)
  await SecureStore.deleteItemAsync(`${k}.n`, OPCIONES)
}

const llavero = {
  async getItem(clave: string): Promise<string | null> {
    const k = limpia(clave)
    const n = Number((await SecureStore.getItemAsync(`${k}.n`, OPCIONES)) ?? 0)
    if (!n) return null
    let valor = ''
    for (let i = 0; i < n; i++) {
      const trozo = await SecureStore.getItemAsync(`${k}.${i}`, OPCIONES)
      // Un trozo perdido es una sesión corrupta: mejor ninguna que media.
      if (trozo == null) return null
      valor += trozo
    }
    return valor
  },

  async setItem(clave: string, valor: string): Promise<void> {
    const k = limpia(clave)
    await borrarTrozos(k)
    const n = Math.ceil(valor.length / TROZO)
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${k}.${i}`, valor.slice(i * TROZO, (i + 1) * TROZO), OPCIONES)
    }
    // El contador al final: si algo falla a medias, no queda apuntando a
    // trozos que no existen.
    await SecureStore.setItemAsync(`${k}.n`, String(n), OPCIONES)
  },

  async removeItem(clave: string): Promise<void> {
    await borrarTrozos(limpia(clave))
  },
}

/**
 * En el navegador no hay llavero. La app nunca corre ahí: solo el catálogo
 * de desarrollo, que se abre en el navegador mientras no hay simulador. Para
 * él, AsyncStorage (que en web es el almacén del navegador). Nunca en un
 * celular.
 */
export const almacenSeguro = Platform.OS === 'web' ? AsyncStorage : llavero

/** Llamar una vez al arrancar, antes de leer la sesión. */
export async function vaciarSiEsInstalacionNueva(claves: string[]): Promise<void> {
  if (await AsyncStorage.getItem(MARCA_INSTALACION)) return
  for (const c of claves) await almacenSeguro.removeItem(c)
  await AsyncStorage.setItem(MARCA_INSTALACION, new Date().toISOString())
}
