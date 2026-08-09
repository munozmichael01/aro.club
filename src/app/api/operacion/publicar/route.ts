import { NextResponse } from 'next/server'
import { z } from 'zod'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Publicar la propuesta: aquí es donde las mesas empiezan a existir.
 *
 * Dos cosas que el contrato pide y que no son adorno:
 *
 *  - Nada se publica solo. Esto lo dispara una persona, y queda con su
 *    nombre en la corrida.
 *  - Al publicar, los correos NO salen: quedan programados para el jueves
 *    a las 12:00 en punto. La revelación es el producto; adelantarla lo
 *    rompe.
 */

const cuerpo = z.object({
  corridaId: z.string().uuid(),
  // Publicar con avisos es una decisión, no un descuido: hay que pedirlo.
  forzar: z.boolean().optional(),
})

type Rotura = { regla: string; detalle: string }

type MesaPropuesta = {
  numero: number
  puntuacion: number
  desglose: Record<string, number>
  roturas?: Rotura[]
  integrantes: { profileId: string; bookingId: string }[]
}

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
    .select('id, event_id, proposal, is_published')
    .eq('id', parsed.data.corridaId)
    .maybeSingle()

  if (!corrida) return NextResponse.json({ error: 'Esa corrida no existe.' }, { status: 404 })
  if (corrida.is_published) {
    return NextResponse.json({ error: 'Esa corrida ya está publicada.' }, { status: 409 })
  }

  const { data: evento } = await admin
    .from('events')
    .select('id, reveal_at, restaurant_id')
    .eq('id', corrida.event_id)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  const mesas = (corrida.proposal ?? []) as unknown as MesaPropuesta[]
  if (!mesas.length) {
    return NextResponse.json({ error: 'La propuesta está vacía.' }, { status: 400 })
  }

  // El freno. El reparto ya apuntó qué reglas duras no pudo cumplir; hasta
  // ahora nadie leía ese campo y se publicaba igual.
  const conRoturas = mesas
    .filter((m) => (m.roturas ?? []).length > 0)
    .map((m) => ({ mesa: m.numero, roturas: m.roturas ?? [] }))

  if (conRoturas.length && !parsed.data.forzar) {
    return NextResponse.json(
      {
        error: 'Esta propuesta rompe reglas duras.',
        // Qué está roto, para poder decidir con el dato delante y no a ciegas.
        roturas: conRoturas,
        // El camino existe: la decisión es de quien lleva la operación.
        sePuedeForzar: true,
      },
      { status: 409 },
    )
  }

  // Publicar dos veces duplicaba los encuentros: borrar las mesas arrastra
  // a sus miembros, pero pair_encounters es un acumulado que el trigger ya
  // habia incrementado. Esto lo descuenta antes de volver a sentar.
  const { error: errorLimpieza } = await admin.rpc('despublicar_evento', {
    p_event_id: corrida.event_id,
  })
  if (errorLimpieza) {
    console.error('[publicar] no se pudo deshacer lo anterior', errorLimpieza)
    return NextResponse.json({ error: 'No pudimos publicar las mesas.' }, { status: 500 })
  }

  const creadas: string[] = []
  for (const mesa of mesas) {
    const { data: fila, error } = await admin
      .from('dinner_tables')
      .insert({
        event_id: corrida.event_id,
        run_id: corrida.id,
        table_number: mesa.numero,
        score: mesa.puntuacion,
        score_breakdown: mesa.desglose as never,
        restaurant_id: evento.restaurant_id,
      })
      .select('id')
      .single()

    if (error || !fila) {
      console.error('[publicar] no se creó la mesa', error)
      return NextResponse.json({ error: 'No pudimos publicar las mesas.' }, { status: 500 })
    }

    // Este insert dispara el trigger que registra los pares: a partir de
    // aquí estas seis personas cuentan como que se vieron.
    const { error: errorMiembros } = await admin.from('table_members').insert(
      mesa.integrantes.map((p, i) => ({
        table_id: fila.id,
        profile_id: p.profileId,
        booking_id: p.bookingId,
        seat_order: i + 1,
      })),
    )

    if (errorMiembros) {
      console.error('[publicar] no se sentaron', errorMiembros)
      return NextResponse.json({ error: 'No pudimos publicar las mesas.' }, { status: 500 })
    }

    creadas.push(fila.id)
  }

  // Los correos quedan EN COLA para la hora de la revelación. No salen.
  const aviso = mesas.flatMap((mesa) =>
    mesa.integrantes.map((p) => ({
      profile_id: p.profileId,
      kind: 'mesa_asignada' as const,
      event_id: corrida.event_id,
      send_at: evento.reveal_at,
      payload: { mesa: mesa.numero },
    })),
  )

  const { data: encolados, error: errorCorreos } = await admin
    .from('scheduled_emails')
    .upsert(aviso as never, { onConflict: 'profile_id,kind,event_id' })
    .select('id')

  if (errorCorreos) {
    // Las mesas ya existen; sin correos nadie se entera de su mesa, así que
    // esto no puede quedarse en un aviso en el registro.
    console.error('[publicar] cola de correos', errorCorreos)
    return NextResponse.json(
      { error: 'Las mesas quedaron publicadas pero los avisos no se programaron. Vuelve a publicar.' },
      { status: 500 },
    )
  }

  await admin
    .from('matching_runs')
    .update({
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: actor,
      // Si se forzó, queda escrito qué se aceptó y quién lo aceptó. Dentro
      // de un mes, ante una mesa que salió mal, la pregunta es si veníamos
      // avisados; sin esto no hay forma de responderla.
      published_breaks: conRoturas.length ? (conRoturas as never) : null,
      forced_by: conRoturas.length ? actor : null,
      forced_at: conRoturas.length ? new Date().toISOString() : null,
    })
    .eq('id', corrida.id)

  await admin.from('events').update({ status: 'matched' }).eq('id', corrida.event_id)

  return NextResponse.json({
    estado: 'publicado',
    mesas: creadas.length,
    // El número real de filas encoladas, no el de la lista que se intentó:
    // reportar 12 habiendo guardado 0 es peor que fallar.
    correosProgramados: encolados?.length ?? 0,
    // Se devuelve lo aceptado para que el panel pueda decirlo, no para
    // enterrarlo en el registro.
    publicadoConAvisos: conRoturas.length ? conRoturas : null,
    // La hora exacta a la que saldrán, para que el panel la enseñe.
    saldranEn: evento.reveal_at,
  })
}
