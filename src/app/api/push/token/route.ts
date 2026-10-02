import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El teléfono dice dónde encontrarle.
 *
 * `POST` lo registra o lo refresca; `DELETE` lo da de baja al cerrar sesión.
 * Los dos con la sesión de la cuenta: quién es lo dice Supabase, no el cuerpo
 * de la petición. Aceptar un `profile_id` por aquí sería dejar que cualquiera
 * se suscriba a las notificaciones de otro.
 *
 * **Un teléfono es un token, y el token se MUEVE de cuenta.** Si alguien
 * cierra sesión y entra con otra cuenta en el mismo teléfono, la fila cambia
 * de `profile_id` en vez de duplicarse. Si se duplicara, la cuenta vieja
 * seguiría recibiendo en un teléfono que ya no es suyo: una fuga de datos con
 * forma de aviso.
 *
 * La app lo reenvía al arrancar si cambió o si pasó una semana, así que esto
 * se llama a menudo con el mismo token. Por eso es un upsert y por eso
 * `visto_en` se refresca: un token sin tocar en mucho tiempo es un teléfono
 * que ya no abre la app.
 */

const alta = z.object({
  token: z.string().min(10).max(300),
  plataforma: z.enum(['ios', 'android']),
  version: z.string().max(40).optional(),
})

const baja = z.object({
  token: z.string().min(10).max(300),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = alta.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const d = parsed.data
  const ahora = new Date().toISOString()

  const { error } = await createAdminClient()
    .from('push_tokens')
    .upsert(
      {
        profile_id: user.id,
        token: d.token,
        plataforma: d.plataforma,
        version: d.version ?? null,
        visto_en: ahora,
        // Volver a registrarlo lo resucita: quien reinstala la app manda el
        // mismo token y tiene que empezar a recibir otra vez.
        baja_en: null,
      } as never,
      { onConflict: 'token' },
    )

  if (error) {
    console.error('[push] no se pudo guardar el token', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'registrado' })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = baja.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  // Solo el suyo. Sin el `profile_id`, mandar el token de otra persona la
  // dejaría sin notificaciones desde una sesión cualquiera.
  //
  // No se borra la fila: saber que un token se dio de baja —y cuándo— es lo
  // que explica después que a alguien dejaran de llegarle las push.
  const { error } = await createAdminClient()
    .from('push_tokens')
    .update({ baja_en: new Date().toISOString() } as never)
    .eq('token', parsed.data.token)
    .eq('profile_id', user.id)

  if (error) {
    console.error('[push] no se pudo dar de baja el token', error)
    return NextResponse.json({ error: 'No pudimos darlo de baja.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'de-baja' })
}
