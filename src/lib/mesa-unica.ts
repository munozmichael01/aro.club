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

/**
 * EL NÚMERO QUE SE DICE EN VOZ ALTA, que no es el que guardamos.
 *
 * `dinner_tables.table_number` es único por fecha —lo exige la base— y se
 * reparte por NOCHE para que dos mesas de la misma noche no choquen. El
 * resultado es que el 16-10 las dos mesas de Vittoria fueron la 02 y la 04:
 * quien llegaba y decía «la 04» pedía algo que en ese restaurante no existe,
 * porque allí solo había dos mesas de Aro.
 *
 * Michael, 22-10: «los números van en función del restaurante, todas son 01
 * si es la única en un restaurante, si no confunde cuando llegan y dicen la
 * 03 y es la única». Y la condición que lo define: «debe coincidir con lo
 * que yo veo en el reparto, porque si no, luego no sé de qué mesa eran».
 *
 * Así que el número guardado se queda como está —es lo que hace única a una
 * fila, lo que está en el historial y lo que no se puede reescribir sin
 * cambiar el pasado— y lo que se ENSEÑA, en las cuatro bocas por las que
 * sale, es la posición de esa mesa dentro de su restaurante esa noche. Las
 * cuatro son: Mi mesa, el correo de la revelación, el aviso al local y el
 * panel. Si solo cambiara una, volveríamos al problema de origen con otro
 * disfraz.
 *
 * Se ordena por el número guardado, que es estable: la primera mesa que se
 * publicó en ese sitio es la 01 y así se queda.
 */
export async function numeroQueSeDice(
  pares: { eventoId: string; sitioId: string | null; numero: number }[],
): Promise<Map<string, number>> {
  const dichos = new Map<string, number>()
  const eventos = [...new Set(pares.map((p) => p.eventoId).filter(Boolean))]
  if (!eventos.length) return dichos

  const admin = createAdminClient()

  const { data: suyos } = await admin
    .from('events')
    .select('id, starts_at')
    .in('id', eventos)

  const noches = [...new Set((suyos ?? []).map((e) => e.starts_at))]
  if (!noches.length) return dichos

  const { data } = await admin
    .from('dinner_tables')
    .select('event_id, table_number, restaurant_id, events!inner(starts_at)')
    .in('events.starts_at', noches)

  type Fila = {
    event_id: string
    table_number: number
    restaurant_id: string | null
    events: { starts_at: string } | null
  }

  // Las mesas de cada (noche, sitio), ordenadas por el número guardado.
  const porSitio = new Map<string, Fila[]>()
  for (const t of (data ?? []) as unknown as Fila[]) {
    const noche = t.events?.starts_at
    if (!noche) continue
    const k = `${noche}|${t.restaurant_id ?? ''}`
    porSitio.set(k, [...(porSitio.get(k) ?? []), t])
  }
  for (const [k, filas] of porSitio) {
    porSitio.set(k, [...filas].sort((a, b) => a.table_number - b.table_number))
  }

  const nocheDe = new Map((suyos ?? []).map((e) => [e.id, e.starts_at]))

  for (const p of pares) {
    const noche = nocheDe.get(p.eventoId)
    if (!noche) continue
    const filas = porSitio.get(`${noche}|${p.sitioId ?? ''}`) ?? []
    const i = filas.findIndex((f) => f.event_id === p.eventoId && f.table_number === p.numero)
    // Sin encontrarla —una propuesta sin publicar no está en esta tabla— se
    // dice el número guardado, que es lo que había antes de esto.
    dichos.set(claveDeNumero(p.eventoId, p.numero), i >= 0 ? i + 1 : p.numero)
  }

  return dichos
}

/** La clave con la que se pide un número ya dicho. */
export function claveDeNumero(eventoId: string, numero: number): string {
  return `${eventoId}|${numero}`
}
