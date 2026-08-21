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
