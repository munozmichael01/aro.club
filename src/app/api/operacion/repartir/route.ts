import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { PESOS, repartir, roturas, evaluacion, desglose, resumen, zonasDe } from '@/lib/reparto/repartir'
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
  /**
   * Dejar que la última mesa salga corta.
   *
   * Por defecto NO: una mesa es de seis, y bajarlo por defecto convierte la
   * promesa del club en «los que haya». Esto es la salida para cuando una
   * fecha no llena y hay que decidir —hacerla con cinco o mandarlos a la
   * espera—, y es una decisión de quien reparte, con su nombre en el
   * historial.
   */
  conCorta: z.boolean().default(false),
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
export async function GET(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  // Cuál se reparte. Sin decir nada, la siguiente por fecha —que es lo que
  // hacía y sigue valiendo para el caso normal—; con `eventoId`, esa. Con
  // tres fechas abiertas a la vez, quedarse siempre con la primera dejaba las
  // otras dos sin forma de tocarlas desde el panel.
  const pedido = new URL(request.url).searchParams.get('eventoId')

  const consulta = admin
    .from('events')
    .select('id, starts_at, booking_closes_at, reveal_at, seats_per_table, status, format, restaurants!events_restaurant_id_fkey(name)')

  const { data: evento } = pedido
    ? await consulta.eq('id', pedido).maybeSingle()
    : await consulta
        .in('status', ['draft', 'open', 'locked', 'matched'])
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle()

  if (!evento) return NextResponse.json({ evento: null })

  const { data: pool } = await admin
    .from('v_matching_pool')
    .select('profile_id, zones, age, gender, industry, employer_key, budget_tier, dietary')
    .eq('event_id', evento.id)

  // Quiénes son, no cuántos.
  //
  // Hasta ahora esto devolvía solo el número y el panel no podía enseñar a
  // nadie hasta que hubiera una corrida: entrabas a una fecha con dos
  // apuntados, veías «2» y ninguna cara. Pero apuntarse pasa antes de
  // repartir, y saber quién se apuntó es justo lo que hace falta para decidir
  // si vale la pena repartir ya o esperar a que entre más gente.
  const { data: nombres } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .in('id', (pool ?? []).map((x) => x.profile_id).filter((x): x is string => !!x))

  const nombreDe = new Map(
    (nombres ?? []).map((n) => [n.id, n.display_name || n.full_name || 'Sin nombre']),
  )

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

  /**
   * Y LOS LOCALES QUE TODAVÍA NO ESTÁN PUESTOS, por zona.
   *
   * Sin esto, elegir el local desde la mesa solo funcionaba si la fecha YA
   * tenía uno: `sedes` son las sedes de la fecha, y mientras ninguna tiene
   * restaurante la lista está vacía y la mesa no ofrece nada.
   *
   * Que es exactamente el caso de hoy —las tres fechas con las dos zonas
   * abiertas y cero locales— así que la pantalla mandaba a Fechas a poner
   * uno y volver. Dos pestañas para una decisión que se toma mirando la
   * mesa.
   *
   * Con su problema dicho si lo tienen, y las mismas reglas que aplica
   * `/api/operacion/fechas` al guardar: ofrecer lo que la otra ruta va a
   * rechazar es ofrecer un error.
   */
  const { data: candidatos } = await admin
    .from('restaurants')
    .select('id, name, zone_slug, open_days, is_active, formats, commission_pct')
    .order('name')

  // El día de la semana EN CARACAS. Una cena del viernes a las 7:30 p.m. es
  // sábado en UTC, y un sitio que no abre sábados parecería cerrado el día
  // que abre.
  const diaCaracas = new Date(new Date(evento.starts_at).getTime() - 4 * 3600_000).getUTCDay()

  /**
   * Lo que hace falta para pintar la corrida guardada: comidas, gasto y si
   * tiene cara. Son tres consultas y solo cuando hay corrida.
   */
  /**
   * De quién hay que saber la edad, la empresa, lo que come y lo que gasta.
   *
   * Los de las mesas propuestas, los de la espera y —cuando todavía no se ha
   * repartido— los apuntados. Las tres listas se miran para lo mismo, así
   * que las tres llevan la misma ficha. Que a una le faltara era lo que
   * convertía la decisión en dos decisiones distintas.
   */
  const idsGuardados = [
    ...new Set(
      [
        ...((corrida?.proposal ?? []) as unknown as { integrantes: { profileId: string }[] }[])
          .flatMap((m) => (m.integrantes ?? []).map((p) => p.profileId)),
        ...((corrida?.unmatched ?? []) as unknown as { profileId: string }[]).map(
          (p) => p.profileId,
        ),
        ...(pool ?? []).map((x) => x.profile_id as string),
      ].filter(Boolean),
    ),
  ]

  const { data: rasgosGuardados } = idsGuardados.length
    ? await admin
        .from('profile_traits')
        .select('profile_id, cuisines, budget_tier, age, gender, industry, employer, dietary')
        .in('profile_id', idsGuardados)
    : { data: [] }

  const dietaGuardada = new Map(
    (rasgosGuardados ?? []).map((r) => [r.profile_id, (r.dietary ?? []) as string[]]),
  )
  const comidaGuardada = new Map(
    (rasgosGuardados ?? []).map((r) => [r.profile_id, (r.cuisines ?? []) as string[]]),
  )
  const gastoGuardado = new Map(
    (rasgosGuardados ?? []).map((r) => [r.profile_id, r.budget_tier as number | null]),
  )
  // La espera guardada no lleva edad ni empresa: solo nombre. Se completan
  // aquí, que es donde ya estamos leyendo los rasgos.
  const rasgoGuardado = new Map(
    (rasgosGuardados ?? []).map((r) => [
      r.profile_id,
      { edad: r.age, genero: r.gender, sector: r.industry, empresa: r.employer, dietas: (r.dietary ?? []) as string[] },
    ]),
  )

  const { data: carasGuardadas } = idsGuardados.length
    ? await admin
        .from('verifications')
        .select('profile_id')
        .eq('kind', 'selfie')
        .eq('status', 'approved')
        .not('storage_path', 'is', null)
        .in('profile_id', idsGuardados)
    : { data: [] }

  const caraGuardada = new Set((carasGuardadas ?? []).map((v) => v.profile_id))

  /**
   * Quién salió de la propuesta guardada sin que la propuesta se enterara.
   *
   * Entre repartir y publicar pasan horas, y en esas horas la gente cancela,
   * se cambia de fecha o la mueve operación. El 13-10 se repartió el sábado
   * normal y media hora después Luis se fue a la cena de mayores de 40: su
   * nombre se quedó en la propuesta vieja, así que salía en las dos.
   */
  const enLaPropuesta = corrida
    ? [
        ...new Set(
          ((corrida.proposal ?? []) as unknown as { integrantes: { profileId: string }[] }[])
            .flatMap((m) => (m.integrantes ?? []).map((p) => p.profileId))
            .filter(Boolean),
        ),
      ]
    : []

  const { data: siguenApuntados } = enLaPropuesta.length
    ? await admin
        .from('bookings')
        .select('profile_id')
        .eq('event_id', evento.id)
        .eq('status', 'confirmed')
        .in('profile_id', enLaPropuesta)
    : { data: [] }

  const vivos = new Set((siguenApuntados ?? []).map((b) => b.profile_id))
  const seGuardaronYNoEstan = enLaPropuesta.filter((id) => !vivos.has(id)).length

  // Cuánta gente se ha apuntado DESPUÉS de la corrida que se está viendo.
  const { count: reservasNuevas } = corrida
    ? await admin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', evento.id)
        .eq('status', 'confirmed')
        .gt('created_at', corrida.created_at)
    : { count: 0 }

  return NextResponse.json({
    sedes: (sedesRaw ?? []).map((v) => ({
      zona: v.zone_slug,
      zonaNombre: (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug,
      restaurantId: v.restaurant_id,
      nombre: (v.restaurants as unknown as { name: string } | null)?.name ?? null,
    })),
    // Con qué se puede llenar una zona que todavía no tiene local, para
    // poder hacerlo desde la mesa y no desde otra pestaña.
    locales: (candidatos ?? []).map((l) => ({
      id: l.id,
      nombre: l.name,
      zona: l.zone_slug,
      comision: l.commission_pct != null ? Number(l.commission_pct) : null,
      problema: !l.is_active
        ? `${l.name} está dado de baja.`
        : (l.open_days ?? []).length && !(l.open_days ?? []).includes(diaCaracas)
          ? `${l.name} no abre ese día.`
          : (l.formats ?? []).length && !(l.formats ?? []).includes(evento.format)
            ? `${l.name} no sirve para este formato.`
            : null,
    })),
    evento: {
      id: evento.id,
      empiezaEn: evento.starts_at,
      cierraEn: evento.booking_closes_at,
      // Cuándo se cuenta el sitio. El panel lo necesita para saber si una
      // mesa publicada todavía admite cambio de local: antes de esta hora
      // nadie tiene la dirección.
      revelaEn: evento.reveal_at,
      estado: evento.status,
      // El formato manda el vocabulario: una caminata tiene grupos y punto de
      // encuentro, no mesas y restaurante. La pantalla no puede deducirlo.
      formato: evento.format,
      // Hoy hay un restaurante por fecha. Con el modelo de zonas sera uno
      // por zona, y esto pasara a salir de la mesa.
      restaurante:
        (evento.restaurants as unknown as { name: string } | null)?.name ?? null,
    },
    apuntados: reservas ?? 0,
    // Los que entran al reparto, con nombre y con las zonas que aceptan. El
    // panel los enseña mientras no hay corrida.
    pool: (pool ?? []).map((x) => ({
      profileId: x.profile_id,
      nombre: nombreDe.get(x.profile_id as string) ?? 'Sin nombre',
      zonas: (x.zones ?? []) as string[],
      // La misma ficha que en una mesa: esta lista es la de antes de
      // repartir, y se mira exactamente para lo mismo.
      edad: x.age,
      genero: x.gender,
      sector: x.industry,
      empresa: x.employer_key,
      tramoGasto: x.budget_tier,
      dietas: (x.dietary ?? []) as string[],
      comidas: comidaGuardada.get(x.profile_id as string) ?? [],
      foto: caraGuardada.has(x.profile_id as string)
        ? `/api/operacion/cara?perfil=${x.profile_id}`
        : null,
    })),
    // Apuntados que NO entran al reparto: sin verificar o sin rasgos. Es la
    // diferencia entre quien se apuntó y quien puede sentarse.
    fueraDelPool: Math.max(0, (reservas ?? 0) - (pool ?? []).length),
    corrida: corrida
      ? {
          id: corrida.id,
          publicada: corrida.is_published,
          /**
           * La propuesta GUARDADA, con lo de mirar puesto al día.
           *
           * `matching_runs.proposal` se escribió el día que alguien pulsó
           * repartir, y el panel lee eso. Así que todo lo que se añada
           * después para MIRAR —la cara, en qué comida coinciden, cuánto
           * espera gastar cada uno— no aparece hasta que se vuelve a
           * repartir, y volver a repartir mueve a seis personas de sitio.
           * Michael lo vio hoy: las fotos salían y el presupuesto decía «—»,
           * porque su corrida era de entre los dos despliegues.
           *
           * `sector` ya se traducía aquí por lo mismo. Esto extiende la idea
           * a los tres campos nuevos: lo que la mesa ES se queda como se
           * guardó —quién se sienta con quién, eso no se toca sin repartir—
           * y lo que la mesa SE VE se resuelve al leer.
           */
          propuesta: ((corrida.proposal ?? []) as unknown as {
            integrantes: { profileId: string; sector: string | null }[]
          }[]).map((m) => ({
            ...m,
            integrantes: (m.integrantes ?? []).map((p) => ({
              ...p,
              sector: p.sector ? (etiquetaDe.get(p.sector) ?? p.sector) : null,
              comidas: comidaGuardada.get(p.profileId) ?? [],
              dietas: dietaGuardada.get(p.profileId) ?? [],
              tramoGasto: gastoGuardado.get(p.profileId) ?? null,
              foto: caraGuardada.has(p.profileId)
                ? `/api/operacion/cara?perfil=${p.profileId}`
                : null,
            })),
          })),
          // Lo mismo que la propuesta: lo que la espera ES se guardó, y lo
          // que se VE se resuelve al leer.
          /**
           * CUÁNDO se calculó, y a cuánta gente no ha visto.
           *
           * El panel enseñaba «12 apuntados» —la cifra de ahora mismo— al
           * lado de una propuesta de anoche con siete, sin nada que
           * explicara la diferencia. Michael lo leyó como que faltaba gente
           * en las mesas, y era que la propuesta no había visto a los cinco
           * que se apuntaron después.
           *
           * No se recalcula sola a propósito: repartir mueve a todo el mundo
           * de sitio y eso es una decisión, no un refresco. Lo que faltaba
           * era decirlo.
           */
          creadaEn: corrida.created_at,
          nuevosDesde: (reservasNuevas ?? 0),
          // Y quién de la propuesta YA NO está apuntado a esta fecha.
          // Publicar los sentaría en una cena que no es la suya: el servidor
          // ya se niega, pero verlo antes de pulsar ahorra el viaje.
          yaNoEstan: seGuardaronYNoEstan,
          /**
           * LA ESPERA, MÁS QUIEN LLEGÓ DESPUÉS.
           *
           * `unmatched` es la foto de quién se quedó fuera CUANDO se
           * repartió. Quien reserva más tarde no está en ninguna mesa ni en
           * esa lista, así que no aparecía por ningún lado: lo único que lo
           * delataba era el «N nuevos desde entonces» de arriba, y la única
           * salida que ofrecía la pantalla era volver a repartir — que mueve
           * a todo el mundo de sitio.
           *
           * Michael, hoy: «¿por qué me haces volver a repartir cuando
           * reserva alguien más en vez de ponerlo en espera?». Tiene razón y
           * no hacía falta recalcular nada: quien no está sentado ESTÁ en
           * espera, por definición. Nadie lo sentó.
           *
           * Así que la espera se resuelve al leer, como ya se resuelven las
           * comidas y el presupuesto: lo guardado, más los que el reparto no
           * llegó a ver. Marcados, porque no es lo mismo «lo miramos y no
           * cupo» que «llegó después»: al segundo quizá sí le toca mesa, y
           * eso es lo que hace decidir si merece la pena repartir otra vez.
           */
          espera: (() => {
            const guardada = ((corrida.unmatched ?? []) as unknown as { profileId: string }[]).map(
              (p) => ({
                ...p,
                ...(rasgoGuardado.get(p.profileId) ?? {}),
                comidas: comidaGuardada.get(p.profileId) ?? [],
                dietas: dietaGuardada.get(p.profileId) ?? [],
                tramoGasto: gastoGuardado.get(p.profileId) ?? null,
                foto: caraGuardada.has(p.profileId)
                  ? `/api/operacion/cara?perfil=${p.profileId}`
                  : null,
                llegoDespues: false,
              }),
            )

            // Quién ya está colocado en algún sitio de esta corrida.
            const colocados = new Set<string>([
              ...((corrida.proposal ?? []) as unknown as {
                integrantes: { profileId: string }[]
              }[]).flatMap((m) => (m.integrantes ?? []).map((i) => i.profileId)),
              ...guardada.map((p) => p.profileId),
            ])

            const tarde = (pool ?? [])
              .filter((x) => x.profile_id && !colocados.has(x.profile_id))
              .map((x) => ({
                profileId: x.profile_id as string,
                nombre: nombreDe.get(x.profile_id as string) ?? 'Sin nombre',
                zonas: (x.zones ?? []) as string[],
                edad: x.age,
                genero: x.gender,
                sector: x.industry,
                empresa: x.employer_key,
                tramoGasto: x.budget_tier,
                dietas: (x.dietary ?? []) as string[],
                comidas: comidaGuardada.get(x.profile_id as string) ?? [],
                foto: caraGuardada.has(x.profile_id as string)
                  ? `/api/operacion/cara?perfil=${x.profile_id}`
                  : null,
                llegoDespues: true,
              }))

            return [...guardada, ...tarde]
          })(),
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

  // Las mesas YA PUBLICADAS no se tocan. Esa gente sabe con quién cena y
  // dónde, así que sale del pool: volver a repartir mueve al resto, no a
  // ellos. Es lo que permite ir cerrando grupos en tandas.
  const { data: yaSentados } = await admin
    .from('dinner_tables')
    .select(
      'id, table_number, restaurant_id, score, restaurants!dinner_tables_restaurant_id_fkey(name, zone_slug), table_members(profile_id, booking_id, profiles(display_name, full_name))',
    )
    .eq('event_id', eventoId)
    .order('table_number')

  // Los rasgos de quien ya está sentado. Sin esto la mesa publicada salía
  // con "—, null" y un rango de edades "0–0": la que YA está cerrada era la
  // que peor se veía.
  const idsCerrados = (yaSentados ?? []).flatMap((t) =>
    ((t.table_members ?? []) as unknown as { profile_id: string }[]).map((m) => m.profile_id),
  )
  const { data: rasgosCerrados } = await admin
    .from('profile_traits')
    .select('profile_id, age, gender, industry, employer, budget_tier, dietary')
    .in('profile_id', idsCerrados.length ? idsCerrados : ['00000000-0000-0000-0000-000000000000'])

  const rasgoDe = new Map((rasgosCerrados ?? []).map((r) => [r.profile_id, r]))

  /**
   * Qué come cada uno, y su cara.
   *
   * Las dos cosas son PARA MIRAR, no para repartir: el algoritmo no usa
   * ninguna. Están aquí porque la decisión que se toma con esta pantalla
   * delante no termina en «esta mesa cuadra», sigue en «y a qué restaurante
   * la mando». Hasta ahora eso había que ir a buscarlo perfil por perfil.
   *
   * `cuisines` vive en `profile_traits` y NO está en `v_matching_pool`, que
   * es la vista que alimenta el reparto. No la añado ahí a propósito: meter
   * una columna en la vista del matcher insinúa que el matcher la usa.
   */
  const idsDeLaFecha = [
    ...new Set([
      ...idsCerrados,
      ...pool.personas.map((p) => p.profileId),
    ]),
  ]

  const { data: comidas } = idsDeLaFecha.length
    ? await admin.from('profile_traits').select('profile_id, cuisines').in('profile_id', idsDeLaFecha)
    : { data: [] }
  const comidaDe = new Map(
    (comidas ?? []).map((c) => [c.profile_id, (c.cuisines ?? []) as string[]]),
  )

  /**
   * Quién TIENE cara que enseñar. La foto en sí no viaja.
   *
   * Antes aquí se firmaba una URL por persona, cinco minutos cada una. En la
   * cola de verificación eso vale porque se decide en el momento; en
   * repartir el panel se queda abierto mientras se piensa, y a los cinco
   * minutos las seis fotos de la mesa se rompían con un `InvalidJWT`.
   *
   * Ahora solo se mira si existe, y el panel pide `/api/operacion/cara`, que
   * comprueba el rol y firma por sesenta segundos en cada petición. De paso
   * desaparecen veinte llamadas a Storage por cada carga del reparto.
   */
  const { data: selfies } = idsDeLaFecha.length
    ? await admin
        .from('verifications')
        .select('profile_id')
        .eq('kind', 'selfie')
        .eq('status', 'approved')
        .not('storage_path', 'is', null)
        .in('profile_id', idsDeLaFecha)
    : { data: [] }

  const conCara = new Set((selfies ?? []).map((f) => f.profile_id))
  const caraDe = (id: string) => (conCara.has(id) ? `/api/operacion/cara?perfil=${id}` : null)

  const cerradas = (yaSentados ?? []).map((t) => {
    const miembros = (t.table_members ?? []) as unknown as {
      profile_id: string
      booking_id: string
      profiles: { display_name: string | null; full_name: string | null } | null
    }[]
    const rest = t.restaurants as unknown as { name: string; zone_slug: string | null } | null
    return {
      numero: t.table_number,
      publicada: true,
      zona: rest?.zone_slug ?? null,
      zonasPosibles: rest?.zone_slug ? [rest.zone_slug] : [],
      restaurantId: t.restaurant_id,
      restaurante: rest?.name ?? null,
      puntuacion: t.score ?? 0,
      desglose: {},
      resumen: null,
      roturas: [] as { regla: string; detalle: string }[],
      integrantes: miembros.map((m) => {
        const r = rasgoDe.get(m.profile_id)
        return {
          profileId: m.profile_id,
          bookingId: m.booking_id,
          nombre: m.profiles?.display_name || m.profiles?.full_name?.split(' ')[0] || '—',
          edad: r?.age ?? null,
          genero: r?.gender ?? null,
          empresa: r?.employer ?? null,
          sector: r?.industry ?? null,
          tramoGasto: r?.budget_tier ?? null,
          dietas: (r?.dietary ?? []) as string[],
          comidas: comidaDe.get(m.profile_id) ?? [],
          foto: caraDe(m.profile_id),
        }
      }),
    }
  })

  const sentados = new Set(cerradas.flatMap((m) => m.integrantes.map((i) => i.profileId)))
  const personas = pool.personas.filter((p) => !sentados.has(p.profileId))
  const desdeNumero = cerradas.reduce((n, m) => Math.max(n, m.numero), 0)

  // ZONAS, no sitios. Se comprobaban los sitios elegidos, así que una fecha
  // con zonas abiertas y el sitio todavía por decidir —que es lo normal, el
  // sitio se elige cuando se sabe cuánta gente hay— no se podía repartir. Y
  // repartir es justo lo que dice cuántas mesas hacen falta en cada zona, que
  // es lo que hace falta saber para elegir bien el sitio.
  if (!pool.zonas.length) {
    return NextResponse.json(
      { error: 'Esta fecha no abre ninguna zona. Abre al menos una antes de repartir.' },
      { status: 409 },
    )
  }

  // `conCorta` es una decisión de quien reparte, no del algoritmo: deja que
  // la última mesa salga con menos de las que caben. Sin ella, cinco
  // apuntados devuelven cero mesas y la pantalla se queda sin nada que
  // decidir.
  const r = repartir(personas, pool.porMesa, pesos, parsed.data.conCorta)

  // Cada mesa cae en una de las zonas que aceptan los seis, y ahí se le da
  // sitio. El aforo se respeta: si Cardenal aguanta dos mesas, la tercera
  // va al siguiente sitio de esa zona.
  const ocupacion = new Map<string, number>()
  // Lo ya publicado ocupa aforo: si Cardenal aguanta dos y ya hay una mesa
  // cerrada allí, solo cabe una más.
  for (const m of cerradas) {
    if (m.restaurantId) ocupacion.set(m.restaurantId, (ocupacion.get(m.restaurantId) ?? 0) + 1)
  }
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

  const nombreDeZona = new Map(pool.zonas.map((z) => [z.slug, z.nombre]))
  const nombreZonaDe = (slug: string | null) => (slug ? (nombreDeZona.get(slug) ?? slug) : null)

  const nuevas = r.mesas.map((mesa, i) => {
    const zonasPosibles = zonasDe(mesa)
    // Reparto estable: entre varias zonas válidas, la primera por orden
    // alfabético. Elegir "la que tenga más sitio" haría que el mismo pool
    // diera repartos distintos según en qué orden se procesaran las mesas.
    const zona = zonasPosibles[0] ?? null
    const sede = zona ? sedeDe(zona) : null
    return {
    numero: desdeNumero + i + 1,
    publicada: false,
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
    // Las siete, cumplidas y rotas. El panel las enseña todas y con solo las
    // rotas tendria que volver a contarlas por su cuenta.
    reglas: evaluacion(mesa, zona, nombreZonaDe(zona)),
    // La aritmética del panel sale de aquí; nada se escribe a mano.
    integrantes: mesa.map((p) => ({
      profileId: p.profileId,
      bookingId: p.bookingId,
      nombre: p.nombre,
      edad: p.edad,
      genero: p.genero,
      empresa: p.empresaTexto || p.empresa,
      sector: p.sector,
      // Cuánto espera gastar, 1 a 4. Lo pide el panel para elegir
      // restaurante: es la otra mitad de la decisión, con la comida.
      tramoGasto: p.tramoGasto,
      // Qué come. No entra en el reparto —el algoritmo no la mira— pero
      // decide el restaurante, que es lo que operación hace justo después
      // de mirar esta pantalla.
      comidas: comidaDe.get(p.profileId) ?? [],
      // Su selfie de verificación, firmada y por cinco minutos. Es la única
      // foto que tenemos de un miembro: no hay foto de perfil.
      foto: caraDe(p.profileId),
    })),
    }
  })

  // Las cerradas van primero: el panel enseña la foto completa de la fecha,
  // no solo lo que queda por decidir.
  const propuesta = [...cerradas, ...nuevas]

  // Una mesa sin sitio no se puede publicar. Pero «sin sitio» son dos cosas
  // distintas y la salida es distinta en cada una: si no hay ninguno elegido,
  // hay que elegirlo; si los que hay están llenos, hay que añadir otro. Un
  // solo mensaje para las dos mandaba a mirar donde no era.
  for (const m of nuevas) {
    if (m.restaurantId) continue

    if (!m.zona) {
      m.roturas = [...m.roturas, { regla: 'sede', detalle: 'sin zona común' }]
      continue
    }

    const cuantos = sedes.filter((v) => v.zona === m.zona).length
    const donde = nombreDeZona.get(m.zona) ?? m.zona
    m.roturas = [
      ...m.roturas,
      {
        regla: 'sede',
        detalle: cuantos === 0
          ? 'falta elegir sitio en ' + donde
          : 'los sitios de ' + donde + ' ya están llenos: añade otro',
      },
    ]
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
      /**
       * La espera, con la MISMA ficha que quien está sentado.
       *
       * Iba con nombre y nada más, y eso convertía la decisión en dos
       * decisiones distintas: a los de la mesa se les mira la edad, la
       * empresa, lo que comen y lo que gastan, y al que sobra se le mira el
       * nombre. Pero es justo de quien hay que decidir si entra, y con qué
       * mesa pega.
       */
      unmatched: r.espera.map((p) => ({
        profileId: p.profileId,
        bookingId: p.bookingId,
        nombre: p.nombre,
        edad: p.edad,
        genero: p.genero,
        empresa: p.empresaTexto || p.empresa,
        sector: p.sector,
        tramoGasto: p.tramoGasto,
        dietas: p.dietas ?? [],
        comidas: comidaDe.get(p.profileId) ?? [],
        foto: caraDe(p.profileId),
      })) as never,
      created_by: actor,
      proposal: propuesta as never,
    })
    .select('id')
    .single()

  if (errorCorrida) {
    console.error('[repartir] no se guardó la corrida', errorCorrida)
    return NextResponse.json({ error: 'No pudimos guardar la propuesta.' }, { status: 500 })
  }

  // Repartir es la decisión más grande del panel —mueve a todo el mundo de
  // sitio— y era la única que no dejaba rastro: `mesas_repartidas` existía en
  // el catálogo de acciones desde el primer día y no lo escribía nadie. Ante
  // una mesa que salió mal, la pregunta «¿quién la armó y cuándo?» no tenía
  // respuesta.
  await anotar(actor, 'mesas_repartidas', 'evento', eventoId, {
    corrida: corrida.id,
    apuntados: personas.length,
    mesas: r.mesas.length,
    // Que quede escrito si se repartió aceptando una mesa corta, y de qué
    // tamaño salió cada una: dentro de dos meses, «¿por qué esa cena fue de
    // cinco?» tiene que poder responderse.
    conCorta: parsed.data.conCorta,
    tamanos: r.mesas.map((m) => m.length),
    espera: r.espera.length,
    media: Number(r.media.toFixed(3)),
  })

  return NextResponse.json({
    corridaId: corrida.id,
    apuntados: personas.length,
    mesas: r.mesas.length,
    espera: r.espera.length,
    media: Number(r.media.toFixed(3)),
    propuesta,
  })
}
