import { NextResponse } from 'next/server'
import { z } from 'zod'

import { cabeEnLaFecha } from '@/lib/edad'
import { hablaElIdioma, nombreDeIdioma } from '@/lib/idioma'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cambiar a alguien de fecha, dentro de la misma noche.
 *
 * Michael, 20-10: «mantenlo separado y en lugar de mezclar las mesas en la
 * fecha, me permites mover a alguien de fecha desde el panel».
 *
 * El reparto mueve gente entre MESAS de una fecha. Entre fechas no puede, y
 * no es un descuido: la reserva, el pago y los correos de esa persona son de
 * una fecha concreta, así que moverla es cambiar la reserva de sitio, no
 * arrastrar una ficha. Por eso vive aquí y no en `/api/operacion/propuesta`.
 *
 * **Solo dentro del mismo día.** Es el caso que existe —el jueves 22 hay dos
 * cenas esa noche y la abierta no llena— y es el único en el que la persona
 * no se entera de nada: mismo día, y se le dirá su mesa y su sitio en la
 * revelación como a todo el mundo. Cambiarle el DÍA a alguien es otra cosa,
 * tiene que avisarse, y no se decide aquí.
 */

const cuerpo = z.object({
  perfilId: z.string().uuid(),
  desdeEventoId: z.string().uuid(),
  aEventoId: z.string().uuid(),
  /** Mover igualmente a quien no encaja por edad o por idioma. */
  forzar: z.boolean().optional(),
})

/** Caracas va cuatro horas por detrás de UTC y no cambia con la estación. */
const CARACAS = 4
const diaDe = (iso: string) => new Date(Date.parse(iso) - CARACAS * 3600_000).toISOString().slice(0, 10)

/** Las que cuentan: reservada o pagada. Una cancelada no ocupa nada. */
const VIVAS: ('pending_payment' | 'confirmed')[] = ['pending_payment', 'confirmed']

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }
  const d = parsed.data

  if (d.desdeEventoId === d.aEventoId) {
    return NextResponse.json({ error: 'Esa persona ya está en esa fecha.' }, { status: 409 })
  }

  const admin = createAdminClient()

  const { data: fechas } = await admin
    .from('events')
    .select('id, starts_at, status, idioma, age_band_min, age_band_max')
    .in('id', [d.desdeEventoId, d.aEventoId])

  const desde = (fechas ?? []).find((e) => e.id === d.desdeEventoId)
  const a = (fechas ?? []).find((e) => e.id === d.aEventoId)
  if (!desde || !a) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  if (diaDe(desde.starts_at) !== diaDe(a.starts_at)) {
    return NextResponse.json(
      {
        error:
          'Las dos fechas tienen que ser de la misma noche. Cambiarle el día a alguien hay que avisárselo, y eso todavía no lo hace el panel.',
      },
      { status: 409 },
    )
  }

  if (a.status !== 'open' && a.status !== 'locked') {
    return NextResponse.json({ error: 'Esa fecha no admite gente: está ' + a.status + '.' }, { status: 409 })
  }

  /**
   * ¿ENCAJA en la fecha de destino?
   *
   * Pregunta, no candado: quien decide es operación, y mover gente es
   * justamente para los casos que el automático no resuelve. Pero no puede
   * pasar sin querer. La cena de +40 la eligieron ocho personas porque era
   * de +40, y sentar ahí a alguien de 35 sin que nadie lo diga rompe lo
   * único que esa fecha prometía. Igual con la mesa en inglés.
   *
   * Es la misma comprobación que hace `/api/reservar` cuando se apunta
   * alguien, leída desde el mismo sitio: dos ideas de quién cabe serían dos
   * respuestas distintas a la misma pregunta.
   */
  if (!d.forzar) {
    const { data: quien } = await admin
      .from('profiles')
      .select('birthdate')
      .eq('id', d.perfilId)
      .maybeSingle()

    /**
     * Dicho para quien opera, no para quien reserva.
     *
     * `porQueNoCabe` existe y se escribió para el miembro: acaba en «mira
     * las otras fechas abiertas», que es el consejo correcto para quien se
     * topa con la puerta y no para quien la está abriendo a mano.
     */
    const laBanda = a.age_band_min != null && a.age_band_max != null
      ? 'es para gente de ' + a.age_band_min + ' a ' + a.age_band_max + ' años'
      : a.age_band_min != null
        ? 'es para mayores de ' + a.age_band_min
        : 'es para menores de ' + a.age_band_max

    const estorbos: string[] = []
    if (!cabeEnLaFecha(quien?.birthdate, a)) estorbos.push('esa cena ' + laBanda)
    if (a.idioma && !(await hablaElIdioma(admin, d.perfilId, a.idioma))) {
      estorbos.push('esa mesa se habla en ' + nombreDeIdioma(a.idioma) + ' y esta persona no lo tiene puesto')
    }

    if (estorbos.length) {
      return NextResponse.json(
        { error: 'Esa fecha no es para esta persona: ' + estorbos.join(', y ') + '.', motivo: 'no-encaja' },
        { status: 409 },
      )
    }
  }

  // Su reserva viva en la fecha de origen.
  const { data: suya } = await admin
    .from('bookings')
    .select('id, status, movida_de')
    .eq('profile_id', d.perfilId)
    .eq('event_id', d.desdeEventoId)
    .in('status', VIVAS)
    .maybeSingle()

  if (!suya) {
    return NextResponse.json({ error: 'Esa persona no tiene reserva viva en esa fecha.' }, { status: 404 })
  }

  /**
   * Y si ya está sentada en una mesa PUBLICADA, no se mueve desde aquí.
   *
   * Publicar manda seis correos con la mesa dentro. Cambiarle la fecha
   * después dejaría su pantalla diciendo una cosa y la base otra, que es el
   * mismo candado que ya tiene retocar una propuesta publicada. Se
   * despublica a propósito y luego se mueve.
   */
  const { data: sentada } = await admin
    .from('table_members')
    .select('table_id, dinner_tables!inner(event_id)')
    .eq('profile_id', d.perfilId)
    .eq('dinner_tables.event_id', d.desdeEventoId)
    .maybeSingle()

  if (sentada) {
    return NextResponse.json(
      { error: 'Esa persona ya está en una mesa publicada. Despublica esa mesa y vuelve a moverla.' },
      { status: 409 },
    )
  }

  /**
   * Y la fecha de destino no puede tener ya una reserva suya.
   *
   * `bookings` es única por (evento, persona). Si tiene una CANCELADA ahí
   * —se apuntó, se bajó, y ahora la movemos— el update chocaría con esa
   * fila, así que se quita: una reserva cancelada no es historia que haga
   * falta conservar en la misma fecha a la que vuelve.
   */
  const { data: enDestino } = await admin
    .from('bookings')
    .select('id, status')
    .eq('profile_id', d.perfilId)
    .eq('event_id', d.aEventoId)
    .maybeSingle()

  if (enDestino) {
    if ((VIVAS as string[]).includes(enDestino.status)) {
      return NextResponse.json({ error: 'Esa persona ya está apuntada a la otra fecha.' }, { status: 409 })
    }
    await admin.from('bookings').delete().eq('id', enDestino.id)
  }

  /**
   * Se conserva la fecha ORIGINAL, no la anterior.
   *
   * Si se mueve dos veces, la etiqueta tiene que seguir diciendo dónde
   * reservó esa persona, que es lo que Michael pidió ver. `movida_de` solo
   * se escribe la primera vez.
   */
  /**
   * Y si vuelve a donde reservó, la etiqueta se va.
   *
   * Mover y deshacer tiene que dejarlo como estaba. Sin esto, devolver a
   * alguien a su fecha la dejaba ahí con un «reservó en» que apunta a esa
   * misma fecha: una etiqueta que dice una verdad inútil y que se lee como
   * que la movimos cuando no.
   */
  const vuelveACasa = suya.movida_de === d.aEventoId

  const { error } = await admin
    .from('bookings')
    .update({
      event_id: d.aEventoId,
      movida_de: vuelveACasa ? null : (suya.movida_de ?? d.desdeEventoId),
      movida_at: vuelveACasa ? null : new Date().toISOString(),
      movida_por: vuelveACasa ? null : actor,
    } as never)
    .eq('id', suya.id)

  if (error) {
    console.error('[mover-fecha]', error)
    return NextResponse.json({ error: 'No pudimos moverla.' }, { status: 500 })
  }

  /**
   * Lo que NO se toca, a propósito:
   *
   *  · el pago, que va atado a la reserva y la reserva es la misma fila;
   *  · el crédito, porque no se ha devuelto nada ni se ha cobrado de nuevo;
   *  · los correos, porque es la misma noche y a esta persona no le cambia
   *    nada de lo que ya se le dijo. Lo que sí cambia —su mesa y el sitio—
   *    se cuenta en la revelación, como a todo el mundo.
   *
   * Y las propuestas guardadas de las dos fechas se quedan viejas: la de
   * origen la sigue enseñando y el panel ya la marca como «ya no está», y la
   * de destino no la tiene todavía. Las dos se arreglan volviendo a repartir,
   * que es lo que hay que hacer después de mover a alguien.
   */
  return NextResponse.json({
    estado: 'movida',
    reserva: suya.id,
    reservoEn: vuelveACasa ? null : (suya.movida_de ?? d.desdeEventoId),
    hayQueRepartir: true,
  })
}
