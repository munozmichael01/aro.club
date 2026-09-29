import 'server-only'

import { type Paso, type Situacion, situacionDePerfil } from '@/lib/embudo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Lo que pasa DESPUÉS de que alguien entre con un proveedor.
 *
 * Estaba dentro de `/auth/callback`, que es la vuelta de Google en el
 * navegador. La app nativa necesita exactamente lo mismo —cruzar el lead,
 * crear el perfil, detectar que entró con otro correo— pero no puede usar esa
 * ruta: no hay redirecciones que seguir ni cookie de ida que leer, y lo que
 * necesita de vuelta es JSON, no un 302.
 *
 * Así que esto se saca aquí y lo llaman los dos. La web sigue respondiendo con
 * sus redirecciones de hoy; `/api/auth/nativo` responde lo mismo en JSON. Si
 * se copiara, el día que cambie una regla cambiaría en uno de los dos.
 *
 * Lo que NO entra aquí, a propósito:
 *
 * - **Canjear el código y comprobar el correo verificado.** Eso lo hace cada
 *   puerta a su manera —la web canjea un `code`, la app llega con la sesión ya
 *   abierta por el SDK— y es la condición que sostiene todo lo demás. Quien
 *   llama aquí ya ha comprobado que el correo viene verificado.
 * - **A dónde se va.** La web redirige, la app decide su pantalla. Aquí solo
 *   se dice en qué PASO está, que es lo mismo para los dos.
 *
 * Es idempotente: llamarla dos veces con la misma persona no crea dos
 * perfiles ni convierte dos veces el lead. Importa porque la app la reintenta
 * al arrancar si murió entre el login y esta llamada.
 */

export type Entrada = {
  /** El id del usuario de auth. La sesión ya está abierta. */
  usuarioId: string
  /** Su correo, ya normalizado y YA COMPROBADO como verificado. */
  correo: string
  /** El nombre que dé el proveedor, si lo da. */
  nombre?: string | null
  /**
   * El correo del lead que traía, cuando se sabe.
   *
   * En la web viene de la cookie de ida: quien pulsó desde un correo nuestro
   * y entró con otra dirección de Google. En la app, de lo que tenga guardado.
   * Se cruza por CORREO y no por token porque el proveedor puede llegar desde
   * un dispositivo sin llave de lead, y sin este cruce se crea una cuenta
   * vacía y las respuestas se quedan huérfanas sin que falle nada.
   */
  leadPrevio?: string | null
  /** De dónde salió esta alta, para no perder la atribución. */
  origen?: string | null
}

export type Salida =
  | {
      ok: true
      paso: Paso
      situacion: Situacion
      /** Se creó el perfil en esta llamada. En la segunda ya es `false`. */
      creado: boolean
      /**
       * Entró con un correo distinto del que se apuntó, y hay que preguntarle
       * a cuál le escribimos. Solo cuando de verdad hay dos: enseñar esa
       * pantalla con una sola dirección es pedirle que elija entre una cosa.
       */
      otroCorreo: { registro: string; entrada: string } | null
    }
  | { ok: false; motivo: 'no-se-pudo' }

/**
 * Apple puede dar una dirección de reenvío en vez de la de la persona.
 *
 * Hay que decírselo: nuestros correos van ahí, y si algún día revoca el
 * permiso desde su iPhone dejan de llegarle sin que nosotros nos enteremos.
 */
export function esRelayDeApple(correo: string): boolean {
  return correo.trim().toLowerCase().endsWith('@privaterelay.appleid.com')
}

export async function trasEntrar(entrada: Entrada): Promise<Salida> {
  const { usuarioId, correo } = entrada
  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('profiles')
    .select('id')
    .eq('id', usuarioId)
    .maybeSingle()

  let creado = false
  let otroCorreo: { registro: string; entrada: string } | null = null

  if (!perfil) {
    // --- el cruce del lead, por correo ----------------------------------
    //
    // Primero el correo del proveedor, que es el caso normal. Y si no, el que
    // traía: quien pulsó desde un correo nuestro y entró con otra dirección.
    const candidatos = [correo, entrada.leadPrevio].filter(Boolean) as string[]

    const { data: leads } = await admin
      .from('waitlist')
      .select('id, email')
      .in('email', candidatos)
      .is('converted_profile_id', null)

    // Se prefiere el del propio proveedor: si los dos existen, el suyo es el
    // que acaba de usar para entrar.
    const lead =
      (leads ?? []).find((l) => l.email === correo) ??
      (leads ?? []).find((l) => l.email === entrada.leadPrevio) ??
      null

    if (lead) {
      const { error } = await admin.rpc('convertir_lead', {
        p_profile_id: usuarioId,
        p_lead_email: lead.email,
        p_auth_email: correo,
      })
      if (error) {
        console.error('[entrar] no se pudo convertir el lead', error)
        return { ok: false, motivo: 'no-se-pudo' }
      }
    } else {
      // Sin lead: cuenta nueva con lo que dé el proveedor, que son las dos
      // primeras cosas que pedimos de todas formas.
      const nombre = entrada.nombre?.trim() || null
      const { error } = await admin.from('profiles').insert({
        id: usuarioId,
        email: correo,
        contact_email: correo,
        full_name: nombre,
        display_name: nombre ? nombre.split(' ')[0] : null,
        city_slug: 'caracas',
        status: 'pending_questionnaire',
        ...(entrada.origen ? { source: entrada.origen } : {}),
      } as never)

      if (error) {
        console.error('[entrar] no se pudo crear el perfil', error)
        return { ok: false, motivo: 'no-se-pudo' }
      }
    }

    creado = true

    if (entrada.leadPrevio && entrada.leadPrevio !== correo) {
      otroCorreo = { registro: entrada.leadPrevio, entrada: correo }
    }
  }

  // En qué paso está. La MISMA pieza que decide qué le falta a cualquiera: si
  // aquí se decidiera aparte, el proveedor mandaría a un sitio y el resto del
  // embudo a otro.
  const situacion = await situacionDePerfil(usuarioId)

  return { ok: true, paso: situacion.paso, situacion, creado, otroCorreo }
}
