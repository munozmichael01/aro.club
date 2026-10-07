import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Las ciudades, y la única comprobación de que una ciudad existe.
 *
 * El catálogo autoritativo es la tabla `cities`, igual que el del cuestionario
 * es `questions`. No se copia a ningún lado: una lista de ciudades escrita a
 * mano es una lista que diverge, y la landing ya pagó esa factura —tenía los
 * slugs en una constante y los nombres en otra, emparejados SOLO por el
 * índice, que es exactamente la forma de fallo que el cuestionario tuvo que
 * desmontar: reordenar una de las dos archiva a la gente en la ciudad
 * equivocada, sin error y sin que se vea en ninguna pantalla—.
 *
 * `/api/lead` llevaba esta consulta escrita dentro. Ahora que la ciudad entra
 * también por el alta de la app y por Mi perfil, tenerla en cuatro sitios es
 * tener cuatro reglas que pueden separarse. Aquí es una.
 */

/** El valor por defecto cuando nadie dice nada. La ciudad que está abierta. */
export const CIUDAD_POR_DEFECTO = 'caracas'

export type Ciudad = {
  slug: string
  nombre: string
  /** Si ya operamos ahí. Hoy solo Caracas. */
  abierta: boolean
}

/** Todas, en el orden en que se enseñan. */
export async function ciudades(): Promise<Ciudad[]> {
  const { data, error } = await createAdminClient()
    .from('cities')
    .select('slug, name, is_open, sort_order')
    .order('sort_order', { ascending: true })

  if (error || !data) {
    console.error('[ciudades] no se pudieron leer', error)
    return []
  }

  return data.map((c) => ({ slug: c.slug, nombre: c.name, abierta: !!c.is_open }))
}

/**
 * ¿Existe esa ciudad? Devuelve el slug bueno, o `null` si no está en la tabla.
 *
 * Un `undefined` o un vacío NO son un error: son «no lo dijo», y entonces vale
 * la de siempre. Lo que no vale es un slug inventado, porque una ciudad que no
 * existe no se puede cruzar con sus zonas ni con sus fechas, y el perfil se
 * queda en una ciudad que no lleva a ninguna parte.
 */
export async function ciudadValida(slug?: string | null): Promise<string | null> {
  const s = (slug ?? '').trim().toLowerCase()
  if (!s) return CIUDAD_POR_DEFECTO

  const { data } = await createAdminClient()
    .from('cities')
    .select('slug')
    .eq('slug', s)
    .maybeSingle()

  return data?.slug ?? null
}

/** Lo que hace falta para decidir si se le enseñan fechas o no. */
export async function ciudadDe(slug?: string | null): Promise<Ciudad> {
  const s = slug ?? CIUDAD_POR_DEFECTO
  const { data } = await createAdminClient()
    .from('cities')
    .select('slug, name, is_open')
    .eq('slug', s)
    .maybeSingle()

  // Una ciudad que no está en la tabla se trata como cerrada y no como un
  // fallo: la persona existe, su perfil existe, y lo único que no sabemos es
  // dónde está. Reventar aquí dejaría Mi cuenta en blanco por un dato de
  // referencia.
  if (!data) return { slug: s, nombre: s, abierta: false }

  return { slug: data.slug, nombre: data.name, abierta: !!data.is_open }
}
