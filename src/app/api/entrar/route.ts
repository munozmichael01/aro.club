import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Entrar con correo y contraseña, y recuperación.
 *
 * Dos reglas del contrato que se cruzan aquí:
 *
 *  - No se manda correo antes de comprobar que la cuenta existe. Un correo
 *    desconocido ve la misma pantalla de confirmación —no filtramos quién
 *    está registrado— pero no se envía nada. Si no, se paga por cada sondeo.
 *  - Máximo 3 envíos por correo y hora.
 */

const CORREO = z.string().trim().toLowerCase().email().max(254)

const cuerpo = z.discriminatedUnion('accion', [
  z.object({ accion: z.literal('entrar'), correo: CORREO, clave: z.string().min(1).max(72) }),
  z.object({ accion: z.literal('recuperar'), correo: CORREO }),
])

const TOPE_POR_HORA = 3

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = cuerpo.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Revisa el correo y la contraseña.' }, { status: 400 })
  }

  // --- Entrar --------------------------------------------------------
  if (parsed.data.accion === 'entrar') {
    const { correo, clave } = parsed.data
    const supabase = await createClient()
    const { error } = await supabase.auth.signInWithPassword({ email: correo, password: clave })

    if (error) {
      // Mismo mensaje exista o no la cuenta: decir cuál de los dos falló
      // convierte esta pantalla en un comprobador de quién está registrado.
      return NextResponse.json(
        { error: 'Ese correo y esa contraseña no coinciden.' },
        { status: 401 },
      )
    }
    return NextResponse.json({ estado: 'dentro' })
  }

  // --- Recuperar -----------------------------------------------------
  const { correo } = parsed.data
  const admin = createAdminClient()

  const { count } = await admin
    .from('auth_envios')
    .select('*', { count: 'exact', head: true })
    .eq('email', correo)
    .gt('created_at', new Date(Date.now() - 3_600_000).toISOString())

  if ((count ?? 0) >= TOPE_POR_HORA) {
    // Mismo cuerpo que el caso bueno: el tope tampoco puede delatar nada.
    return NextResponse.json({ estado: 'enviado' })
  }

  const { data: perfil } = await admin
    .from('profiles')
    .select('id')
    .eq('email', correo)
    .maybeSingle()

  // Solo se registra el intento y se genera el enlace si la cuenta existe.
  if (perfil) {
    await admin.from('auth_envios').insert({ email: correo, kind: 'recuperar' })
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: correo,
    })
    if (error) {
      console.error('[entrar] no se pudo generar el enlace', error)
    } else if (process.env.NODE_ENV !== 'production') {
      // El envío real llega con los correos transaccionales. Hasta entonces
      // el enlace queda en el registro para poder probar el recorrido.
      console.info('[entrar] enlace de recuperación:', data.properties?.action_link)
    }
  }

  // Exista o no, la respuesta es la misma.
  return NextResponse.json({ estado: 'enviado' })
}
