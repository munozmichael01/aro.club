import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { encolar } from '@/lib/correos'
import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Abrir una fecha.
 *
 * No existía. Ni en el panel ni en ninguna ruta: los eventos aparecían en la
 * base porque alguien —yo, con un script de pruebas— insertaba filas a mano.
 * Todo lo demás del producto cuelga de que haya una fecha abierta: sin ella
 * nadie reserva, nadie paga y no hay mesas que repartir. Era el agujero más
 * grande y no lo vio nadie porque siempre había una fecha puesta a mano.
 *
 * Las tres horas NO se piden: se derivan de la fecha y del formato, que es
 * como funciona el club. Pedirlas sería dejar que alguien abra una cena que
 * cierra después de empezar.
 *
 *   empieza  el día elegido, a la hora del formato
 *   cierra   48 h antes  — el tiempo que necesita el reparto
 *   revela   ese mismo día a las 12:00 — «todo se abre a mediodía»
 *
 * Al abrirla se avisa a quien tenga alguna de esas zonas entre las suyas y
 * el aviso encendido. Es la plantilla 11 de Design, que hasta ahora no podía
 * dispararse porque no había forma de abrir una fecha.
 */

/** Caracas, cuatro horas por detrás de UTC y sin horario de verano. */
const CARACAS = 4

/**
 * A qué hora empieza cada formato, hora de Caracas.
 *
 * Los once del enum, no los cuatro que enseña la interfaz: «Movimiento» es
 * una familia —caminar, correr, pádel— y cada uno tiene su hora. Si el
 * formato no está aquí, la cena es la hora por defecto.
 */
const HORA_DE: Record<string, number> = {
  dinner: 19, foodie_dinner: 19, women_dinner: 19,
  drinks: 20, coffee: 10,
  walk: 9, hike: 7, run: 6, padel: 8, pilates: 8, cycling: 6,
}

/** Cuánto antes cierra: el reparto necesita el pool cerrado dos días antes. */
const HORAS_DE_CIERRE = 48

/** Y a mediodía se revela todo. */
const HORA_REVELACION = 12

function enUTC(dia: string, horaCaracas: number): Date {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d, horaCaracas + CARACAS, 0, 0, 0))
}

const cuerpo = z.object({
  // Solo el día. La hora la pone el formato.
  dia: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha no se entiende.'),
  formato: z
    .enum([
      'dinner', 'foodie_dinner', 'women_dinner', 'coffee', 'drinks',
      'walk', 'hike', 'run', 'padel', 'pilates', 'cycling',
    ])
    .default('dinner'),
  ciudad: z.string().min(2).max(40).default('caracas'),
  precioUsd: z.number().positive().max(500).default(8),
  // Dónde puede caer, y en qué local. El restaurante NO es opcional: es lo
  // que se revela el jueves a mediodía, y una zona sin sitio es una mesa que
  // no se puede reservar a nombre de nadie.
  zonas: z
    .array(
      z.object({
        zona: z.string().regex(/^[a-z-]+$/),
        // El mensaje tambien cuando falta del todo: zod dice "expected
        // string, received undefined" y eso no se lo enseño a nadie.
        restauranteId: z
          .string({ error: 'Falta el restaurante de esa zona.' })
          .uuid('Falta el restaurante de esa zona.'),
        maxMesas: z.number().int().positive().max(20).nullable().optional(),
      }),
    )
    .min(1, 'Elige al menos una zona.'),
})

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Revisa los datos.' },
      { status: 400 },
    )
  }

  const d = parsed.data
  const empieza = enUTC(d.dia, HORA_DE[d.formato] ?? 19)
  const cierra = new Date(empieza.getTime() - HORAS_DE_CIERRE * 3600_000)
  const revela = enUTC(d.dia, HORA_REVELACION)

  // Una fecha que ya cerró nace muerta: nadie puede apuntarse.
  if (cierra.getTime() <= Date.now()) {
    return NextResponse.json(
      { error: 'Esa fecha cierra en el pasado: hacen falta 48 horas de margen.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  // Dos fechas del mismo formato el mismo día parten el pool en dos y ninguna
  // llena. Si de verdad hacen falta dos, se abren en días distintos.
  const { data: yaHay } = await admin
    .from('events')
    .select('id')
    .eq('city_slug', d.ciudad)
    .eq('format', d.formato)
    .gte('starts_at', enUTC(d.dia, 0).toISOString())
    .lt('starts_at', enUTC(d.dia, 24).toISOString())
    .maybeSingle()

  if (yaHay) {
    return NextResponse.json({ error: 'Ya hay una fecha de ese tipo ese día.' }, { status: 409 })
  }

  const { data: evento, error } = await admin
    .from('events')
    .insert({
      format: d.formato,
      starts_at: empieza.toISOString(),
      booking_closes_at: cierra.toISOString(),
      reveal_at: revela.toISOString(),
      city_slug: d.ciudad,
      price_usd: d.precioUsd,
      status: 'open',
    } as never)
    .select('id')
    .single()

  if (error || !evento) {
    console.error('[fechas] no se creó', error)
    return NextResponse.json({ error: 'No pudimos abrir la fecha.' }, { status: 500 })
  }

  const { error: errorZonas } = await admin.from('event_venues').insert(
    d.zonas.map((z) => ({
      event_id: evento.id,
      zone_slug: z.zona,
      restaurant_id: z.restauranteId,
      max_tables: z.maxMesas ?? null,
    })) as never,
  )

  // Si las zonas no entran, la fecha se deshace. Sin ellas es un evento al
  // que nadie puede apuntarse, y dejarlo ahí es peor que no haberlo creado:
  // sale en la agenda, la gente lo ve y el reparto no tiene dónde sentarla.
  if (errorZonas) {
    console.error('[fechas] zonas', errorZonas)
    await admin.from('events').delete().eq('id', evento.id)
    return NextResponse.json(
      { error: 'No pudimos guardar las zonas. La fecha no se abrió.' },
      { status: 500 },
    )
  }

  await anotar(actor, 'fecha_abierta', 'evento', evento.id, {
    dia: d.dia,
    formato: d.formato,
    zonas: d.zonas.map((z) => z.zona),
  })

  // --- el aviso, a quien le sirva ---------------------------------------
  //
  // A quien tenga alguna de esas zonas Y el aviso encendido. Las dos
  // condiciones: escribir a quien no puede llegar es ruido, y escribir a
  // quien lo apagó es ignorar lo que nos pidió.
  const slugs = d.zonas.map((z) => z.zona)

  const { data: candidatos } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'zonas')

  const interesados = (candidatos ?? [])
    .filter((a) => Array.isArray(a.value) && (a.value as string[]).some((z) => slugs.includes(z)))
    .map((a) => a.profile_id)

  let avisados = 0
  if (interesados.length) {
    const { data: perfiles } = await admin
      .from('profiles')
      .select('id, notificaciones')
      .in('id', interesados)
      .is('deleted_at', null)

    for (const p of perfiles ?? []) {
      // Encendido por defecto: solo se salta a quien lo apagó a propósito.
      const avisos = (p.notificaciones ?? {}) as Record<string, boolean>
      if (avisos.apertura_zona === false) continue

      await encolar({ perfil: p.id }, 'abrimos_zona', { zonas: slugs, dia: d.dia }, { eventoId: evento.id })
      avisados++
    }
  }

  return NextResponse.json({
    estado: 'abierta',
    id: evento.id,
    empiezaEn: empieza.toISOString(),
    cierraEn: cierra.toISOString(),
    revelaEn: revela.toISOString(),
    avisados,
  })
}
