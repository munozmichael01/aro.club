import { NextResponse } from 'next/server'
import { z } from 'zod'

import { darDeBaja } from '@/lib/baja'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Darse de baja.
 *
 * **Baja no es cerrar sesión y no es borrar la fila.** `profiles.id`
 * referencia `auth.users` con ON DELETE CASCADE, y de `profiles` cuelgan
 * `bookings`, `payments` y `credit_ledger` también en cascada: borrar el
 * usuario de auth se llevaría por delante la facturación que el legal
 * promete conservar diez años.
 *
 * Así que se borra de verdad lo que prometimos borrar —respuestas y
 * documentos— y lo demás se anonimiza. La fila sobrevive como lápida sin
 * nada legible dentro.
 *
 * Lo que NO se borra, y por qué:
 *
 *  - **Facturación.** Lo dice el legal y lo exige cualquier contabilidad.
 *  - **Reportes sobre ella.** Si alguien reportó una conducta, ese registro
 *    protege a otra persona. Darse de baja no puede ser la forma de borrar
 *    lo que hiciste; queda apuntando a una lápida sin nombre.
 *  - **Exclusiones.** Protegen a los dos lados y ya no emparejan a nadie.
 *
 * El correo se libera: se cambia por uno de lápida para que pueda volver a
 * registrarse algún día con el suyo. No la castigamos por irse.
 */

const baja = z.object({
  // Escribir la palabra. Un botón de «darse de baja» a un toque de
  // distancia de «cerrar sesión» se pulsa por error, y esto no se deshace.
  confirmacion: z.literal('BAJA'),
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  // El JWT de esta sesión, ANTES de tocar nada: es lo que hace falta para
  // cerrar las demás, y más abajo la cuenta ya no se parece a esta.
  const { data: { session } } = await supabase.auth.getSession()

  const parsed = baja.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Escribe BAJA para confirmar.' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('profiles')
    .select('id, deleted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil) return NextResponse.json({ error: 'Esa cuenta no existe.' }, { status: 404 })
  if (perfil.deleted_at) {
    return NextResponse.json({ error: 'Esa cuenta ya está dada de baja.' }, { status: 409 })
  }

  // --- 1 · las rutas de las fotos, antes de que la transaccion las borre --
  const fallo = await darDeBaja(admin, user.id, session?.access_token ?? null)
  if (fallo) return NextResponse.json({ error: fallo }, { status: 500 })

  await supabase.auth.signOut()

  return NextResponse.json({ estado: 'baja' })
}
