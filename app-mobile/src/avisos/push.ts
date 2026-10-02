import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { api } from '../sesion'
import { color } from '../diseno/tokens'
import { debePreguntar, destinoDe, hayQueMandar, type DatosPush, type Momento, type Permiso } from './maquina'
import { crearServicioPush } from './servicio'

/**
 * Las push del lado nativo: el permiso, el token y el canal de Android.
 *
 * **El permiso se pide al reservar, no al abrir la app** (nota de Design en
 * la Bienvenida, NOTIFICACIONES.md): en frío es un «no» casi seguro, y en
 * iOS ese «no» no se puede volver a preguntar. Al apartar un puesto la
 * persona ya tiene algo que esperar —su mesa—, y es justo lo que avisamos.
 *
 * En Expo Go no hay push remotas: todo esto no hace nada allí.
 */
const servicio = crearServicioPush(api)
const CLAVE = 'aro.push.ultimo'
const enExpoGo = Constants.executionEnvironment === 'storeClient'

const nativo = Platform.OS === 'ios' || Platform.OS === 'android'

// En primer plano también se enseñan: la revelación con la app abierta tiene
// que verse igual. Solo en el teléfono: el catálogo corre en el navegador.
if (nativo)
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }),
  })

/**
 * Las push ya atendidas. Al abrir la app desde una push la ve el arranque
 * (`destinoAlAbrir`) y, según la plataforma, también el oyente: sin esto se
 * abriría la pantalla dos veces.
 */
const atendidas = new Set<string>()

function atender(r: Notifications.NotificationResponse | null): string | null {
  if (!r) return null
  const id = `${r.notification.request.identifier}@${r.notification.date}`
  if (atendidas.has(id)) return null
  atendidas.add(id)
  Notifications.clearLastNotificationResponse()
  return destinoDe(r.notification.request.content.data as DatosPush)
}

/** Si la app se abrió tocando una push: a qué pantalla va. Lo pregunta el arranque, con sesión. */
export function destinoAlAbrir(): string | null {
  if (!nativo || enExpoGo) return null
  try {
    return atender(Notifications.getLastNotificationResponse())
  } catch {
    return null
  }
}

/** Con la app ya abierta (o en segundo plano): tocar una push lleva a su pantalla. */
export function escucharToques(ir: (ruta: string) => void): { remove: () => void } | null {
  if (!nativo || enExpoGo) return null
  return Notifications.addNotificationResponseReceivedListener((r) => {
    const destino = atender(r)
    if (destino) ir(destino)
  })
}

async function canal() {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('aro', {
    name: 'Aro Club',
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: color.terracota,
  })
}

async function tokenDelTelefono(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) return null
  try {
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data
  } catch (e) {
    // Sin credenciales de FCM/APNs en EAS, o sin red: no es cosa de quien usa la app.
    if (__DEV__) console.warn('[push] sin token', String(e))
    return null
  }
}

async function mandar(token: string) {
  let ultimo: { token: string; en: number } | null = null
  try {
    ultimo = JSON.parse((await AsyncStorage.getItem(CLAVE)) ?? 'null')
  } catch {
    /* nada guardado */
  }
  if (!hayQueMandar(ultimo, token, Date.now())) return
  const plataforma = Platform.OS === 'ios' ? 'ios' : 'android'
  const ok = await servicio.registrar(token, plataforma, Constants.expoConfig?.version ?? '')
  if (ok) await AsyncStorage.setItem(CLAVE, JSON.stringify({ token, en: Date.now() })).catch(() => {})
}

/** Al reservar o reportar un pago: pide el permiso si aún no se preguntó, y registra el teléfono. */
export async function pedirAvisos(): Promise<void> {
  if (enExpoGo || !nativo) return
  try {
    await canal()
    let { status, canAskAgain } = await Notifications.getPermissionsAsync()
    if (status !== 'granted' && canAskAgain) status = (await Notifications.requestPermissionsAsync()).status
    if (status !== 'granted') return
    const token = await tokenDelTelefono()
    if (token) await mandar(token)
  } catch (e) {
    if (__DEV__) console.warn('[push] pedirAvisos', String(e))
  }
}

/** Al arrancar con sesión: si ya dio permiso, se refresca el token (cambia sin avisar). Nunca pregunta. */
export async function refrescarAvisos(): Promise<void> {
  if (enExpoGo || !nativo) return
  try {
    const { status } = await Notifications.getPermissionsAsync()
    if (status !== 'granted') return
    await canal()
    const token = await tokenDelTelefono()
    if (token) await mandar(token)
  } catch {
    /* se intenta en el próximo arranque */
  }
}

/** Al cerrar sesión: este teléfono deja de recibir las push de esta cuenta. Antes de `signOut`, que pide la sesión. */
export async function olvidarAvisos(): Promise<void> {
  if (enExpoGo || !nativo) return
  try {
    const ultimo = JSON.parse((await AsyncStorage.getItem(CLAVE)) ?? 'null') as { token: string } | null
    if (ultimo?.token) await servicio.olvidar(ultimo.token)
    await AsyncStorage.removeItem(CLAVE)
  } catch {
    /* si falla, el servidor lo limpia cuando Expo diga que el token ya no vale */
  }
}

// --- La pregunta previa ------------------------------------------------------

const CLAVE_VISTOS = 'aro.push.preguntado'

async function permisoActual(): Promise<Permiso> {
  if (enExpoGo || !nativo) return { estado: 'denied', puedePreguntar: false }
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync()
    return { estado: status as Permiso['estado'], puedePreguntar: canAskAgain }
  } catch {
    return { estado: 'denied', puedePreguntar: false }
  }
}

/**
 * ¿Sale la pregunta en este momento? Si sale, se apunta como vista. Si el
 * permiso ya está dado (Android antiguo lo da solo), se registra el teléfono
 * en silencio: la sesión puede ser nueva y el arranque no lo hizo.
 */
export async function tocaPreguntar(momento: Momento): Promise<boolean> {
  const permiso = await permisoActual()
  if (permiso.estado === 'granted') {
    refrescarAvisos()
    return false
  }
  let vistos: Momento[] = []
  try {
    vistos = JSON.parse((await AsyncStorage.getItem(CLAVE_VISTOS)) ?? '[]')
  } catch {
    /* nada guardado */
  }
  if (!debePreguntar(permiso, vistos, momento)) return false
  await AsyncStorage.setItem(CLAVE_VISTOS, JSON.stringify([...vistos, momento])).catch(() => {})
  return true
}
