import 'server-only'

import { encolar } from '@/lib/correos'
import { retirarAbonoSinMesa } from '@/lib/creditos'
import { construirPool } from '@/lib/reparto/pool'
import { puntuar, roturas, type Persona } from '@/lib/reparto/repartir'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Alguien se baja de una mesa publicada: se rellena el hueco, no se rehace.
 *
 * La regla la decidió Michael y es la que faltaba: quien ya tiene mesa no se
 * cae a espera NUNCA. Si alguien se baja, los otros cinco no se tocan y se
 * mete a alguien de la espera en ese hueco.
 *
 * Hasta ahora la mesa se quedaba en cinco y el comentario de `/api/cancelar`
 * lo decía así: «a más de 24 horas el reparto se rehace solo cuando se vuelva
 * a repartir». Rehacer el reparto entero mueve a gente que ya leyó «tu mesa
 * es la 2», y eso no es una opción.
 *
 * ## Qué es «encajar»
 *
 * Las MISMAS reglas duras que usa el reparto —`roturas`— sobre los cinco que
 * quedan más el candidato. No una versión aproximada: si aquí se comprobara
 * la edad y el género a mano, el día que discrepe de `roturas` esto sentaría
 * a alguien que el panel marca en rojo.
 *
 * Pero no se pide que la mesa quede LIMPIA, se pide que el candidato no la
 * empeore. Una mesa publicada a la fuerza ya arrastra una rotura anotada
 * —pasa: el panel lo permite y lo deja escrito—, y exigir cero roturas
 * significaría que en esa mesa no puede entrar nadie nunca, por algo que el
 * candidato no hizo. Se compara el conjunto de reglas rotas con y sin él: si
 * no añade ninguna nueva, encaja.
 *
 * Y tiene que aceptar la zona de la mesa, que no es una regla dura del
 * reparto sino de esta mesa en concreto: ya está puesta en un sitio.
 *
 * De los que encajan entra el que deja mejor la mesa, con la misma
 * puntuación con la que se decidió el reparto original.
 *
 * ## Y si no encaja nadie
 *
 * No se fuerza. La mesa se queda en cinco y se devuelve `null`, para que
 * quien llame lo diga en el panel: confirmar una mesa de cinco o modificarla
 * a mano es una decisión, y tomarla sola metiendo a quien rompe una regla es
 * justo lo que el reparto existe para no hacer.
 */

export type Relleno = {
  profileId: string
  nombre: string
  mesa: number
}

export async function rellenarHueco(
  eventoId: string,
  tableId: string,
): Promise<Relleno | null> {
  const admin = createAdminClient()

  const { data: mesa } = await admin
    .from('dinner_tables')
    .select('id, table_number, restaurant_id, restaurants!dinner_tables_restaurant_id_fkey(zone_slug)')
    .eq('id', tableId)
    .maybeSingle()

  if (!mesa) return null

  const zonaDeLaMesa =
    (mesa.restaurants as unknown as { zone_slug: string | null } | null)?.zone_slug ?? null

  const { data: evento } = await admin
    .from('events')
    .select('reveal_at, seats_per_table, format')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return null

  // Quién sigue sentado en ESTA mesa, y quién está sentado en cualquiera de
  // la fecha: lo segundo es lo que separa la espera de los que ya tienen sitio.
  const { data: aqui } = await admin
    .from('table_members')
    .select('profile_id, seat_order')
    .eq('table_id', tableId)

  const { data: sentados } = await admin
    .from('table_members')
    .select('profile_id, dinner_tables!inner(event_id)')
    .eq('dinner_tables.event_id', eventoId)

  const enLaMesa = new Set((aqui ?? []).map((m) => m.profile_id))
  const conSitio = new Set((sentados ?? []).map((m) => m.profile_id))

  const porMesa = evento.seats_per_table ?? 6
  if (enLaMesa.size >= porMesa) return null

  const pool = await construirPool(admin, eventoId)
  const quedan = pool.personas.filter((p) => enLaMesa.has(p.profileId))
  const espera = pool.personas.filter((p) => !conSitio.has(p.profileId))

  if (!quedan.length || !espera.length) return null

  // Lo que ya estaba roto antes de que llegara nadie.
  const yaRotas = new Set(roturas(quedan).map((r) => r.regla))

  const caben = espera
    .filter((c) => !zonaDeLaMesa || (c.zonas ?? []).includes(zonaDeLaMesa))
    .filter((c) => roturas([...quedan, c]).every((r) => yaRotas.has(r.regla)))

  if (!caben.length) return null

  const elegido = caben.reduce<Persona>(
    (mejor, c) => (puntuar([...quedan, c]) > puntuar([...quedan, mejor]) ? c : mejor),
    caben[0],
  )

  // El asiento LIBRE, no «los que hay más uno». Si se baja quien tenía el 5,
  // quedan cinco personas y la última sigue siendo la 6: contando salían dos
  // asientos 6 en la misma mesa. Se ocupa el hueco que dejó.
  const ocupados = new Set((aqui ?? []).map((m) => m.seat_order))
  let asiento = 1
  while (ocupados.has(asiento)) asiento++

  const { error } = await admin.from('table_members').insert({
    table_id: tableId,
    profile_id: elegido.profileId,
    booking_id: elegido.bookingId,
    seat_order: asiento,
  } as never)

  if (error) {
    console.error('[rellenar] no se pudo sentar', error)
    return null
  }

  // Ya no está en espera: fuera su aviso si no ha salido, y fuera el abono
  // por mesa no conseguida. Es lo mismo que hace `publicar` cuando alguien
  // pasa de la espera a una mesa, y por el mismo motivo: si no, recibe los
  // dos correos y cena con el crédito devuelto.
  await admin
    .from('scheduled_emails')
    .delete()
    .eq('event_id', eventoId)
    .eq('kind', 'sin_mesa')
    .is('sent_at', null)
    .eq('profile_id', elegido.profileId)

  await retirarAbonoSinMesa(elegido.profileId, eventoId)

  // El correo, SOLO a quien entra. Los otros cinco no se han movido y para
  // ellos no ha cambiado nada.
  //
  // A la hora de la revelación si todavía no ha pasado —se entera con todo el
  // mundo— y ya si ya pasó, porque entonces la cena es hoy y esperar sería
  // avisarle cuando ya no le da tiempo.
  const revela = new Date(evento.reveal_at).getTime()
  await encolar(
    { perfil: elegido.profileId },
    'mesa_asignada',
    { mesa: mesa.table_number, formato: evento.format, sitio: null },
    { eventoId, cuando: revela > Date.now() ? new Date(evento.reveal_at) : undefined },
  )

  return { profileId: elegido.profileId, nombre: elegido.nombre, mesa: mesa.table_number }
}
