import { NextResponse } from 'next/server'

import { cabeEnLaFecha } from '@/lib/edad'
import { encolar } from '@/lib/correos'
import { quienQuiereSaberDe } from '@/lib/a-quien-avisar'
import { ZONA_POR_DEFECTO, partesDe } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { todasLasFilas } from '@/lib/todas-las-filas'

/**
 * «Hombres, vamos a equilibrar las mesas», a mano.
 *
 * No es un cron aunque viva aquí: usa el mismo candado del secreto que los
 * demás y se dispara una vez desde fuera. Lo pidió Michael el 21-10 de
 * noche, con 32 mujeres y 12 hombres apuntados a las fechas abiertas y una
 * cena de +40 con nueve personas y un solo hombre.
 *
 * DOS PÚBLICOS, un correo:
 *
 *  · `verificados`: hombres con la verificación aprobada y sin reserva viva
 *    esta semana. Incluye a quien ya cenó alguna vez y a quien canceló: lo
 *    que decide es si tiene plan ESTA semana, no su historia.
 *  · `sin-verificar`: hombres con el cuestionario terminado y sin
 *    verificación aprobada. A estos el botón de reservar les llevaría contra
 *    el candado, así que el correo les pide la cédula. Y quien ya la tiene
 *    EN REVISIÓN queda fuera: ya hizo su parte y pedírsela otra vez es
 *    decirle que no nos enteramos.
 *
 * `?seco=1` cuenta sin escribir, `?solo=correo@…` manda a una sola dirección
 * —la única forma de mirar el correo antes de soltarlo— y `?jueves=0` quita
 * las fechas del jueves de las dos listas, que es la decisión que Michael se
 * reservó para cuando viera la prueba.
 */

export const dynamic = 'force-dynamic'

/**
 * Cinco minutos, porque doscientos correos no caben en el plazo de siempre.
 *
 * El primer envío real se cortó a los noventa y dos: la función se quedó sin
 * tiempo, la petición volvió vacía y la mitad de la gente se quedó sin su
 * correo. No se vio desde fuera, se vio contando filas en la cola.
 */
export const maxDuration = 300

/** Caracas va cuatro horas por detrás de UTC y no cambia con la estación. */
const CARACAS = 4
const diaDe = (iso: string) => new Date(Date.parse(iso) - CARACAS * 3600_000).toISOString().slice(0, 10)

const VIVAS: ('pending_payment' | 'confirmed' | 'attended')[] = ['pending_payment', 'confirmed', 'attended']

async function mandar(
  seco: boolean,
  solo: string | null,
  conJueves: boolean,
  variante: string | null,
  cuando: Date | null,
) {
  const admin = createAdminClient()
  const ahora = new Date().toISOString()

  /**
   * Las fechas que se ofrecen: abiertas, por venir y que todavía admiten
   * gente. Sin la de inglés ni el brunch, que Michael dejó fuera.
   *
   * Y se comprueba el cierre, no solo el estado: una fecha abierta cuya hora
   * de cierre ya pasó es una puerta cerrada que el panel todavía no ha
   * cerrado, y anunciarla es mandar gente contra ella.
   */
  const { data: todas } = await admin
    .from('events')
    .select('id, starts_at, booking_closes_at, format, idioma, age_band_min, age_band_max')
    .eq('status', 'open')
    .gte('starts_at', ahora)
    .order('starts_at')

  const abiertas = (todas ?? []).filter((e) =>
    e.format === 'dinner'
    && !e.idioma
    && (!e.booking_closes_at || e.booking_closes_at > ahora))

  /**
   * `?jueves=0` quita la noche más cercana, que es la que cierra antes.
   *
   * No se escribe «22 de octubre» en ningún sitio: se quita el día de la
   * primera fecha abierta, que hoy es el jueves y mañana será otro. Michael
   * se reservó esta decisión para cuando viera la prueba, y así se toma sin
   * tocar código.
   */
  const laMasCercana = abiertas.length ? diaDe(abiertas[0].starts_at) : null
  const ofrecibles = conJueves
    ? abiertas
    : abiertas.filter((e) => diaDe(e.starts_at) !== laMasCercana)

  if (!ofrecibles.length) {
    return NextResponse.json({ error: 'No queda ninguna fecha abierta que ofrecer.' }, { status: 409 })
  }

  /**
   * Quién tiene plan esta semana: de hoy en adelante, en cualquier fecha.
   *
   * Por tramos, porque `attended` no se borra nunca: esta consulta crece una
   * fila por cada persona que cena, para siempre.
   */
  const conPlan = await todasLasFilas<{
    profile_id: string | null
    events: unknown
  }>((desde, hasta) => admin
    .from('bookings')
    .select('profile_id, events!bookings_event_id_fkey(starts_at)')
    .in('status', VIVAS)
    .order('id')
    .range(desde, hasta))

  const ocupados = new Set(
    conPlan
      .filter((b) => {
        const ev = b.events as unknown as { starts_at?: string } | null
        return !!ev?.starts_at && ev.starts_at >= ahora
      })
      .map((b) => b.profile_id)
      .filter((x): x is string => !!x),
  )

  /**
   * Verificación: aprobada, o en revisión (que no es lo mismo y cuenta).
   *
   * POR TRAMOS, y es el fallo que tuvo este envío.
   *
   * Esto pedía la tabla entera de un tirón, y PostgREST devuelve mil filas
   * como máximo sin decir nada. `verifications` tenía mil doscientas sesenta
   * el 27-10, así que doscientas sesenta no existían para esta ruta:
   * TREINTA Y CINCO hombres verificados quedaban fuera del envío, y los que
   * estaban en `pending_verification` habrían recibido el correo que pide
   * una cédula que ya les habíamos aprobado.
   *
   * No falló nada. La consulta volvía sin error y con menos gente.
   */
  const verifs = await todasLasFilas<{ profile_id: string; status: string }>(
    (desde, hasta) => admin
      .from('verifications')
      .select('profile_id, status')
      .order('profile_id')
      .range(desde, hasta))

  const aprobados = new Set(verifs.filter((v) => v.status === 'approved').map((v) => v.profile_id))
  const enRevision = new Set(verifs.filter((v) => v.status === 'pending').map((v) => v.profile_id))

  // Los hombres vivos, con su nacimiento para medir las bandas de edad.
  const hombres = await todasLasFilas<{
    id: string
    email: string | null
    birthdate: string | null
    es_prueba: boolean | null
    deleted_at: string | null
    status: string | null
  }>((desde, hasta) => admin
    .from('profiles')
    .select('id, email, birthdate, es_prueba, deleted_at, status')
    .eq('gender', 'hombre')
    .order('id')
    .range(desde, hasta))

  const vivos = hombres.filter((p) => !p.es_prueba && !p.deleted_at && p.email && !ocupados.has(p.id))

  const grupos = {
    verificados: vivos.filter((p) => aprobados.has(p.id)),
    // Cuestionario hecho, sin aprobar y sin estar ya en revisión.
    /**
     * Cuestionario terminado = `pending_verification`. Es el estado en el
     * que queda quien contestó todo y todavía no ha subido la cédula, y es
     * el mismo que mira el embudo.
     */
    'sin-verificar': vivos.filter((p) =>
      !aprobados.has(p.id) && !enRevision.has(p.id) && p.status === 'pending_verification'),
  }

  /**
   * A QUIÉN YA SE LE MANDÓ.
   *
   * Esto faltaba y por poco cuesta caro: `equilibrar_mesas` no está en el
   * índice único de los correos que anuncian algo una vez, así que volver a
   * lanzar la ruta le habría escrito por segunda vez a los noventa y dos que
   * ya lo tenían. Un envío que no se puede reanudar sin duplicar no es un
   * envío, es una apuesta.
   *
   * Con esto la ruta se puede llamar las veces que haga falta: sigue por
   * donde se quedó y a nadie le llega dos veces.
   */
  const yaTienen = await todasLasFilas<{ profile_id: string | null }>(
    (desde, hasta) => admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('kind', 'equilibrar_mesas')
      .order('id')
      .range(desde, hasta))

  const hechos = new Set(yaTienen.map((r) => r.profile_id).filter((x): x is string => !!x))

  const salida: Record<string, unknown> = {}
  let encolados = 0
  let repetidos = 0
  let sinFechas = 0
  let noLesVa = 0

  for (const [grupo, gente] of Object.entries(grupos)) {
    const falta = grupo === 'sin-verificar' ? 'verificacion' : ''
    // A quien hay que verificar no se le ofrece el jueves si ya no le da
    // tiempo a que una persona le mire la cédula. Esa decisión es de Michael
    // y llega por `?jueves=0`; aquí solo se respeta.
    /**
     * `?solo=` NO filtra por público: busca a esa persona y le manda la
     * variante que se pida.
     *
     * Filtrándola dentro del grupo, la prueba a Michael no salía: él tiene
     * reserva esta semana, así que no está en ninguno de los dos públicos y
     * el envío se quedaba en cero sin decir por qué. Una prueba que depende
     * de que quien la mira cumpla los requisitos no sirve para mirar nada.
     */
    let destinatarios = gente

    if (solo) {
      if (variante && variante !== grupo) { salida[grupo] = { candidatos: gente.length, encolados: 0, saltado: 'otra variante' }; continue }
      const buscado = solo.trim().toLowerCase()
      const { data: ese } = await admin
        .from('profiles')
        .select('id, email, birthdate, es_prueba, deleted_at, status')
        .ilike('email', buscado)
        .is('deleted_at', null)
        .limit(1)
      destinatarios = (ese ?? []) as typeof gente
      if (!destinatarios.length) {
        return NextResponse.json({ error: `no hay cuenta viva con el correo ${solo}` }, { status: 404 })
      }
    }

    /**
     * Las bajas, de una vez y no de una en una.
     *
     * `quienQuiereSaberDe` acepta la lista entera y por dentro hace sus
     * consultas una sola vez. Preguntándolo persona a persona, la pasada en
     * seco de doscientas tardaba minutos, y el envío de verdad los tardaría
     * también: esta noche eso importa.
     */
    const quieren = solo
      ? new Set(destinatarios.map((p) => p.id))
      : await quienQuiereSaberDe(destinatarios.map((p) => p.id), 'dinner')

    let delGrupo = 0
    for (const p of destinatarios) {
      // Las fechas que ESTA persona puede tomar: la banda de edad se mide el
      // día de la cena, no hoy, que es como lo miran reservar y pago.
      const suyas = ofrecibles.filter((e) => cabeEnLaFecha(p.birthdate, e))
      if (!suyas.length) { sinFechas++; continue }

      if (!quieren.has(p.id)) { noLesVa++; continue }
      // A quien ya se le mandó, no se le repite. Salvo `?solo=`, que es la
      // prueba y tiene que poder verse más de una vez.
      if (!solo && hechos.has(p.id)) { repetidos++; continue }

      if (seco) { delGrupo++; encolados++; continue }

      const r = await encolar(
        { perfil: p.id },
        'equilibrar_mesas',
        { fechas: suyas.map((e) => e.id), falta },
        // Sin `cuando` sale al momento. Con `cuando`, `encolar` NO despacha y
        // la fila espera en la cola a que el cron de los correos la recoja.
        cuando ? { cuando } : {},
      )
      if (r === 'encolado') { delGrupo++; encolados++ }
    }

    salida[grupo] = { candidatos: gente.length, encolados: delGrupo }
  }

  return NextResponse.json({
    fechas: ofrecibles.map((e) => ({
      id: e.id,
      empieza: e.starts_at,
      cierra: e.booking_closes_at,
      banda: e.age_band_min ?? null,
    })),
    conJueves,
    ...salida,
    encolados,
    yaLoTenian: repetidos,
    sinFechasQueOfrecer: sinFechas,
    /**
     * Y NO son bajas de correo, que es como lo llamé al principio.
     *
     * `quienQuiereSaberDe` filtra varias cosas a la vez, y de las dieciséis
     * que quedaron fuera de este envío CERO eran bajas: catorce habían
     * dicho en el cuestionario que las cenas no son su plan, y dos no
     * contestaron esa pregunta. Llamarlo «de baja» en la respuesta me hizo
     * contárselo mal a Michael.
     */
    noLesVaEsteplan: noLesVa,
    ...(seco ? { seco: true } : {}),
    ...(solo ? { solo } : {}),
    /**
     * A qué hora sale, dicho en Caracas y no en UTC.
     *
     * El cron de los correos pasa cada quince minutos, así que lo programado
     * para las ocho sale entre las ocho y las ocho y cuarto. Decirlo aquí
     * evita la pregunta de por qué a las 8:00 en punto no había salido.
     */
    ...(cuando
      ? {
        programado: cuando.toISOString(),
        programadoEnCaracas: (() => {
          const p = partesDe(cuando.toISOString(), ZONA_POR_DEFECTO)
          return p ? `${p.dia} ${p.numero} de ${p.mes}, ${p.hora}` : cuando.toISOString()
        })(),
        nota: 'La cola pasa cada quince minutos: sale a esa hora o hasta un cuarto de hora después.',
      }
      : {}),
  })
}

/** Mismo candado que los demás: sin el secreto, 404. */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  const params = new URL(request.url).searchParams

  /**
   * `?cuando=` deja el envío PROGRAMADO en vez de soltarlo ahora.
   *
   * Michael, 27-10: «el correo sale mañana a las 8am, no ahorita». Sin esto
   * la única forma de que saliera a esa hora era que alguien estuviera
   * delante a esa hora, y eso no es una hora de envío, es una alarma.
   *
   * Se pide en UTC con la Z, a propósito: una hora sin zona escrita en una
   * URL es la forma de fallo que este repositorio ya ha pagado dos veces.
   * Las ocho de la mañana de Caracas son las 12:00Z. La respuesta devuelve
   * la hora en Caracas para que se vea que se entendió bien.
   *
   * Y se rechaza una hora pasada: `encolar` despacha al momento cuando
   * `cuando` ya venció, así que un error de un día aquí es un envío
   * inmediato a todo el mundo.
   */
  const cuandoCrudo = params.get('cuando')
  let cuando: Date | null = null
  if (cuandoCrudo) {
    const t = Date.parse(cuandoCrudo)
    if (Number.isNaN(t)) {
      return NextResponse.json(
        { error: `no entiendo la hora «${cuandoCrudo}». Pídela en ISO con zona, por ejemplo 2026-10-28T12:00:00Z.` },
        { status: 400 },
      )
    }
    if (t <= Date.now()) {
      return NextResponse.json(
        { error: 'esa hora ya pasó, y eso haría que el envío saliera al momento. Pon una futura o quita el parámetro.' },
        { status: 400 },
      )
    }
    cuando = new Date(t)
  }

  return mandar(
    params.get('seco') === '1',
    params.get('solo'),
    params.get('jueves') !== '0',
    params.get('variante'),
    cuando,
  )
}
