import { NextResponse } from 'next/server'
import { z } from 'zod'

import { PESOS, repartir, roturas, desglose, resumen, zonasDe, type Persona } from '@/lib/reparto/repartir'
import { exigirOps } from '@/lib/ops'
import { construirPool } from '@/lib/reparto/pool'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El reparto PROPONE. Una persona confirma (HANDOFF-4 §4.2).
 *
 * Por eso la propuesta se guarda en `matching_runs` y no se materializa en
 * `dinner_tables` ni `table_members` hasta publicar. No es un matiz: el
 * trigger de `table_members` registra los pares en `pair_encounters`, así
 * que crear las mesas al proponer haría que dos personas figuren como
 * "ya se vieron" por una cena que nadie confirmó y que puede no ocurrir.
 */

const cuerpo = z.object({
  eventoId: z.string().uuid(),
  pesos: z
    .object({
      cohesion: z.number(),
      sector: z.number(),
      arraigo: z.number(),
      energia: z.number(),
      novedad: z.number(),
    })
    .optional(),
})

/**
 * El estado actual: la próxima fecha, quién está apuntado y la última
 * propuesta sin publicar. El panel lo lee de aquí en vez de traerse su
 * propia idea de cuánta gente hay.
 */
export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, starts_at, booking_closes_at, seats_per_table, status, restaurants!events_restaurant_id_fkey(name)')
    .in('status', ['draft', 'open', 'locked', 'matched'])
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!evento) return NextResponse.json({ evento: null })

  const { data: pool } = await admin
    .from('v_matching_pool')
    .select('profile_id')
    .eq('event_id', evento.id)

  const { count: reservas } = await admin
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', evento.id)
    .eq('status', 'confirmed')

  // Los sectores viajan por codigo estable. La etiqueta vive en las
  // opciones de la pregunta y se resuelve ahi, igual que en Mi mesa: un
  // mapa aqui seria un segundo catalogo que se desincroniza.
  const { data: preguntaSector } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiquetaDe = new Map(
    ((preguntaSector?.options ?? []) as { value: string; label: string }[]).map((o) => [
      o.value,
      o.label,
    ]),
  )

  const { data: corrida } = await admin
    .from('matching_runs')
    .select('id, proposal, unmatched, avg_score, is_published, created_at')
    .eq('event_id', evento.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Las sedes abiertas, para que el panel pueda ofrecer el cambio de sitio
  // sin inventarse candidatos.
  const { data: sedesRaw } = await admin
    .from('event_venues')
    .select('zone_slug, restaurant_id, restaurants(name), zones(name)')
    .eq('event_id', evento.id)

  return NextResponse.json({
    sedes: (sedesRaw ?? []).map((v) => ({
      zona: v.zone_slug,
      zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
      restaurantId: v.restaurant_id,
      nombre: (v.restaurants as unknown as { name: string } | null)?.name ?? null,
    })),
    evento: {
      id: evento.id,
      empiezaEn: evento.starts_at,
      cierraEn: evento.booking_closes_at,
      estado: evento.status,
      // Hoy hay un restaurante por fecha. Con el modelo de zonas sera uno
      // por zona, y esto pasara a salir de la mesa.
      restaurante:
        (evento.restaurants as unknown as { name: string } | null)?.name ?? null,
    },
    apuntados: reservas ?? 0,
    // Apuntados que NO entran al reparto: sin verificar o sin rasgos. Es la
    // diferencia entre quien se apuntó y quien puede sentarse.
    fueraDelPool: Math.max(0, (reservas ?? 0) - (pool ?? []).length),
    corrida: corrida
      ? {
          id: corrida.id,
          publicada: corrida.is_published,
          propuesta: ((corrida.proposal ?? []) as unknown as {
            integrantes: { sector: string | null }[]
          }[]).map((m) => ({
            ...m,
            integrantes: (m.integrantes ?? []).map((p) => ({
              ...p,
              sector: p.sector ? (etiquetaDe.get(p.sector) ?? p.sector) : null,
            })),
          })),
          espera: corrida.unmatched,
          media: corrida.avg_score,
        }
      : null,
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const { eventoId } = parsed.data
  const pesos = parsed.data.pesos ?? PESOS
  const admin = createAdminClient()
  const arranque = Date.now()

  const { data: evento } = await admin
    .from('events')
    .select('id')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  // El mismo pool que usa retocar la propuesta. Con dos construcciones, una
  // validaria contra datos distintos de los que se usaron para proponer.
  const pool = await construirPool(admin, eventoId)
  const sedes = pool.sedes
  const personas = pool.personas

  if (!sedes.length) {
    return NextResponse.json(
      { error: 'Esta fecha no tiene ninguna zona abierta. Abre al menos una antes de repartir.' },
      { status: 409 },
    )
  }

  const r = repartir(personas, pool.porMesa, pesos)

  // Cada mesa cae en una de las zonas que aceptan los seis, y ahí se le da
  // sitio. El aforo se respeta: si Cardenal aguanta dos mesas, la tercera
  // va al siguiente sitio de esa zona.
  const ocupacion = new Map<string, number>()
  const sedeDe = (zona: string) => {
    const candidatas = sedes.filter((v) => v.zona === zona)
    for (const v of candidatas) {
      const usadas = ocupacion.get(v.restaurantId) ?? 0
      if (usadas < v.maxMesas) {
        ocupacion.set(v.restaurantId, usadas + 1)
        return { restaurantId: v.restaurantId, nombre: v.nombre }
      }
    }
    return null
  }

  const propuesta = r.mesas.map((mesa, i) => {
    const zonasPosibles = zonasDe(mesa)
    // Reparto estable: entre varias zonas válidas, la primera por orden
    // alfabético. Elegir "la que tenga más sitio" haría que el mismo pool
    // diera repartos distintos según en qué orden se procesaran las mesas.
    const zona = zonasPosibles[0] ?? null
    const sede = zona ? sedeDe(zona) : null
    return {
    numero: i + 1,
    zona,
    zonasPosibles,
    restaurantId: sede?.restaurantId ?? null,
    restaurante: sede?.nombre ?? null,
    puntuacion: Number(r.puntuaciones[i].toFixed(3)),
    desglose: desglose(mesa),
    // Lo que comparten, para poder decidir con criterio y no solo con un
    // numero. Va en la propuesta y no se recalcula en la pantalla.
    resumen: resumen(mesa),
    roturas: roturas(mesa),
    // La aritmética del panel sale de aquí; nada se escribe a mano.
    integrantes: mesa.map((p) => ({
      profileId: p.profileId,
      bookingId: p.bookingId,
      nombre: p.nombre,
      edad: p.edad,
      genero: p.genero,
      empresa: p.empresa,
      sector: p.sector,
    })),
    }
  })

  // Una mesa sin sitio no se puede publicar: el aforo de la zona se agotó.
  for (const m of propuesta) {
    if (!m.restaurantId) {
      m.roturas = [
        ...m.roturas,
        { regla: 'sede', detalle: m.zona ? 'sin sitio libre en ' + m.zona : 'sin zona común' },
      ]
    }
  }

  const { data: corrida, error: errorCorrida } = await admin
    .from('matching_runs')
    .insert({
      event_id: eventoId,
      algo_version: 'v1',
      weights: pesos,
      pool_size: personas.length,
      tables_created: r.mesas.length,
      avg_score: Number(r.media.toFixed(3)),
      min_score: r.puntuaciones.length ? Number(Math.min(...r.puntuaciones).toFixed(3)) : null,
      runtime_ms: Date.now() - arranque,
      is_published: false,
      unmatched: r.espera.map((p) => ({ profileId: p.profileId, nombre: p.nombre })) as never,
      created_by: actor,
      proposal: propuesta as never,
    })
    .select('id')
    .single()

  if (errorCorrida) {
    console.error('[repartir] no se guardó la corrida', errorCorrida)
    return NextResponse.json({ error: 'No pudimos guardar la propuesta.' }, { status: 500 })
  }

  return NextResponse.json({
    corridaId: corrida.id,
    apuntados: personas.length,
    mesas: r.mesas.length,
    espera: r.espera.length,
    media: Number(r.media.toFixed(3)),
    propuesta,
  })
}
