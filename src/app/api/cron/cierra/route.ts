import { NextResponse } from 'next/server'

import { encolar } from '@/lib/correos'
import { createAdminClient } from '@/lib/supabase/admin'

import { quienQuiereSaberDe } from '@/lib/a-quien-avisar'

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
 * Una vez por persona y fecha, por el índice único. El cron puede correr dos
 * veces sin duplicar.
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

async function avisar(seco: boolean) {
  const admin = createAdminClient()

  const ahora = Date.now()

  const { data: eventos } = await admin
    .from('events')
    .select('id, booking_closes_at, format')
    .eq('status', 'open')
    .gt('booking_closes_at', new Date(ahora).toISOString())
    .lte('booking_closes_at', new Date(ahora + ANTELACION).toISOString())

  if (!eventos?.length) return NextResponse.json({ eventos: 0, encolados: 0, seco })

  let encolados = 0

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

    // Quien ya tiene sitio en esa fecha, sea pagando o con crédito.
    const { data: reservas } = await admin
      .from('bookings')
      .select('profile_id')
      .eq('event_id', ev.id)
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
    const { data: verificados } = await admin
      .from('v_verified_profiles')
      .select('id')
      .in('id', puedenLlegar)

    const puede = new Set((verificados ?? []).map((v) => v.id).filter((id): id is string => !!id))
    if (!puede.size) continue

    // Y de esos, quien quiere saber de ESTE plan y no es una cuenta de
    // prueba. Las dos reglas viven en `a-quien-avisar` porque son las mismas
    // que `abrimos_zona`, que tenia el mismo hueco.
    const quieren = await quienQuiereSaberDe([...puede], ev.format)
    if (!quieren.size) continue

    const { data: perfiles } = await admin
      .from('profiles')
      .select('id, notificaciones')
      .in('id', [...quieren])
      .is('deleted_at', null)

    // Quien ya lo tiene encolado para esta fecha. El índice único ya impide el
    // duplicado, pero filtrarlo aquí es lo que hace que la cuenta que devuelve
    // la pasada en seco sea la misma que escribiría la de verdad.
    const { data: yaHay } = await admin
      .from('scheduled_emails')
      .select('profile_id')
      .eq('event_id', ev.id)
      .eq('kind', 'cierra_pronto')

    const yaTienen = new Set((yaHay ?? []).map((r) => r.profile_id))

    for (const p of perfiles ?? []) {
      // Encendido por defecto: solo se salta a quien lo apagó a propósito.
      const avisos = (p.notificaciones ?? {}) as Record<string, boolean>
      if (avisos.apertura_zona === false) continue
      if (yaTienen.has(p.id)) continue

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
  const seco = new URL(request.url).searchParams.get('seco') === '1'

  return avisar(seco)
}
