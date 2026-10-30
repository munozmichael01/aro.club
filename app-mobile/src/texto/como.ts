/**
 * «Cómo funciona» en tres tarjetas (entrega como-funciona de Design, 29-10).
 * Los textos viven en `reglas.js` (`AroReglas.COMO_FUNCIONA`, f0e8a7e), los
 * mismos que enseña la web: aquí solo se reexportan, sin copia propia. La
 * hora de la revelación entra como `cuando` y sale de la fecha.
 */
import { reglas } from '../reglas'

const C = reglas.COMO_FUNCIONA

export type Tipo = 'cena' | 'brunch' | 'grupo'

export const titulo = C.titulo
export const fila = C.fila
export const filaMesa = C.filaMesa
export const siguiente = C.siguiente
export const entendido = C.entendido
export const pie = C.pie
export const cuentaDe = C.cuentaDe
export const primeraVez = C.primeraVez
export const etiquetas = C.etiquetas
export const tarjetas = C.tarjetas
export const tipoDe = C.tipoDe
