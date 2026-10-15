import AsyncStorage from '@react-native-async-storage/async-storage'

import { CLAVE, guardadoVacio, leer, type Guardado } from './maquina'

/**
 * El avance del juego, por mesa, en este teléfono (entrega 20). No se
 * sincroniza: lo lleva una sola persona. Un fallo del almacenamiento no
 * rompe nada: se juega igual, solo que no se recuerda.
 */
export async function cargar(mesa: string): Promise<Guardado> {
  const crudo = await AsyncStorage.getItem(CLAVE(mesa)).catch(() => null)
  return crudo ? leer(crudo) : guardadoVacio()
}

export function guardar(mesa: string, g: Guardado) {
  AsyncStorage.setItem(CLAVE(mesa), JSON.stringify(g)).catch(() => {})
}

export function borrar(mesa: string) {
  return AsyncStorage.removeItem(CLAVE(mesa)).catch(() => {})
}

/**
 * «Volver al paso a paso» (fin de la ronda 1): Mi mesa sigue montada debajo
 * del juego, así que se le deja dicho que abra el paso a paso al volver.
 */
let pedidoPaso = false
export const pedirPasoAPaso = () => {
  pedidoPaso = true
}
export function tomarPedidoPaso(): boolean {
  const p = pedidoPaso
  pedidoPaso = false
  return p
}
