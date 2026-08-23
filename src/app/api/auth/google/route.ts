import { NextResponse } from 'next/server'

import { env } from '@/lib/env'
import { verificar } from '@/lib/lead-token'
import { firmarEstado } from '@/lib/oauth-estado'
import { SITIO } from '@/lib/remitente'

/**
 * Entrar con Google: la ruta que arma la URL y redirige.
 *
 * Las pantallas son `.dc.html` sin cliente de Supabase, así que el botón no
 * puede llamar a `signInWithOAuth` — no hay SDK en el navegador. El patrón es
 * el de `/clave`: una ruta nuestra que construye la URL y devuelve un 302.
 *
 * ## Qué se le pasa a Supabase
 *
 * `redirect_to` es SIEMPRE `https://aro.club/auth/callback`, a secas. Es la
 * única redirección registrada en la consola, y el destino de después viaja
 * dentro del `state` firmado. Meterlo como parámetro obligaría a listar cada
 * variante, y es por donde se cuelan los redirects abiertos.
 *
 * ## Y el correo del lead
 *
 * Si quien pulsa llega con su llave de lead —el `?t=` de los correos— se
 * mete en el `state`. Es lo único que después permite cruzar a quien se
 * apuntó con una dirección y entra con otra: sin eso, Google trae un correo
 * que no cruza con ningún lead y las diecinueve respuestas se quedan
 * huérfanas sin que falle nada.
 *
 * Google puede llegar desde un dispositivo sin esa llave. Entonces no va, y
 * se cruza solo por el correo que dé Google, que es lo que hay.
 */

export async function GET(request: Request) {
  const url = new URL(request.url)

  // El correo del lead solo si viene FIRMADO. `verificar` comprueba la firma
  // sobre ese correo; sin ella, cualquiera podría poner `?correo=` con la
  // dirección de otro y quedarse con su lead y sus diecinueve respuestas.
  const correo = (url.searchParams.get('correo') ?? '').trim().toLowerCase()
  const t = url.searchParams.get('t')
  const lead = correo && t && verificar(correo, t) ? correo : undefined

  const state = firmarEstado({
    destino: url.searchParams.get('destino') ?? '/cuenta',
    lead,
  })

  const autorizar = new URL(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize`)
  autorizar.searchParams.set('provider', 'google')
  autorizar.searchParams.set('redirect_to', `${SITIO}/auth/callback`)
  // `prompt=select_account`: sin esto, quien ya tiene una sesión de Google en
  // el navegador entra con ESA sin poder elegir, y en un ordenador compartido
  // acaba dentro de la cuenta de Aro de otra persona.
  autorizar.searchParams.set('query_params', new URLSearchParams({ prompt: 'select_account' }).toString())
  autorizar.searchParams.set('state', state)

  return NextResponse.redirect(autorizar.toString(), 302)
}
