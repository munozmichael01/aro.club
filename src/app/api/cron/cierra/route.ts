import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { enTrozos } from '@/lib/en-trozos'
import { createAdminClient } from '@/lib/supabase/admin'

import { quienQuiereSaberDe } from '@/lib/a-quien-avisar'
import { ZONA_POR_DEFECTO } from '@/lib/reglas'
import { diaDe } from '@/lib/tandas'

/**
 * «Esta fecha se cierra mañana».
 *
 * El hueco que faltaba: alguien verificado, con una fecha abierta en una zona
 * suya, que no reservó. `abrimos_zona` se manda cuando la fecha SE ABRE —dos
 * semanas antes, cuando todavía no es decisión de nadie— y después silencio
 * hasta que ya no se puede apartar puesto.
 *
 * Lo que se pierde ahí es un puesto vacío en una mesa que se arma con cinco.
 *
 * **A quién NO se le escribe**, y cada exclusión importa:
 *
 * - A quien ya reservó. Es la mitad del punto.
 * - A quien no está verificado: `/api/reservar` le va a decir que no, así que
 *   invitarle a apartar puesto es mandarle a una puerta cerrada.
 * - A quien no marcó ninguna de las zonas que esa fecha abrió: no puede
 *   llegar, y escribirle es ruido.
 * - A quien apagó «fechas nuevas en tus zonas». No estrena preferencia: quien
 *   apagó que le avisen de una fecha tampoco quiere que le recuerden esa
 *   misma fecha.
 *
 * Una vez por persona y DÍA DE CENA, no por fecha. Dos fechas del mismo día
 * son dos mesas y un solo aviso: el índice único mira `event_id` y no las ve
 * como lo mismo, así que la cuenta la lleva este cron. Y a quien le sale hoy
 * el resumen con esas fechas dentro tampoco se le escribe: ya se lo contamos.
 *
 * El cron puede correr dos veces sin duplicar.
 *
 * **`?seco=1` calcula sin escribir**, y no es un lujo: no hay staging, esta
 * base es la de producción y `/api/cron/correos` la recorre cada quince
 * minutos. Una fila encolada «de prueba» SE MANDA. Probar esto en caliente ya
 * sacó cinco correos a direcciones de verdad; la pasada en seco es para que no
 * vuelva a pasar.
 */

export const dynamic = 'force-dynamic'

/** Treinta horas: un cron diario coge cada fecha una vez, con margen. */
const ANTELACION = 30 * 3600_000

/**
 * A qué hora sale: 10:00 de Caracas (14:00 UTC), en `vercel.json`.
 *
 * Estaba a las 11:00, o sea UNA HORA antes de la revelación del mediodía.
 * Quien cenaba esa noche recibía «el sábado se cierra hoy» y sesenta minutos
 * después «ya sabes con quién cenas»: el primero se lee a la sombra del
 * segundo, y el que invita a apuntarse es justo el que necesita atención.
 * Michael, 16-10: «una hora antes me parece poco, lo ponemos a las 10».
 */

async function avisar(seco: boolean, soloEste?: string | null) {
  const admin = createAdminClient()

  const ahora = Date.now()

  const consulta = admin
    .from('events')
    .select('id, booking_closes_at, format, starts_at, city_slug, age_band_min, age_band_max, idioma')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date(ahora).toISOString())
    /**
     * Orden fijo, porque ahora decide algo.
     *
     * Desde que el aviso es uno por persona y día, cuando dos fechas de la
     * misma noche le valen a la misma persona GANA LA PRIMERA de este orden.
     * Sin `order` eso lo decidía Postgres, o sea nadie, y el sábado 31 había
     * tres fechas a la misma hora: la que se anunciaba podía cambiar entre
     * dos pasadas. Con `starts_at` y después `id` siempre gana la misma.
     *
     * Quien reciba el aviso de la de español y también pudiera ir a la de
     * inglés no se queda sin saberlo: el botón lleva a la agenda, que lista
     * las de esa noche. Lo que no puede es recibir dos correos distintos la
     * misma mañana diciendo lo mismo.
     */
    .order('starts_at')
    .order('id')

  /**
   * `?evento=` mira UNA fecha, y solo en seco.
   *
   * La pasada en seco dice a cuánta gente se le escribiría, que es lo que hay
   * que saber antes de escribirle a medio club. Pero cuenta todas las fechas
   * que cierran dentro del plazo juntas, y dos fechas del mismo día son dos
   * correos a casi la misma gente: el total no dice cuántos recibirían dos.
   *
   * Con un id se ve una sola, y se ve ANTES de que entre en el plazo. Solo en
   * seco: en caliente serviría para mandar un correo a destiempo.
   */
  if (soloEste && seco) consulta.eq('id', soloEste)
  else consulta.lte('booking_closes_at', new Date(ahora + ANTELACION).toISOString())

  const { data: eventos } = await consulta

  if (!eventos?.length) return NextResponse.json({ eventos: 0, encolados: 0, seco })

  let encolados = 0

  /**
   * A quién ya se le contó ESE DÍA, y no esa fecha.
   *
   * El 30-10 a la 1 de la mañana esto iba a mandar 1.509 correos a 508
   * personas: 493 el mismo «el sábado se cierra hoy» TRES veces. El sábado
   * eran tres fechas distintas —tres mesas, tres sedes, tres filas en
   * `events`— y el antiduplicado de aquí miraba `event_id`, así que para el
   * cron eran tres avisos distintos. Para quien los recibe es uno repetido
   * tres veces, y es el correo que invita a reservar: el que menos se puede
   * permitir leerse como spam.
   *
   * El comentario de arriba ya lo decía —«dos fechas del mismo día son dos
   * correos a casi la misma gente»— y se quedó en comentario. Esto lo cierra:
   * la unidad es la persona y el día de la cena, no la fila.
   */
  const husos = new Map<string, string>()
  const husoDe = async (slug: string | null | undefined): Promise<string> => {
    if (!slug) return ZONA_POR_DEFECTO
    const guardado = husos.get(slug)
    if (guardado) return guardado
    const { data } = await admin.from('cities').select('timezone').eq('slug', slug).maybeSingle()
    const huso = data?.timezone || ZONA_POR_DEFECTO
    husos.set(slug, huso)
    return huso
  }

  const { data: yaAvisados } = await admin
    .from('scheduled_emails')
    .select('profile_id, event_id')
    .eq('kind', 'cierra_pronto')
    .not('event_id', 'is', null)

  const deEsasFechas = [...new Set((yaAvisados ?? []).map((r) => r.event_id).filter((x): x is string => !!x))]

  const cuandoEran = new Map<string, { starts_at: string; city_slug: string | null }>()
  for (const trozo of await enTrozos<{ id: string; starts_at: string; city_slug: string | null }>(
    deEsasFechas,
    (t) => admin.from('events').select('id, starts_at, city_slug').in('id', t),
    'de qué día eran los avisos ya mandados',
  )) cuandoEran.set(trozo.id, trozo)

  /** Día de la cena -> quién ya tiene el aviso de ese día. */
  const avisadosDelDia = new Map<string, Set<string>>()
  for (const r of yaAvisados ?? []) {
    const ev = r.event_id ? cuandoEran.get(r.event_id) : null
    if (!ev || !r.profile_id) continue
    const dia = diaDe(new Date(ev.starts_at), await husoDe(ev.city_slug))
    if (!avisadosDelDia.has(dia)) avisadosDelDia.set(dia, new Set())
    avisadosDelDia.get(dia)!.add(r.profile_id)
  }

  /**
   * Y a quién ya le sale hoy el resumen con estas mismas fechas dentro.
   *
   * `resumen_semanal` lista las fechas abiertas una por una. Quien lo recibe
   * a las ocho ya sabe lo que este cron le iba a contar a las diez, así que
   * recibirlo sería la segunda copia de la misma noticia con otro asunto. No
   * se mira el estado de la fila: una encolada para hoy se manda hoy.
   */
  const hoy = diaDe(new Date(ahora), ZONA_POR_DEFECTO)
  const { data: resumenes } = await admin
    .from('scheduled_emails')
    .select('profile_id, send_at')
    .eq('kind', 'resumen_semanal')
    .gte('send_at', new Date(ahora - 36 * 3600_000).toISOString())

  const yaLesLlegaElResumen = new Set(
    (resumenes ?? [])
      .filter((r) => r.profile_id && r.send_at && diaDe(new Date(r.send_at), ZONA_POR_DEFECTO) === hoy)
      .map((r) => r.profile_id as string),
  )

  for (const ev of eventos) {
    // Las zonas que ESTA fecha abrió. Están en `event_venues`, no en el
    // evento: las columnas `zone_slug` del evento son de antes de que las
    // sedes se movieran ahí.
    const { data: sedes } = await admin
      .from('event_venues')
      .select('zone_slug')
      .eq('event_id', ev.id)

    const abiertas = (sedes ?? []).map((s) => s.zone_slug).filter(Boolean) as string[]
    if (!abiertas.length) continue

    /**
     * Quien ya tiene sitio ESA NOCHE, sea en esta fecha o en otra.
     *
     * Miraba solo `ev.id`, y eso valia cuando cada noche era una fecha. El
     * sabado 31 son tres —hasta 44, 45+ y la de ingles— y quince personas
     * con su puesto en una de ellas entraban como candidatas a las otras
     * dos: a las nueve les llega «mañana es tu cena» y a las diez «la cena
     * en ingles del sabado se cierra hoy, ¿te apuntas?». Es ofrecerle a
     * alguien una segunda mesa la noche que ya tiene plan.
     *
     * Nadie cena dos veces el mismo sabado. La unidad es la noche.
     */
    const diaDeLaCena = diaDe(new Date(ev.starts_at), await husoDe(ev.city_slug))

    const { data: esaNoche } = await admin
      .from('events')
      .select('id, starts_at, city_slug')
      .gte('starts_at', new Date(Date.parse(ev.starts_at) - 36 * 3600_000).toISOString())
      .lte('starts_at', new Date(Date.parse(ev.starts_at) + 36 * 3600_000).toISOString())

    const hermanas: string[] = []
    for (const otra of esaNoche ?? []) {
      if (diaDe(new Date(otra.starts_at), await husoDe(otra.city_slug)) === diaDeLaCena) {
        hermanas.push(otra.id)
      }
    }

    const { data: reservas } = await admin
      .from('bookings')
      .select('profile_id')
      .in('event_id', hermanas.length ? hermanas : [ev.id])
      .in('status', ['pending_payment', 'confirmed', 'attended'])

    const yaVan = new Set((reservas ?? []).map((r) => r.profile_id))

    // Quien marcó alguna de esas zonas.
    const { data: respuestas } = await admin
      .from('answers')
      .select('profile_id, value')
      .eq('question_key', 'zonas')

    const puedenLlegar = (respuestas ?? [])
      .filter((a) => Array.isArray(a.value) && (a.value as string[]).some((z) => abiertas.includes(z)))
      .map((a) => a.profile_id)
      .filter((id): id is string => !!id && !yaVan.has(id))

    if (!puedenLlegar.length) continue

    // Y de esos, los verificados. `v_verified_profiles` es la misma vista con
    // la que `/api/reservar` decide si deja apartar puesto: si se mirara otra
    // cosa aquí, el correo invitaría a gente a la que la ruta le dice que no.
    const verificados = await enTrozos<{ id: string | null }>(
      puedenLlegar,
      (t) => admin.from('v_verified_profiles').select('id').in('id', t),
      'quién está verificado',
    )

    const puede = new Set(verificados.map((v) => v.id).filter((id): id is string => !!id))
    if (!puede.size) continue

    // Y de esos, quien quiere saber de ESTE plan y no es una cuenta de
    // prueba. Las dos reglas viven en `a-quien-avisar` porque son las mismas
    // que `abrimos_zona`, que tenia el mismo hueco.
    const quieren = await quienQuiereSaberDe([...puede], ev.format, ev)
    if (!quieren.size) continue

    // Por trozos: con la lista entera en la URL esto devuelve 400 en cuanto
    // el club crece, y un nulo aquí es un cron que no escribe a nadie sin
    // decir que no escribió. Es lo que mató `abrimos_zona` desde el 17-10.
    const perfiles = await enTrozos<{ id: string; notificaciones: unknown }>(
      [...quieren],
      (t) => admin.from('profiles').select('id, notificaciones').in('id', t).is('deleted_at', null),
      'a quién hay que escribir',
    )

    /**
     * Quien ya tiene el aviso de ESTE DÍA, venga de la fecha que venga.
     *
     * El conjunto se va llenando dentro del bucle y también en seco, que es
     * lo que hace que la pasada en seco cuente lo mismo que escribiría la de
     * verdad. Si solo se llenara al encolar, la cuenta en seco volvería a
     * decir 1.509.
     */
    if (!avisadosDelDia.has(diaDeLaCena)) avisadosDelDia.set(diaDeLaCena, new Set())
    const yaTienen = avisadosDelDia.get(diaDeLaCena)!

    for (const p of perfiles ?? []) {
      // Encendido por defecto: solo se salta a quien lo apagó a propósito.
      const avisos = (p.notificaciones ?? {}) as Record<string, boolean>
      if (avisos.apertura_zona === false) continue
      if (yaTienen.has(p.id)) continue
      if (yaLesLlegaElResumen.has(p.id)) continue

      // Se apunta ANTES de encolar y también en seco: lo que hace que la
      // segunda fecha del mismo día no vuelva a contar a esta persona.
      yaTienen.add(p.id)

      if (seco) {
        encolados++
        continue
      }

      const r = await encolar(
        { perfil: p.id },
        'cierra_pronto',
        { zonas: abiertas },
        { eventoId: ev.id },
      )
      if (r === 'encolado') encolados++
    }
  }

  return NextResponse.json({ eventos: eventos.length, encolados, seco })
}

/**
 * Mismo candado que los demás crons: sin el secreto no se entra, y 404 en vez
 * de 401 para no confirmar que la ruta existe.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  // `?seco=1` calcula y NO escribe. Ver la nota de arriba: sin esto, probar
  // este cron es mandar correos.
  const params = new URL(request.url).searchParams
  const seco = params.get('seco') === '1'

  return avisar(seco, params.get('evento'))
}
