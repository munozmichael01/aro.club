import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Marcar dónde grabamos: una mesa, o una fecha entera.
 *
 * Michael, 17-10: «que se informe al momento de armar la mesa, puede ser un
 * check de permisos de contenido, entonces las mesas marcadas, se las
 * enviamos. Podría estar a nivel de mesa y a nivel de fecha».
 *
 * Marcar enciende dos cosas a la vez, y por eso vive en un solo sitio: el
 * bloque del correo de la revelación —que se compone al enviar, así que
 * marcar antes de esa hora basta— y la pregunta de permiso en Mi mesa.
 *
 * Lo que NO hace es borrar lo que la gente ya contestó. Desmarcar una mesa
 * apaga la pregunta, y las respuestas se quedan donde están: si mañana se
 * vuelve a grabar ahí, quien ya dijo que no sigue diciendo que no.
 */

const cuerpo = z.union([
  z.object({ mesaId: z.string().uuid(), graba: z.boolean() }),
  z.object({ eventoId: z.string().uuid(), graba: z.boolean() }),
])

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data

  if ('mesaId' in d) {
    const { error } = await admin
      .from('dinner_tables')
      .update({ grabacion: d.graba } as never)
      .eq('id', d.mesaId)

    if (error) {
      console.error('[grabacion] mesa', error)
      return NextResponse.json({ error: 'No pudimos marcarla.' }, { status: 500 })
    }

    // Queda anotado contra la fecha: la mesa no es una entidad del registro
    // y lo que importa para mirar atrás es en qué noche se grabó.
    await anotar(actor, 'mesas_repartidas', 'evento', d.mesaId, { grabacion: d.graba, mesa: d.mesaId })
    return NextResponse.json({ estado: 'marcada', graba: d.graba })
  }

  const { error } = await admin
    .from('events')
    .update({ grabacion: d.graba } as never)
    .eq('id', d.eventoId)

  if (error) {
    console.error('[grabacion] fecha', error)
    return NextResponse.json({ error: 'No pudimos marcarla.' }, { status: 500 })
  }

  await anotar(actor, 'mesas_repartidas', 'evento', d.eventoId, { grabacion: d.graba })
  return NextResponse.json({ estado: 'marcada', graba: d.graba })
}
