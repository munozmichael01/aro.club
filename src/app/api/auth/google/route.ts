import { NextResponse } from 'next/server'

import { verificar } from '@/lib/lead-token'
import { firmarEstado, COOKIE_ESTADO } from '@/lib/oauth-estado'
import { SITIO } from '@/lib/remitente'
import { createClient } from '@/lib/supabase/server'

/**
 * Entrar con Google: la ruta que arma la URL y redirige.
 *
 * Las pantallas son `.dc.html` sin cliente de Supabase, así que el botón no
 * puede llamar a `signInWithOAuth` desde el navegador. El patrón es el de
 * `/clave`: una ruta nuestra que construye la URL y devuelve un 302.
 *
 * ## La URL la genera el cliente, no yo a mano
 *
 * Esto la armaba a mano —`/auth/v1/authorize?provider=google&…`— y por eso no
 * funcionaba: le faltaba el `code_challenge`. Sin PKCE, Supabase no vuelve con
 * `?code=`, devuelve la sesión en el FRAGMENTO (`#access_token=…`), y el
 * fragmento no lo manda el navegador al servidor. Así que `/auth/callback` no
 * encontraba código y salía por `sin-codigo` — que es exactamente lo que veía
 * Michael: la pantalla de Google funciona, das permiso, vuelves, y no hay
 * sesión.
 *
 * Con `signInWithOAuth` la URL sale con su `code_challenge` Y el verificador
 * queda escrito en una cookie por el adaptador que este cliente ya usa. Esa
 * es la otra mitad: sin esa cookie, `exchangeCodeForSession` tampoco podría
 * canjear el código aunque llegara.
 *
 * `skipBrowserRedirect` porque aquí no hay navegador que redirigir: estamos
 * en el servidor y el 302 lo devolvemos nosotros.
 *
 * ## Dónde va el destino ahora
 *
 * El `state` lo genera y lo usa Supabase para su propio flujo, así que ya no
 * cabe el mío. Va en una COOKIE firmada, no en la URL de retorno: así la
 * redirección registrada sigue siendo una sola —`/auth/callback` a secas— y
 * no hay que listar una variante por destino, que es por donde se cuelan los
 * redirects abiertos.
 */

export async function GET(request: Request) {
  const url = new URL(request.url)

  // El correo del lead solo si viene FIRMADO. `verificar` comprueba la firma
  // sobre ese correo; sin ella, cualquiera podría poner `?correo=` con la
  // dirección de otro y quedarse con su lead y sus diecinueve respuestas.
  const correo = (url.searchParams.get('correo') ?? '').trim().toLowerCase()
  const t = url.searchParams.get('t')
  const lead = correo && t && verificar(correo, t) ? correo : undefined

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${SITIO}/auth/callback`,
      skipBrowserRedirect: true,
      // Sin esto, quien ya tiene una sesión de Google en el navegador entra
      // con ESA sin poder elegir, y en un ordenador compartido acaba dentro
      // de la cuenta de Aro de otra persona.
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error || !data?.url) {
    console.error('[google] no se pudo armar la URL de entrada', error)
    return NextResponse.redirect(`${SITIO}/entrar?fallo=no-se-pudo`, 302)
  }

  const respuesta = NextResponse.redirect(data.url, 302)

  respuesta.cookies.set(COOKIE_ESTADO, firmarEstado({
    destino: url.searchParams.get('destino') ?? '/cuenta',
    lead,
  }), {
    httpOnly: true,
    secure: SITIO.startsWith('https://'),
    // `lax` y no `strict`: la vuelta de Google es una navegación desde otro
    // sitio, y con `strict` el navegador no mandaría la cookie justo cuando
    // hace falta.
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60,
  })

  return respuesta
}
