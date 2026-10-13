/**
 * La edad, y quién cabe en una fecha con banda de edad.
 *
 * Una sola función para las cinco puertas que lo preguntan —reservar, pagar,
 * la próxima fecha, la agenda de Mi cuenta y los avisos—, por la misma razón
 * que `embudo.ts`: cinco cuentas de la misma edad acaban dando edades
 * distintas, y aquí eso significa dejar entrar a quien no cabe o dejar fuera
 * a quien sí.
 *
 * **La columna ya existía.** `events.age_band_min` y `age_band_max` están en
 * el esquema inicial y no las usaba nadie: la banda de edad estaba prevista
 * desde el principio y se quedó sin cablear. Inventar una `edad_minima` al
 * lado habría sido un segundo sitio donde dice lo mismo.
 */

/**
 * Los años que tiene alguien EL DÍA DE LA CENA, no hoy.
 *
 * No es una sutileza: quien cumple 40 la semana que viene tiene 40 en una
 * cena del mes que viene, y contándolo con el reloj de hoy se le cerraría la
 * puerta de una fecha a la que sí puede ir. La pregunta que hace una cena
 * +40 es «¿cuántos años tendrás esa noche?».
 *
 * Todo en UTC y a mano, sin `getMonth()` ni `getDate()`: esos son la hora de
 * la máquina que ejecuta, y el servidor corre en UTC mientras la cena es de
 * Caracas. Para una cuenta de años un día de desfase solo importa el día del
 * cumpleaños, pero es justo el día en que la respuesta cambia.
 */
export function edadEn(nacimiento: string | null | undefined, cuando: string | Date): number | null {
  if (!nacimiento) return null

  const n = nacimiento.slice(0, 10).split('-').map(Number)
  if (n.length !== 3 || n.some((x) => !Number.isFinite(x))) return null

  const fecha = typeof cuando === 'string' ? cuando : cuando.toISOString()
  const d = fecha.slice(0, 10).split('-').map(Number)
  if (d.length !== 3 || d.some((x) => !Number.isFinite(x))) return null

  let años = d[0] - n[0]
  if (d[1] < n[1] || (d[1] === n[1] && d[2] < n[2])) años--

  // Fuera de lo humano es un dato roto, no una edad. Devolver 0 lo colaría
  // por un `>= 40`; devolver null obliga a quien pregunte a decidir.
  return años >= 0 && años < 120 ? años : null
}

/**
 * Lo que una fecha exige, si exige algo.
 *
 * Es una EDAD MÍNIMA, no una banda: lo que se pone es un suelo. El máximo
 * viaja porque la columna existe desde el esquema inicial y no cuesta nada
 * respetarla, pero una «Cena de 25 a 35» sería otra decisión de producto.
 */
export type EdadMinima = { age_band_min?: number | null; age_band_max?: number | null }

/** ¿Esta fecha pide una edad? */
export function tieneEdadMinima(evento: EdadMinima | null | undefined): boolean {
  return !!(evento && (evento.age_band_min != null || evento.age_band_max != null))
}

/**
 * ¿Cabe esta persona en esta fecha?
 *
 * **Sin fecha de nacimiento no cabe**, y eso es a propósito: una cena de
 * mayores de 40 en la que entra quien no dijo su edad no es una cena de
 * mayores de 40. Quien no la tiene es porque no terminó el cuestionario, y
 * el embudo ya le dice lo que le falta.
 *
 * Una fecha SIN edad mínima la cabe todo el mundo, también quien no la dio:
 * esto no es una puerta nueva para el resto del club.
 */
export function cabeEnLaFecha(
  nacimiento: string | null | undefined,
  evento: (EdadMinima & { starts_at: string }) | null | undefined,
): boolean {
  if (!evento || !tieneEdadMinima(evento)) return true

  const edad = edadEn(nacimiento, evento.starts_at)
  if (edad == null) return false

  if (evento.age_band_min != null && edad < evento.age_band_min) return false
  if (evento.age_band_max != null && edad > evento.age_band_max) return false
  return true
}

/**
 * Lo que se le dice a quien no cabe, en una sola frase y en un solo sitio.
 *
 * Con la salida: «mira las otras fechas abiertas» es lo único accionable que
 * se le puede ofrecer a alguien al que acabamos de cerrar una puerta.
 */
export function porQueNoCabe(evento: EdadMinima): string {
  const { age_band_min: min, age_band_max: max } = evento
  const quien =
    min != null && max != null
      ? `para gente de ${min} a ${max}`
      : min != null
        ? `para mayores de ${min}`
        : `para menores de ${max}`
  return `Esta cena es ${quien}. Mira las otras fechas abiertas.`
}

/** Lo que se le manda a quien llama. `motivo` es el código estable. */
export const MOTIVO_EDAD = 'edad' as const
