import 'server-only'

import { cabeEnLaFecha, tieneEdadMinima, type EdadMinima } from '@/lib/edad'
import { FAMILIA_DE_FORMATO, PLANES_DE_FAMILIA } from '@/lib/formatos'
import { PUERTA, diaDe, partesDe } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

/**
 * En qué casilla de «¿Qué días te sirven mejor?» cae una fecha.
 *
 * La pregunta no ofrece días sueltos: ofrece **día y momento** —«Jueves
 * noche», «Sábado mañana», «Domingo mañana»—, que es justo lo que distingue
 * un brunch del domingo de una cena del sábado. Por eso el brunch se puede
 * cruzar con lo que la gente contestó sin inventar nada.
 *
 * Devuelve `null` cuando la fecha no cae en ninguna casilla —un martes, un
 * domingo de noche, un sábado a las cuatro de la tarde—, y entonces NO se
 * filtra por día: nadie pudo declarar ese hueco, así que tratarlo como un
 * «no» dejaría la fecha sin anunciar a nadie.
 *
 * La hora y el día son los de la ciudad de la fecha, nunca los del servidor:
 * un sábado a las 7:30 p.m. de Caracas es domingo en UTC.
 */
export function casillaDeDia(iso: string, zona: string): string | null {
  const p = partesDe(iso, zona)
  if (!p) return null

  // Mañana y noche, como las nombra la pregunta. Lo de en medio no existe en
  // el catálogo, así que no se clasifica.
  const momento = p.horas < 12 ? 'am' : p.horas >= 18 ? 'pm' : null
  if (!momento) return null

  const casilla = (
    p.diaNumero === 4 && momento === 'pm' ? 'jue'
    : p.diaNumero === 5 && momento === 'pm' ? 'vie'
    : p.diaNumero === 6 && momento === 'am' ? 'sab-am'
    : p.diaNumero === 6 && momento === 'pm' ? 'sab'
    : p.diaNumero === 0 && momento === 'am' ? 'dom-am'
    : null
  )

  // Y que el código siga existiendo en la pregunta. Si alguien reordena o
  // renombra las opciones, esto deja de filtrar en vez de filtrar mal: el
  // catálogo manda, como en todo lo que se guarda por código.
  if (!casilla) return null
  const codigos = (PUERTA.dias?.opciones ?? []).map(([, c]) => c)
  return codigos.includes(casilla) ? casilla : null
}

/**
 * Quién quiere saber de una fecha, de los que ya pueden llegar a ella.
 *
 * Esto NO decide quién puede ir: eso lo deciden las zonas, la verificación y
 * si ya tiene puesto, y cada aviso lo mira a su manera. Esto quita a los TRES
 * grupos que ninguno de los avisos estaba quitando, y que son los mismos en
 * todos: `cierra_pronto` y `abrimos_zona`.
 *
 * 1 · QUIEN DIJO QUE ESE PLAN NO LE INTERESA. En «¿Qué planes te interesan?»
 *     alguien marca cenas y no drinks. Escribirle de una fecha de drinks es
 *     escribirle de algo que ya dijo que no quiere, y es como se consigue que
 *     alguien apague los avisos enteros.
 *
 *     Quien NO contestó esa pregunta sí recibe. No contestar no es decir que
 *     no: es no haber llegado. Tratar el silencio como un «no» dejaría sin
 *     avisos a todo el que se apuntó antes de que la pregunta existiera.
 *
 * 2 · LAS CUENTAS DE PRUEBA. Las de los guiones y la del revisor de Apple.
 *     A Michael le llegaban varios avisos a la vez, que eran los de sus
 *     propias cuentas de prueba llegando a su buzón.
 *
 * 5 · QUIEN CABE EN UNA FECHA CON EDAD QUE COMPITE CON ESTA. Si el mismo día
 *     y en la misma zona hay una cena abierta y una cena +40, a quien tiene
 *     45 años se le habla de la +40 y de ninguna otra. Michael, 15-10: «nos
 *     interesa que se apunten a ese, nos enfocamos en ese».
 *
 *     No es un filtro de ruido, es de reparto: esas doce plazas solo las
 *     pueden llenar ellos, y el resto del club llena las otras. A quien le
 *     mandas las dos, elige la de siempre.
 *
 *     Compite = abierta, sin cerrar todavía, el MISMO día de la ciudad y con
 *     alguna zona en común. Sin zona común no compite: son dos planes que
 *     esa persona ni siquiera puede comparar.
 *
 * 4 · QUIEN DIJO QUE ESE DÍA NO. «Jueves noche» y «Domingo mañana» son dos
 *     de las cinco casillas que ofrece la puerta, y quien marcó solo fin de
 *     semana no puede ir a una cena del jueves. Escribirle de una fecha a la
 *     que no puede llegar es la misma falta de respeto que escribirle de un
 *     plan que no quiere, y aquí es la mitad de la lista: de los 376 que
 *     aceptan Chacao y quieren cenas, 182 pueden un jueves.
 *
 *     Mismo trato que los planes: quien no contestó sí recibe, y una fecha
 *     que no cae en ninguna casilla —un martes— no filtra a nadie.
 *
 * 3 · QUIEN NO TIENE LA EDAD DE ESA FECHA. Una cena de mayores de 40 no se
 *     anuncia a quien tiene 25: el aviso le ofrece apuntarse a algo que
 *     `/api/reservar` le va a negar, y la forma honesta de cerrar una puerta
 *     es no llamar a la gente para que la empuje.
 *
 *     Está aquí y no en cada aviso por lo mismo que los otros dos: son tres
 *     sitios distintos los que escriben —abrir una fecha, el cron del cierre
 *     y el panel— y la tercera vez que se escribe una regla es la primera
 *     que diverge.
 */
export async function quienQuiereSaberDe(
  ids: string[],
  formato: string | null | undefined,
  /**
   * La fecha de la que se avisa, para su banda de edad. Opcional: sin ella
   * no se filtra por edad y el aviso sale como salía.
   */
  evento?: (EdadMinima & { id?: string; starts_at: string; city_slug?: string | null }) | null,
): Promise<Set<string>> {
  const permitidos = new Set(ids)
  if (!ids.length) return permitidos

  const admin = createAdminClient()

  // --- las de prueba, fuera ---------------------------------------------
  const { data: deprueba } = await admin
    .from('profiles')
    .select('id')
    .in('id', ids)
    .eq('es_prueba', true)

  for (const p of deprueba ?? []) permitidos.delete(p.id)

  // --- y quien no tiene la edad de esta fecha ---------------------------
  //
  // Sin fecha de nacimiento tampoco, que es lo mismo que decide
  // `/api/reservar`: avisar a quien después no va a poder apuntarse es
  // precisamente lo que esto evita.
  if (tieneEdadMinima(evento)) {
    const { data: edades, error } = await admin
      .from('profiles')
      .select('id, birthdate')
      .in('id', [...permitidos])

    /**
     * Y si la consulta FALLA, se para en seco. No se avisa a nadie y no se
     * avisa a todos.
     *
     * Este es el punto delicado de todo el filtro. Un `error` deja `edades`
     * en nulo, y entonces las dos salidas silenciosas son malas de verdad:
     * tratarlo como «no cabe nadie» deja la fecha sin anunciar a nadie sin
     * que falle nada visible, y saltarse el filtro le anuncia una cena de
     * mayores de 40 a cuatrocientas personas de veinte y pico.
     *
     * Así que ninguna de las dos: se levanta el error. En el panel sale un
     * 500 que se ve, y en el cron queda en los registros. Un filtro de
     * quién recibe un correo no puede fallar en silencio hacia ningún lado.
     */
    if (error) {
      console.error('[avisos] no se pudo leer la edad: no se avisa a nadie', error)
      throw new Error('No se pudo comprobar la edad de quien recibe el aviso.')
    }

    const cabe = new Set(
      (edades ?? []).filter((p) => cabeEnLaFecha(p.birthdate, evento!)).map((p) => p.id),
    )
    for (const id of [...permitidos]) if (!cabe.has(id)) permitidos.delete(id)
  }

  // --- y quien dijo que ese plan no ------------------------------------
  const familia = formato ? FAMILIA_DE_FORMATO[formato] : null
  const planes = familia ? PLANES_DE_FAMILIA[familia] : null

  // Sin familia no se filtra. Un formato nuevo sin reparto en familias no
  // puede dejar a todo el mundo fuera en silencio: el comprobador avisa de
  // eso, y mientras tanto el aviso sale como salía.
  if (!planes?.length) return permitidos

  const { data: respuestas } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'planes')
    .in('profile_id', [...permitidos])

  for (const r of respuestas ?? []) {
    if (!r.profile_id) continue
    const suyos = Array.isArray(r.value) ? (r.value as string[]) : []
    // Contestó y no marcó ninguno de este formato.
    if (suyos.length && !suyos.some((plan) => planes.includes(plan))) {
      permitidos.delete(r.profile_id)
    }
  }

  // --- y quien dijo que ese día no --------------------------------------
  if (!evento?.starts_at || !permitidos.size) return permitidos

  const zonaHoraria = await zonaDeCiudad(evento.city_slug)
  const casilla = casillaDeDia(evento.starts_at, zonaHoraria)
  if (!casilla) return permitidos

  const { data: suDia } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'dias')
    .in('profile_id', [...permitidos])

  for (const r of suDia ?? []) {
    if (!r.profile_id) continue
    const suyos = Array.isArray(r.value) ? (r.value as string[]) : []
    if (suyos.length && !suyos.includes(casilla)) permitidos.delete(r.profile_id)
  }

  return quitarALosDeLaOtra(permitidos, evento, zonaHoraria)
}

/**
 * Quita a quien cabe en una fecha con edad que compite con esta.
 *
 * Solo se aplica a las fechas SIN edad: la que la tiene ya se queda con los
 * suyos por el filtro de arriba, y así las dos listas no se pisan. El que
 * tiene 45 años recibe el correo de la +40 y nada más; el resto del club
 * recibe el de la otra.
 */
async function quitarALosDeLaOtra(
  permitidos: Set<string>,
  evento: EdadMinima & { id?: string; starts_at: string; city_slug?: string | null },
  zonaHoraria: string,
): Promise<Set<string>> {
  if (tieneEdadMinima(evento) || !evento.id || !permitidos.size) return permitidos

  const admin = createAdminClient()

  const { data: mias } = await admin
    .from('event_venues')
    .select('zone_slug')
    .eq('event_id', evento.id)

  const zonas = new Set((mias ?? []).map((v) => v.zone_slug).filter(Boolean))
  if (!zonas.size) return permitidos

  // El mismo día, en la hora de la ciudad. Un sábado a las 7:30 p.m. de
  // Caracas es domingo en UTC: comparar los `starts_at` en crudo juntaría la
  // cena del sábado con un brunch del domingo y separaría dos del sábado.
  const diaMio = diaDe(evento.starts_at, zonaHoraria)

  const { data: otras } = await admin
    .from('events')
    .select('id, starts_at, age_band_min, age_band_max')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date().toISOString())
    .not('id', 'eq', evento.id)

  const compiten = []
  for (const o of otras ?? []) {
    if (!tieneEdadMinima(o)) continue
    if (diaDe(o.starts_at, zonaHoraria) !== diaMio) continue
    const { data: suyas } = await admin
      .from('event_venues')
      .select('zone_slug')
      .eq('event_id', o.id)
    if ((suyas ?? []).some((v) => v.zone_slug && zonas.has(v.zone_slug))) compiten.push(o)
  }

  if (!compiten.length) return permitidos

  const { data: edades, error } = await admin
    .from('profiles')
    .select('id, birthdate')
    .in('id', [...permitidos])

  // Mismo criterio que el filtro de edad de arriba: si no se puede leer la
  // edad no se adivina hacia ningún lado. Aquí fallar en silencio mandaría
  // el correo de la cena normal a la gente de la +40, que es justo lo que
  // esto evita.
  if (error) {
    console.error('[avisos] no se pudo leer la edad para la fecha que compite', error)
    throw new Error('No se pudo comprobar quién cabe en la otra fecha.')
  }

  for (const p of edades ?? []) {
    if (compiten.some((o) => cabeEnLaFecha(p.birthdate, o))) permitidos.delete(p.id)
  }

  return permitidos
}
