import 'server-only'

/**
 * Cuánto se tarda andando de un sitio a otro.
 *
 * Michael, 16-10: «¿tú no puedes calcular las distancias al mostrarlas?
 * Porque esto es dinámico, depende del restaurante». Tiene razón: el bar de
 * después es el mismo, pero la cena cambia de sitio cada semana, así que un
 * número tecleado a mano es un número por cada par —y uno más cada vez que
 * se abre un restaurante nuevo—. Las coordenadas las tenemos: las trae
 * Google al dar de alta el local.
 *
 * ## Lo que esto NO es
 *
 * No es la ruta de Google. Es la distancia en línea recta corregida: las
 * calles no van en diagonal, así que se multiplica por 1,25 —lo habitual en
 * una trama urbana— y se divide por 80 metros por minuto, que es el paso de
 * alguien que acaba de cenar, no el de quien va a tomar el metro.
 *
 * Preguntarle a Google la ruta real daría el minuto exacto y cuesta una
 * llamada por mesa y por sitio cada vez que alguien abre la pantalla, en un
 * producto distinto del que ya pagamos. Para «¿nos movemos o no?» a las diez
 * de la noche, dos minutos de margen no cambian la decisión.
 *
 * Y por eso lo tecleado a mano MANDA: si alguien sabe que entre esos dos
 * sitios hay un puente que hay que rodear, su número es mejor que este.
 */

const FACTOR_CALLE = 1.25
const METROS_POR_MINUTO = 80
const RADIO_TIERRA = 6371000

export type Punto = { lat: number | null; lng: number | null }

/** Metros en línea recta entre dos puntos. `null` si falta alguna coordenada. */
export function metrosEntre(a: Punto | null | undefined, b: Punto | null | undefined): number | null {
  if (a?.lat == null || a?.lng == null || b?.lat == null || b?.lng == null) return null

  const rad = (g: number) => (g * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2

  return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Minutos andando, redondeados hacia arriba y con uno de suelo.
 *
 * Cero minutos no se puede enseñar —«0 min a pie» se lee como un error— y
 * dos sitios en la misma cuadra son un minuto.
 *
 * Por encima de media hora devuelve `null`: a esa distancia ya no es «un
 * sitio cerca» y decirlo en la despedida sería mandar a seis personas a
 * cruzar Caracas. Si alguien quiere ofrecerlo igual, pone el número a mano.
 */
export function minutosAPie(a: Punto | null | undefined, b: Punto | null | undefined): number | null {
  const metros = metrosEntre(a, b)
  if (metros == null) return null
  const minutos = Math.ceil((metros * FACTOR_CALLE) / METROS_POR_MINUTO)
  if (minutos > 30) return null
  return Math.max(1, minutos)
}
