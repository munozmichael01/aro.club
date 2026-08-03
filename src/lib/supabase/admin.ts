import 'server-only'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { env, serverEnv } from '@/lib/env'

import type { Database } from './database.types'

/**
 * Cliente con `service_role`. SALTA RLS POR COMPLETO.
 *
 * El import de 'server-only' hace que la compilación falle si este módulo
 * llega, aunque sea por una cadena de imports, a un Client Component. Es una
 * red de seguridad, no un adorno: esta clave da acceso total a la base.
 *
 * Solo para:
 *   - operaciones del panel (conciliar pagos, aprobar verificaciones)
 *   - jobs (expirar reservas retenidas)
 *   - el endpoint de matching
 *
 * Nunca para leer datos del propio usuario: para eso está el cliente de
 * servidor con sesión, que respeta RLS.
 */
export function createAdminClient() {
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv()

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )
}
