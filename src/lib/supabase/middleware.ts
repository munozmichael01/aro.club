import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { env } from '@/lib/env'

import type { Database } from './database.types'

/**
 * Refresca la sesión en cada petición y la devuelve en las cookies de la
 * respuesta. Sin esto, los Server Components ven sesiones caducadas.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // getUser() y no getSession(): valida el token contra el servidor de auth
  // en vez de confiar en lo que venga en la cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // El panel no puede quedar detrás de una URL difícil de adivinar: eso no
  // es una puerta, es un cartel tapado. Se comprueba el rol de verdad.
  if (request.nextUrl.pathname.startsWith('/operacion')) {
    if (!user) {
      const destino = request.nextUrl.clone()
      destino.pathname = '/entrar'
      return NextResponse.redirect(destino)
    }

    const { data: perfil } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (perfil?.role !== 'ops' && perfil?.role !== 'admin') {
      // 404 y no 403: un 403 confirma que la ruta existe.
      return new NextResponse(null, { status: 404 })
    }
  }

  return response
}
