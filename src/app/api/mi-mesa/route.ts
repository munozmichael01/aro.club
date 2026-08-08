import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * F10 · Mi mesa.
 *
 * LEE la asignación ya persistida. Nunca la calcula al abrirse: el reparto
 * ocurre al cerrar la fecha y queda consultable desde ese momento.
 *
 * Antes de `reveal_at` no devuelve ni restaurante ni acompañantes, aunque
 * la mesa ya esté armada. La dosificación es el producto: adelantarla lo
 * rompe, y una API que lo suelta antes hace inútil el candado de la
 * pantalla.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()

  const { data: reserva } = await admin
    .from('bookings')
    .select('id, event_id, events(starts_at, reveal_at, status)')
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const evento = reserva?.events as
    | { starts_at: string; reveal_at: string; status: string }
    | null
    | undefined

  if (!reserva || !evento) {
    return NextResponse.json({ fase: 'sin-reserva' })
  }

  const ahora = Date.now()
  const revelaEn = new Date(evento.reveal_at).getTime()
  const empiezaEn = new Date(evento.starts_at).getTime()

  if (ahora < revelaEn) {
    // Cerrada: solo la cuenta atrás. Ni el sitio ni con quién.
    return NextResponse.json({
      fase: 'cerrada',
      revelaEn: evento.reveal_at,
      empiezaEn: evento.starts_at,
      faltanSegundos: Math.round((revelaEn - ahora) / 1000),
    })
  }

  const { data: miembro } = await admin
    .from('table_members')
    .select('table_id, dinner_tables(table_number, event_id, restaurants!dinner_tables_restaurant_id_fkey(name, address, maps_url, facade_photo_path))')
    .eq('profile_id', user.id)
    .eq('booking_id', reserva.id)
    .maybeSingle()

  if (!miembro) {
    // Apuntada y revelada pero sin mesa: no se inventa nada.
    return NextResponse.json({ fase: 'sin-mesa', empiezaEn: evento.starts_at })
  }

  const mesa = miembro.dinner_tables as unknown as {
    table_number: number
    restaurants: { name: string; address: string; maps_url: string | null; facade_photo_path: string | null } | null
  }

  const { data: companeros } = await admin
    .from('table_members')
    .select('profile_id, seat_order, profiles(display_name, full_name)')
    .eq('table_id', miembro.table_id)
    .neq('profile_id', user.id)
    .order('seat_order')

  const { data: traits } = await admin
    .from('profile_traits')
    .select('profile_id, industry')
    .in('profile_id', (companeros ?? []).map((c) => c.profile_id))

  const sectorDe = new Map((traits ?? []).map((t) => [t.profile_id, t.industry]))

  return NextResponse.json({
    // Pasada: la cena ya ocurrió, toca F11.
    fase: ahora > empiezaEn + 5 * 3600 * 1000 ? 'pasada' : 'abierta',
    numeroMesa: mesa.table_number,
    empiezaEn: evento.starts_at,
    restaurante: mesa.restaurants?.name ?? null,
    direccion: mesa.restaurants?.address ?? null,
    mapa: mesa.restaurants?.maps_url ?? null,
    // Solo nombre de pila y sector. Sin apellidos, sin fotos, sin contacto.
    companeros: (companeros ?? []).map((c) => {
      const p = c.profiles as unknown as { display_name: string | null; full_name: string | null } | null
      const nombre = p?.display_name || p?.full_name?.split(' ')[0] || null
      return { nombre, sector: sectorDe.get(c.profile_id) ?? null }
    }),
    // Todas verificaron: es el retorno de lo que costó verificarse.
    todosVerificados: true,
  })
}
