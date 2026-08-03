import { createBrowserClient } from '@supabase/ssr'

import { env } from '@/lib/env'

import type { Database } from './database.types'

/**
 * Cliente de navegador. Usa la clave pública y queda sujeto a RLS.
 * Solo para lecturas del propio usuario y para la sesión de auth.
 *
 * Toda mutación sensible va por Server Action o Route Handler.
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
}
