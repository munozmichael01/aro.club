import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { quienQuiereSaberDe } from '@/lib/a-quien-avisar'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El resumen de los lunes.
 *
 * Un solo correo con los planes de la semana, con lo que le cuadra a cada
 * quien arriba y el resto debajo. Nació el 19-10 de una pregunta de Michael:
 * «¿no vale la pena agrupar un correo todos los lunes a las 8 con un resumen
 * de los planes de esta semana?».
 *
 * **Sustituye al aviso de apertura de los lunes, no se suma.** Un plan que va
 * dentro del resumen ya está contado: mandarle además su `abrimos_zona` es
 * contarle lo mismo dos veces el mismo día. De martes a domingo no cambia
 * nada, cada apertura sigue avisando por su cuenta.
 *
 * A quién: TODAS las cuentas de la ciudad, no solo a quien tenga una
 * coincidencia. Michael, 19-10: «al final el envío semanal debería ser para
 * todos para despertar interés». Lo que cambia según la persona es el orden,
 * no la lista.
 *
 * Quien vive en otra ciudad NO lo recibe. Son nueve y todos los planes son de
 * Caracas: un resumen semanal de algo a lo que no puedes ir es la forma más
 * rápida de que alguien apague los correos.
 *
 * `?seco=1` calcula y no escribe, como todos los crones que encolan. Aquí
 * hace más falta que en ninguno: son seiscientos destinatarios y esta base es
 * la de producción.
 *
 * `?solo=correo@…` manda SOLO a esa dirección. Es para verlo antes de
 * soltarlo, y existe porque no hay forma de mirar un correo sin mandarlo: la
 * llave de Resend del entorno local es inválida a propósito.
 *
 * `?clave=` le pone nombre al envío para poder mandar DOS en la misma semana,
 * `?sinReserva=1` lo acota a quien no tiene sitio en ninguna de las fechas y
 * `?verificados=1` a quien ya puede apartar puesto hoy mismo.
 * Los dos nacieron el 30-10 del mismo encargo: un viernes a las ocho, las
 * cenas de esa noche y del sábado, a quien todavía puede apuntarse.
 */

export const dynamic = 'force-dynamic'

/** Caracas va cuatro horas por detrás de UTC y no cambia con la estación. */
const CARACAS = 4

/**
 * La semana de hoy, de lunes a domingo, en hora de Caracas.
 *
 * «Nuestra semana va de lunes a viernes», dijo Michael el 18-10 cuando el
 * panel metía el brunch del domingo en la semana siguiente. La semana del
 * club empieza el lunes, y la fecha de corte es medianoche de Caracas, no la
 * del servidor, que corre en UTC: un sábado a las 8 de la noche de Caracas ya
 * es domingo en UTC.
 */
/**
 * `semanas` desplaza la ventana: 1 es la siguiente.
 *
 * El resumen nació para correr los lunes, y entonces «la semana de hoy» es
 * la que empieza ese día. Michael, 25-10, un domingo por la tarde: quiere
 * mandar la agenda de la semana que viene esta misma tarde, que es cuando
 * la gente arma su semana. Sin esto saldría la semana que termina hoy, con
 * una fecha dentro y seiscientos repetidos.
 *
 * La clave de la semana se mueve con la ventana, así que el candado de «uno
 * por persona y semana» sigue valiendo: mandar el domingo la que viene no
 * impide el resumen del lunes siguiente, y mandarla dos veces sí se impide.
 */
function semanaDeHoy(ahora = new Date(), semanas = 0): { desde: Date; hasta: Date; semana: string } {
  const enCcs = new Date(ahora.getTime() - CARACAS * 3600_000 + semanas * 7 * 24 * 3600_000)
  // getUTCDay sobre la fecha ya corrida es el día de Caracas. 0 es domingo.
  const atras = (enCcs.getUTCDay() + 6) % 7
  const lunes = Date.UTC(
    enCcs.getUTCFullYear(),
    enCcs.getUTCMonth(),
    enCcs.getUTCDate() - atras,
    0, 0, 0, 0,
  )
  return {
    desde: new Date(lunes + CARACAS * 3600_000),
    hasta: new Date(lunes + CARACAS * 3600_000 + 7 * 24 * 3600_000),
    semana: new Date(lunes).toISOString().slice(0, 10),
  }
}

/**
 * A qué hora de Caracas sale, si no es ahora mismo.
 *
 * `encolar` sin hora manda en el acto, y eso vale para una prueba de una
 * fila. Para seiscientas no: se encolan con su hora y la cola las va sacando.
 * Devuelve la próxima vez que den esas horas y minutos, hoy o mañana.
 */
function aLasDeCaracas(hhmm: string, ahora = new Date()): Date | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim())
  if (!m) return null
  const enCcs = new Date(ahora.getTime() - CARACAS * 3600_000)
  const hoy = Date.UTC(enCcs.getUTCFullYear(), enCcs.getUTCMonth(), enCcs.getUTCDate(), Number(m[1]), Number(m[2]))
  const cuando = new Date(hoy + CARACAS * 3600_000)
  return cuando.getTime() > ahora.getTime() ? cuando : new Date(cuando.getTime() + 24 * 3600_000)
}


/**
 * LA LISTA DE ESPERA, por su cuenta.
 *
 * Michael, 25-10: «la lista de espera va también hoy en otro envío para que
 * no tenga nada que ver con la lógica anterior». Y tiene razón en separarlo:
 * de esta gente no sabemos NADA —ni zonas, ni días, ni planes, ni edad— así
 * que ninguno de los filtros de arriba tiene con qué decidir, y aplicárselos
 * a medias sería inventarse preferencias que nadie nos dijo.
 *
 * Así que reciben la semana entera, sin nada marcado como suyo, que es
 * exactamente la variante que ya existe para quien no tiene coincidencias.
 * El botón no los manda a `/cuenta`, que les pediría entrar con una cuenta
 * que no tienen, sino a la agenda pública.
 *
 * Quien ya convirtió a cuenta queda fuera: esa persona recibe el otro envío,
 * y mandarle los dos sería contarle la misma semana dos veces.
 */
async function espera(
  admin: ReturnType<typeof createAdminClient>,
  fechas: { id: string }[],
  ciudades: string[],
  semana: string,
  cuando: Date | null,
  seco: boolean,
  solo: string | null,
) {
  // Las ciudades de ESTAS fechas, como arriba: quien dejó su correo para
  // otra ciudad no tiene nada que leer en esta agenda.
  const abiertas = new Set(ciudades.length ? ciudades : ['caracas'])

  let filas: { email: string | null; city_slug: string | null }[] = []
  for (let desde = 0; ; desde += 1000) {
    const { data } = await admin
      .from('waitlist')
      .select('email, city_slug')
      .is('converted_profile_id', null)
      .range(desde, desde + 999)
    if (!data?.length) break
    filas = filas.concat(data)
    if (data.length < 1000) break
  }

  /**
   * Sin repetir direcciones y sin las que ya tienen cuenta.
   *
   * `converted_profile_id` cubre a quien convirtió por el camino normal,
   * pero alguien pudo dejar su correo dos veces, o dejarlo y crear la cuenta
   * con esa misma dirección sin que la conversión quedara apuntada. Se
   * comprueba contra `profiles` por la dirección, que es lo que de verdad
   * recibe el correo.
   */
  const correos = [...new Set(
    filas
      .filter((f) => f.email && abiertas.has(f.city_slug ?? 'caracas'))
      .map((f) => f.email!.trim().toLowerCase()),
  )]

  const conCuenta = new Set<string>()
  for (let i = 0; i < correos.length; i += 300) {
    const { data } = await admin
      .from('profiles')
      .select('email')
      .in('email', correos.slice(i, i + 300))
    for (const p of data ?? []) if (p.email) conCuenta.add(p.email.trim().toLowerCase())
  }

  const destinatarios = correos
    .filter((c) => !conCuenta.has(c))
    .filter((c) => !solo || c === solo.trim().toLowerCase())

  const todas = fechas.map((f) => f.id)
  let encolados = 0
  for (const correo of destinatarios) {
    if (seco) { encolados++; continue }
    const r = await encolar(
      { correo },
      'resumen_semanal',
      { tuyas: [], otras: todas, semana },
      cuando ? { cuando } : {},
    )
    if (r === 'encolado') encolados++
  }

  return NextResponse.json({
    semana,
    fechas: fechas.length,
    enLaEspera: correos.length,
    yaTienenCuenta: conCuenta.size,
    destinatarios: destinatarios.length,
    encolados,
    salen: cuando ? cuando.toISOString() : 'ahora',
    ...(seco ? { seco: true } : {}),
  })
}

async function resumir(
  seco: boolean,
  solo: string | null,
  hora: string | null,
  semanas = 0,
  paraLaEspera = false,
  clave: string | null = null,
  soloSinReserva = false,
  soloVerificados = false,
) {
  const admin = createAdminClient()
  const { desde, hasta, semana: laSemana } = semanaDeHoy(new Date(), semanas)

  /**
   * `?clave=` es un envío APARTE dentro de la misma semana.
   *
   * El candado de abajo es por la semana de la que habla el correo, y eso es
   * lo correcto para el de los lunes: dos pasadas el mismo lunes son un
   * repetido. Pero el 30-10, un viernes, Michael quiso mandar las cenas de
   * esa noche y del sábado, y el resumen del lunes 26 ya había salido: con la
   * clave de la semana el candado lo leía como repetido y encolaba cero.
   *
   * Así que la clave del envío se puede dar a mano. Pasa al payload, así que
   * también es la que llega a `utm_content`: en Analytics este viernes no se
   * mezcla con el lunes, que es justo lo que hay que poder comparar.
   */
  const semana = clave || laSemana

  const cuando = hora ? aLasDeCaracas(hora) : null
  if (hora && !cuando) {
    return NextResponse.json({ error: 'La hora no se entiende. Se escribe como 08:00.' }, { status: 400 })
  }

  const { data: fechas } = await admin
    .from('events')
    /**
     * `idioma` hace falta aunque el resumen no lo pinte.
     *
     * Se lo pasamos entero a `quienQuiereSaberDe`, y ahí dentro el idioma
     * decide DOS cosas: a quién se le ofrece una mesa en inglés, y si esa
     * fecha compite con las de edad de esa misma noche. Sin el campo, la
     * cena en inglés del 31 se leía como una cena en español: las dos de
     * edad del sábado le competían, entre «hasta 45» y «desde 46» cubren
     * todas las edades que existen, y se quedó marcada para 14 personas de
     * las 213 que hablan inglés y pueden ese sábado. Las 14 eran las que no
     * tienen fecha de nacimiento.
     */
    .select('id, format, starts_at, city_slug, age_band_min, age_band_max, idioma')
    .eq('status', 'open')
    .gte('starts_at', desde.toISOString())
    .lt('starts_at', hasta.toISOString())
    .order('starts_at')

  if (!fechas?.length) {
    return NextResponse.json({ semana, fechas: 0, encolados: 0, ...(seco ? { seco: true } : {}) })
  }

  /**
   * A quién se le escribe: toda cuenta viva de la ciudad de los planes.
   *
   * Sin ciudad también, que es lo que hace el resto del sistema: quien no la
   * tiene es de la ciudad del club, que es lo que el producto dio por hecho
   * hasta que hubo una segunda.
   */
  const ciudades = [...new Set(fechas.map((f) => f.city_slug).filter((c): c is string => !!c))]

  // Y aquí se bifurca: o las cuentas, o la espera. Nunca las dos en la
  // misma pasada, para que cada envío se cuente por separado.
  if (paraLaEspera) return espera(admin, fechas, ciudades, semana, cuando, seco, solo)

  let perfiles: { id: string; email: string | null; notificaciones: unknown }[] = []
  for (let desdeFila = 0; ; desdeFila += 1000) {
    const { data } = await admin
      .from('profiles')
      .select('id, email, notificaciones, city_slug, es_prueba')
      .is('deleted_at', null)
      .not('email', 'is', null)
      .range(desdeFila, desdeFila + 999)
    if (!data?.length) break
    perfiles = perfiles.concat(
      data
        .filter((p) => !p.es_prueba)
        .filter((p) => !p.city_slug || ciudades.includes(p.city_slug))
        // Encendido por defecto: solo se salta a quien lo apagó a propósito.
        .filter((p) => ((p.notificaciones ?? {}) as Record<string, boolean>).resumen_semanal !== false)
        .map((p) => ({ id: p.id, email: p.email, notificaciones: p.notificaciones })),
    )
    if (data.length < 1000) break
  }

  /**
   * `?sinReserva=1`: solo a quien NO tiene sitio en ninguna de estas fechas.
   *
   * El resumen de los lunes va a todo el mundo a propósito —«al final el
   * envío semanal debería ser para todos para despertar interés»— y quien ya
   * reservó lo lee con un «Ya tienes puesto» en su fecha.
   *
   * Esto es para el otro caso, el del 30-10: un envío cuyo único objetivo es
   * llenar las mesas de esta semana. A quien ya tiene su silla no le dice
   * nada que no sepa, y es el correo que menos se puede permitir leerse como
   * de más. Michael esa noche: «a los 372 que nunca han reservado», y luego
   * los que reservaron antes y no tienen sitio ahora.
   */
  /**
   * `?soloVerificados=1`: solo a quien ya puede apartar puesto.
   *
   * El de los lunes va también a quien no se ha verificado, y está bien: a
   * esa persona el botón le dice «Verificar mi identidad» y la lleva ahí, que
   * es su siguiente paso de verdad.
   *
   * Pero un envío cuyo objetivo es llenar las mesas de ESTA semana es otra
   * cosa. A quien le falta la cédula no le da tiempo: la de esta noche cierra
   * a las diez de la mañana y verificarse lo mira una persona. Invitarle a
   * reservar algo que no va a poder reservar hoy es el correo que el 25-10 ya
   * mandó a 348 personas, y no se repite.
   *
   * La misma vista que usa `/api/reservar` para decidir si deja apartar
   * puesto. Preguntar otra cosa aquí sería invitar a quien la ruta rechaza.
   */
  if (soloVerificados) {
    const ids = perfiles.map((p) => p.id)
    const listos = new Set<string>()
    for (let i = 0; i < ids.length; i += 300) {
      const { data } = await admin
        .from('v_verified_profiles')
        .select('id')
        .in('id', ids.slice(i, i + 300))
      for (const v of data ?? []) if (v.id) listos.add(v.id)
    }
    perfiles = perfiles.filter((p) => listos.has(p.id))
  }

  if (soloSinReserva) {
    const conSitio = new Set<string>()
    for (const f of fechas) {
      const { data: suyas } = await admin
        .from('bookings')
        .select('profile_id')
        .eq('event_id', f.id)
        .in('status', ['pending_payment', 'confirmed', 'attended'])
      for (const b of suyas ?? []) if (b.profile_id) conSitio.add(b.profile_id)
    }
    perfiles = perfiles.filter((p) => !conSitio.has(p.id))
  }

  if (solo) {
    const buscado = solo.trim().toLowerCase()
    perfiles = perfiles.filter((p) => (p.email ?? '').toLowerCase() === buscado)
    if (!perfiles.length) {
      return NextResponse.json({ error: `no hay ninguna cuenta viva con el correo ${solo}` }, { status: 404 })
    }
  }

  const todos = perfiles.map((p) => p.id)

  /**
   * Qué fecha le cuadra a quién.
   *
   * Se pregunta con la MISMA función que deciden el aviso de apertura y el de
   * cierre, y no con una copia: zonas, plan que le interesa, día que le
   * sirve, edad de la fecha y ciudad. Dos ideas distintas de «esto te cuadra»
   * es como se acaba mandando una cena de +40 a alguien de veintitrés.
   */
  /**
   * Las zonas que marcó cada quien, que `quienQuiereSaberDe` NO mira.
   *
   * Esa función resuelve plan, día, edad, ciudad y cuentas de prueba; la zona
   * la filtra quien la llama, porque cada aviso sabe qué zonas abre. Faltaba
   * aquí y se vio en la primera prueba: a Michael, que marcó Las Mercedes,
   * Los Palos Grandes, Chacao y El Rosal, el resumen le ponía como «para ti»
   * las dos cenas de Los Naranjos y El Hatillo.
   */
  const { data: respuestasZonas } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'zonas')

  const zonasDe = new Map<string, string[]>()
  for (const r of respuestasZonas ?? []) {
    if (r.profile_id && Array.isArray(r.value)) {
      zonasDe.set(r.profile_id, (r.value as string[]).filter((z) => typeof z === 'string'))
    }
  }

  const leCuadra = new Map<string, string[]>()
  for (const f of fechas) {
    const { data: sedes } = await admin
      .from('event_venues')
      .select('zone_slug')
      .eq('event_id', f.id)
    const abiertas = [...new Set((sedes ?? []).map((s) => s.zone_slug).filter((z): z is string => !!z))]
    if (!abiertas.length) continue

    /**
     * Quien no contestó las zonas sí entra, igual que con los planes: no
     * contestar no es decir que no, es no haber llegado. Y son veintidós
     * cuentas que si no, no verían nunca nada arriba.
     */
    const enZona = todos.filter((id) => {
      const suyas = zonasDe.get(id)
      return !suyas || !suyas.length || suyas.some((z) => abiertas.includes(z))
    })
    if (!enZona.length) continue

    const quieren = await quienQuiereSaberDe(enZona, f.format, f)
    for (const id of quieren) leCuadra.set(id, [...(leCuadra.get(id) ?? []), f.id])
  }

  /**
   * Y a quién ya se le mandó el de esta semana.
   *
   * Sin esto, dos pasadas el mismo lunes son dos correos. No hay índice único
   * que lo impida —el de `scheduled_emails` es por persona, tipo y FECHA, y
   * aquí no hay fecha— así que lo impide esta consulta. Mientras no haya
   * índice, dos pasadas a la vez podrían colarse: el cron corre una vez.
   */
  /**
   * Por la SEMANA de la que habla, no por cuándo sale.
   *
   * Miraba el `send_at` dentro de la ventana de la semana, y eso valía
   * mientras el resumen saliera el lunes de esa misma semana. Desde que se
   * puede mandar la que viene —`?semanas=1`, un domingo por la tarde— el
   * correo sale FUERA de su propia ventana y el candado no se veía a sí
   * mismo: una segunda pasada eran 822 correos repetidos.
   *
   * La semana de la que habla va en el payload, así que se pregunta por
   * ahí, que es lo que de verdad no puede repetirse.
   */
  const { data: yaTienen } = await admin
    .from('scheduled_emails')
    .select('profile_id')
    .eq('kind', 'resumen_semanal')
    .eq('payload->>semana', semana)

  const hechos = new Set((yaTienen ?? []).map((r) => r.profile_id).filter((x): x is string => !!x))

  let encolados = 0
  let repetidos = 0
  let conCoincidencia = 0
  for (const p of perfiles) {
    if (hechos.has(p.id)) { repetidos++; continue }

    const tuyas = leCuadra.get(p.id) ?? []
    const otras = fechas.map((f) => f.id).filter((id) => !tuyas.includes(id))
    if (tuyas.length) conCoincidencia++

    if (seco) { encolados++; continue }

    const r = await encolar(
      { perfil: p.id },
      'resumen_semanal',
      { semana, tuyas, otras },
      cuando ? { cuando } : {},
    )
    if (r === 'encolado') encolados++
    else repetidos++
  }

  return NextResponse.json({
    semana,
    fechas: fechas.length,
    destinatarios: perfiles.length,
    conCoincidencia,
    sinCoincidencia: perfiles.length - conCoincidencia,
    encolados,
    repetidos,
    ...(cuando ? { salen: cuando.toISOString() } : { salen: 'ahora' }),
    ...(seco ? { seco: true } : {}),
    ...(solo ? { solo } : {}),
  })
}

/**
 * Mismo candado que los demás crones: sin el secreto no se entra, y 404 en vez
 * de 401 para no confirmar que la ruta existe.
 */
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET
  const cabecera = request.headers.get('authorization')

  if (!secreto || cabecera !== `Bearer ${secreto}`) {
    return new NextResponse(null, { status: 404 })
  }

  const params = new URL(request.url).searchParams
  // `?semanas=1` para la que viene. Sin él, la de hoy, que es lo que hace
  // el cron de los lunes.
  const semanas = Number(params.get('semanas') ?? 0)
  if (!Number.isInteger(semanas) || semanas < 0 || semanas > 4) {
    return NextResponse.json({ error: 'semanas se escribe de 0 a 4.' }, { status: 400 })
  }
  // `?espera=1` manda el OTRO envío: el de quien dejó su correo y nunca
  // llegó a tener cuenta. Va aparte a propósito y no comparte un solo
  // filtro con el de las cuentas.
  /**
   * `?clave=` da nombre al envío, para poder mandar dos en una semana. Se
   * acota a lo que cabe en una etiqueta de Analytics y en un payload: sin
   * esto, cualquier cosa escrita en la URL acaba en `utm_content`.
   */
  const clave = params.get('clave')
  if (clave !== null && !/^[a-z0-9-]{3,40}$/.test(clave)) {
    return NextResponse.json(
      { error: 'clave se escribe en minúsculas, números y guiones, de 3 a 40.' },
      { status: 400 },
    )
  }

  return resumir(
    params.get('seco') === '1',
    params.get('solo'),
    params.get('hora'),
    semanas,
    params.get('espera') === '1',
    clave,
    params.get('sinReserva') === '1',
    params.get('verificados') === '1',
  )
}
