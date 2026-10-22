import 'server-only'

/**
 * En qué idioma se habla una mesa, dicho para enseñarlo.
 *
 * Nulo es español, que es lo de siempre y no se etiqueta. Vive aquí porque
 * lo mandan ya escrito DOS rutas —`/api/mi-cuenta` y `/api/agenda`— y la
 * razón es la de siempre: que la web y la app no tengan cada una su tabla de
 * traducción. La app la pinta tal cual viene.
 */
export const ETIQUETA_IDIOMA: Record<string, string> = {
  en: 'En inglés',
  pt: 'En portugués',
  fr: 'En francés',
  it: 'En italiano',
}

/** La etiqueta de un idioma, o `null` cuando es el de siempre. */
export function etiquetaDeIdioma(idioma: string | null | undefined): string | null {
  return idioma ? ETIQUETA_IDIOMA[String(idioma)] ?? null : null
}
