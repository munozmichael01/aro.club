/**
 * Familias de formato: las cuatro que se enseñan y los once que guarda la base.
 *
 * Las pantallas hablan de CUATRO cosas —cenas, drinks, movimiento, coffee— y
 * la base guarda el formato exacto. «Movimiento» son seis cosas distintas
 * —caminata, carrera, pádel…— y pedirle a operación que marque las seis para
 * decir «aquí se puede hacer deporte» sería trasladarle una decisión de
 * esquema.
 *
 * El mapa vivía copiado en dos rutas —`locales` en un sentido y `fechas` en el
 * otro— y ahora vive aquí una vez. Dos copias de la misma tabla es cómo un
 * formato nuevo acaba clasificado en `fechas` y sin sitio en `locales`.
 *
 * Ojo con el reparto de valores: `event_format_t` tiene `walk` y
 * `women_dinner`, que el cuestionario no ofrece, y `profile_traits.formats`
 * guarda lo que se contestó en el cuestionario. El mapa cubre los dos
 * conjuntos a propósito: se pregunta desde los dos lados.
 */

export const FORMATOS_DE_FAMILIA: Record<string, string[]> = {
  cenas: ['dinner', 'foodie_dinner', 'women_dinner'],
  drinks: ['drinks'],
  movimiento: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],
  coffee: ['coffee'],
}

/** Las cuatro, en el orden en que se enseñan. */
export const FAMILIAS = Object.keys(FORMATOS_DE_FAMILIA)

/** A qué familia pertenece cada formato: es lo que dice qué sitios sirven. */
export const FAMILIA_DE_FORMATO: Record<string, string> = Object.fromEntries(
  Object.entries(FORMATOS_DE_FAMILIA).flatMap(([familia, formatos]) =>
    formatos.map((formato) => [formato, familia]),
  ),
)

/** Los que salen a la calle: no basta con decir dónde, hay que decir qué. */
export const MOVIMIENTO = FORMATOS_DE_FAMILIA.movimiento

export const familiaDe = (formato: string): string | null =>
  FAMILIA_DE_FORMATO[formato] ?? null

export const esFamilia = (valor: string): boolean =>
  Object.prototype.hasOwnProperty.call(FORMATOS_DE_FAMILIA, valor)

/**
 * Las familias que toca una lista de formatos, sin repetir y en el orden en
 * que se enseñan. Lo usa Gente: la pantalla filtra por familia y quien
 * contestó «cena» y «cena foodie» no puede salir dos veces en «cenas».
 */
export function familiasDe(formatos: string[] | null | undefined): string[] {
  const tocadas = new Set((formatos ?? []).map((f) => FAMILIA_DE_FORMATO[f]).filter(Boolean))
  return FAMILIAS.filter((f) => tocadas.has(f))
}
