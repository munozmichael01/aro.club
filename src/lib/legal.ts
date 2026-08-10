import 'server-only'

/**
 * La versión del legal vigente.
 *
 * Vive sola y en un sitio porque es lo que da sentido a
 * `profiles.terms_accepted_at`: sin saber QUÉ aceptó cada quien, «aceptó los
 * términos» no quiere decir nada en cuanto el texto cambie una coma.
 *
 * Al cambiar los términos: se sube esta versión, y quien tenga una anterior
 * queda identificable para volver a pedírsela. No se toca la fecha de nadie.
 */
export const VERSION_LEGAL = '2026-08'
