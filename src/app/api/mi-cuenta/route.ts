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
  | 'datos'
  | 'porconfirmar'
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
    .select(
      'id, full_name, display_name, email, contact_email, status, role, waitlist_id, birthdate, gender, phone_e164, city_slug',
    )
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

  // Solo las OBLIGATORIAS. Contra las 17 a secas, quien salta una opcional
  // —dieta, evitar, romance— se quedaba en 16 de 17 y Mi cuenta le pedia
  // terminar el perfil para siempre por no contestar algo que decia
  // OPCIONAL en pantalla.
  const { data: obligatorias } = await admin
    .from('questions')
    .select('key')
    .eq('version_id', version?.id ?? 0)
    .eq('is_required', true)

  const { data: dadas } = await admin
    .from('answers')
    .select('question_key')
    .eq('profile_id', user.id)
    .eq('version_id', version?.id ?? 0)

  const respondidasSet = new Set((dadas ?? []).map((a) => a.question_key))
  const pendientes = (obligatorias ?? []).filter((q) => !respondidasSet.has(q.key))
  const totalPreguntas = obligatorias?.length ?? 0
  const faltan = pendientes.length

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
    // `pending_payment` cuenta como reserva: el puesto ESTA apartado
    // aunque el pago no este cuadrado. Dejarla fuera haria que la pantalla
    // le ofreciera reservar otra vez algo que ya tiene.
    .in('status', ['pending_payment', 'confirmed', 'attended'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (errorReserva) console.error('[mi-cuenta] reserva', errorReserva)

  // La próxima fecha abierta, para quien todavía no ha reservado. El copy
  // decía "Ya van 34 apuntados y se cierra el martes" con doce apuntados y
  // el cierre otro día: dos cifras escritas a mano en la pantalla que mas
  // veces se abre.
  const { data: proxima } = await admin
    .from('events')
    .select(
      'id, starts_at, booking_closes_at, restaurants!events_restaurant_id_fkey(name, zone_slug)',
    )
    .in('status', ['open', 'draft'])
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let apuntadosProxima = 0
  let zonaProxima: string | null = null
  if (proxima) {
    const { count } = await admin
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', proxima.id)
      .eq('status', 'confirmed')
    apuntadosProxima = count ?? 0

    const slug = (proxima.restaurants as unknown as { zone_slug: string | null } | null)?.zone_slug
    if (slug) {
      const { data: z } = await admin.from('zones').select('name').eq('slug', slug).maybeSingle()
      zonaProxima = z?.name ?? null
    }
  }

  // La agenda: las fechas abiertas con cuánta gente va. Enseñar cuánta
  // gente hay y no cuántos puestos quedan es deliberado —un contador de
  // escasez es otra cosa— pero seis fechas escritas a mano tampoco son
  // gente.
  const { data: fechas } = await admin
    .from('events')
    .select('id, format, starts_at, booking_closes_at, credit_cost, city_slug')
    .in('status', ['open', 'draft'])
    .gte('starts_at', new Date().toISOString())
    .eq('city_slug', perfil.city_slug ?? 'caracas')
    .order('starts_at', { ascending: true })
    .limit(12)

  const idsFechas = (fechas ?? []).map((f) => f.id)

  const { data: apuntadosPorFecha } = await admin
    .from('bookings')
    .select('event_id')
    .in('event_id', idsFechas.length ? idsFechas : ['00000000-0000-0000-0000-000000000000'])
    .eq('status', 'confirmed')

  const cuentaPorFecha = new Map<string, number>()
  for (const b of apuntadosPorFecha ?? []) {
    cuentaPorFecha.set(b.event_id, (cuentaPorFecha.get(b.event_id) ?? 0) + 1)
  }

  const { data: misReservas } = await admin
    .from('bookings')
    .select('event_id')
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])

  const mias = new Set((misReservas ?? []).map((b) => b.event_id))

  // Las zonas de cada fecha, para decir dónde es sin prometer un sitio.
  const { data: sedesFechas } = await admin
    .from('event_venues')
    .select('event_id, zone_slug, zones(name)')
    .in('event_id', idsFechas.length ? idsFechas : ['00000000-0000-0000-0000-000000000000'])

  const zonasPorFecha = new Map<string, string[]>()
  for (const v of sedesFechas ?? []) {
    const nombre = (v.zones as unknown as { name: string } | null)?.name ?? v.zone_slug
    const ya = zonasPorFecha.get(v.event_id) ?? []
    if (!ya.includes(nombre)) zonasPorFecha.set(v.event_id, [...ya, nombre])
  }

  // Sus planes: todo lo que reservó, con lo que paso. Habia tres lineas
  // escritas a mano —"Alto, mesa 02", "Malabar, cancelaste"— en la pantalla
  // que hace de historial. Un historial inventado es peor que no tenerlo.
  const { data: todasSusReservas } = await admin
    .from('bookings')
    .select(
      'id, status, cancelled_at, event_id, events(starts_at, format, reveal_at), table_members(dinner_tables(table_number, restaurants!dinner_tables_restaurant_id_fkey(name)))',
    )
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const ahora = Date.now()
  const evento = reserva?.events as
    | { starts_at: string; reveal_at: string; status: string; restaurants: { name: string; address: string; zone_slug: string | null } | null }
    | null
    | undefined

  const revelado = evento ? ahora >= new Date(evento.reveal_at).getTime() : false

  // El orden de esta cadena ES el recorrido: cada estado tiene un solo
  // paso siguiente y no puede haber dos a la vez.
  // Nombre, nacimiento, genero y telefono. La pantalla existia desde la
  // entrega 3 pero no la enlazaba nadie, asi que nadie los daba: `age` y
  // `gender` llegaban nulos al reparto y las dos restricciones mas duras
  // —diez anos de horquilla y equilibrio de genero— no filtraban nada.
  const datosBase = Boolean(perfil.full_name && perfil.birthdate && perfil.phone_e164)

  let estado: Estado
  if (faltan > 0) estado = 'perfil'
  else if (!datosBase) estado = 'datos'
  else if (!verificada && !enRevision) estado = 'verificar'
  else if (enRevision) estado = 'revision'
  else if (!reserva) estado = 'reservar'
  // Pagado no es confirmado: mientras alguien lo cuadra con el banco, su
  // pantalla lo dice en vez de darlo por hecho.
  else if (reserva.status === 'pending_payment') estado = 'porconfirmar'
  else if (!revelado) estado = 'reservada'
  else estado = 'abierta'

  return NextResponse.json({
    nombre: perfil.display_name || perfil.full_name || null,
    esOps: perfil.role === 'ops' || perfil.role === 'admin',
    planes: (todasSusReservas ?? []).map((b) => {
      const ev = b.events as unknown as { starts_at: string; format: string; reveal_at: string } | null
      const mesa = (b.table_members as unknown as {
        dinner_tables: { table_number: number; restaurants: { name: string } | null } | null
      }[])?.[0]?.dinner_tables
      const revelada = ev ? Date.now() >= new Date(ev.reveal_at).getTime() : false
      return {
        empiezaEn: ev?.starts_at ?? null,
        formato: ev?.format ?? 'dinner',
        estado: b.status,
        cancelada: !!b.cancelled_at,
        pasada: ev ? Date.now() > new Date(ev.starts_at).getTime() : false,
        // El sitio y la mesa solo despues de revelar: antes no los sabe, y
        // el historial no puede ser la puerta de atras a la revelacion.
        restaurante: revelada ? (mesa?.restaurants?.name ?? null) : null,
        numeroMesa: revelada ? (mesa?.table_number ?? null) : null,
      }
    }),
    agenda: (fechas ?? []).map((f) => ({
      id: f.id,
      formato: f.format,
      empiezaEn: f.starts_at,
      cierraEn: f.booking_closes_at,
      creditos: f.credit_cost ?? 1,
      zonas: zonasPorFecha.get(f.id) ?? [],
      apuntados: cuentaPorFecha.get(f.id) ?? 0,
      // Si ya está apuntada, la tarjeta lo dice en vez de ofrecerle
      // reservar otra vez.
      mia: mias.has(f.id),
    })),
    proximaFecha: proxima
      ? {
          empiezaEn: proxima.starts_at,
          cierraEn: proxima.booking_closes_at,
          zona: zonaProxima,
          apuntados: apuntadosProxima,
        }
      : null,
    estado,
    verif,
    motivoRechazo: rechazada?.rejection_reason ?? null,
    respuestas: { faltan, total: totalPreguntas },
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
