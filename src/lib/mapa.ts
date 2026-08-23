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
  lat?: number | string | null
  lng?: number | string | null
}

/** Caracas, mientras sea la única ciudad abierta. */
const CIUDAD = 'Caracas, Venezuela'

export function enlaceDeMapa(sitio: Sitio | null | undefined): string | null {
  if (!sitio) return null

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
  const lat = Number(sitio?.lat)
  const lng = Number(sitio?.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const etiqueta = sitio?.name?.trim()
  const q = etiqueta ? `${encodeURIComponent(etiqueta)}&ll=${lat},${lng}` : `${lat},${lng}`
  return `maps://?q=${q}`
}
