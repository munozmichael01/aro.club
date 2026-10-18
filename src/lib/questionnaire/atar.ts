import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/database.types'

/**
 * La única pregunta atada a otra: la bebida.
 *
 * Michael, 18-10: quien contesta «no tomo alcohol» no se puede quedar
 * eligiendo ron en la siguiente pregunta. Así que `bebidas` se pone sola en
 * «sin alcohol», y si después dice que sí toma, se suelta y se vacía para
 * que elija.
 *
 * Vive AQUÍ, en el servidor, y no solo en las pantallas, porque hay tres
 * puertas para contestar —el cuestionario, Mi perfil y el aviso de Mi
 * cuenta— y la regla tiene que valer igual por las tres. Escrita en cada
 * pantalla, basta con que una se quede atrás para que la base guarde «no
 * tomo alcohol» y «ron» a la vez, que es un dato que no significa nada.
 *
 * Está escrita a mano y no deducida de ningún catálogo: es UNA relación
 * entre dos preguntas, y un motor de condiciones para un caso son más cosas
 * que pueden romperse que el caso. El día que haya tres, se generaliza.
 */
export async function atarBebida(
  admin: SupabaseClient<Database>,
  perfilId: string,
  versionId: number,
  clave: string,
  valor: unknown,
): Promise<void> {
  if (clave !== 'copas') return

  if (valor === 'nada') {
    const { error } = await admin.from('answers').upsert(
      {
        profile_id: perfilId,
        version_id: versionId,
        question_key: 'bebidas',
        value: ['sin-alcohol'] as never,
      } as never,
      { onConflict: 'profile_id,version_id,question_key' },
    )
    if (error) console.error('[atar] no se pudo poner «sin alcohol»', error)
    return
  }

  // Dejó de ser «no tomo». Se suelta SOLO si lo que hay es lo que pusimos
  // nosotros: si eligió sus bebidas a mano, son suyas y no se tocan.
  const { data: ya } = await admin
    .from('answers')
    .select('value')
    .eq('profile_id', perfilId)
    .eq('version_id', versionId)
    .eq('question_key', 'bebidas')
    .maybeSingle()

  const puesto = (ya?.value ?? null) as string[] | null
  if (Array.isArray(puesto) && puesto.length === 1 && puesto[0] === 'sin-alcohol') {
    await admin
      .from('answers')
      .delete()
      .eq('profile_id', perfilId)
      .eq('version_id', versionId)
      .eq('question_key', 'bebidas')
  }
}
