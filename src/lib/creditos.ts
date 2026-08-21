import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El libro de créditos, cuando el pago es en dinero.
 *
 * Pagar con crédito ya se anotaba —`/api/reservar` mete un `event_charge`— y
 * cancelar con margen también —`refund`—. Pagar por evento con dinero no
 * anotaba NADA, así que el libro de quien pagó iba de cero a +1 al cancelar,
 * sin explicar de dónde salía ese crédito. El saldo era correcto; el libro no
 * era un libro.
 *
 * Se anotan DOS apuntes y no uno: la compra y el cargo, neto cero.
 *
 *   pack_purchase  +1   pagó ocho dólares y eso compra un puesto
 *   event_charge   -1   y lo gasta en esta fecha, ahora mismo
 *
 * Con uno solo el saldo quedaría en -1 para quien pagó, que es una deuda que
 * no existe. Con los dos, el saldo no se mueve —nadie ve un número distinto—
 * y cada movimiento posterior tiene su origen detrás: una devolución deja de
 * ser un crédito que aparece de la nada.
 */
export async function anotarPagoDeEvento(
  perfilId: string,
  bookingId: string | null,
  coste = 1,
): Promise<void> {
  if (!bookingId) return

  const admin = createAdminClient()

  // Idempotente: confirmar dos veces no puede duplicar el libro. Se mira por
  // el cargo, que es el apunte que ata el pago a ESTA reserva.
  const { data: yaEsta } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('reason', 'event_charge')
    .limit(1)
    .maybeSingle()

  if (yaEsta) return

  const { error } = await admin.from('credit_ledger').insert([
    {
      profile_id: perfilId,
      delta: coste,
      reason: 'pack_purchase',
      booking_id: bookingId,
      note: 'Pago por evento',
    },
    {
      profile_id: perfilId,
      delta: -coste,
      reason: 'event_charge',
      booking_id: bookingId,
      note: 'Pago por evento',
    },
  ] as never)

  // No tumba la confirmación: el dinero ya está cobrado y la reserva
  // confirmada. Perder el apunte es malo; no confirmar un pago que sí entró,
  // peor. Se grita en el log para poder cuadrarlo después.
  if (error) console.error('[creditos] no se anotó el pago por evento', bookingId, error)
}

/**
 * El abono de quien pagó y no se sentó.
 *
 * Al repartir siempre puede sobrar gente: las mesas son de seis y las reglas
 * son duras, así que con siete apuntados hay uno que no entra. Ese uno pagó
 * igual, y hasta ahora se le cobraba por una mesa que no tuvo — el panel
 * prometía «su crédito no se toca» y el libro decía lo contrario.
 *
 * Se anota una devolución, no se borra el cargo: el libro cuenta lo que pasó
 * —compró, se le cobró, no entró, se le devolvió— y el saldo queda en uno,
 * listo para la próxima fecha sin volver a pagar.
 */
export async function abonarSinMesa(perfilId: string, eventoId: string): Promise<void> {
  const admin = createAdminClient()

  // La reserva de esta persona en ESTA fecha: el abono se ata a ella para
  // poder no repetirlo y para que se vea de qué fecha viene.
  const { data: reserva } = await admin
    .from('bookings')
    .select('id')
    .eq('profile_id', perfilId)
    .eq('event_id', eventoId)
    .maybeSingle()

  if (!reserva) return

  // Idempotente: publicar dos veces no abona dos veces.
  const { data: yaEsta } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('booking_id', reserva.id)
    .eq('reason', 'refund')
    .limit(1)
    .maybeSingle()

  if (yaEsta) return

  // Y solo si de verdad se le cobró algo: quien no tiene cargo en esta
  // reserva no tiene nada que abonar, y regalarle un crédito sería inventar
  // dinero.
  const { data: cargo } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('booking_id', reserva.id)
    .eq('reason', 'event_charge')
    .limit(1)
    .maybeSingle()

  if (!cargo) return

  const { error } = await admin.from('credit_ledger').insert({
    profile_id: perfilId,
    delta: 1,
    reason: 'refund',
    booking_id: reserva.id,
    note: 'No entró en mesa esta fecha',
  } as never)

  if (error) console.error('[creditos] no se abonó la mesa no conseguida', reserva.id, error)
}

/**
 * Deshace el abono por mesa no conseguida cuando esa persona SÍ acaba sentada.
 *
 * Es el camino de al lado del de arriba y llega igual de fácil: se publica
 * todo, quien no entró recibe su abono; alguien se cae, se despublica una
 * mesa, se vuelve a repartir y ahora sí entra. El `refund` seguía puesto, así
 * que cenaba y se quedaba con el crédito. Cena gratis, y no por un fallo
 * raro: por el flujo que el panel ofrece.
 *
 * No se BORRA la fila del abono. El libro de créditos es un libro: se apunta
 * el contrario y quedan las dos, que es como se ve después qué pasó. Borrar
 * dejaría un saldo correcto y una historia que no cuenta nada.
 *
 * Idempotente por el mismo par que el abono: si ya hay una retirada para esa
 * reserva, no se apunta otra. Y si no hay abono que retirar, no hace nada —
 * quien nunca estuvo en la espera no tiene nada que devolver.
 */
export async function retirarAbonoSinMesa(perfilId: string, eventoId: string): Promise<void> {
  const admin = createAdminClient()

  const { data: reserva } = await admin
    .from('bookings')
    .select('id')
    .eq('profile_id', perfilId)
    .eq('event_id', eventoId)
    .maybeSingle()

  if (!reserva) return

  const { data: abono } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('booking_id', reserva.id)
    .eq('reason', 'refund')
    .limit(1)
    .maybeSingle()

  if (!abono) return

  // ¿Ya se retiró? La retirada es un `event_charge` con su nota: el motivo no
  // es un cargo nuevo por cenar —ese ya está— sino la vuelta atrás de la
  // devolución, y `credit_reason_t` no tiene un valor mejor. La nota es lo
  // que lo distingue del cargo original al mirar el libro.
  const NOTA = 'Entró en mesa: se retira el abono por mesa no conseguida'

  const { data: yaRetirado } = await admin
    .from('credit_ledger')
    .select('id')
    .eq('booking_id', reserva.id)
    .eq('note', NOTA)
    .limit(1)
    .maybeSingle()

  if (yaRetirado) return

  const { error } = await admin.from('credit_ledger').insert({
    profile_id: perfilId,
    delta: -1,
    reason: 'event_charge',
    booking_id: reserva.id,
    note: NOTA,
  } as never)

  if (error) console.error('[creditos] no se retiró el abono', reserva.id, error)
}
