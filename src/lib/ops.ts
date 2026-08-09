import 'server-only'

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

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (data?.role !== 'ops' && data?.role !== 'admin') return null
  return user.id
}
