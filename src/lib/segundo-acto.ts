import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Qué bar le toca a cada zona de una fecha.
 *
 * El segundo acto es de una zona, no de la fecha (Michael, 06-11): quien cena en
 * Los Palos Grandes no sigue en un bar de Chacao. Toda pregunta sobre «¿esta mesa
 * tiene bar?» pasa por la zona de su restaurante, y una zona sin bar se queda con
 * los bares cercanos de ese restaurante.
 */
export async function barPorZona(admin: Admin, eventoId: string): Promise<Map<string, string>> {
  const { data, error } = await admin
    .from('event_second_acts')
    .select('zone_slug, bar_id')
    .eq('event_id', eventoId)
  if (error) console.error('[segundo acto] no se pudo leer el bar de la fecha', error)
  return new Map((data ?? []).map((f) => [f.zone_slug, f.bar_id]))
}

/**
 * Cuáles de estas fechas tienen segundo acto en alguna de sus zonas.
 *
 * Es la marca de antes de repartir, cuando todavía no se sabe en qué zona cena
 * nadie. Nunca sirve para decidir qué le pasa a una mesa: para eso, `barPorZona`.
 */
export async function fechasConSegundoActo(admin: Admin, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const { data, error } = await admin
    .from('event_second_acts')
    .select('event_id')
    .in('event_id', ids)
  if (error) console.error('[segundo acto] no se pudieron leer las fechas', error)
  return new Set((data ?? []).map((f) => f.event_id))
}

/**
 * Lo mismo, para una persona: quien ya tiene mesa en una fecha no mira si alguna
 * zona tiene bar, sino si la tiene la SUYA. Sin esto, Inicio le ponía la marca a
 * quien cena en una zona sin bar mientras Mi mesa le enseñaba sus bares cercanos.
 */
export async function fechasConSegundoActoPara(
  admin: Admin,
  perfilId: string,
  ids: string[],
): Promise<Set<string>> {
  if (!ids.length) return new Set()
  const [{ data: bares, error: e1 }, { data: asientos, error: e2 }] = await Promise.all([
    admin.from('event_second_acts').select('event_id, zone_slug').in('event_id', ids),
    admin
      .from('table_members')
      .select('dinner_tables!inner(event_id, restaurants!dinner_tables_restaurant_id_fkey(zone_slug))')
      .eq('profile_id', perfilId)
      .in('dinner_tables.event_id', ids),
  ])
  if (e1 || e2) console.error('[segundo acto] no se pudo leer la fecha de la persona', e1 ?? e2)

  const conBar = new Set((bares ?? []).map((b) => b.event_id))
  const barDeZona = new Set((bares ?? []).map((b) => `${b.event_id}|${b.zone_slug}`))
  for (const a of asientos ?? []) {
    const mesa = a.dinner_tables as unknown as {
      event_id: string
      restaurants: { zone_slug: string | null } | null
    }
    if (!barDeZona.has(`${mesa.event_id}|${mesa.restaurants?.zone_slug ?? ''}`)) conBar.delete(mesa.event_id)
  }
  return conBar
}
