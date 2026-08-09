import { NextResponse } from 'next/server'
import { z } from 'zod'

import { PESOS, repartir, roturas, desglose, type Persona } from '@/lib/reparto/repartir'
import { exigirOps } from '@/lib/ops'
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

  return NextResponse.json({
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
    .select('id, seats_per_table')
    .eq('id', eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })

  const { data: pool, error: errorPool } = await admin
    .from('v_matching_pool')
    .select('*')
    .eq('event_id', eventoId)

  if (errorPool) {
    console.error('[repartir] pool', errorPool)
    return NextResponse.json({ error: 'No pudimos leer los apuntados.' }, { status: 500 })
  }

  const ids = (pool ?? []).map((p) => p.profile_id).filter((id): id is string => id != null)

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .in('id', ids)

  const { data: encuentros } = await admin
    .from('pair_encounters')
    .select('profile_a, profile_b')
    .gt('last_met_at', new Date(Date.now() - 182 * 86400_000).toISOString())

  const { data: exclusiones } = await admin.from('exclusions').select('profile_a, profile_b')

  // Un solo mapa: "con quién no puede sentarse". Al matcher le da igual si
  // el motivo fue una exclusión o que ya cenaron en marzo.
  const vetos = new Map<string, Set<string>>()
  for (const { profile_a, profile_b } of [...(encuentros ?? []), ...(exclusiones ?? [])]) {
    if (!vetos.has(profile_a)) vetos.set(profile_a, new Set())
    if (!vetos.has(profile_b)) vetos.set(profile_b, new Set())
    vetos.get(profile_a)!.add(profile_b)
    vetos.get(profile_b)!.add(profile_a)
  }

  const nombreDe = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name || p.full_name?.split(' ')[0] || '—']),
  )

  const personas: Persona[] = (pool ?? []).map((p) => ({
    profileId: p.profile_id as string,
    bookingId: p.booking_id as string,
    nombre: nombreDe.get(p.profile_id as string) ?? '—',
    edad: p.age,
    genero: p.gender,
    arraigo: p.rootedness,
    sector: p.industry,
    empresa: p.employer_key,
    energia: p.social_energy,
    tramoGasto: p.budget_tier,
    intereses: p.interests ?? [],
    temas: p.conversation_topics ?? [],
    idiomas: p.languages ?? ['es'],
    vetados: vetos.get(p.profile_id as string) ?? new Set<string>(),
  }))

  const r = repartir(personas, evento.seats_per_table ?? 6, pesos)

  const propuesta = r.mesas.map((mesa, i) => ({
    numero: i + 1,
    puntuacion: Number(r.puntuaciones[i].toFixed(3)),
    desglose: desglose(mesa),
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
  }))

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
