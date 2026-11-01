import { NextResponse } from 'next/server'

import { comprobanteDe } from '@/lib/comprobante'
import { invitacionDe, marcarVisto, reservaDentro } from '@/lib/estas-dentro'
import { DENTRO } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Estás dentro»: la reserva viva, su plan y el código para compartirlo.
 *
 * La pide la pantalla `/estas-dentro` y la hoja «Comparte tu plan», que se
 * abre también desde Mi mesa. `?evento=` elige la fecha; sin él, la próxima.
 * Sin reserva viva responde `{ reserva: null }` y la pantalla se va a Mi
 * cuenta: no hay nada que celebrar.
 *
 * Los textos NO viajan aquí: salen de `AroReglas.DENTRO`, que la pantalla ya
 * carga. Esto solo trae los datos.
 */
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const evento = new URL(request.url).searchParams.get('evento')
  const admin = createAdminClient()
  const d = await reservaDentro(admin, user.id, evento)
  if (!d) return NextResponse.json({ reserva: null })

  const conTarjetas = DENTRO.conTarjetas(d.plan.formato)
  const [invitar, comprobante] = await Promise.all([
    invitacionDe(admin, user.id),
    comprobanteDe(admin, d.reservaId, d.plan),
  ])
  return NextResponse.json({
    reserva: { id: d.reservaId, eventoId: d.eventoId, pendiente: d.pendiente, revelado: d.revelado, visto: d.visto },
    plan: d.plan,
    invitar,
    /** Lo que reportó, como en la app debajo de «Estás dentro». Null con crédito o cupón. */
    comprobante,
    /** Las tarjetas que se ofrecen, en orden; vacío si el plan no tiene. */
    variantes: conTarjetas ? DENTRO.variantes(!!invitar, d.plan.formato) : [],
  })
}

/**
 * «Ya la vi». Lo manda la pantalla al abrirse, también con el pago solo
 * reportado (Michael, 31-10): desde ese momento Mi cuenta, Mi mesa y Pago
 * dejan de llevar aquí, y al confirmarse no vuelve a salir.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const cuerpo = (await request.json().catch(() => null)) as { reservaId?: unknown } | null
  if (typeof cuerpo?.reservaId !== 'string') return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  await marcarVisto(createAdminClient(), user.id, cuerpo.reservaId)
  return NextResponse.json({ ok: true })
}
