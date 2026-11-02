import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

/**
 * Dar de baja una cuenta: la transacción `dar_de_baja`, las fotos de la
 * verificación fuera de Storage, el correo de acceso liberado y las sesiones
 * cerradas.
 *
 * Vivía dentro de `/api/baja`. Sale de ahí el 02-11 porque hay una segunda
 * puerta: la cuenta de un menor, que se cierra al confirmar su fecha de
 * nacimiento (Michael). Dos copias de la baja serían dos ideas de qué queda
 * de una cuenta cerrada.
 *
 * Devuelve el texto del fallo, o null si todo fue bien.
 */
export async function darDeBaja(
  admin: ReturnType<typeof createAdminClient>,
  perfilId: string,
  token: string | null,
): Promise<string | null> {
  const { data: verificaciones } = await admin
    .from('verifications')
    .select('storage_path')
    .eq('profile_id', perfilId)

  const rutas = (verificaciones ?? [])
    .map((v) => v.storage_path)
    .filter((r): r is string => !!r)

  // --- 2 · la baja, en UNA transaccion ----------------------------------
  // La primera version hacia esto en seis pasos desde aqui y el ultimo
  // reventó: los datos quedaron borrados y la cuenta viva. Una operacion
  // destructiva de varios pasos no puede vivir en la aplicacion.
  const { error: errorBaja } = await admin.rpc('dar_de_baja', {
    p_profile_id: perfilId,
  })

  if (errorBaja) {
    console.error('[baja] la transaccion no paso', errorBaja)
    return 'No pudimos completar la baja. No hemos tocado nada.'
  }

  // --- 3 · las fotos del almacen ----------------------------------------
  // Va DESPUES: el almacen no entra en la transaccion. Si falla, la cuenta
  // ya esta cerrada —que es lo que pidio— y los ficheros los recoge la
  // purga de los 90 dias. Se registra fuerte porque es una promesa a
  // medias hasta entonces.
  if (rutas.length) {
    const { error } = await admin.storage.from('verificaciones').remove(rutas)
    if (error) {
      console.error('[baja] LA CUENTA SE CERRO PERO LAS CAPTURAS SIGUEN AHI', perfilId, error)
    }
  }

  // --- 4 · cortar el acceso y liberar su correo -------------------------
  // El correo se cambia por uno de lápida en vez de borrar el usuario:
  // borrarlo arrastraría la facturación. Y liberarlo le deja volver.
  await admin.auth.admin.updateUserById(perfilId, {
    email: `baja+${perfilId}@aro.club`,
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
  if (token) {
    const { error } = await admin.auth.admin.signOut(token, 'global')
    if (error) console.error('[baja] LA CUENTA SE CERRO PERO LAS SESIONES SIGUEN ABIERTAS', perfilId, error)
  }
  return null
}
