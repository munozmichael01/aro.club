import { reglas } from '../reglas'
/**
 * Lo del +1 que no está en `reglas.MAS_UNO` (casilla C, solo del celular):
 * la carga de la invitación (entrega carga, 03-11). «No pudimos cargar tu
 * invitación.»; el resto lo pone `reglas.CARGA`.
 */
export const carga = {
  que: reglas.CARGA.texto.que.masUno,
  cargando: 'Cargando tu invitación',
}
