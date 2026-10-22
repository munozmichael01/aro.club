import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * Qué crédito se puede devolver, y hasta cuándo.
 *
 * Vive aquí y no en la ruta porque lo preguntan tres sitios: la ruta que
 * recibe la solicitud, Mi mesa y Mi cuenta. Con una copia en cada uno, la
 * pantalla acabaría enseñando un botón que el servidor niega, que es el peor
 * de los dos errores posibles.
 */

/** Tres días desde que se quedó sin mesa. Después el crédito sigue siendo crédito. */
export const DIAS_DE_PLAZO = 3

/**
 * El crédito que se puede devolver, si lo hay.
 *
 * Vive aquí y lo usan las dos puertas —esta ruta y las pantallas que enseñan
 * el botón— porque dos ideas de «se puede pedir» acaban enseñando un botón
 * que el servidor niega.
 */
export async function reembolsable(
  admin: ReturnType<typeof createAdminClient>,
  perfilId: string,
) {
  const desde = new Date(Date.now() - DIAS_DE_PLAZO * 86400_000).toISOString()

  // El abono de quedarse sin mesa, el más reciente que siga en plazo.
  const { data: abonos } = await admin
    .from('credit_ledger')
    .select('id, created_at, booking_id')
    .eq('profile_id', perfilId)
    .eq('reason', 'refund')
    .gt('delta', 0)
    .gte('created_at', desde)
    .order('created_at', { ascending: false })
    .limit(1)

  const abono = (abonos ?? [])[0]
  if (!abono) return null

  // ¿Ya se pidió? Una solicitud por crédito, lo garantiza también el índice.
  const { data: yaPedido } = await admin
    .from('refund_requests')
    .select('id, estado, solicitado_at, reembolsado_at, referencia, monto_ves, tasa')
    .eq('credito_id', abono.id)
    .maybeSingle()

  /**
   * Y que el crédito SIGA ahí.
   *
   * El saldo sale del libro entero. Si volvió a reservar con él, ya no hay
   * nada que devolver, y lo correcto es decirlo y no descubrirlo al pagar.
   */
  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', perfilId)
    .maybeSingle()

  // Cuánto costó esa plaza: de la fecha de SU reserva, no de una constante.
  let precio = 0
  if (abono.booking_id) {
    const { data: r } = await admin
      .from('bookings')
      .select('events!bookings_event_id_fkey(price_usd)')
      .eq('id', abono.booking_id)
      .maybeSingle()
    const ev = r?.events as unknown as { price_usd: number | null } | null
    precio = Number(ev?.price_usd ?? 0)
  }

  return {
    abono,
    solicitud: yaPedido ?? null,
    saldo: Number(saldo?.balance ?? 0),
    precio,
    hasta: new Date(Date.parse(abono.created_at) + DIAS_DE_PLAZO * 86400_000).toISOString(),
  }
}

