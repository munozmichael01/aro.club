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
