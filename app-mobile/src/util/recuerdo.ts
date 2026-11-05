import AsyncStorage from '@react-native-async-storage/async-storage'

import { supabase } from '../sesion'

/**
 * Lo último que el servidor contestó, para pintar al instante al abrir la
 * app (Michael, 03-11: «vuelve a cargar y tarda»). La pantalla enseña el
 * recuerdo mientras pide lo nuevo por detrás, y lo nuevo lo sustituye al
 * llegar. El esqueleto queda para la primera vez o sin red.
 *
 * Va POR PERSONA (el id de la sesión): quien cierra sesión y entra con otra
 * cuenta nunca ve la de antes, y `olvidarRecuerdos` los borra al salir. Un
 * recuerdo viejo no se enseña: una mesa cambia a una hora y de un día para
 * otro ya no dice la verdad.
 */
const PREFIJO = 'aro.recuerdo.'
const EDAD_MAXIMA = 12 * 3600 * 1000

async function quien(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession()
    return data.session?.user.id ?? null
  } catch {
    return null
  }
}

export async function recordar(clave: string, datos: unknown): Promise<void> {
  const u = await quien()
  if (!u) return
  await AsyncStorage.setItem(`${PREFIJO}${u}.${clave}`, JSON.stringify({ t: Date.now(), datos })).catch(() => undefined)
}

export async function recuerdo<T>(clave: string): Promise<T | null> {
  return (await recuerdoConHora<T>(clave))?.datos ?? null
}

/** El recuerdo con la hora en que llegó: la franja «Esto es de las 3:40 p.m.» dice la de los datos, no la de ahora. */
export async function recuerdoConHora<T>(clave: string): Promise<{ t: number; datos: T } | null> {
  const u = await quien()
  if (!u) return null
  try {
    const crudo = await AsyncStorage.getItem(`${PREFIJO}${u}.${clave}`)
    if (!crudo) return null
    const x = JSON.parse(crudo) as { t: number; datos: T }
    return Date.now() - x.t > EDAD_MAXIMA ? null : x
  } catch {
    return null
  }
}

/** Al cerrar sesión o dar de baja la cuenta: no queda nada de nadie en el teléfono. */
export async function olvidarRecuerdos(): Promise<void> {
  try {
    const claves = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PREFIJO))
    if (claves.length) await AsyncStorage.multiRemove(claves)
  } catch {
    /* sin almacén: nada que borrar */
  }
}
