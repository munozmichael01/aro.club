import 'server-only'

import { DENTRO, horaDe, type PlanDentro } from '@/lib/reglas'
import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * El comprobante de un pago, armado con lo que se REPORTÓ.
 *
 * Pago lo armaba en la pantalla con el método que tuviera elegido en ese
 * momento y el precio de ahora. Recién reportado coincide; al volver otro día,
 * el método elegido es el primero de la lista —no el que usó— y el importe,
 * el de hoy. Un comprobante tiene que decir lo que pasó, y eso solo lo sabe
 * la fila de `payments`.
 *
 * Lo enseñan Pago y «Estás dentro» (debajo, como en la app). Una sola forma de
 * escribirlo.
 */
export type FilaComprobante = { campo: string; valor: string; fuerte: boolean }

const dinero = (n: number | null | undefined, moneda: string) =>
  n == null ? null : n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' ' + moneda

export async function comprobanteDe(admin: Admin, bookingId: string, plan: PlanDentro) {
  const { data: pago } = await admin
    .from('payments')
    .select('status, metodo, moneda, amount_usd, amount_local, fx_rate')
    .eq('booking_id', bookingId)
    .in('status', ['awaiting_proof', 'under_review', 'confirmed'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  // Con crédito no hay pago, y con un código del 100 % no hay nada que contar.
  if (!pago || !pago.metodo || pago.metodo === 'cupon') return null

  const { data: metodo } = await admin.from('payment_methods').select('nombre').eq('id', pago.metodo).maybeSingle()
  const z = plan.zonaHoraria
  const confirmado = pago.status === 'confirmed'
  const usd = Number(pago.amount_usd)
  const enSuMoneda = pago.moneda === 'VES' ? dinero(Number(pago.amount_local), 'Bs') : dinero(usd, pago.moneda ?? 'USD')

  const filas: [string, string | null, boolean][] = [
    [DENTRO.planDe(plan.formato), [DENTRO.diaYNumero(plan.empiezaEn, z), horaDe(plan.empiezaEn, z)].filter(Boolean).join(', '), false],
    ['Zona', DENTRO.zonasEnTexto(plan.zonas) || 'Se sabe al abrirse', false],
    ['Método', metodo?.nombre ?? pago.metodo, false],
    // La tasa que se CONGELÓ al reportar, no la de ahora.
    ['Tasa aplicada', pago.fx_rate ? dinero(Number(pago.fx_rate), 'Bs') + ' por ref' : null, false],
    [confirmado ? 'Pagado' : 'Reportaste', [enSuMoneda, dinero(usd, 'ref')].filter(Boolean).join(' · '), true],
  ]
  return {
    confirmado,
    filas: filas.filter((f): f is [string, string, boolean] => !!f[1]).map(([campo, valor, fuerte]) => ({ campo, valor, fuerte })),
  }
}
