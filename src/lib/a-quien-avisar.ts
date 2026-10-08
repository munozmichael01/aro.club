import 'server-only'

import { FAMILIA_DE_FORMATO, PLANES_DE_FAMILIA } from '@/lib/formatos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Quién quiere saber de una fecha, de los que ya pueden llegar a ella.
 *
 * Esto NO decide quién puede ir: eso lo deciden las zonas, la verificación y
 * si ya tiene puesto, y cada aviso lo mira a su manera. Esto quita a dos
 * grupos que ninguno de los dos estaba quitando, y que son los mismos en los
 * dos: `cierra_pronto` y `abrimos_zona`.
 *
 * 1 · QUIEN DIJO QUE ESE PLAN NO LE INTERESA. En «¿Qué planes te interesan?»
 *     alguien marca cenas y no drinks. Escribirle de una fecha de drinks es
 *     escribirle de algo que ya dijo que no quiere, y es como se consigue que
 *     alguien apague los avisos enteros.
 *
 *     Quien NO contestó esa pregunta sí recibe. No contestar no es decir que
 *     no: es no haber llegado. Tratar el silencio como un «no» dejaría sin
 *     avisos a todo el que se apuntó antes de que la pregunta existiera.
 *
 * 2 · LAS CUENTAS DE PRUEBA. Las de los guiones y la del revisor de Apple.
 *     A Michael le llegaban varios avisos a la vez, que eran los de sus
 *     propias cuentas de prueba llegando a su buzón.
 */
export async function quienQuiereSaberDe(
  ids: string[],
  formato: string | null | undefined,
): Promise<Set<string>> {
  const permitidos = new Set(ids)
  if (!ids.length) return permitidos

  const admin = createAdminClient()

  // --- las de prueba, fuera ---------------------------------------------
  const { data: deprueba } = await admin
    .from('profiles')
    .select('id')
    .in('id', ids)
    .eq('es_prueba', true)

  for (const p of deprueba ?? []) permitidos.delete(p.id)

  // --- y quien dijo que ese plan no ------------------------------------
  const familia = formato ? FAMILIA_DE_FORMATO[formato] : null
  const planes = familia ? PLANES_DE_FAMILIA[familia] : null

  // Sin familia no se filtra. Un formato nuevo sin reparto en familias no
  // puede dejar a todo el mundo fuera en silencio: el comprobador avisa de
  // eso, y mientras tanto el aviso sale como salía.
  if (!planes?.length) return permitidos

  const { data: respuestas } = await admin
    .from('answers')
    .select('profile_id, value')
    .eq('question_key', 'planes')
    .in('profile_id', [...permitidos])

  for (const r of respuestas ?? []) {
    if (!r.profile_id) continue
    const suyos = Array.isArray(r.value) ? (r.value as string[]) : []
    // Contestó y no marcó ninguno de este formato.
    if (suyos.length && !suyos.some((plan) => planes.includes(plan))) {
      permitidos.delete(r.profile_id)
    }
  }

  return permitidos
}
