import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Si una mesa es la ÚNICA de su sitio en esa fecha.
 *
 * Cuando lo es, el número no aporta nada: «la mesa de Aro, la 01» en un
 * restaurante donde solo hay una mesa de Aro es una precisión que no
 * distingue nada, y el «01» obliga a quien llega a buscar un cartel que no
 * existe. Con dos o más, el número es justo lo que hace falta.
 *
 * SE AGRUPA POR SITIO Y NO POR FECHA. Una misma fecha puede tener mesas en
 * tres restaurantes distintos: contar las de toda la fecha diría «hay tres»
 * y quitaría el número a nadie, cuando en cada sitio solo hay una.
 *
 * Y cuenta las mesas PUBLICADAS, que son las únicas que existen en
 * `dinner_tables`: una propuesta sin publicar vive en la corrida y no aquí.
 *
 * Operación no usa esto: allí el número siempre se ve, porque es como se
 * habla de una mesa entre quienes la arman.
 */

/** La clave de un par fecha + sitio. `null` es un sitio sin asignar, y agrupa. */
export function claveDeMesa(eventoId: string, sitioId: string | null): string {
  return `${eventoId}|${sitioId ?? ''}`
}

/**
 * Las claves de los pares que tienen UNA sola mesa.
 *
 * De una consulta para todos los pares: el historial de alguien con doce
 * cenas haría doce consultas, y es el mismo dato.
 */
export async function mesasUnicas(
  pares: { eventoId: string; sitioId: string | null }[],
): Promise<Set<string>> {
  const unicas = new Set<string>()
  const eventos = [...new Set(pares.map((p) => p.eventoId).filter(Boolean))]
  if (!eventos.length) return unicas

  const { data } = await createAdminClient()
    .from('dinner_tables')
    .select('event_id, restaurant_id')
    .in('event_id', eventos)

  const cuantas = new Map<string, number>()
  for (const t of data ?? []) {
    const k = claveDeMesa(t.event_id, t.restaurant_id)
    cuantas.set(k, (cuantas.get(k) ?? 0) + 1)
  }

  for (const [k, n] of cuantas) if (n === 1) unicas.add(k)
  return unicas
}
