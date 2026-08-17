import { NextResponse } from 'next/server'
import { z } from 'zod'

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
  const { data: verificaciones } = await admin
    .from('verifications')
    .select('storage_path')
    .eq('profile_id', user.id)

  const rutas = (verificaciones ?? [])
    .map((v) => v.storage_path)
    .filter((r): r is string => !!r)

  // --- 2 · la baja, en UNA transaccion ----------------------------------
  // La primera version hacia esto en seis pasos desde aqui y el ultimo
  // reventó: los datos quedaron borrados y la cuenta viva. Una operacion
  // destructiva de varios pasos no puede vivir en la aplicacion.
  const { error: errorBaja } = await admin.rpc('dar_de_baja', {
    p_profile_id: user.id,
  })

  if (errorBaja) {
    console.error('[baja] la transaccion no paso', errorBaja)
    return NextResponse.json(
      { error: 'No pudimos completar la baja. No hemos tocado nada.' },
      { status: 500 },
    )
  }

  // --- 3 · las fotos del almacen ----------------------------------------
  // Va DESPUES: el almacen no entra en la transaccion. Si falla, la cuenta
  // ya esta cerrada —que es lo que pidio— y los ficheros los recoge la
  // purga de los 90 dias. Se registra fuerte porque es una promesa a
  // medias hasta entonces.
  if (rutas.length) {
    const { error } = await admin.storage.from('verificaciones').remove(rutas)
    if (error) {
      console.error('[baja] LA CUENTA SE CERRO PERO LAS CAPTURAS SIGUEN AHI', user.id, error)
    }
  }

  // --- 4 · cortar el acceso y liberar su correo -------------------------
  // El correo se cambia por uno de lápida en vez de borrar el usuario:
  // borrarlo arrastraría la facturación. Y liberarlo le deja volver.
  await admin.auth.admin.updateUserById(user.id, {
    email: `baja+${user.id}@aro.club`,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: {},
  })

  // Y se cierran todas las sesiones abiertas, no solo esta.
  //
  // Con el id de la persona esto no cerraba ninguna: `signOut` quiere el JWT
  // de una sesión viva y los dos son `string`, así que no fallaba al compilar
  // —fallaba en cada llamada, sin que nadie mirase el error—. Una cuenta dada
  // de baja seguía abierta en el móvil donde ya lo estaba.
  if (session?.access_token) {
    const { error } = await admin.auth.admin.signOut(session.access_token, 'global')
    if (error) console.error('[baja] LA CUENTA SE CERRO PERO LAS SESIONES SIGUEN ABIERTAS', user.id, error)
  }
  await supabase.auth.signOut()

  return NextResponse.json({ estado: 'baja' })
}
