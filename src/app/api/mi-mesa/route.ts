import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { FIN_CENA, sePuedeValorar } from '@/lib/ventana-mesa'

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

  const { data: reservas } = await admin
    .from('bookings')
    .select('id, event_id, events(starts_at, reveal_at, status)')
    .eq('profile_id', user.id)
    .in('status', ['confirmed', 'attended'])

  const ahora = Date.now()
  // Las dos cifras viven en lib/ventana-mesa: Mi cuenta decide con ellas si
  // enseña la tarjeta de valorar, y si alli fueran 72 horas el boton
  // llevaria a esta pantalla cuando ya no deja valorar.

  type Reserva = NonNullable<typeof reservas>[number]
  const empiezaDe = (r: Reserva) =>
    new Date((r.events as unknown as { starts_at: string }).starts_at).getTime()

  // Cuál de sus reservas es "su mesa" ahora mismo. Ordenar por fecha de
  // creación y quedarse con la última tenía un agujero: quien se apunta a la
  // siguiente fecha antes de valorar la anterior deja de ver la anterior, y
  // valorar es la única cosa de F11 que caduca. Así que durante las 48 horas
  // siguientes a una cena, esa cena manda; después vuelve a mandar la próxima.
  const porValorar = (reservas ?? [])
    .filter((r) => {
      return sePuedeValorar(empiezaDe(r), ahora)
    })
    .sort((a, b) => empiezaDe(b) - empiezaDe(a))[0]

  const proxima = (reservas ?? [])
    .filter((r) => empiezaDe(r) + FIN_CENA > ahora)
    .sort((a, b) => empiezaDe(a) - empiezaDe(b))[0]

  const reserva =
    porValorar ?? proxima ?? (reservas ?? []).sort((a, b) => empiezaDe(b) - empiezaDe(a))[0]

  const evento = reserva?.events as
    | { starts_at: string; reveal_at: string; status: string }
    | null
    | undefined

  if (!reserva || !evento) {
    return NextResponse.json({ fase: 'sin-reserva' })
  }

  const revelaEn = new Date(evento.reveal_at).getTime()
  const empiezaEn = new Date(evento.starts_at).getTime()

  if (ahora < revelaEn) {
    // Cerrada: la hora y las zonas que ELLA acepto. Ya no es informacion
    // que le damos sobre el sitio —es lo que ella eligio— asi que no
    // adelanta nada de la revelacion. Si acepto una sola, la sabe desde el
    // primer momento; si acepto dos, sabe que es una de las dos.
    const { data: suyas } = await admin
      .from('booking_zones')
      .select('zone_slug')
      .eq('booking_id', reserva.id)

    const slugs = (suyas ?? []).map((z) => z.zone_slug)
    const { data: nombres } = await admin
      .from('zones')
      .select('name')
      .in('slug', slugs.length ? slugs : ['__ninguna__'])
      .order('sort_order')

    return NextResponse.json({
      fase: 'cerrada',
      revelaEn: evento.reveal_at,
      empiezaEn: evento.starts_at,
      zonas: (nombres ?? []).map((z) => z.name),
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

  // `industry` se guarda con el código estable ("tecnologia"), que no es lo
  // que se enseña. La etiqueta vive en las opciones de la pregunta y se lee
  // de ahí: un mapa aquí sería un segundo catálogo que se desincroniza a la
  // primera vez que Design cambie un nombre.
  const { data: preguntaSector } = await admin
    .from('questions')
    .select('options, questionnaire_versions!inner(is_active)')
    .eq('key', 'sector')
    .eq('questionnaire_versions.is_active', true)
    .maybeSingle()

  const etiquetaDe = new Map(
    ((preguntaSector?.options ?? []) as { value: string; label: string }[]).map((o) => [
      o.value,
      o.label,
    ]),
  )

  const { data: yaValoro } = await admin
    .from('table_feedback')
    .select('id')
    .eq('table_id', miembro.table_id)
    .eq('profile_id', user.id)
    .maybeSingle()

  // De `exclusions`, que es donde vive el bloqueo. Se cruza con quienes
  // estuvieron en esta mesa para saber a cuáles de ellos bloqueó.
  const idsMesa = (companeros ?? []).map((c) => c.profile_id)
  const { data: exclusiones } = await admin
    .from('exclusions')
    .select('profile_a, profile_b, reason, created_by')
    .or(`profile_a.eq.${user.id},profile_b.eq.${user.id}`)

  const suyas = (exclusiones ?? [])
    .map((e) => ({
      otro: e.profile_a === user.id ? e.profile_b : e.profile_a,
      reason: e.reason,
      mia: e.created_by === user.id,
    }))
    .filter((e) => e.mia && idsMesa.includes(e.otro))

  const sectorDe = new Map(
    (traits ?? []).map((t) => [
      t.profile_id,
      t.industry ? (etiquetaDe.get(t.industry) ?? t.industry) : null,
    ]),
  )

  return NextResponse.json({
    // Pasada: la cena ya ocurrió, toca F11.
    fase: ahora > empiezaEn + 5 * 3600 * 1000 ? 'pasada' : 'abierta',
    // El id de la mesa y los de sus companeros: hacen falta para valorar,
    // bloquear y reportar. Son uuid opacos; el nombre de pila y el sector
    // siguen siendo lo unico legible que se le enseña de ellos.
    mesaId: miembro.table_id,
    numeroMesa: mesa.table_number,
    empiezaEn: evento.starts_at,
    restaurante: mesa.restaurants?.name ?? null,
    direccion: mesa.restaurants?.address ?? null,
    mapa: mesa.restaurants?.maps_url ?? null,
    // Solo nombre de pila y sector. Sin apellidos, sin fotos, sin contacto.
    companeros: (companeros ?? []).map((c) => {
      const p = c.profiles as unknown as { display_name: string | null; full_name: string | null } | null
      const nombre = p?.display_name || p?.full_name?.split(' ')[0] || null
      return { id: c.profile_id, nombre, sector: sectorDe.get(c.profile_id) ?? null }
    }),
    // Todas verificaron: es el retorno de lo que costó verificarse.
    todosVerificados: true,
    // Lo que ya hizo. Los tres caminos son independientes, asi que se
    // devuelven por separado: haber valorado no cierra reportar.
    yaValoro: !!yaValoro,
    yaBloqueados: suyas.map((e) => e.otro),
    // A quién reportó, no un sí/no: al recargar, la pantalla decía
    // «Reportaste a alguien». Con el id puede volver a decir su nombre.
    yaReporto: suyas.find((e) => e.reason === 'reporte')?.otro ?? null,
  })
}
