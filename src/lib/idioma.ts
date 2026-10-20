import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * El idioma de una mesa, y quién cabe en ella.
 *
 * Una sola función para las tres puertas que lo preguntan —reservar, pagar y
 * el cupón— por la misma razón que `edad.ts`: tres cuentas de lo mismo acaban
 * dando respuestas distintas, y aquí eso significa sentar a alguien en una
 * mesa que no va a poder seguir, o cerrarle la puerta a quien sí.
 *
 * Nació el 20-10 con la cena «Dinner in English» del sábado 24. No es una
 * traducción del producto: es una propiedad de la fecha, como la edad mínima.
 *
 * El dato ya existía. `idiomas` es una pregunta del cuestionario desde el
 * principio y la han contestado 667 personas, de las que 252 marcaron inglés.
 * Inventar un campo nuevo en el perfil habría sido un segundo sitio donde
 * dice lo mismo.
 */

type Admin = SupabaseClient<Database>

/** El código estable del 409, para que la app no lea el texto. */
export const MOTIVO_IDIOMA = 'falta-idioma'

/**
 * Cómo se llama cada idioma cuando hay que escribirlo.
 *
 * En español, que es la lengua del producto: el error lo lee alguien que no
 * marcó inglés, así que decírselo en inglés sería la broma más cara posible.
 */
const NOMBRE: Record<string, string> = {
  en: 'inglés',
  pt: 'portugués',
  fr: 'francés',
  it: 'italiano',
  de: 'alemán',
  zh: 'chino',
  ar: 'árabe',
}

export function nombreDeIdioma(codigo: string | null | undefined): string {
  return NOMBRE[String(codigo ?? '')] ?? String(codigo ?? '')
}

/** ¿Esta fecha pide un idioma? Nulo es español, que es lo de siempre. */
export function pideIdioma(evento: { idioma?: string | null } | null | undefined): boolean {
  return !!(evento && evento.idioma)
}

/**
 * ¿Esta persona marcó ese idioma?
 *
 * Y si la consulta FALLA, se dice que NO. Es el lado seguro: quien no cabe se
 * encuentra una puerta cerrada y un texto que le dice cómo abrirla —añadir el
 * idioma en sus respuestas— mientras que dejar pasar por un error de red
 * sienta a alguien en una mesa que no entiende y lo descubre esa noche,
 * delante de cinco desconocidos.
 */
export async function hablaElIdioma(
  admin: Admin,
  perfilId: string,
  idioma: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', perfilId)
    .eq('question_key', 'idiomas')
    .maybeSingle()

  if (error) {
    console.error('[idioma] no se pudo leer la respuesta de idiomas', error)
    return false
  }

  const marcados = Array.isArray(data?.value) ? (data?.value as unknown[]) : []
  return marcados.some((x) => String(x) === idioma)
}

/** El 409 entero, igual en las tres puertas. */
export function noCabePorIdioma(idioma: string) {
  return {
    error: `Esta mesa se habla en ${nombreDeIdioma(idioma)}. Añádelo en tus respuestas y te apuntas.`,
    motivo: MOTIVO_IDIOMA,
    idioma,
  }
}
