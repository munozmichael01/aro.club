import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { enTrozos } from '@/lib/en-trozos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El anuncio de una mesa en otro idioma, a mano.
 *
 * No es un cron aunque viva aquí: usa el mismo candado del secreto que los
 * demás y se dispara una vez desde fuera. Lo pidió Michael el 20-10 para la
 * primera cena «Dinner in English», y está escrito para cualquier idioma
 * porque la columna `events.idioma` ya lo es.
 *
 * A QUIÉN. Verificados que marcaron ese idioma y que NO tienen reserva viva
 * esa semana. Lo segundo no es un detalle: en el sábado normal cuatro de
 * ocho hablan inglés, y escribirles sería vaciar una mesa que ya funciona
 * para llenar otra. Se invita a quien todavía no tiene plan.
 *
 * `?seco=1` cuenta sin escribir y `?solo=correo@…` manda a una sola
 * dirección, que es la única forma de mirar el correo antes de soltarlo: la
 * llave de Resend del entorno local es inválida a propósito.
 */

export const dynamic = 'force-dynamic'

/** Caracas va cuatro horas por detrás de UTC y no cambia con la estación. */
const CARACAS = 4

/**
 * A qué hora de Caracas sale, si no es ahora mismo.
 *
 * Doscientos treinta y cuatro correos no se sueltan en el segundo en que se
 * pulsa: se encolan con su hora y la cola los va sacando. Devuelve la próxima
 * vez que den esas horas y minutos, hoy o mañana.
 */
function aLasDeCaracas(hhmm: string, ahora = new Date()): Date | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim())
  if (!m) return null
  const enCcs = new Date(ahora.getTime() - CARACAS * 3600_000)
  const hoy = Date.UTC(enCcs.getUTCFullYear(), enCcs.getUTCMonth(), enCcs.getUTCDate(), Number(m[1]), Number(m[2]))
  const cuando = new Date(hoy + CARACAS * 3600_000)
  return cuando.getTime() > ahora.getTime() ? cuando : new Date(cuando.getTime() + 24 * 3600_000)
}

/** El lunes de la semana de esa fecha, en hora de Caracas. */
function semanaDe(iso: string): { desde: string; hasta: string } {
  const enCcs = new Date(Date.parse(iso) - CARACAS * 3600_000)
  const atras = (enCcs.getUTCDay() + 6) % 7
  const lunes = Date.UTC(enCcs.getUTCFullYear(), enCcs.getUTCMonth(), enCcs.getUTCDate() - atras, 0, 0, 0, 0)
  return {
    desde: new Date(lunes + CARACAS * 3600_000).toISOString(),
    hasta: new Date(lunes + CARACAS * 3600_000 + 7 * 24 * 3600_000).toISOString(),
  }
}

async function anunciar(seco: boolean, solo: string | null, eventoId: string | null, hora: string | null) {
  const admin = createAdminClient()

  const cuando = hora ? aLasDeCaracas(hora) : null
  if (hora && !cuando) {
    return NextResponse.json({ error: 'La hora no se entiende. Se escribe como 12:00.' }, { status: 400 })
  }

  // La fecha: la que se pida, o la próxima abierta que pida un idioma.
  const columnas = 'id, starts_at, idioma, status'
  const { data: fechas } = eventoId
    ? await admin.from('events').select(columnas).eq('id', eventoId).limit(1)
    : await admin
        .from('events')
        .select(columnas)
        .eq('status', 'open')
        .not('idioma', 'is', null)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at')
        .limit(1)

  const fecha = (fechas ?? [])[0] as { id: string; starts_at: string; idioma: string | null } | undefined
  if (!fecha?.idioma) {
    return NextResponse.json({ error: 'No hay ninguna fecha abierta en otro idioma.' }, { status: 404 })
  }

  // Quién marcó ese idioma.
  const { data: respuestas } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'idiomas')

  const loHablan = new Set(
    (respuestas ?? [])
      .filter((r) => Array.isArray(r.value) && (r.value as unknown[]).some((x) => String(x) === fecha.idioma))
      .map((r) => r.profile_id)
      .filter((x): x is string => !!x),
  )

  /**
   * Y de esos, las cuentas vivas. SIN exigir verificación.
   *
   * Estuvo filtrado a verificados y Michael lo cambió el 20-10: «¿será que
   * mandamos a los 253 menos los que tienen plan?». Son noventa y una
   * personas que marcaron inglés y no han subido la cédula, y para ellas
   * este correo es justo la razón que les faltaba: hay una mesa que les
   * interesa y para sentarse hay que terminar. Es el mismo criterio que ya
   * tiene el resumen de los lunes, que también va a los sin verificar.
   *
   * Lo que sí se quita siempre: cuentas de prueba, borradas y sin correo.
   * Las de prueba son las de los guiones y la del revisor de Apple, y ya han
   * llenado el buzón de Michael otras veces.
   */
  const cuentas = await enTrozos<{ id: string | null; email: string | null; es_prueba: boolean | null; deleted_at: string | null }>(
    [...loHablan],
    (t) => admin.from('profiles').select('id, email, es_prueba, deleted_at').in('id', t),
    'las cuentas de quien habla inglés',
  )

  const puede = new Set(
    cuentas
      .filter((p) => !p.es_prueba && !p.deleted_at && p.email)
      .map((p) => p.id)
      .filter((x): x is string => !!x),
  )

  // Quién ya tiene plan esa semana. No se les escribe.
  const { desde, hasta } = semanaDe(fecha.starts_at)
  const { data: deLaSemana } = await admin
    .from('events')
    .select('id')
    .gte('starts_at', desde)
    .lt('starts_at', hasta)

  const { data: reservas } = await admin
    .from('bookings')
    .select('profile_id')
    .in('event_id', (deLaSemana ?? []).map((e) => e.id))
    .in('status', ['pending_payment', 'confirmed'])

  const yaTienenPlan = new Set((reservas ?? []).map((r) => r.profile_id).filter((x): x is string => !!x))

  let destinatarios = [...puede].filter((id) => !yaTienenPlan.has(id))

  if (solo) {
    const buscado = solo.trim().toLowerCase()
    const { data: ese } = await admin
      .from('profiles')
      .select('id, email')
      .ilike('email', buscado)
      .is('deleted_at', null)
      .limit(1)
    const id = ese?.[0]?.id
    if (!id) return NextResponse.json({ error: `no hay cuenta viva con el correo ${solo}` }, { status: 404 })
    destinatarios = [id]
  }

  // Y a quién ya se le contó. Sin índice todavía: esto se dispara a mano y
  // una vez, pero una segunda pasada no puede repetirle el correo a nadie.
  const { data: yaContado } = await admin
    .from('scheduled_emails')
    .select('profile_id')
    .eq('kind', 'cena_en_ingles')
    .eq('event_id', fecha.id)

  const hechos = new Set((yaContado ?? []).map((r) => r.profile_id).filter((x): x is string => !!x))

  let encolados = 0
  let repetidos = 0
  for (const id of destinatarios) {
    if (hechos.has(id)) { repetidos++; continue }
    if (seco) { encolados++; continue }
    const r = await encolar({ perfil: id }, 'cena_en_ingles', {}, cuando ? { eventoId: fecha.id, cuando } : { eventoId: fecha.id })
    if (r === 'encolado') encolados++
    else repetidos++
  }

  return NextResponse.json({
    fecha: fecha.id,
    empieza: fecha.starts_at,
    idioma: fecha.idioma,
    loHablan: loHablan.size,
    cuentasVivas: puede.size,
    conPlanEstaSemana: [...puede].filter((id) => yaTienenPlan.has(id)).length,
    destinatarios: destinatarios.length,
    encolados,
    repetidos,
    ...(cuando ? { salen: cuando.toISOString() } : { salen: 'ahora' }),
    ...(seco ? { seco: true } : {}),
    ...(solo ? { solo } : {}),
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
  return anunciar(params.get('seco') === '1', params.get('solo'), params.get('evento'), params.get('hora'))
}
