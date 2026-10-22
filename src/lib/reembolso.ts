import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * Los bolívares, como se escriben aquí.
 *
 * El correo decía «9931.76 Bs», con el punto de programar y sin miles. Lo
 * que esa persona busca en su banco es «9.931,76».
 */
export const enBolivares = (n: number) =>
  Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

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


/**
 * El bloque que leen las pantallas, con el mismo nombre en las tres.
 *
 * `puede` dice si va el botón. `estado` manda sobre él: con una solicitud
 * viva se enseña el acuse, no el botón, porque pedirlo dos veces no es una
 * opción que exista.
 */
export async function bloqueDeReembolso(
  admin: ReturnType<typeof createAdminClient>,
  perfilId: string,
) {
  const r = await reembolsable(admin, perfilId)
  if (!r) return { puede: false, estado: null }

  const { data: tasa } = await admin
    .from('fx_rates')
    .select('ves_por_ref')
    .order('rate_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const laTasa = tasa ? Number(tasa.ves_por_ref) : null
  const s = r.solicitud as {
    estado?: string
    solicitado_at?: string
    reembolsado_at?: string | null
    referencia?: string | null
    monto_ves?: number | null
    tasa?: number | null
  } | null

  return {
    // Sin solicitud, con el crédito todavía en el saldo y con tasa que
    // enseñarle: las tres cosas, o el botón promete algo que no ocurre.
    puede: !s && r.saldo >= 1 && laTasa != null,
    hasta: r.hasta,
    precio: r.precio,
    // Lo que va a recibir, ya calculado. Michael: «así sabe cuánto va a
    // recibir». Si ya lo pidió, el de su solicitud y no el de hoy.
    montoBs: s?.monto_ves != null
      ? Number(s.monto_ves)
      : (laTasa != null ? Number((r.precio * laTasa).toFixed(2)) : null),
    tasa: s?.tasa != null ? Number(s.tasa) : laTasa,
    estado: s?.estado ?? null,
    solicitadoEn: s?.solicitado_at ?? null,
    reembolsadoEn: s?.reembolsado_at ?? null,
    referencia: s?.referencia ?? null,
  }
}
