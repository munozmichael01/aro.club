import 'server-only'

/**
 * El enlace de «Cómo llegar», en un solo sitio.
 *
 * Lo construían dos: `correos-datos` para el correo de la mesa y
 * `Mi mesa.dc.html` en el navegador, cada uno a su manera. Ninguno metía la
 * ciudad, así que el respaldo era una búsqueda de «Cardenal Calle Madrid con
 * avenida Principal, Las Mercedes» sin decir en qué país. Michael lo pulsó
 * camino de la cena y Maps no dio con el sitio.
 *
 * Ahora lo arma el servidor y la pantalla solo lo pinta: un botón que lleva a
 * una dirección no puede depender de en qué pantalla estás.
 *
 * ## El respaldo es un respaldo, no una solución
 *
 * Con `maps_url` puesto se devuelve ese, que es un enlace a una FICHA de
 * Maps: lleva al sitio exacto, con su nombre, sus reseñas y su botón de
 * navegar. Sin él lo mejor que se puede hacer es una búsqueda, y una búsqueda
 * acierta o no acierta.
 *
 * Por eso lo de verdad no es esta función: es que un local no llegue a una
 * mesa sin su enlace. El panel ya lo pide y lo avisa.
 *
 * ## Por qué esta forma de URL
 *
 * `https://www.google.com/maps/search/?api=1&query=` es la forma documentada
 * y estable, la que las apps de iOS y Android reconocen y abren en la app en
 * vez de en el navegador. La anterior era `maps.google.com/?q=`, que es la
 * heredada: sigue funcionando por redirección, y en móvil se comporta peor.
 */

type Sitio = {
  name?: string | null
  address?: string | null
  maps_url?: string | null
  place_id?: string | null
  lat?: number | string | null
  lng?: number | string | null
}

/** Caracas, mientras sea la única ciudad abierta. */
const CIUDAD = 'Caracas, Venezuela'

export function enlaceDeMapa(sitio: Sitio | null | undefined): string | null {
  if (!sitio) return null

  /**
   * Primero, la forma universal CON coordenadas. Y es por abrir la app.
   *
   * Michael, 17-10: «la app me abre maps de Android y no Google Maps, quiero
   * Google Maps sobre el mapa default del teléfono». El enlace que daba
   * Places —`maps.google.com/?cid=…`— lleva a la ficha buena, pero es un
   * dominio que el teléfono puede resolver como quiera: abre el navegador, o
   * el mapa que tenga por defecto, o pregunta.
   *
   * `google.com/maps/search/?api=1` es la forma que Google documenta para
   * esto: con la app instalada la abre, y sin ella cae al navegador. Con
   * `query_place_id` además aterriza en la FICHA del sitio y no en un pin:
   * mismo destino que el enlace viejo, pero en la app.
   */
  const lat = Number(sitio.lat)
  const lng = Number(sitio.lng)
  if (sitio.lat != null && sitio.lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    const id = sitio.place_id?.trim()
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      + (id ? `&query_place_id=${encodeURIComponent(id)}` : '')
  }

  // Sin coordenadas, la ficha que guardamos. Lleva al sitio exacto aunque
  // decida el teléfono con qué abrirla.
  const ficha = sitio.maps_url?.trim()
  if (ficha) return ficha

  // Sin nombre ni dirección no hay búsqueda que valga: mejor no dar botón que
  // dar uno que abre Maps en mitad del océano.
  const partes = [sitio.name?.trim(), sitio.address?.trim(), CIUDAD].filter(Boolean)
  if (partes.length < 2) return null

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(partes.join(', '))}`
}

/**
 * El mismo sitio para Apple Maps, cuando hay coordenadas.
 *
 * La grieta: `google.com/maps/search/?api=1` abre la app en Android y en un
 * iPhone que tenga Google Maps, pero en un iPhone SIN Google Maps abre Safari
 * — un mapa dentro del navegador, sin navegación, yendo tarde a una dirección
 * que no conoces. Con `maps://` ese teléfono abre su app nativa.
 *
 * Solo con coordenadas. `maps://?q=<nombre>` sin más hace que Apple Maps
 * busque, y buscar es lo que veníamos a dejar de hacer.
 *
 * Quién lo usa: la pantalla, que es el único sitio donde se puede saber en
 * qué teléfono se está leyendo. En un correo no se puede.
 */
export function enlaceApple(sitio: Sitio | null | undefined): string | null {
  /**
   * Sin coordenadas, NULL. Y `null` no es cero.
   *
   * `Number(null)` es 0 y 0 es finito, así que un sitio sin coordenadas
   * pasaba el filtro y salía `maps://?q=Alto&ll=0,0`: Apple Maps abriendo en
   * medio del golfo de Guinea. Se vio con los sitios para seguir, que es
   * donde más fácil es que falten, pero valía para cualquier local que no
   * venga de una búsqueda de Google.
   */
  if (sitio?.lat == null || sitio?.lng == null) return null
  const lat = Number(sitio.lat)
  const lng = Number(sitio.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const etiqueta = sitio?.name?.trim()
  const q = etiqueta ? `${encodeURIComponent(etiqueta)}&ll=${lat},${lng}` : `${lat},${lng}`
  return `maps://?q=${q}`
}
