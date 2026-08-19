import { NextResponse } from 'next/server'
import { z } from 'zod'

import { situacionDeLead } from '@/lib/embudo'
import { VERSION_LEGAL } from '@/lib/legal'
import { verificar } from '@/lib/lead-token'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Creación de cuenta al cerrar el cuestionario (HANDOFF-3 §5).
 *
 * El acceso se elige cuando ya hay algo que guardar, no antes. Aquí solo
 * va la vía de contraseña: Apple y Google los inicia el navegador contra
 * Supabase y vuelven por `/api/cuenta/proveedor`.
 *
 * La cuenta se ata al lead por su FIRMA, no por el correo: si alguien se
 * registró con juan@trabajo.com y luego entra con Google como
 * juan@gmail.com, casar por correo dejaría el lead huérfano.
 */

const cuerpo = z.object({
  correo: z.string().trim().toLowerCase().email().max(254),
  token: z.string().min(1),
  // Ocho es el mínimo del contrato. El máximo es de bcrypt, que trunca a 72.
  clave: z.string().min(8).max(72),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = cuerpo.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'La contraseña necesita al menos ocho caracteres.' },
      { status: 400 },
    )
  }

  const { correo, token, clave } = parsed.data

  if (!verificar(correo, token)) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: lead } = await admin
    .from('waitlist')
    .select('id, converted_profile_id')
    .eq('email', correo)
    .maybeSingle()

  if (!lead) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }
  if (lead.converted_profile_id) {
    // Ya tenía cuenta. No es un error (§3.8): se le manda a entrar.
    return NextResponse.json({ estado: 'ya_existe' })
  }

  // No se crea una cuenta a medias. La pantalla guía y el servidor impide,
  // como en el pago: aquí no se comprobaba nada, y por eso hay un perfil en
  // `pending_verification` sin fecha de nacimiento ni teléfono — que además
  // bloquea su propia verificación, porque verificar es comparar el
  // documento contra el nombre y la fecha del perfil.
  //
  // Lo que falta lo dice la MISMA pieza que se lo dice al cuestionario y a
  // Mi cuenta: si cada uno lo decidiera por su cuenta volveríamos a tener
  // huecos entre pantallas, que es de donde salió todo esto.
  const situacion = await situacionDeLead(correo)
  if (situacion.paso !== 'cuenta') {
    return NextResponse.json(
      {
        // Se NOMBRA lo que falta. «Faltan datos» obliga a repasar cuatro
        // campos para descubrir cuál, que es justo lo que esta pantalla ya
        // evita en el pago.
        error: situacion.paso === 'preguntas'
          ? (situacion.falta.preguntas.length === 1
              ? 'Te falta una pregunta del cuestionario.'
              : `Te faltan ${situacion.falta.preguntas.length} preguntas del cuestionario.`)
          : 'Falta ' + ({ nombre: 'tu nombre', nacimiento: 'tu fecha de nacimiento', telefono: 'tu teléfono' } as Record<string, string>)[situacion.falta.contacto[0]]
            + (situacion.falta.contacto.length > 1
                ? ' y ' + (situacion.falta.contacto.length - 1) + ' dato más.'
                : '.'),
        paso: situacion.paso,
        donde: situacion.donde,
        falta: situacion.falta,
      },
      { status: 409 },
    )
  }

  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email: correo,
    password: clave,
    // No hay correo de confirmación todavía, y el correo ya se validó al
    // capturar el lead.
    email_confirm: true,
  })

  if (errorAuth || !creado.user) {
    console.error('[cuenta] no se pudo crear', errorAuth)
    const yaRegistrado = errorAuth?.message?.toLowerCase().includes('already')
    return NextResponse.json(
      {
        error: yaRegistrado
          ? 'Ese correo ya tiene cuenta. Entra con tu contraseña.'
          : 'No pudimos crear tu cuenta. Es cosa nuestra: inténtalo otra vez.',
      },
      { status: yaRegistrado ? 409 : 500 },
    )
  }

  const { error: errorConversion } = await admin.rpc('convertir_lead', {
    p_profile_id: creado.user.id,
    p_lead_email: correo,
    p_auth_email: correo,
  })

  if (errorConversion) {
    // El usuario de auth ya existe pero sin perfil: se deshace para que
    // pueda volver a intentarlo en vez de quedar en tierra de nadie.
    console.error('[cuenta] conversión falló, deshaciendo', errorConversion)
    await admin.auth.admin.deleteUser(creado.user.id)

    // Un teléfono repetido NO es cosa nuestra: es un dato que esa persona
    // puede cambiar, y decirle «inténtalo otra vez» la manda a repetir lo
    // mismo para obtener lo mismo. `profiles.phone_e164` es único porque es
    // por donde se avisa el día de la cena.
    const repetido = errorConversion.code === '23505'
      && String(errorConversion.details ?? '').includes('phone_e164')

    return NextResponse.json(
      {
        error: repetido
          ? 'Ese teléfono ya está en otra cuenta. Usa otro número o entra con la cuenta que ya tienes.'
          : 'No pudimos crear tu cuenta. Es cosa nuestra: inténtalo otra vez.',
      },
      { status: repetido ? 409 : 500 },
    )
  }

  await admin
    .from('profile_identities')
    .insert({ profile_id: creado.user.id, provider: 'password', provider_email: correo })

  // La aceptacion de los terminos, con fecha y version. Se guarda AQUI y no
  // en la pantalla: el boton de la pantalla es lo que ella ve, esta fila es
  // la constancia. Le pedimos la cedula y una selfie —no se piden esas cosas
  // sin registrar para que consintio.
  await admin
    .from('profiles')
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: VERSION_LEGAL,
    } as never)
    .eq('id', creado.user.id)

  // Sesión inmediata: quien acaba de registrarse entra sin pasar por
  // ningún correo. Es una cuenta recién creada, así que no hay riesgo de
  // colarse en la de otro.
  const supabase = await createClient()
  const { error: errorSesion } = await supabase.auth.signInWithPassword({
    email: correo,
    password: clave,
  })

  if (errorSesion) {
    console.error('[cuenta] creada pero sin sesión', errorSesion)
    return NextResponse.json({ estado: 'creada_sin_sesion' })
  }

  return NextResponse.json({ estado: 'creada' })
}
