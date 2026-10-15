/**
 * Familias de formato: las cuatro que se enseñan, y los DOS vocabularios que
 * hay debajo.
 *
 * Las pantallas hablan de cuatro cosas —cenas, drinks, movimiento, coffee— y
 * la base guarda el formato exacto. «Movimiento» son seis cosas distintas
 * —caminata, carrera, pádel…— y pedirle a operación que marque las seis para
 * decir «aquí se puede hacer deporte» sería trasladarle una decisión de
 * esquema.
 *
 * Los dos vocabularios son de verdad dos, y confundirlos no falla: cuenta mal
 * en silencio. Lo vi en la pestaña Gente enseñando «Cenas 0» con cinco
 * personas que habían marcado cena.
 *
 *   · LOS EVENTOS hablan `event_format_t`: dinner, foodie_dinner,
 *     women_dinner, coffee, drinks, walk, hike, run, padel, pilates, cycling.
 *     Es lo que guardan `events.format` y `restaurants.formats`.
 *
 *   · LAS PERSONAS hablan el código del cuestionario. `profile_traits.formats`
 *     sale tal cual de la respuesta a la pregunta `planes`, cuyo catálogo está
 *     en la tabla `questions` (`20260809190000_cuestionario_v3.sql`): cena,
 *     cena-gastronomica, cafe, drinks, correr, senderismo, padel, pilates,
 *     ciclismo. Solo coinciden por casualidad en `drinks`, `padel` y
 *     `pilates`, que es lo que hace que el error parezca funcionar a medias.
 *
 * Nadie traducía entre los dos porque hasta Gente nadie había necesitado
 * cruzarlos. Cuando haga falta —«¿esta persona quiere lo que hace esta
 * fecha?»— se hace aquí, no en la pantalla.
 */

/**
 * A qué hora empieza cada formato, hora de Caracas.
 *
 * Vivía en `/api/operacion/fechas`, que es quien la aplica, y ahora la
 * necesita también la muestra que se le enseña a un local: con la hora en la
 * ruta, enseñarle su correo a una cafetería pedía una segunda copia de esta
 * tabla, que es como empiezan todas.
 *
 * Los doce del enum, no los cinco que enseña la interfaz: «Movimiento» es
 * una familia —caminar, correr, pádel— y cada uno tiene su hora. Si el
 * formato no está aquí, la cena es la hora por defecto.
 */
export const HORA_DE: Record<string, string> = {
  // Las cenas, a las 7:30 (Michael, 06-10). Con minutos: la hora de una cena
  // la manda el sitio, y media hora importa.
  dinner: '19:30', foodie_dinner: '19:30', women_dinner: '19:30',
  drinks: '20:00', coffee: '10:00',
  // El brunch del domingo, a las once (Michael, 14-10). No es la hora del
  // café: un café es a media mañana y un brunch se come, así que empieza
  // cuando la gente ya desayunó o no desayunó a propósito.
  brunch: '11:00',
  walk: '09:00', hike: '07:00', run: '06:00',
  padel: '08:00', pilates: '08:00', cycling: '06:00',
}

/** «19:30» → [19, 30]. Sin minutos, cero. */
export function partesHora(h: string): [number, number] {
  const [a, b] = String(h).split(':')
  return [Number(a) || 0, Number(b) || 0]
}

/** «7:30 p.m.», para que ninguna pantalla escriba las horas a mano. */
export function horaBonita(h: string): string {
  const [hh, mm] = partesHora(h)
  const doce = hh % 12 || 12
  return `${doce}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a.m.' : 'p.m.'}`
}

/** Familia → formatos de evento. Sitios y fechas. */
export const FORMATOS_DE_FAMILIA: Record<string, string[]> = {
  cenas: ['dinner', 'foodie_dinner', 'women_dinner'],
  drinks: ['drinks'],
  movimiento: ['walk', 'hike', 'run', 'padel', 'pilates', 'cycling'],
  coffee: ['coffee'],
  brunch: ['brunch'],
}

/**
 * Familia → códigos de la pregunta `planes`. Personas.
 *
 * El catálogo autoritativo es la tabla `questions`; esto es el reparto en
 * familias, que es una decisión de producto y no vive en la base.
 * `scripts/comprobar-cuestionario.mjs` vigila que no aparezca un plan nuevo
 * sin familia: sin ese aviso, el plan nuevo no saldría en ningún filtro y la
 * pantalla diría cero sin equivocarse en nada visible.
 */
export const PLANES_DE_FAMILIA: Record<string, string[]> = {
  cenas: ['cena', 'cena-gastronomica'],
  drinks: ['drinks'],
  movimiento: ['correr', 'senderismo', 'padel', 'pilates', 'ciclismo'],
  /**
   * Café y brunch, cada uno con lo suyo.
   *
   * Estuvieron juntos un día, y era un error a medias: la pregunta se partió
   * ayer —un café no es un brunch— y esto los siguió tratando como el mismo
   * plan, así que abrir un brunch le habría escrito a quien solo quiere café.
   *
   * Los conjuntos ya se están separando solos: de 472 respuestas, 3 marcaron
   * solo café y 11 solo brunch, y son los catorce que han contestado desde
   * que la pregunta los distingue.
   */
  coffee: ['cafe'],
  brunch: ['brunch'],
}

/** Las cuatro, en el orden en que se enseñan. */
export const FAMILIAS = Object.keys(FORMATOS_DE_FAMILIA)

const invertir = (mapa: Record<string, string[]>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(mapa).flatMap(([familia, valores]) =>
      valores.map((valor) => [valor, familia]),
    ),
  )

/** A qué familia pertenece cada formato de evento: qué sitios sirven. */
export const FAMILIA_DE_FORMATO: Record<string, string> = invertir(FORMATOS_DE_FAMILIA)

/** A qué familia pertenece cada plan del cuestionario: qué quiere la gente. */
export const FAMILIA_DE_PLAN: Record<string, string> = invertir(PLANES_DE_FAMILIA)

/** Los que salen a la calle: no basta con decir dónde, hay que decir qué. */
export const MOVIMIENTO = FORMATOS_DE_FAMILIA.movimiento

export const familiaDe = (formato: string): string | null =>
  FAMILIA_DE_FORMATO[formato] ?? null

export const esFamilia = (valor: string): boolean =>
  Object.prototype.hasOwnProperty.call(PLANES_DE_FAMILIA, valor)

/**
 * Las familias que toca lo que alguien contestó en `planes`, sin repetir y en
 * el orden en que se enseñan. Quien marcó «cena» y «cena con foco
 * gastronómico» está una sola vez en «cenas».
 */
export function familiasDe(planes: string[] | null | undefined): string[] {
  const tocadas = new Set((planes ?? []).map((p) => FAMILIA_DE_PLAN[p]).filter(Boolean))
  return FAMILIAS.filter((f) => tocadas.has(f))
}

/** Los planes que caben en una familia; si no es familia, el valor tal cual. */
export const planesDe = (valor: string): string[] =>
  PLANES_DE_FAMILIA[valor] ?? [valor]
