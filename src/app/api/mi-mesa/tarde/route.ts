import { NextResponse } from 'next/server'
import { z } from 'zod'

import { encolar } from '@/lib/correos'
import { diaYMes } from '@/lib/fechas'
import { diaDe, horaDe, vozDe } from '@/lib/reglas'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Llego tarde»: avisa a los otros cinco.
 *
 * El botón estaba en Mi mesa desde su entrega y la FAQ lo prometía en la
 * portada —«avisas desde la app con un toque y se lo decimos a la mesa»—,
 * pero `avisar` solo hacía `setState({ avisado: true })`. La pantalla decía
 * «Avisamos que llegas 20 minutos tarde» y no salía nada, ni a la mesa ni a
 * operación: quien lo pulsara llegaba tarde a cinco desconocidos a los que
 * nadie dijo nada, creyendo que sí. Es peor que no tener el botón.
 *
 * Va por correo a los otros cinco, y solo DESPUÉS de la revelación: antes
 * nadie sabe con quién cena, así que no hay a quién avisar y la mesa puede ni
 * existir. Cuando la app esté, además irá como notificación.
 *
 * Un aviso por persona y mesa. La pantalla no ofrece corregirlo después de
 * mandarlo, así que el servidor tampoco lo finge: el segundo intento
 * responde que ya está hecho y no manda un segundo correo.
 */

const cuerpo = z.object({
  // Diez, veinte o media hora es lo que ofrece la pantalla. El rango es más
  // ancho para no tener que tocar esto si mañana ofrece «una hora».
  minutos: z.number().int().min(5).max(120),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'No pudimos avisar.' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Su reserva viva de la fecha más próxima, igual que la que lee `GET
  // /api/mi-mesa`. No se acepta un `bookingId` de fuera: quién es y a qué
  // mesa va lo decide el servidor.
  const { data: reservas } = await admin
    .from('bookings')
    .select('id, event_id, events(starts_at, reveal_at, status, format)')
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])

  type Reserva = NonNullable<typeof reservas>[number]
  const evDe = (r: Reserva) =>
    r.events as unknown as { starts_at: string; reveal_at: string; format: string }

  const ahora = Date.now()
  const reserva = (reservas ?? [])
    .filter((r) => new Date(evDe(r).starts_at).getTime() > ahora - 6 * 3600_000)
    .sort((a, b) => new Date(evDe(a).starts_at).getTime() - new Date(evDe(b).starts_at).getTime())[0]

  if (!reserva) {
    return NextResponse.json({ error: 'No tienes ninguna fecha por delante.' }, { status: 409 })
  }

  const evento = evDe(reserva)

  // El candado: antes de la revelación no hay a quién avisar.
  if (new Date(evento.reveal_at).getTime() > ahora) {
    return NextResponse.json(
      { error: 'Todavía no se ha abierto tu mesa. Podrás avisar en cuanto se revele.' },
      { status: 409 },
    )
  }

  const { data: miembro } = await admin
    .from('table_members')
    .select('table_id, dinner_tables(restaurants!dinner_tables_restaurant_id_fkey(name, address))')
    .eq('profile_id', user.id)
    .eq('booking_id', reserva.id)
    .maybeSingle()

  if (!miembro) {
    return NextResponse.json({ error: 'Todavía no tienes mesa asignada.' }, { status: 409 })
  }

  // ¿Ya avisó? El índice único lo garantiza; esto lo distingue de un error
  // para poder contestar «ya está» en vez de «no pudimos».
  const { data: yaEsta } = await admin
    .from('late_notices')
    .select('minutes')
    .eq('table_id', miembro.table_id)
    .eq('profile_id', user.id)
    .maybeSingle()

  if (yaEsta) {
    return NextResponse.json({ avisado: true, minutos: yaEsta.minutes, repetido: true })
  }

  const { error: errorRegistro } = await admin.from('late_notices').insert({
    table_id: miembro.table_id,
    profile_id: user.id,
    minutes: parsed.data.minutos,
  } as never)

  if (errorRegistro) {
    console.error('[tarde] no se pudo registrar', errorRegistro)
    return NextResponse.json({ error: 'No pudimos avisar. Inténtalo otra vez.' }, { status: 500 })
  }

  // Los otros cinco. Nunca quien avisa: recibir tu propio aviso se lee como
  // que no salió.
  const { data: companeros } = await admin
    .from('table_members')
    .select('profile_id, profiles(display_name)')
    .eq('table_id', miembro.table_id)
    .neq('profile_id', user.id)

  const { data: yo } = await admin
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle()

  const mesa = miembro.dinner_tables as unknown as {
    restaurants: { name: string; address: string | null } | null
  }

  // Mesa o grupo, según el formato: para la caminata del domingo no hay mesa.
  const voz = vozDe(evento.format)

  // El nombre que la mesa conoce es el de pila, no el completo: es el único
  // que se le enseña a los otros cinco.
  const quien = yo?.display_name || 'Alguien de tu ' + voz.unidad

  let mandados = 0
  for (const c of companeros ?? []) {
    const suyo = c.profiles as unknown as { display_name: string | null } | null
    const r = await encolar({ perfil: c.profile_id }, 'llego_tarde', {
      quien,
      trato: suyo?.display_name ?? '',
      retraso: parsed.data.minutos + ' minutos',
      sitio: mesa.restaurants?.name ?? 'el sitio de la ' + voz.unidad,
      // La direccion, no la zona: despues de revelar la mesa ya sabe el
      // sitio exacto, y `dinner_tables` no guarda zona.
      zona: mesa.restaurants?.address ?? '',
      hora: [diaDe(evento.starts_at), horaDe(evento.starts_at)].filter(Boolean).join(' · '),
      cuando: diaYMes(evento.starts_at),
      unidad: voz.unidad,
      TU: voz.TU,
    }, { eventoId: reserva.event_id })
    if (r === 'encolado') mandados++
  }

  return NextResponse.json({ avisado: true, minutos: parsed.data.minutos, avisados: mandados })
}
