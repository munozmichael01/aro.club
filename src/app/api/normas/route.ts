import { NextResponse } from 'next/server'
import { z } from 'zod'

import { VERSION_LEGAL } from '@/lib/legal'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * «Acepto las normas y los Términos», una sola vez por cuenta.
 *
 * Viene del rechazo de Apple por la norma 1.2: exige que la persona acepte
 * antes de ver contenido de otros. La app lo pedía con una casilla en CADA
 * inicio de sesión, y Michael no lo quiere así: se acepta una vez, queda
 * guardado, y quien ya aceptó entra directo.
 *
 * No hay columna nueva. `profiles.terms_accepted_at` y `terms_version`
 * existen desde el 10-08 y las escribe el alta con correo: quien se registró
 * así ya tiene su constancia y no se le vuelve a preguntar. Lo que faltaba
 * era la puerta para los demás —quien entró con Apple o con Google, y quien
 * se registró antes de que existiera la columna— y poder saberlo desde la
 * pantalla.
 *
 * IDEMPOTENTE: si ya había aceptado esta versión, no se le mueve la fecha.
 * La primera vez es la que vale como consentimiento; reescribirla cada vez
 * que abre la app sería perder justo el dato que la columna guarda.
 *
 * Guarda la VERSIÓN además de la fecha. El día que cambie el legal, quien
 * tenga una anterior vuelve a quedar identificable sin tocarle la fecha a
 * nadie.
 */

const cuerpo = z.object({
  // Explícito y solo `true`: un `false` no es «no acepto», es una llamada
  // que no debería existir. Aquí solo se registra lo que se aceptó.
  acepto: z.literal(true),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = cuerpo.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: perfil, error: errorPerfil } = await admin
    .from('profiles')
    .select('terms_accepted_at, terms_version')
    .eq('id', user.id)
    .maybeSingle()

  if (errorPerfil) {
    console.error('[normas] no se pudo leer el perfil', errorPerfil)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }
  if (!perfil) return NextResponse.json({ error: 'Sin perfil.' }, { status: 404 })

  // Ya aceptó esta versión: se devuelve SU fecha, no la de ahora.
  if (perfil.terms_accepted_at && perfil.terms_version === VERSION_LEGAL) {
    return NextResponse.json({ estado: 'aceptadas', en: perfil.terms_accepted_at })
  }

  const en = new Date().toISOString()
  const { error } = await admin
    .from('profiles')
    .update({ terms_accepted_at: en, terms_version: VERSION_LEGAL } as never)
    .eq('id', user.id)

  if (error) {
    console.error('[normas] no se pudo guardar', error)
    return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'aceptadas', en })
}
