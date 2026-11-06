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
