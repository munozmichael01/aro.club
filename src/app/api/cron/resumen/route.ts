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
function semanaDeHoy(ahora = new Date()): { desde: Date; hasta: Date; semana: string } {
  const enCcs = new Date(ahora.getTime() - CARACAS * 3600_000)
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

async function resumir(seco: boolean, solo: string | null, hora: string | null) {
  const admin = createAdminClient()
  const { desde, hasta, semana } = semanaDeHoy()

  const cuando = hora ? aLasDeCaracas(hora) : null
  if (hora && !cuando) {
    return NextResponse.json({ error: 'La hora no se entiende. Se escribe como 08:00.' }, { status: 400 })
  }

  const { data: fechas } = await admin
    .from('events')
    .select('id, format, starts_at, city_slug, age_band_min, age_band_max')
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
  const { data: yaTienen } = await admin
    .from('scheduled_emails')
    .select('profile_id')
    .eq('kind', 'resumen_semanal')
    .gte('send_at', desde.toISOString())
    .lt('send_at', hasta.toISOString())

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
  return resumir(params.get('seco') === '1', params.get('solo'), params.get('hora'))
}
