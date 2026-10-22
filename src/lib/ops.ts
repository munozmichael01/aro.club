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
/**
 * DESDE CUÁNDO CUENTA LO QUE SE MIRA EN OPERACIÓN.
 *
 * Michael, 21-10: «te había dicho que en los pagos e historial de mesas no
 * quiero nada anterior al 12/10».
 *
 * Antes de esa fecha el club estaba probándose: pagos de mentira, cenas que
 * no ocurrieron, cuentas de ensayo. Mezclarlos con lo real no es un detalle
 * estético, hace que las cifras mientan: hoy son 23 pagos viejos de 132 y
 * cuatro mesas de quince.
 *
 * No se borra nada. Se deja de enseñar en las dos pantallas donde esos
 * números se leen como negocio. La base conserva todo.
 *
 * Es medianoche del 12 en Caracas, que es UTC-4 y no cambia con la estación.
 */
export const DESDE_QUE_ES_REAL = '2026-10-12T04:00:00+00:00'

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
