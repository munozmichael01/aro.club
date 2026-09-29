import { NextResponse } from 'next/server'

import { COOKIE_ESTADO, leerEstado } from '@/lib/oauth-estado'
import { SITIO } from '@/lib/remitente'
import { createClient } from '@/lib/supabase/server'
import { trasEntrar } from '@/lib/tras-entrar'

/**
 * La vuelta de Google.
 *
 * Es la ÚNICA redirección registrada en Supabase, a secas y sin parámetros:
 * a dónde ir después viaja en el `state`, firmado por nosotros. Un `?next=`
 * en la URL de retorno obliga a listar cada variante y es por donde se cuelan
 * los redirects abiertos.
 *
 * Aquí se aplican las reglas que decidió Michael, y el orden importa:
 *
 * 1. Sin correo verificado por Google, NO se entra. Es la condición que
 *    sostiene todo lo demás: enlazar por correo sin ella significa que quien
 *    controle una dirección se queda con la cuenta de quien la usó.
 * 2. Se cruza el lead por CORREO, no por token. Google puede llegar desde un
 *    dispositivo sin llave de lead, y sin este cruce se crea una cuenta vacía
 *    y las diecinueve respuestas se quedan huérfanas sin que falle nada.
 * 3. Quien no tenía nada va DIRECTO a las preguntas. Google da correo y
 *    nombre, que son los dos primeros pasos del embudo; llega al paso de
 *    datos con esos dos puestos y solo se le pide teléfono y trato. El
 *    nacimiento y el género dejaron de ser un problema al moverlos al
 *    cuestionario, así que no se salta nada.
 * 4. Si el correo de Google no es el del lead que traía, se le enseña la
 *    pantalla de «correo distinto» para que elija a cuál le escribimos.
 */

/**
 * La cookie de la ida se gasta al volver.
 *
 * Dura diez minutos de todas formas, pero dejarla puesta significa que la
 * siguiente vuelta —de otra pestaña, de otro intento— usaría el destino de la
 * anterior.
 */
function conCookieBorrada(r: NextResponse): NextResponse {
  r.cookies.set(COOKIE_ESTADO, '', { path: '/', maxAge: 0 })
  return r
}

/** A la pantalla de entrar con un motivo, en vez de a una página en blanco. */
function alFallo(motivo: string) {
  return conCookieBorrada(
    NextResponse.redirect(`${SITIO}/entrar?fallo=${encodeURIComponent(motivo)}`, 302),
  )
}

export async function GET(request: Request) {
  const url = new URL(request.url)

  // Supabase manda `error` cuando la persona cancela en la pantalla de
  // Google. No es un fallo nuestro y no se le grita: se vuelve a entrar.
  if (url.searchParams.get('error')) {
    return NextResponse.redirect(`${SITIO}/entrar`, 302)
  }

  const code = url.searchParams.get('code')
  if (!code) return alFallo('sin-codigo')

  // Lo nuestro viene en la cookie, no en `state`: ese parámetro lo usa
  // Supabase para su propio flujo desde que la ida la genera
  // `signInWithOAuth`, que es lo que trae el PKCE.
  //
  // Que falte NO corta la vuelta. La cookie es `lax` y dura diez minutos:
  // quien tarde más en la pantalla de Google, o vuelva desde un navegador que
  // no la mandó, entraría igual — y negarle la sesión después de que Google
  // ya le pidió permiso sería dejarle fuera por nuestra contabilidad. Sin
  // ella se entra al destino de siempre y sin cruce de lead por correo
  // distinto, que es lo único que se pierde.
  //
  // Lo que SÍ protege contra que alguien te meta en su sesión es el PKCE: sin
  // el verificador que está en su cookie, el código no se canjea.
  const cookies = request.headers.get('cookie') ?? ''
  const cruda = cookies
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_ESTADO}=`))
  const estado = leerEstado(cruda ? decodeURIComponent(cruda.slice(COOKIE_ESTADO.length + 1)) : null)
    ?? { destino: '/cuenta' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('[google] no se pudo canjear el código', error)
    return alFallo('no-se-pudo')
  }

  const usuario = data.user
  const correo = (usuario.email ?? '').trim().toLowerCase()

  // --- 1 · el correo tiene que venir verificado ------------------------
  //
  // Google lo marca. Sin esta condición, enlazar por correo es regalar la
  // cuenta a quien controle esa dirección — y esa es justo la puerta por la
  // que se toma una cuenta ajena.
  const verificado =
    usuario.user_metadata?.email_verified === true ||
    usuario.identities?.some(
      (i) => i.provider === 'google' && i.identity_data?.email_verified === true,
    )

  if (!correo || !verificado) {
    await supabase.auth.signOut()
    return alFallo('correo-sin-verificar')
  }

  // --- 2, 3 y 4 · el perfil, el lead y el correo distinto -------------
  //
  // Las tres viven en `trasEntrar()` desde que existe la app: necesita
  // exactamente lo mismo y no puede usar esta ruta —no hay redirecciones que
  // seguir ni cookie de ida que leer, y lo que le hace falta de vuelta es
  // JSON—. Aquí no cambia nada: se sigue cruzando el lead por CORREO, se
  // sigue creando la cuenta con lo que da Google, y se sigue preguntando por
  // el correo distinto solo cuando de verdad hay dos.
  const r = await trasEntrar({
    usuarioId: usuario.id,
    correo,
    nombre: (usuario.user_metadata?.full_name as string | undefined) ?? null,
    leadPrevio: estado.lead ?? null,
    origen: 'google',
  })

  if (!r.ok) return alFallo('no-se-pudo')

  if (r.otroCorreo) {
    const q = new URLSearchParams({ registro: r.otroCorreo.registro, entrada: r.otroCorreo.entrada })
    return conCookieBorrada(
      NextResponse.redirect(`${SITIO}/entrar?fase=otroCorreo&${q}`, 302),
    )
  }

  // A dónde. El paso lo decide la MISMA pieza que se lo dice a todos; lo que
  // decide esta ruta es a qué URL lleva cada paso, que es lo suyo.
  const porDefecto =
    r.paso === 'preguntas' || r.paso === 'contacto' ? '/cuestionario' : estado.destino

  return conCookieBorrada(NextResponse.redirect(`${SITIO}${porDefecto}`, 302))
}
