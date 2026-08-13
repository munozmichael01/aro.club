import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Devuelve el id de quien pide, solo si es ops o admin. null en cualquier
 * otro caso, incluido no tener sesión.
 *
 * Vivía copiado en cada ruta de operación. Con tres copias, la cuarta se
 * escribe mal: es el tipo de comprobación que no puede depender de que
 * alguien se acuerde de repetirla igual.
 */
export async function exigirOps(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // La SESIÓN sale del cliente del usuario —eso no se delega— pero el ROL se
  // lee con el de servicio.
  //
  // Con el cliente del usuario esto llevaba caído desde que `profiles` dejó
  // de ser legible para `authenticated`: la consulta fallaba por permisos,
  // `data` venía null, y las nueve rutas de operación respondían 404 a
  // quien sí tenía el rol. El panel abría y pintaba todo a cero, que es
  // exactamente como se ve una jornada sin trabajo pendiente.
  //
  // Quién eres lo dice tu sesión; qué puedes hacer lo dice nuestra tabla de
  // roles, y esa la lee el servidor.
  const { data } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (data?.role !== 'ops' && data?.role !== 'admin') return null
  return user.id
}
