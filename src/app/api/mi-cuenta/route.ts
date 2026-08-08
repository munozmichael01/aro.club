import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * El estado de Mi cuenta, derivado del servidor.
 *
 * Los seis estados tienen un solo paso siguiente cada uno y el orden
 * importa (HANDOFF-2 §4). Se calculan aquí y no en la pantalla: si la
 * pantalla decidiera, dos pantallas distintas podrían discrepar sobre en
 * qué punto está la misma persona.
 */

type Estado =
  | 'perfil'
  | 'verificar'
  | 'revision'
  | 'reservar'
  | 'reservada'
  | 'abierta'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('profiles')
    .select('id, full_name, display_name, email, contact_email, status, role, waitlist_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) {
    return NextResponse.json({ error: 'Sin perfil.' }, { status: 404 })
  }

  // --- cuántas respuestas faltan --------------------------------------
  const { data: version } = await admin
    .from('questionnaire_versions')
    .select('id')
    .eq('is_active', true)
    .maybeSingle()

  const { count: totalPreguntas } = await admin
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('version_id', version?.id ?? 0)

  const { count: respondidas } = await admin
    .from('answers')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('version_id', version?.id ?? 0)

  const faltan = Math.max(0, (totalPreguntas ?? 0) - (respondidas ?? 0))

  // --- verificación ----------------------------------------------------
  const { data: verificaciones } = await admin
    .from('verifications')
    .select('kind, status, rejection_reason')
    .eq('profile_id', user.id)

  const aprobadas = new Set(
    (verificaciones ?? []).filter((v) => v.status === 'approved').map((v) => v.kind),
  )
  const verificada = aprobadas.has('id_document') && aprobadas.has('selfie')
  const enRevision = (verificaciones ?? []).some((v) => v.status === 'pending')
  const rechazada = (verificaciones ?? []).find((v) => v.status === 'rejected')

  const verif = verificada ? 'ok' : enRevision ? 'revision' : 'sin'

  // --- créditos: se suman del libro mayor, nunca se guardan sueltos ----
  const { data: saldo } = await admin
    .from('v_credit_balance')
    .select('balance')
    .eq('profile_id', user.id)
    .maybeSingle()

  const creditos = saldo?.balance ?? 0

  // --- la reserva viva --------------------------------------------------
  // `restaurants!events_restaurant_id_fkey` y no `restaurants` a secas:
  // events tiene DOS claves hacia restaurants —el sitio y el bar del
  // segundo acto— y sin decir cuál, PostgREST responde 300 y la reserva
  // llegaba vacía sin que nada fallara.
  const { data: reserva, error: errorReserva } = await admin
    .from('bookings')
    .select(
      'id, status, event_id, events(starts_at, reveal_at, status, restaurants!events_restaurant_id_fkey(name, address, zone_slug))',
    )
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errorReserva) console.error('[mi-cuenta] reserva', errorReserva)

  const ahora = Date.now()
  const evento = reserva?.events as
    | { starts_at: string; reveal_at: string; status: string; restaurants: { name: string; address: string; zone_slug: string | null } | null }
    | null
    | undefined

  const revelado = evento ? ahora >= new Date(evento.reveal_at).getTime() : false

  // El orden de esta cadena ES el recorrido: cada estado tiene un solo
  // paso siguiente y no puede haber dos a la vez.
  let estado: Estado
  if (faltan > 0) estado = 'perfil'
  else if (!verificada && !enRevision) estado = 'verificar'
  else if (enRevision) estado = 'revision'
  else if (!reserva) estado = 'reservar'
  else if (!revelado) estado = 'reservada'
  else estado = 'abierta'

  return NextResponse.json({
    nombre: perfil.display_name || perfil.full_name || null,
    esOps: perfil.role === 'ops' || perfil.role === 'admin',
    estado,
    verif,
    motivoRechazo: rechazada?.rejection_reason ?? null,
    respuestas: { faltan, total: totalPreguntas ?? 0 },
    creditos,
    reserva: reserva
      ? {
          id: reserva.id,
          empiezaEn: evento?.starts_at ?? null,
          revelaEn: evento?.reveal_at ?? null,
          revelado,
          restaurante: revelado ? (evento?.restaurants?.name ?? null) : null,
          direccion: revelado ? (evento?.restaurants?.address ?? null) : null,
        }
      : null,
  })
}
