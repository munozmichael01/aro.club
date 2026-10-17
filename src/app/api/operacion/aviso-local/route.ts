import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * «Ya se lo dije al local».
 *
 * No avisa a nadie: deja escrito lo que se dijo por teléfono y cuándo. A
 * partir de ahí la tarjeta de la mesa puede decir sola si lo que el
 * restaurante tiene apuntado sigue siendo verdad.
 *
 * Michael, 17-10, después de contarle a Pizza Tua cuatro versiones en un
 * día: dos mesas de seis, una de seis y una de cinco, solo una de seis, y
 * al final cinco. Cada cambio invitaba a volver a llamar porque no había
 * forma de saber qué sabía ya el local.
 *
 * El número se cuenta AQUÍ y no se recibe de la pantalla: lo que se registra
 * tiene que ser lo que de verdad hay sentado en ese momento, no lo que la
 * pantalla tuviera pintado.
 */

const cuerpo = z.object({
  mesaId: z.string().uuid(),
  // Para desmarcarlo si se marcó por error.
  borrar: z.boolean().optional(),
})

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  if (parsed.data.borrar) {
    const { error } = await admin
      .from('dinner_tables')
      .update({ avisado_local_at: null, avisado_local_num: null } as never)
      .eq('id', parsed.data.mesaId)

    if (error) {
      console.error('[aviso-local] no se pudo borrar', error)
      return NextResponse.json({ error: 'No pudimos quitarlo.' }, { status: 500 })
    }
    return NextResponse.json({ estado: 'sin-avisar' })
  }

  const { count } = await admin
    .from('table_members')
    .select('profile_id', { count: 'exact', head: true })
    .eq('table_id', parsed.data.mesaId)

  const cuantos = count ?? 0

  const { data: mesa, error } = await admin
    .from('dinner_tables')
    .update({ avisado_local_at: new Date().toISOString(), avisado_local_num: cuantos } as never)
    .eq('id', parsed.data.mesaId)
    .select('event_id, table_number')
    .maybeSingle()

  if (error) {
    console.error('[aviso-local] no se pudo guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  if (mesa?.event_id) {
    await anotar(actor, 'mesas_repartidas', 'evento', mesa.event_id, {
      avisoAlLocal: { mesa: mesa.table_number, cuantos },
    })
  }

  return NextResponse.json({ estado: 'avisado', cuantos })
}
