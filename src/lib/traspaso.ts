import 'server-only'

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * La llave temporal que viaja en el QR.
 *
 * Es lo único de todo el producto que deja hacer algo sin sesión, así que
 * está acotada a propósito: solo sirve para subir las dos fotos de una
 * verificación concreta, dura diez minutos y se muere al completarse.
 *
 * En la base va el sha256. Si mañana alguien lee esa tabla —una copia, un
 * volcado, un log— no se lleva llaves, se lleva huellas de llaves.
 */

export const MINUTOS = 10

const hash = (token: string) => createHash('sha256').update(token).digest('hex')

export async function crearTraspaso(profileId: string) {
  const admin = createAdminClient()

  // Los anteriores de esta persona dejan de valer: dos QR vivos a la vez
  // son dos llaves, y solo una está en la pantalla que está mirando.
  await admin
    .from('verification_handoffs')
    .update({ consumed_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('consumed_at', null)

  // 32 caracteres base64url. Suficiente para que adivinarlo no sea una vía.
  const token = randomBytes(24).toString('base64url')
  const expira = new Date(Date.now() + MINUTOS * 60_000)

  const { error } = await admin.from('verification_handoffs').insert({
    profile_id: profileId,
    token_hash: hash(token),
    expires_at: expira.toISOString(),
  })

  if (error) return null
  return { token, expira: expira.toISOString() }
}

/**
 * Devuelve el profile_id si el código sirve, null si no. Marca el primer
 * uso para que se pueda ver desde dónde se abrió.
 */
export async function perfilDeTraspaso(token: string): Promise<string | null> {
  if (!token || token.length < 20) return null

  const admin = createAdminClient()
  const buscado = hash(token)

  const { data } = await admin
    .from('verification_handoffs')
    .select('id, profile_id, token_hash, expires_at, consumed_at')
    .eq('token_hash', buscado)
    .maybeSingle()

  if (!data || data.consumed_at) return null
  if (new Date(data.expires_at).getTime() < Date.now()) return null

  // La comparación va en tiempo constante aunque ya hayamos filtrado por
  // igualdad: el filtro lo hace Postgres, y esto es lo que decide.
  const a = Buffer.from(data.token_hash)
  const b = Buffer.from(buscado)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  if (!data.consumed_at) {
    await admin
      .from('verification_handoffs')
      .update({ claimed_at: new Date().toISOString() })
      .eq('id', data.id)
      .is('claimed_at', null)
  }

  return data.profile_id
}

/** Al llegar las dos fotos la llave sobra, y lo que sobra se cierra. */
export async function cerrarTraspasos(profileId: string) {
  await createAdminClient()
    .from('verification_handoffs')
    .update({ consumed_at: new Date().toISOString() })
    .eq('profile_id', profileId)
    .is('consumed_at', null)
}
