import 'server-only'

import { cabeEnLaFecha, tieneBanda, type Banda } from '@/lib/edad'
import { FAMILIA_DE_FORMATO, PLANES_DE_FAMILIA } from '@/lib/formatos'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Quién quiere saber de una fecha, de los que ya pueden llegar a ella.
 *
 * Esto NO decide quién puede ir: eso lo deciden las zonas, la verificación y
 * si ya tiene puesto, y cada aviso lo mira a su manera. Esto quita a los TRES
 * grupos que ninguno de los avisos estaba quitando, y que son los mismos en
 * todos: `cierra_pronto` y `abrimos_zona`.
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
 *
 * 3 · QUIEN NO TIENE LA EDAD DE ESA FECHA. Una cena de mayores de 40 no se
 *     anuncia a quien tiene 25: el aviso le ofrece apuntarse a algo que
 *     `/api/reservar` le va a negar, y la forma honesta de cerrar una puerta
 *     es no llamar a la gente para que la empuje.
 *
 *     Está aquí y no en cada aviso por lo mismo que los otros dos: son tres
 *     sitios distintos los que escriben —abrir una fecha, el cron del cierre
 *     y el panel— y la tercera vez que se escribe una regla es la primera
 *     que diverge.
 */
export async function quienQuiereSaberDe(
  ids: string[],
  formato: string | null | undefined,
  /**
   * La fecha de la que se avisa, para su banda de edad. Opcional: sin ella
   * no se filtra por edad y el aviso sale como salía.
   */
  evento?: (Banda & { starts_at: string }) | null,
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

  // --- y quien no tiene la edad de esta fecha ---------------------------
  //
  // Sin fecha de nacimiento tampoco, que es lo mismo que decide
  // `/api/reservar`: avisar a quien después no va a poder apuntarse es
  // precisamente lo que esto evita.
  if (tieneBanda(evento)) {
    const { data: edades } = await admin
      .from('profiles')
      .select('id, birthdate')
      .in('id', [...permitidos])

    const cabe = new Set(
      (edades ?? []).filter((p) => cabeEnLaFecha(p.birthdate, evento!)).map((p) => p.id),
    )
    for (const id of [...permitidos]) if (!cabe.has(id)) permitidos.delete(id)
  }

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
