import { NextResponse } from 'next/server'

import { situacionDePerfil } from '@/lib/embudo'
import { leerEstado } from '@/lib/oauth-estado'
import { SITIO } from '@/lib/remitente'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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

/** A la pantalla de entrar con un motivo, en vez de a una página en blanco. */
function alFallo(motivo: string) {
  return NextResponse.redirect(`${SITIO}/entrar?fallo=${encodeURIComponent(motivo)}`, 302)
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

  const estado = leerEstado(url.searchParams.get('state'))
  // Un `state` que no cuadra es una vuelta que no empezamos nosotros. No se
  // continúa: es la protección contra que alguien te meta en su sesión.
  if (!estado) return alFallo('estado-invalido')

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

  const admin = createAdminClient()

  // --- 2 · ¿ya tiene perfil? -------------------------------------------
  const { data: perfil } = await admin
    .from('profiles')
    .select('id, full_name, display_name, contact_email')
    .eq('id', usuario.id)
    .maybeSingle()

  if (!perfil) {
    // --- 3 · el cruce del lead, por correo ------------------------------
    //
    // Primero el correo de Google, que es el caso normal. Y si no hay, el
    // del `state`: quien pulsó desde un correo nuestro y entró con otra
    // dirección de Google.
    const candidatos = [correo, estado.lead].filter(Boolean) as string[]

    const { data: leads } = await admin
      .from('waitlist')
      .select('id, email, full_name, display_name')
      .in('email', candidatos)
      .is('converted_profile_id', null)

    // Se prefiere el del propio Google: si los dos existen, el suyo es el que
    // acaba de usar para entrar.
    const lead =
      (leads ?? []).find((l) => l.email === correo) ??
      (leads ?? []).find((l) => l.email === estado.lead) ??
      null

    if (lead) {
      const { error: errorConvertir } = await admin.rpc('convertir_lead', {
        p_profile_id: usuario.id,
        p_lead_email: lead.email,
        p_auth_email: correo,
      })

      if (errorConvertir) {
        console.error('[google] no se pudo convertir el lead', errorConvertir)
        return alFallo('no-se-pudo')
      }
    } else {
      // Sin lead: cuenta nueva con lo que da Google, que son las dos primeras
      // cosas que pedimos de todas formas.
      const nombre = (usuario.user_metadata?.full_name as string | undefined)?.trim() || null
      const { error: errorAlta } = await admin.from('profiles').insert({
        id: usuario.id,
        email: correo,
        contact_email: correo,
        full_name: nombre,
        display_name: nombre ? nombre.split(' ')[0] : null,
        city_slug: 'caracas',
        status: 'pending_questionnaire',
      } as never)

      if (errorAlta) {
        console.error('[google] no se pudo crear el perfil', errorAlta)
        return alFallo('no-se-pudo')
      }
    }

    // --- 4 · ¿entró con un correo distinto del que se apuntó? -----------
    //
    // Solo se pregunta cuando de verdad hay dos, que es cuando la pantalla
    // tiene algo que decir. Enseñarla con una sola dirección sería pedirle
    // que elija entre una cosa.
    if (estado.lead && estado.lead !== correo) {
      const q = new URLSearchParams({ registro: estado.lead, entrada: correo })
      return NextResponse.redirect(`${SITIO}/entrar?fase=otroCorreo&${q}`, 302)
    }
  }

  // A dónde. La misma pieza que decide qué le falta a cualquiera: si aquí se
  // decidiera aparte, Google mandaría a un sitio y el resto del embudo a otro.
  const situacion = await situacionDePerfil(usuario.id)
  const porDefecto =
    situacion.paso === 'preguntas' || situacion.paso === 'contacto' ? '/cuestionario' : estado.destino

  return NextResponse.redirect(`${SITIO}${porDefecto}`, 302)
}
