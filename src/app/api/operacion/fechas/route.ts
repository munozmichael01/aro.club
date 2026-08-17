import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { encolar } from '@/lib/correos'
import { FAMILIA_DE_FORMATO, MOVIMIENTO } from '@/lib/formatos'
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
 *   revela   a las 12:00 — del día ANTERIOR si el plan es de mañana
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

/**
 * Cuándo se revela: mediodía, sí, pero no siempre del mismo día.
 *
 * «Todo se abre a las 12:00» se escribió mirando una cena, que empieza a las
 * siete. Siete de los once formatos empiezan por la mañana —un hiking a las
 * 7:00, un run a las 6:00— y para esos el mediodía del propio día llega con
 * la actividad ya terminada: la mesa se revelaría después de la caminata.
 *
 * Así que la regla se deriva de la hora de inicio en vez de estar escrita a
 * mano: si el plan es de mañana, se revela el mediodía ANTERIOR. Sigue siendo
 * «a mediodía» —lo que promete la portada y lo que dice el pie de todos los
 * correos— y sigue dejando la tarde entera para leerlo.
 */
function revelacionDe(dia: string, horaDeInicio: number): Date {
  const mediodia = enUTC(dia, HORA_REVELACION)
  if (horaDeInicio >= HORA_REVELACION) return mediodia
  return new Date(mediodia.getTime() - 24 * 3600_000)
}

/** El día de la semana de una fecha del calendario. 0 = domingo, como getDay(). */
function diaDeLaSemana(dia: string): number {
  const [a, m, d] = dia.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

/**
 * Si ese sitio puede recibir esa fecha. Devuelve el problema, o null.
 *
 * Vive aparte porque se pregunta dos veces: al abrir, si ya se sabe el sitio,
 * y al elegirlo después —que es el caso normal—. Con la comprobación escrita
 * solo en el alta, añadir un sitio más tarde se saltaba las cuatro.
 */
async function revisarSitio(
  admin: ReturnType<typeof createAdminClient>,
  restauranteId: string,
  zona: string,
  diaSemana: number,
  formato: string,
): Promise<string | null> {
  const { data: local } = await admin
    .from('restaurants')
    .select('id, name, zone_slug, open_days, is_active, formats')
    .eq('id', restauranteId)
    .maybeSingle()

  if (!local) return 'Ese sitio no existe.'
  if (local.is_active === false) return `${local.name} está dado de baja.`
  if (local.zone_slug && local.zone_slug !== zona) return `${local.name} no está en esa zona.`

  const abre = local.open_days ?? []
  if (abre.length && !abre.includes(diaSemana)) {
    return `${local.name} no abre ese día de la semana.`
  }

  // Y que sirva para lo que se hace: un sitio de coffee no recibe una cena.
  const sirve = (local.formats ?? []) as string[]
  if (sirve.length && !sirve.includes(formato)) {
    const familia = FAMILIA_DE_FORMATO[formato] ?? formato
    return `${local.name} no sirve para ${familia}.`
  }

  return null
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
  // Ocho dólares es el arranque, no una constante: un pádel no cuesta lo que
  // una cena, y el día que cambie el precio no puede hacer falta un deploy.
  precioUsd: z.number().positive().max(500).default(8),
  // Cuántos por mesa. Seis en una cena, pero una caminata de seis no es lo
  // mismo que una de doce, y el reparto ya lee esta columna.
  porMesa: z.number().int().min(2).max(20).default(6),
  // Qué se hace. Para una cena el sitio ES el plan y esto sobra; para los
  // siete formatos de movimiento el punto de encuentro no dice nada de la
  // ruta, los kilómetros ni el nivel, y salir sin decirlo es mandar a
  // alguien a un sitio a las siete de la mañana sin saber a qué.
  actividad: z
    .object({
      ruta: z.string().trim().min(1, 'Di qué se hace.').max(160),
      km: z.number().positive().max(300).nullable().optional(),
      minutos: z.number().int().positive().max(600).nullable().optional(),
      nivel: z.enum(['suave', 'medio', 'exigente']).nullable().optional(),
    })
    .nullable()
    .optional(),
  // Dónde puede caer. El local es OPCIONAL aquí a propósito.
  //
  // Elegirlo al abrir es elegirlo a ciegas: la decisión buena depende de
  // cuánta gente se apunte —cuántas mesas hacen falta—, de cuántas aguanta
  // cada sitio y de cosas de negocio que no se saben el lunes. Y el miembro
  // no ve el sitio hasta la revelación, así que congelarlo antes no compra
  // nada. Se elige antes de publicar, que es lo que sí lo congela.
  zonas: z
    .array(
      z.object({
        zona: z.string().regex(/^[a-z-]+$/),
        restauranteId: z.string().uuid().nullable().optional(),
        maxMesas: z.number().int().positive().max(20).nullable().optional(),
      }),
    )
    .min(1, 'Elige al menos una zona.'),
})
  // La actividad es obligatoria en movimiento y solo ahí. Va aquí y no en el
  // campo porque depende del formato, y la base tiene el mismo check: que el
  // mensaje sea bueno es cosa de esta capa, que no entre sin ella es de la
  // otra.
  .refine((d) => !MOVIMIENTO.includes(d.formato) || d.actividad != null, {
    path: ['actividad'],
    error: 'Di qué se hace: la ruta, y si puedes los kilómetros y el nivel.',
  })

/**
 * Las fechas vivas, para elegir cuál se reparte.
 *
 * El panel enseñaba una sola: la ruta de reparto coge la siguiente por orden
 * y no acepta ningún parámetro, así que con tres fechas abiertas —una cena,
 * un coffee y una caminata— solo se podía trabajar la primera y las otras dos
 * eran invisibles hasta que la primera pasara.
 *
 * Devuelve lo que hace falta para el riel de fechas: qué es, cuándo, cuánto
 * queda para que cierre, y cuánta gente apuntada hay en cada zona —que es lo
 * que dice si esa zona da para una mesa o no—.
 */
export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: eventos } = await admin
    .from('events')
    .select('id, format, starts_at, booking_closes_at, reveal_at, status, seats_per_table, price_usd, activity, city_slug')
    .in('status', ['draft', 'open', 'locked', 'matched'])
    .order('starts_at', { ascending: true })

  const ids = (eventos ?? []).map((e) => e.id)
  const vacio = ['00000000-0000-0000-0000-000000000000']

  const { data: sedes } = await admin
    .from('event_venues')
    .select('id, event_id, zone_slug, restaurant_id, max_tables, restaurants(name, max_tables, commission_pct), zones(name)')
    .in('event_id', ids.length ? ids : vacio)

  // Quién está apuntado y a qué zonas dijo que sí. Del pool, no de bookings a
  // secas: quien no está verificado no se sienta, y contarlo aquí haría creer
  // que una zona da para una mesa que luego no sale.
  const { data: pool } = await admin
    .from('v_matching_pool')
    .select('event_id, profile_id, zones')
    .in('event_id', ids.length ? ids : vacio)

  // Una fila en `dinner_tables` ES una mesa publicada: el reparto vive en la
  // propuesta de la corrida y solo baja aquí al publicarse.
  const { data: mesas } = await admin
    .from('dinner_tables')
    .select('event_id')
    .in('event_id', ids.length ? ids : vacio)

  const fechas = (eventos ?? []).map((e) => {
    const suyas = (sedes ?? []).filter((v) => v.event_id === e.id)
    const suPool = (pool ?? []).filter((p) => p.event_id === e.id)
    const susMesas = (mesas ?? []).filter((m) => m.event_id === e.id)

    return {
      id: e.id,
      formato: e.format,
      empiezaEn: e.starts_at,
      cierraEn: e.booking_closes_at,
      revelaEn: e.reveal_at,
      estado: e.status,
      porMesa: e.seats_per_table ?? 6,
      precioUsd: e.price_usd != null ? Number(e.price_usd) : null,
      actividad: e.activity ?? null,
      apuntados: suPool.length,
      publicadas: susMesas.length,
      zonas: suyas.map((v) => {
        const local = v.restaurants as unknown as {
          name: string
          max_tables: number | null
          commission_pct: number | null
        } | null
        return {
          sedeId: v.id,
          zona: v.zone_slug,
          zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
          restauranteId: v.restaurant_id,
          restaurante: local?.name ?? null,
          // Cuántas mesas aguanta ese sitio esa noche. Lo que se puso a mano
          // para esta fecha manda sobre lo que dice la ficha.
          aguanta: v.max_tables ?? local?.max_tables ?? null,
          comision: local?.commission_pct != null ? Number(local.commission_pct) : null,
          // Los apuntados que aceptan ESTA zona. Alguien que acepta tres cuenta
          // en las tres: puede acabar sentado en cualquiera de ellas.
          apuntados: suPool.filter((p) => ((p.zones ?? []) as string[]).includes(v.zone_slug ?? '')).length,
        }
      }),
    }
  })

  // Y lo que hace falta decidir todavía. Se calcula aquí y no en la pantalla
  // porque es la pregunta que hace útil este listado: dónde no tenemos sitio
  // para la gente que ya se apuntó.
  const conAviso = fechas.map((f) => {
    const porZona = new Map<string, { apuntados: number; aguanta: number; sitios: number }>()
    for (const z of f.zonas) {
      const antes = porZona.get(z.zona ?? '') ?? { apuntados: 0, aguanta: 0, sitios: 0 }
      porZona.set(z.zona ?? '', {
        // Los apuntados de una zona son los mismos aunque haya dos sitios.
        apuntados: Math.max(antes.apuntados, z.apuntados),
        aguanta: antes.aguanta + (z.restauranteId ? (z.aguanta ?? 0) : 0),
        sitios: antes.sitios + (z.restauranteId ? 1 : 0),
      })
    }

    const avisos: { zona: string; hacenFalta: number; aguanta: number; sinSitio: boolean }[] = []
    for (const [zona, d] of porZona) {
      // Una estimación, no el reparto: cuántas mesas daría esa zona si toda
      // su gente cupiera junta. El reparto real es global y puede dar menos.
      const hacenFalta = Math.floor(d.apuntados / (f.porMesa || 6))
      if (hacenFalta > 0 && (d.sitios === 0 || d.aguanta < hacenFalta)) {
        avisos.push({ zona, hacenFalta, aguanta: d.aguanta, sinSitio: d.sitios === 0 })
      }
    }

    return { ...f, faltaSitio: avisos }
  })

  return NextResponse.json({ fechas: conAviso })
}

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
  const horaDeInicio = HORA_DE[d.formato] ?? 19
  const empieza = enUTC(d.dia, horaDeInicio)
  const cierra = new Date(empieza.getTime() - HORAS_DE_CIERRE * 3600_000)
  const revela = revelacionDe(d.dia, horaDeInicio)

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

  // --- que los sitios elegidos puedan de verdad ------------------------
  //
  // Un sitio cerrado los jueves no puede recibir la cena del jueves. La
  // columna existe desde hace días y no la miraba nadie: el alta la guardaba
  // y aquí se abría la fecha igual, así que el error solo aparecía cuando
  // seis personas llegaban a una puerta cerrada.
  //
  // Y de paso la zona: si el local está en Altamira, no puede ser el sitio de
  // la zona de Las Mercedes, por mucho que quien abre la fecha lo escriba.
  const diaSemana = diaDeLaSemana(d.dia)

  // Solo las zonas que traen sitio: abrir sin decidirlo es lo normal.
  const conSitio = d.zonas.filter((z) => z.restauranteId != null)

  for (const z of conSitio) {
    const problema = await revisarSitio(admin, z.restauranteId as string, z.zona, diaSemana, d.formato)
    if (problema) {
      return NextResponse.json({ error: problema }, { status: 400 })
    }
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
      seats_per_table: d.porMesa,
      activity: d.actividad ?? null,
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
    porMesa: d.porMesa,
    precioUsd: d.precioUsd,
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
    // La pantalla enseña las tres antes de abrir, para que quien abre vea qué
    // está prometiendo. Se devuelven también después, que es lo que queda
    // escrito en el registro.
    porMesa: d.porMesa,
    avisados,
  })
}

/**
 * Elegir, cambiar o quitar el sitio de una zona, con la fecha ya abierta.
 *
 * Es donde se toma de verdad la decisión, y no existía: `event_venues` se
 * escribía al abrir y ninguna ruta lo volvía a tocar. Elegir el sitio el lunes
 * es elegirlo a ciegas —no se sabe cuánta gente vendrá ni cuántas mesas hacen
 * falta— y además deja fuera lo que hace que la elección sea buena: la
 * comisión, cómo salieron las mesas anteriores, si el sitio aguanta las tres
 * mesas que hoy hacen falta o solo dos.
 *
 * Una zona admite VARIOS sitios en la misma fecha, y eso es la respuesta al
 * aforo: si hacen falta tres mesas en Las Mercedes y Cardenal da para dos, no
 * se sientan dos —se añade otro sitio de Las Mercedes—.
 *
 * Se puede hasta que se publica. Publicar es lo que le dice a la gente dónde,
 * y a partir de ahí cambiarlo sería mandarlos a otro sitio.
 */
const sitio = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('poner'),
    eventoId: z.string().uuid(),
    zona: z.string().regex(/^[a-z-]+$/),
    restauranteId: z.string().uuid(),
    maxMesas: z.number().int().positive().max(20).nullable().optional(),
  }),
  z.object({
    accion: z.literal('quitar'),
    eventoId: z.string().uuid(),
    sedeId: z.string().uuid(),
  }),
  z.object({
    accion: z.literal('cerrar-zona'),
    eventoId: z.string().uuid(),
    zona: z.string().regex(/^[a-z-]+$/),
  }),
])

export async function PATCH(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = sitio.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Petición inválida.' },
      { status: 400 },
    )
  }

  const d = parsed.data
  const admin = createAdminClient()

  const { data: evento } = await admin
    .from('events')
    .select('id, format, starts_at, status')
    .eq('id', d.eventoId)
    .maybeSingle()

  if (!evento) return NextResponse.json({ error: 'Esa fecha no existe.' }, { status: 404 })
  if (evento.status === 'cancelled') {
    return NextResponse.json({ error: 'Esa fecha está cancelada.' }, { status: 409 })
  }

  if (d.accion === 'quitar') {
    // Una zona que ya tiene mesas publicadas ahí no puede quedarse sin sitio:
    // esa gente ya sabe dónde va.
    const { data: sede } = await admin
      .from('event_venues')
      .select('id, restaurant_id, zone_slug')
      .eq('id', d.sedeId)
      .eq('event_id', d.eventoId)
      .maybeSingle()

    if (!sede) return NextResponse.json({ error: 'Ese sitio no está en esta fecha.' }, { status: 404 })

    if (sede.restaurant_id) {
      const { count } = await admin
        .from('dinner_tables')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', d.eventoId)
        .eq('restaurant_id', sede.restaurant_id)

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Ya hay mesas publicadas ahí. Despublícalas antes de quitarlo.' },
          { status: 409 },
        )
      }
    }

    // Quitar el sitio NO cierra la zona.
    //
    // Son dos cosas distintas y confundirlas hace daño: «este sitio ya no me
    // vale» deja la zona abierta esperando otro, y borrar la fila la cerraría
    // —la gente que aceptó Las Mercedes dejaría de tener dónde caer, sin que
    // nadie lo haya decidido—. Si la zona tiene más sitios, la fila sobra; si
    // es el último, se queda vacía y el listado avisa de que falta elegir.
    const { count: otros } = await admin
      .from('event_venues')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', d.eventoId)
      .eq('zone_slug', sede.zone_slug ?? '')
      .neq('id', d.sedeId)

    if ((otros ?? 0) > 0) {
      await admin.from('event_venues').delete().eq('id', d.sedeId)
    } else {
      await admin
        .from('event_venues')
        .update({ restaurant_id: null, max_tables: null } as never)
        .eq('id', d.sedeId)
    }

    await anotar(actor, 'fecha_abierta', 'evento', d.eventoId, {
      cambio: 'sitio_quitado',
      zona: sede.zone_slug,
      zonaSigueAbierta: (otros ?? 0) === 0,
    })
    return NextResponse.json({ estado: 'quitado', zonaSigueAbierta: (otros ?? 0) === 0 })
  }

  if (d.accion === 'cerrar-zona') {
    // Esto sí la cierra: la fecha deja de abrir esa zona. Quien la aceptaba
    // se queda sin sitio donde caer en esta fecha, así que no puede ser el
    // efecto lateral de cambiar de restaurante.
    const { data: sedes } = await admin
      .from('event_venues')
      .select('id, restaurant_id')
      .eq('event_id', d.eventoId)
      .eq('zone_slug', d.zona)

    if (!sedes?.length) {
      return NextResponse.json({ error: 'Esa zona no está abierta en esta fecha.' }, { status: 404 })
    }

    const conLocal = sedes.map((s) => s.restaurant_id).filter((x): x is string => x != null)
    if (conLocal.length) {
      const { count } = await admin
        .from('dinner_tables')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', d.eventoId)
        .in('restaurant_id', conLocal)

      if ((count ?? 0) > 0) {
        return NextResponse.json(
          { error: 'Ya hay mesas publicadas en esa zona. Despublícalas antes de cerrarla.' },
          { status: 409 },
        )
      }
    }

    await admin.from('event_venues').delete().eq('event_id', d.eventoId).eq('zone_slug', d.zona)
    await anotar(actor, 'fecha_abierta', 'evento', d.eventoId, { cambio: 'zona_cerrada', zona: d.zona })
    return NextResponse.json({ estado: 'zona-cerrada' })
  }

  // Poner: las mismas cuatro comprobaciones que al abrir. El día de la semana
  // sale de la fecha real, en hora de Caracas: en UTC un jueves de 19:00 ya es
  // viernes, y con el día equivocado un sitio correcto saldría rechazado.
  const diaCaracas = new Date(new Date(evento.starts_at).getTime() - CARACAS * 3600_000)
  const problema = await revisarSitio(
    admin,
    d.restauranteId,
    d.zona,
    diaCaracas.getUTCDay(),
    evento.format,
  )
  if (problema) return NextResponse.json({ error: problema }, { status: 400 })

  // La fila sin sitio de esa zona es la que se rellena. Si ya tiene sitio, se
  // añade otra: dos sitios en la misma zona es exactamente lo que hace falta
  // cuando una sola no da para las mesas que hay.
  const { data: hueco } = await admin
    .from('event_venues')
    .select('id')
    .eq('event_id', d.eventoId)
    .eq('zone_slug', d.zona)
    .is('restaurant_id', null)
    .maybeSingle()

  const fila = {
    event_id: d.eventoId,
    zone_slug: d.zona,
    restaurant_id: d.restauranteId,
    max_tables: d.maxMesas ?? null,
  }

  const { error } = hueco
    ? await admin.from('event_venues').update(fila as never).eq('id', hueco.id)
    : await admin.from('event_venues').insert(fila as never)

  if (error) {
    // 23505: ese sitio ya estaba puesto en esta fecha.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ese sitio ya está en esta fecha.' }, { status: 409 })
    }
    console.error('[fechas] no se pudo poner el sitio', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  await anotar(actor, 'fecha_abierta', 'evento', d.eventoId, {
    cambio: 'sitio_puesto',
    zona: d.zona,
    restauranteId: d.restauranteId,
  })

  return NextResponse.json({ estado: 'puesto' })
}
