import { NextResponse } from 'next/server'
import { z } from 'zod'

import { anotar } from '@/lib/auditoria'
import { PESOS, repartir, roturas, evaluacion, desglose, resumen, zonasDe } from '@/lib/reparto/repartir'
import { exigirOps } from '@/lib/ops'
import { claveDeNumero, numeroQueSeDice } from '@/lib/mesa-unica'
import { renumerar, yaSeRevelo } from '@/lib/reparto/numeros'
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
   * Deshacer el último reparto en vez de hacer uno nuevo.
   *
   * Michael, 17-10. Repartir mueve a todo el mundo de sitio y no tenía
   * vuelta atrás: la propuesta anterior seguía guardada —cada corrida es
   * una fila nueva— pero el panel lee siempre la última, así que no había
   * forma de volver. Esto la marca descartada y la de antes vuelve a ser la
   * buena.
   *
   * Lo ya PUBLICADO no se toca: eso vive en `dinner_tables` y hay gente que
   * ya sabe con quién cena. Por eso una corrida publicada no se puede
   * deshacer, y el servidor lo dice en vez de hacer algo a medias.
   */
  deshacer: z.boolean().default(false),
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
      // Opcional con su valor por defecto: una corrida vieja, o la app, que
      // manda los cinco de antes, no se cae por el termino nuevo.
      bebida: z.number().default(PESOS.bebida),
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
    .select('id, starts_at, booking_closes_at, reveal_at, seats_per_table, status, format, grabacion, grabacion_requerida, restaurants!events_restaurant_id_fkey(name)')

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

  /**
   * Y el apellido, para cuando dos se llaman igual.
   *
   * La propuesta guarda el nombre de trato, y en la misma mesa pueden caer
   * dos Daniel —Carlos Daniel Gonzalez y Daniel De Alba, el viernes 16—. En
   * la pantalla se lee «Daniel, Daniel» y parece la misma persona repetida.
   * Michael lo leyó así y con razón: una mesa con alguien dos veces sería un
   * fallo grave, y pasar un susto por un homónimo cuesta tanto como el fallo.
   *
   * Solo la primera palabra que no sea el nombre: «Daniel De» no, «Daniel D.»
   * sí. Es lo justo para distinguir sin enseñar el apellido entero, que en
   * esta pantalla no hace falta para decidir.
   */
  const apellidoDe = new Map(
    (nombres ?? []).map((n) => {
      const trato = (n.display_name || '').trim()
      const partes = (n.full_name || '').trim().split(/\s+/).filter(Boolean)
      const siguiente = partes.find((x) => x.toLowerCase() !== trato.toLowerCase())
      return [n.id, siguiente ? siguiente.charAt(0).toUpperCase() + '.' : '']
    }),
  )

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
    // Las deshechas no cuentan: la buena es la última que sigue en pie.
    .is('descartada_at', null)
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
  /**
   * Los locales que se le pueden poner a esta fecha.
   *
   * SIN los de segundo acto. Michael, 21-10: «el segundo acto no debe salir
   * en las mesas, aquí seleccionamos solo restaurantes si es cena o brunch».
   *
   * Y tiene razón además de ser lo que quiere: un bar de segundo acto es
   * donde se sigue después, no donde se sienta la mesa. Desde que los bares
   * pueden activarse con menos datos, si entraran aquí saldrían siete sitios
   * nuevos entre los que elegir para una cena, todos sin contacto al que
   * avisar y sin foto de la entrada, que es justo lo que no les pedimos
   * porque ahí no cena nadie.
   */
  const { data: candidatos } = await admin
    .from('restaurants')
    .select('id, name, zone_slug, open_days, is_active, formats, commission_pct')
    .or('is_after_venue.is.null,is_after_venue.eq.false')
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
        .select('profile_id, cuisines, budget_tier, age, gender, industry, employer, dietary, drinks, drink_level')
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
  /**
   * Qué bebe cada uno, y si bebe.
   *
   * Michael, 18-10: «quiero saber quiénes beberán en la cena y quiénes no».
   * Es de la misma familia que lo que come y lo que gasta: no reparte nada,
   * se mira para elegir sitio y para lo que hay que decirle al local antes de
   * sentar a seis personas ahí.
   */
  const bebidaGuardada = new Map(
    (rasgosGuardados ?? []).map((r) => [r.profile_id, (r.drinks ?? []) as string[]]),
  )
  const copasGuardadas = new Map(
    (rasgosGuardados ?? []).map((r) => [r.profile_id, r.drink_level]),
  )
  // La espera guardada no lleva edad ni empresa: solo nombre. Se completan
  // aquí, que es donde ya estamos leyendo los rasgos.
  const rasgoGuardado = new Map(
    (rasgosGuardados ?? []).map((r) => [
      r.profile_id,
      { edad: r.age, genero: r.gender, sector: r.industry, empresa: r.employer, dietas: (r.dietary ?? []) as string[] },
    ]),
  )

  /**
   * Quién reservó en OTRA fecha de esa noche y la movió operación.
   *
   * Michael, 20-10: «me permites mover a alguien de fecha desde el panel,
   * siguiendo marcándolo con la etiqueta de la mesa original donde reservó».
   * Aquí solo viaja el id de aquella fecha; el rótulo —«+40», «en inglés»,
   * la zona— lo compone el panel con el mismo código que usa en el riel,
   * para que la misma fecha no se llame de dos maneras distintas.
   */
  const { data: movidas } = await admin
    .from('bookings')
    .select('profile_id, movida_de')
    .eq('event_id', evento.id)
    .not('movida_de', 'is', null)

  const movidaDe = new Map(
    (movidas ?? []).map((b) => [b.profile_id as string, b.movida_de as string]),
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
        .select('profile_id, permiso_grabacion')
        .eq('event_id', evento.id)
        .eq('status', 'confirmed')
        .in('profile_id', enLaPropuesta)
    : { data: [] }

  const vivos = new Set((siguenApuntados ?? []).map((b) => b.profile_id))

  /**
   * Los permisos de contenido, al leer y no al repartir.
   *
   * La propuesta guardada es de cuando alguien pulsó repartir, y el permiso
   * lo contesta cada quien después, desde Mi mesa. Si esto se leyera de la
   * propuesta, el panel diría que nadie ha contestado hasta el siguiente
   * reparto, y volver a repartir mueve a seis personas de sitio.
   *
   * La marca de la mesa, igual: se pone después de publicarla.
   */
  const permisoDe = new Map(
    (siguenApuntados ?? []).map((b) => [b.profile_id, b.permiso_grabacion ?? null]),
  )

  const { data: mesasVivas } = await admin
    .from('dinner_tables')
    .select('id, table_number, grabacion, grabacion_requerida, avisado_local_at, avisado_local_num')
    .eq('event_id', evento.id)

  const mesaPorNumero = new Map((mesasVivas ?? []).map((m) => [m.table_number, m]))
  const seGuardaronYNoEstan = enLaPropuesta.filter((id) => !vivos.has(id)).length

  /**
   * Cuánta gente no ha visto esta corrida. Y se cuenta DEL POOL, no de las
   * reservas.
   *
   * Contaba reservas confirmadas posteriores a la corrida, y la espera
   * enseña quien está en el pool del reparto y no está colocado. No son lo
   * mismo: alguien que reserva sin estar verificado es una reserva y no
   * entra al pool, así que el aviso decía «está abajo en la espera,
   * marcada» y abajo no había nadie. El aviso prometía algo que la lista no
   * podía cumplir.
   *
   * Contando lo mismo que se enseña, los dos no pueden discrepar. Quien
   * reservó y no entra al reparto ya se cuenta aparte, en `fueraDelPool`,
   * que es su sitio: no le falta mesa, le falta verificarse.
   */
  const colocadosEnLaCorrida = new Set<string>([
    ...((corrida?.proposal ?? []) as unknown as { integrantes: { profileId: string }[] }[])
      .flatMap((m) => (m.integrantes ?? []).map((i) => i.profileId)),
    ...((corrida?.unmatched ?? []) as unknown as { profileId: string }[]).map((p) => p.profileId),
  ])

  const reservasNuevas = corrida
    ? (pool ?? []).filter((x) => x.profile_id && !colocadosEnLaCorrida.has(x.profile_id)).length
    : 0

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
      /**
       * Si esa noche grabamos POR LA FECHA ENTERA.
       *
       * Michael pidió las dos alturas el 17-10 —«podría estar a nivel de
       * mesa y a nivel de fecha»— y la de la mesa se cableó en el panel; la
       * de la fecha se quedó con su endpoint y sin botón, así que la única
       * forma de encenderla era por base. Hoy lo pidió otra vez delante de
       * una fecha sin mesas todavía, donde la marca por mesa no existe: no
       * había nada que marcar.
       */
      grabacion: !!(evento as { grabacion?: boolean }).grabacion,
      // Y si el permiso es CONDICIÓN para reservar en ella. Michael, 18-10:
      // las dos alturas se marcan opcional o requerida, y eso es lo que
      // decide si se le cierra la puerta a quien no quiera salir.
      grabacionRequerida: !!(evento as { grabacion_requerida?: boolean }).grabacion_requerida,
    },
    apuntados: reservas ?? 0,
    // Los que entran al reparto, con nombre y con las zonas que aceptan. El
    // panel los enseña mientras no hay corrida.
    pool: (pool ?? []).map((x) => ({
      profileId: x.profile_id,
      movidaDe: movidaDe.get(x.profile_id as string) ?? null,
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
      bebidas: bebidaGuardada.get(x.profile_id as string) ?? [],
      copas: copasGuardadas.get(x.profile_id as string) ?? null,
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
            // La fila de verdad de esta mesa, si ya está publicada: su id
            // —para poder marcarla— y si está marcada para grabar.
            mesaId: mesaPorNumero.get((m as unknown as { numero: number }).numero)?.id ?? null,
            grabacion: !!mesaPorNumero.get((m as unknown as { numero: number }).numero)?.grabacion,
            grabacionRequerida: !!(mesaPorNumero.get((m as unknown as { numero: number }).numero) as { grabacion_requerida?: boolean } | undefined)?.grabacion_requerida,
            /**
             * Lo que le dijimos al local, si se dijo. La tarjeta compara con
             * los que hay ahora: esa diferencia es lo único que justifica
             * volver a llamar.
             */
            avisoLocal: (() => {
              const viva = mesaPorNumero.get((m as unknown as { numero: number }).numero)
              if (!viva?.avisado_local_at) return null
              return { cuando: viva.avisado_local_at, cuantos: viva.avisado_local_num ?? 0 }
            })(),
            integrantes: (m.integrantes ?? []).map((p) => ({
              ...p,
              movidaDe: movidaDe.get(p.profileId) ?? null,
              // Qué contestó al «¿te podemos grabar?». `null` es que no ha
              // contestado, que no es un no.
              permisoGrabacion: permisoDe.get(p.profileId) ?? null,
              /**
               * Si ESTA persona ya no está apuntada a la fecha.
               *
               * El contador de arriba decía «2 ya no están» y la mesa los
               * seguía pintando como comensales: Michael movió a dos a otra
               * fecha y los seguía viendo sentados. La cifra es un aviso; lo
               * que hace falta es verlo en la cara de quién.
               */
              yaNoEsta: !vivos.has(p.profileId),
              // Para distinguir a dos que se llamen igual en la misma mesa.
              // La pantalla solo lo enseña cuando el nombre se repite.
              apellido: apellidoDe.get(p.profileId) ?? '',
              sector: p.sector ? (etiquetaDe.get(p.sector) ?? p.sector) : null,
              comidas: comidaGuardada.get(p.profileId) ?? [],
              dietas: dietaGuardada.get(p.profileId) ?? [],
              bebidas: bebidaGuardada.get(p.profileId) ?? [],
              copas: copasGuardadas.get(p.profileId) ?? null,
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
            /**
             * Y quien canceló DESPUÉS de repartir se cae de la espera.
             *
             * `unmatched` es la foto de quién se quedó fuera aquel día, y
             * una foto no se entera de nada. Kristhina canceló dos minutos
             * después de la última corrida del 18-10 y el panel la seguía
             * contando en espera: Michael leía que había alguien esperando
             * mesa cuando ya no estaba apuntada.
             *
             * En las mesas esto se marca y no se quita —quién se sienta con
             * quién es una decisión y el hueco hay que verlo—, pero la
             * espera no es una decisión: es quien está en el pool y nadie
             * sentó. Si ya no está en el pool, no está esperando nada.
             */
            const enElPool = new Set(
              (pool ?? []).map((x) => x.profile_id).filter((x): x is string => !!x),
            )

            const guardada = ((corrida.unmatched ?? []) as unknown as { profileId: string }[])
              .filter((p) => enElPool.has(p.profileId))
              .map((p) => ({
                ...p,
                movidaDe: movidaDe.get(p.profileId) ?? null,
                ...(rasgoGuardado.get(p.profileId) ?? {}),
                comidas: comidaGuardada.get(p.profileId) ?? [],
                dietas: dietaGuardada.get(p.profileId) ?? [],
                bebidas: bebidaGuardada.get(p.profileId) ?? [],
                copas: copasGuardadas.get(p.profileId) ?? null,
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
                movidaDe: movidaDe.get(x.profile_id as string) ?? null,
                nombre: nombreDe.get(x.profile_id as string) ?? 'Sin nombre',
                zonas: (x.zones ?? []) as string[],
                edad: x.age,
                genero: x.gender,
                sector: x.industry,
                empresa: x.employer_key,
                tramoGasto: x.budget_tier,
                dietas: (x.dietary ?? []) as string[],
                comidas: comidaGuardada.get(x.profile_id as string) ?? [],
                bebidas: bebidaGuardada.get(x.profile_id as string) ?? [],
                copas: copasGuardadas.get(x.profile_id as string) ?? null,
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

  // --- deshacer, que no reparte nada ------------------------------------
  if (parsed.data.deshacer) {
    const { data: ultima } = await admin
      .from('matching_runs')
      .select('id, is_published, created_at')
      .eq('event_id', eventoId)
      .is('descartada_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!ultima) {
      return NextResponse.json({ error: 'Esa fecha no tiene ningún reparto que deshacer.' }, { status: 404 })
    }

    if (ultima.is_published) {
      return NextResponse.json(
        {
          error:
            'Ese reparto ya está publicado: hay gente que sabe con quién cena.'
            + ' Para cambiarlo hay que despublicar la mesa, no deshacer.',
          motivo: 'ya-publicada',
        },
        { status: 409 },
      )
    }

    const { error } = await admin
      .from('matching_runs')
      .update({ descartada_at: new Date().toISOString() } as never)
      .eq('id', ultima.id)

    if (error) {
      console.error('[repartir] no se pudo deshacer', error)
      return NextResponse.json({ error: 'No pudimos deshacerlo.' }, { status: 500 })
    }

    const { data: anterior } = await admin
      .from('matching_runs')
      .select('id, created_at')
      .eq('event_id', eventoId)
      .is('descartada_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    await anotar(actor, 'mesas_repartidas', 'evento', eventoId, {
      deshecha: ultima.id,
      vuelveA: anterior?.id ?? null,
    })

    return NextResponse.json({
      estado: 'deshecho',
      // Para que el panel pueda decir a qué se volvió, o que no quedó nada.
      hayAnterior: !!anterior,
      corridaId: anterior?.id ?? null,
    })
  }

  const { data: evento } = await admin
    .from('events')
    // `reveal_at` para saber si todavía se pueden tocar los números de mesa.
    .select('id, reveal_at')
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
      'id, table_number, restaurant_id, score, grabacion, restaurants!dinner_tables_restaurant_id_fkey(name, zone_slug), table_members(profile_id, booking_id, bookings(permiso_grabacion), profiles(display_name, full_name))',
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
    .select('profile_id, age, gender, industry, employer, budget_tier, dietary, drinks, drink_level')
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

  // El número que se dice en cada mesa publicada, de una vez para todas.
  const dichos = await numeroQueSeDice(
    (yaSentados ?? []).map((t) => ({
      eventoId,
      sitioId: t.restaurant_id,
      numero: t.table_number,
    })),
  )

  const cerradas = (yaSentados ?? []).map((t) => {
    const miembros = (t.table_members ?? []) as unknown as {
      profile_id: string
      booking_id: string
      bookings: { permiso_grabacion: boolean | null } | null
      profiles: { display_name: string | null; full_name: string | null } | null
    }[]
    const rest = t.restaurants as unknown as { name: string; zone_slug: string | null } | null
    return {
      // `numero` sigue siendo el GUARDADO: es con lo que el panel pide
      // despublicar o quitar una mesa, así que cambiarlo rompería las dos.
      numero: t.table_number,
      // Y este es el que se enseña, el mismo que ve quien va a cenar: su
      // posición dentro de ese restaurante esa noche. Michael, 22-10: «debe
      // coincidir con lo que yo veo en el reparto, porque si no, luego no sé
      // de qué mesa eran».
      numeroDicho: dichos.get(claveDeNumero(eventoId, t.table_number)) ?? t.table_number,
      publicada: true,
      // La mesa, para poder marcarla; y si está marcada para grabar.
      mesaId: t.id,
      grabacion: !!t.grabacion,
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
          // Qué contestó al «¿te podemos grabar?». `null` es que no ha
          // contestado, que no es un no: quien graba ve los tres estados.
          permisoGrabacion: m.bookings?.permiso_grabacion ?? null,
          nombre: m.profiles?.display_name || m.profiles?.full_name?.split(' ')[0] || '—',
          edad: r?.age ?? null,
          genero: r?.gender ?? null,
          empresa: r?.employer ?? null,
          sector: r?.industry ?? null,
          tramoGasto: r?.budget_tier ?? null,
          dietas: (r?.dietary ?? []) as string[],
          comidas: comidaDe.get(m.profile_id) ?? [],
          bebidas: (r?.drinks ?? []) as string[],
          copas: r?.drink_level ?? null,
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
  /**
   * Dónde han estado ya, y a dónde no quieren volver.
   *
   * Michael, 17-10: «que no se nos escape el hecho de no repetir y
   * excluidos. En el feedback me piden lo mismo para los locales: no
   * repetir en un tiempo y excluir locales si no les gusta». Lo segundo lo
   * pidió Leonor en la encuesta de anoche con esas palabras.
   *
   * Son dos cosas distintas y se tratan distinto:
   *
   *  - **Excluido** es una decisión suya y no se discute: no se le manda a
   *    ese sitio, aunque sea el único libre.
   *  - **Repetido** es una preferencia nuestra: con seis locales en Chacao
   *    y una cena por semana, prohibir repetir en tres meses dejaría las
   *    mesas sin sitio. Así que pesa, no prohíbe: entre dos locales que
   *    caben, gana el que menos gente de esa mesa haya pisado hace poco.
   */
  const DIAS_SIN_REPETIR = 42

  const { data: pisados } = await admin
    .from('table_members')
    .select('profile_id, dinner_tables!inner(restaurant_id, events!inner(starts_at))')
    .in('profile_id', pool.personas.map((p) => p.profileId))

  type Pisada = { profile_id: string; dinner_tables: { restaurant_id: string | null; events: { starts_at: string } | null } | null }
  const cuandoFue = new Map<string, number>()
  for (const x of (pisados ?? []) as unknown as Pisada[]) {
    const sitio = x.dinner_tables?.restaurant_id
    const cuando = x.dinner_tables?.events?.starts_at
    if (!sitio || !cuando) continue
    const k = `${x.profile_id}|${sitio}`
    const antes = cuandoFue.get(k) ?? 0
    cuandoFue.set(k, Math.max(antes, new Date(cuando).getTime()))
  }

  const { data: vetadosDeSitio } = await admin
    .from('table_feedback')
    .select('profile_id, sitio_no_repetir, dinner_tables!inner(restaurant_id)')
    .eq('sitio_no_repetir', true)
    .in('profile_id', pool.personas.map((p) => p.profileId))

  type Veto = { profile_id: string; dinner_tables: { restaurant_id: string | null } | null }
  const sitioVetado = new Set<string>()
  for (const x of (vetadosDeSitio ?? []) as unknown as Veto[]) {
    if (x.dinner_tables?.restaurant_id) sitioVetado.add(`${x.profile_id}|${x.dinner_tables.restaurant_id}`)
  }

  const ahoraSitios = Date.now()

  /**
   * El sitio de una mesa: el primero que quepa, que nadie haya vetado y, a
   * igualdad, el que menos reciente les quede.
   */
  const sedeDe = (zona: string, mesa?: { profileId: string; tramoGasto?: number | null }[]) => {
    const gente = mesa ?? []
    const candidatas = sedes
      .filter((v) => v.zona === zona)
      .filter((v) => (ocupacion.get(v.restaurantId) ?? 0) < v.maxMesas)
      // Lo vetado no entra, ni aunque sea lo único que queda: es la misma
      // regla que con las personas.
      .filter((v) => !gente.some((p) => sitioVetado.has(`${p.profileId}|${v.restaurantId}`)))

    if (!candidatas.length) return null

    const reciente = (v: { restaurantId: string }) =>
      gente.filter((p) => {
        const cuando = cuandoFue.get(`${p.profileId}|${v.restaurantId}`)
        return !!cuando && ahoraSitios - cuando < DIAS_SIN_REPETIR * 86400_000
      }).length

    /**
     * Cuánta gente de esta mesa come lo que ahí se cocina.
     *
     * Michael, 17-10: «el sitio se elige por lo que come la mesa». Hasta hoy
     * se elegía por zona y aforo, teniendo los dos datos guardados: la
     * cocina del local y la comida favorita de cada persona. Así es como un
     * hombre que come parrilla y venezolano acabó en un indio.
     */
    const comen = (v: { restaurantId: string; cocinas: string[] }) =>
      !v.cocinas.length
        ? 0
        : gente.filter((p) => (comidaDe.get(p.profileId) ?? []).some((c) => v.cocinas.includes(c))).length

    /**
     * Y lo lejos que le queda el bolsillo a la mesa.
     *
     * El tramo de la mesa es el más BAJO de los suyos, no la media: en una
     * cena que se paga aparte, quien marcó «hasta 20» es quien decide si la
     * cuenta duele, y los demás pueden gastar menos sin que les pase nada.
     */
    const tramoDeLaMesa = (() => {
      const suyos = gente.map((p) => p.tramoGasto).filter((x): x is number => x != null)
      return suyos.length ? Math.min(...suyos) : null
    })()

    const lejosDelBolsillo = (v: { tramo: number | null }) =>
      v.tramo == null || tramoDeLaMesa == null ? 0 : Math.max(0, v.tramo - tramoDeLaMesa)

    /**
     * El orden, con todo junto y por este orden de importancia:
     *
     *  1. No repetir sitio a nadie de la mesa. Volver al mismo restaurante
     *     en seis semanas es lo que más se nota.
     *  2. Que coman lo que ahí se cocina.
     *  3. Que el sitio no se salga del bolsillo del más ajustado.
     *
     * Y a igualdad de todo, el orden de siempre: el mismo pool tiene que
     * dar el mismo reparto.
     */
    const elegida = candidatas
      .map((v, i) => ({
        v,
        i,
        nota: reciente(v) * 3 - comen(v) + lejosDelBolsillo(v) * 2,
      }))
      .sort((a, b) => a.nota - b.nota || a.i - b.i)[0].v

    ocupacion.set(elegida.restaurantId, (ocupacion.get(elegida.restaurantId) ?? 0) + 1)
    return { restaurantId: elegida.restaurantId, nombre: elegida.nombre }
  }

  const nombreDeZona = new Map(pool.zonas.map((z) => [z.slug, z.nombre]))
  const nombreZonaDe = (slug: string | null) => (slug ? (nombreDeZona.get(slug) ?? slug) : null)

  const nuevas = r.mesas.map((mesa, i) => {
    const zonasPosibles = zonasDe(mesa)
    // Reparto estable: entre varias zonas válidas, la primera por orden
    // alfabético. Elegir "la que tenga más sitio" haría que el mismo pool
    // diera repartos distintos según en qué orden se procesaran las mesas.
    const zona = zonasPosibles[0] ?? null
    const sede = zona ? sedeDe(zona, mesa) : null
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
    // Las ocho, cumplidas y rotas. El panel las enseña todas y con solo las
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

  /**
   * Y numeradas de 1 a N, que es donde nacía el descuadre.
   *
   * Las nuevas se numeraban a partir del número más alto de las publicadas
   * —`desdeNumero`—, así que una fecha con las mesas 1, 4 y 5 publicadas
   * paría la 6 y la 7 en vez de la 2 y la 3. El viernes 16 acabó con 1, 4,
   * 5, 6 y 7. Repartir es justo el momento en que se puede arreglar: todavía
   * no se ha revelado nada.
   *
   * Si falla, se para: una propuesta con los números a medio cambiar es peor
   * que una con huecos.
   */
  if (!yaSeRevelo(evento.reveal_at)) {
    const falloNumeros = await renumerar(admin, eventoId, propuesta)
    if (falloNumeros) {
      return NextResponse.json({ error: falloNumeros }, { status: 500 })
    }
  }

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
