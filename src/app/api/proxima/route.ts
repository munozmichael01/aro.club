import { NextResponse } from 'next/server'

import { cabeEnLaFecha } from '@/lib/edad'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { zonaDeCiudad } from '@/lib/zona-ciudad'

/**
 * La próxima fecha abierta. Pública: la portada la necesita sin sesión.
 *
 * La portada contaba atrás hacia «el próximo martes a las siete», calculado
 * con aritmética de calendario y sin mirar ninguna fecha real. Decía «la
 * próxima se cierra en 5 días» hubiera o no hubiera fecha, y al terminar el
 * alta la misma pantalla decía «te escribimos en cuanto abramos mesa»: dos
 * frases contradictorias en el mismo recorrido, y la primera podía ser
 * mentira.
 *
 * Solo lo que ya es público —cuándo empieza y cuándo cierra—. Ni el
 * restaurante ni cuánta gente va: eso se sabe después de reservar, y esta
 * ruta la puede leer cualquiera.
 *
 * Y DINÁMICA desde que hay bandas de edad. Era una respuesta igual para todo
 * el mundo y se podía cachear; ahora una fecha de mayores de 40 se le enseña
 * a quien los tiene y no al resto, así que depende de la sesión.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = createAdminClient()

  /**
   * Quién pregunta, SI hay alguien. Esta ruta es pública: la portada la
   * necesita sin sesión y eso no cambia.
   */
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: nacimiento } = user
    ? await admin.from('profiles').select('birthdate').eq('id', user.id).maybeSingle()
    : { data: null }

  /**
   * Varias, no una, y se elige la primera que esta persona pueda reservar.
   *
   * Pidiendo `limit(1)` y descartándola después, una fecha de mayores de 40
   * dejaba la portada sin cuenta atrás para todo el que no los tuviera —y
   * hay otra fecha abierta detrás que sí puede reservar—. Decir «no hay
   * fecha» teniéndola es la misma mentira que esta ruta vino a arreglar.
   *
   * Sin tope de cinco. «Con dos o tres fechas abiertas a la vez, sobra»,
   * decía aquí, y la semana del 29-10 las cinco primeras eran todas de
   * banda (≤44 y 45+): sin sesión se descartaban todas, y la cena del 31
   * para cualquier edad era la sexta. La portada dijo «abrimos la próxima
   * fecha en cuanto haya gente suficiente» con fechas abiertas (27-10).
   * Por eso, sin sesión, las bandas se quitan EN la consulta y no después.
   */
  let consulta = admin
    .from('events')
    .select('id, starts_at, booking_closes_at, reveal_at, format, city_slug, age_band_min, age_band_max')
    .eq('status', 'open')
    // Y nunca una de prueba, aunque alguien la deje en `open` por error.
    .eq('es_prueba', false)
    .gt('booking_closes_at', new Date().toISOString())
  if (!user) consulta = consulta.is('age_band_min', null).is('age_band_max', null)
  const { data: abiertas } = await consulta.order('starts_at', { ascending: true }).limit(50)

  /**
   * Sin sesión, ninguna fecha con banda.
   *
   * No sabemos quién mira, y anunciar en la portada como «la próxima» una
   * cena a la que la mayoría no puede ir es prometer algo que la pantalla
   * de reservar va a negar. Quien tenga la edad la verá en cuanto entre.
   */
  const data =
    (abiertas ?? []).find((e) =>
      user ? cabeEnLaFecha(nacimiento?.birthdate, e) : !e.age_band_min && !e.age_band_max,
    ) ?? null

  // En qué hora habla esta fecha. Viaja con ella y no en la raíz: una
  // persona puede tener una cena en Caracas y otra en otra ciudad.
  const zonaHoraria = data ? await zonaDeCiudad(data.city_slug) : null

  // `null` y no un 404: «no hay fecha abierta» es una respuesta legítima, y
  // la portada tiene que poder decirlo con esas palabras.
  return NextResponse.json({
    hay: !!data,
    empiezaEn: data?.starts_at ?? null,
    cierraEn: data?.booking_closes_at ?? null,
    // Cuándo se abre todo. Es público desde siempre —«a mediodía del día de
    // la cena» está escrito en la portada, en la FAQ y en los correos— pero
    // salía de ahí como una regla, no del evento, así que una cena que se
    // revelara a otra hora dejaba mintiendo a cinco pantallas a la vez.
    //
    // Lo pidió la app para poder decir la hora sin escribirla. Aditivo: quien
    // no lo lea sigue igual.
    revelaEn: data?.reveal_at ?? null,
    zonaHoraria,
    formato: data?.format ?? null,
    // Para qué edades es, si es para algunas. La app lo pinta como «Cena
    // +40»; quien no lo lea sigue igual.
    edadMinima: data?.age_band_min ?? null,
    edadMaxima: data?.age_band_max ?? null,
  })
}
