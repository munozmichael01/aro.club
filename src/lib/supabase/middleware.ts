import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

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
  // Las tres del panel, no solo /operacion: la ficha de un miembro y el
  // alta de locales se abren DESDE el panel y cargaban sin sesion. Sus APIs
  // devuelven 404 sin rol, asi que no se escapaba ningun dato —se veia el
  // cascaron vacio—, pero una pantalla interna que responde a cualquiera es
  // media puerta.
  const DEL_PANEL = ['/operacion', '/locales', '/miembro']
  if (DEL_PANEL.some((p) => request.nextUrl.pathname.startsWith(p))) {
    if (!user) {
      const destino = request.nextUrl.clone()
      destino.pathname = '/entrar'
      return NextResponse.redirect(destino)
    }

    // Con el cliente de SERVICIO, no con el del usuario.
    //
    // Esta comprobación llevaba caída desde que `profiles` dejó de ser
    // legible para `authenticated`: la consulta devolvía null por permisos,
    // el rol nunca era 'ops' y el panel respondía 404 a todo el mundo,
    // incluido admin. No saltó porque las rutas de /api/operacion validan
    // por su cuenta y esas sí funcionaban; lo que estaba roto era la puerta.
    //
    // Es una comprobación de autorización del servidor sobre su propia
    // tabla de roles, que es justo para lo que existe la clave de servicio.
    // La alternativa —volver a abrir `profiles` a `authenticated`— desharía
    // el cierre por defecto para arreglar una sola consulta.
    const { data: perfil } = await createAdminClient()
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
