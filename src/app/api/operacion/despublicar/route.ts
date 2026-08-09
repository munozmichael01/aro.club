import { NextResponse } from 'next/server'
import { z } from 'zod'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Deshacer una mesa ya publicada.
 *
 * Publicar por tandas sin poder deshacer deja un callejón sin salida: si te
 * equivocas al cerrar la 02, no hay forma de volver, y eso se descubre el
 * jueves a las once.
 *
 * Lo que NO se deshace: los correos que ya salieron. La gente ya los leyó, y
 * borrar el registro no deshace el correo — solo nos deja sin saber qué se
 * mandó. Si ya salieron, se avisa para que se les escriba a mano.
 */

const cuerpo = z.object({
  corridaId: z.string().uuid(),
  mesa: z.number().int().positive(),
})

type Mesa = { numero: number; publicada?: boolean }

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: corrida } = await admin
    .from('matching_runs')
    .select('id, event_id, proposal')
    .eq('id', parsed.data.corridaId)
    .maybeSingle()

  if (!corrida) return NextResponse.json({ error: 'Esa corrida no existe.' }, { status: 404 })

  const { data: mesa } = await admin
    .from('dinner_tables')
    .select('id, table_number')
    .eq('event_id', corrida.event_id)
    .eq('table_number', parsed.data.mesa)
    .maybeSingle()

  if (!mesa) {
    return NextResponse.json({ error: 'Esa mesa no está publicada.' }, { status: 409 })
  }

  // Si algún correo ya salió, deshacer la mesa no lo desmanda. Se avisa
  // antes de tocar nada, porque cambia lo que hay que hacer después.
  const { data: miembros } = await admin
    .from('table_members')
    .select('profile_id')
    .eq('table_id', mesa.id)

  const perfiles = (miembros ?? []).map((m) => m.profile_id)

  const { count: yaSalieron } = await admin
    .from('scheduled_emails')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', corrida.event_id)
    .eq('kind', 'mesa_asignada')
    .not('sent_at', 'is', null)
    .in('profile_id', perfiles.length ? perfiles : ['00000000-0000-0000-0000-000000000000'])

  const { data: resultado, error } = await admin.rpc('despublicar_mesa', {
    p_table_id: mesa.id,
  })

  if (error) {
    console.error('[despublicar] no se pudo', error)
    return NextResponse.json({ error: 'No pudimos deshacer la mesa.' }, { status: 500 })
  }

  // La propuesta deja de darla por cerrada, para que el próximo reparto la
  // vuelva a considerar.
  const mesas = (corrida.proposal ?? []) as unknown as Mesa[]
  for (const m of mesas) {
    if (m.numero === parsed.data.mesa) m.publicada = false
  }

  await admin
    .from('matching_runs')
    .update({ proposal: mesas as never, is_published: false })
    .eq('id', corrida.id)

  const retirados = (resultado as unknown as { correos_retirados: number }[] | null)?.[0]
    ?.correos_retirados

  return NextResponse.json({
    estado: 'deshecha',
    correosRetirados: retirados ?? 0,
    // Cuántos avisos ya no se pueden retirar. Si hay alguno, hay que
    // escribirle a esa gente a mano: el sistema no puede arreglarlo.
    correosYaEnviados: yaSalieron ?? 0,
    personas: perfiles.length,
  })
}
