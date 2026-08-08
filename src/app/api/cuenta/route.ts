import { NextResponse } from 'next/server'
import { z } from 'zod'

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
    return NextResponse.json(
      { error: 'No pudimos crear tu cuenta. Es cosa nuestra: inténtalo otra vez.' },
      { status: 500 },
    )
  }

  await admin
    .from('profile_identities')
    .insert({ profile_id: creado.user.id, provider: 'password', provider_email: correo })

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
