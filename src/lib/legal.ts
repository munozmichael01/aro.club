import 'server-only'

import legal from '../../public/legal.js'

/**
 * La versión del legal vigente.
 *
 * Es lo que da sentido a `profiles.terms_accepted_at`: sin saber QUÉ aceptó
 * cada quien, «aceptó los términos» no quiere decir nada en cuanto el texto
 * cambie una coma.
 *
 * Y sale del MISMO fichero que el texto, desde el 18-10: estaba escrita aquí
 * y el texto vivía en la pantalla, así que se podía cambiar el legal sin
 * subir la versión, o al revés. Ahora la versión va pegada a lo que versiona.
 *
 * Al cambiar los términos: se sube `version` en `public/legal.js`, y quien
 * tenga una anterior queda identificable para volver a pedírsela. No se toca
 * la fecha de nadie.
 */
export const VERSION_LEGAL: string = (legal as unknown as { version: string }).version
