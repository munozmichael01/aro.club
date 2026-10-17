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

  const admin = createAdminClient()

  /**
   * La cuenta es por SITIO Y NOCHE, no por fecha.
   *
   * El 17-10 hubo dos cenas la misma noche en Vittoria: la normal y la de
   * mayores de 40. Cada una es una fila de `events`, así que cada una se
   * creía la única mesa de Aro de ese restaurante, y a las doce personas les
   * dijimos lo mismo: «di que vas a la mesa de Aro». Doce personas pidiendo
   * la misma mesa.
   *
   * Quien llega al restaurante no sabe de `events`: ve un sitio y una hora.
   * Así que lo que decide si el número sobra es cuántas mesas de Aro hay esa
   * noche en ese sitio, vengan de la fecha que vengan.
   */
  const { data: suyos } = await admin
    .from('events')
    .select('id, starts_at, city_slug')
    .in('id', eventos)

  const noches = [...new Set((suyos ?? []).map((e) => e.starts_at))]
  if (!noches.length) return unicas

  const { data } = await admin
    .from('dinner_tables')
    .select('event_id, restaurant_id, events!inner(starts_at)')
    .in('events.starts_at', noches)

  type Fila = { event_id: string; restaurant_id: string | null; events: { starts_at: string } | null }
  const nocheDe = new Map((suyos ?? []).map((e) => [e.id, e.starts_at]))

  // Cuántas mesas hay en cada (noche, sitio).
  const cuantas = new Map<string, number>()
  for (const t of (data ?? []) as unknown as Fila[]) {
    const noche = t.events?.starts_at
    if (!noche) continue
    const k = `${noche}|${t.restaurant_id ?? ''}`
    cuantas.set(k, (cuantas.get(k) ?? 0) + 1)
  }

  // Y se devuelve con la clave que usa quien pregunta, que es por fecha.
  for (const p of pares) {
    const noche = nocheDe.get(p.eventoId)
    if (!noche) continue
    if ((cuantas.get(`${noche}|${p.sitioId ?? ''}`) ?? 0) === 1) {
      unicas.add(claveDeMesa(p.eventoId, p.sitioId))
    }
  }

  return unicas
}
