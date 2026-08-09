import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Con quién no quiere volver a coincidir.
 *
 * La tarjeta de Mi cuenta decía «Ninguna» escrito a mano y enlazaba al
 * legal. Dos cosas mal a la vez: un dato inventado que se lee como dato, y
 * un enlace cuyo texto no coincide con su destino.
 *
 * **De la otra persona solo sale el nombre de pila.** No hace falta más
 * para reconocerla —cenó con ella— y dar más sería convertir un bloqueo en
 * una ficha de alguien que no eligió estar aquí.
 *
 * Quitar se puede, pero solo lo que puso ella misma. Un bloqueo que vino de
 * un reporte, o que puso operación, no lo deshace desde aquí: si pudiera,
 * bastaría con insistir para volver a coincidir con quien te reportó.
 */

const quitar = z.object({ aQuien: z.string().uuid() })

/** El CHECK de la tabla exige profile_a < profile_b. */
const par = (a: string, b: string) => (a < b ? [a, b] : [b, a])

const SUYO = 'bloqueo del miembro'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('exclusions')
    .select('profile_a, profile_b, reason, created_at')
    .or(`profile_a.eq.${user.id},profile_b.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[mis-exclusiones] leer', error)
    return NextResponse.json({ error: 'No pudimos leerlas.' }, { status: 500 })
  }

  const otros = (data ?? []).map((e) => (e.profile_a === user.id ? e.profile_b : e.profile_a))

  const { data: perfiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .in('id', otros.length ? otros : ['00000000-0000-0000-0000-000000000000'])

  const nombreDe = new Map(
    (perfiles ?? []).map((p) => [p.id, p.display_name || p.full_name?.split(' ')[0] || 'Alguien']),
  )

  return NextResponse.json({
    exclusiones: (data ?? []).map((e) => {
      const otro = e.profile_a === user.id ? e.profile_b : e.profile_a
      return {
        id: otro,
        nombre: nombreDe.get(otro) ?? 'Alguien',
        // Por qué está puesta, en sus términos y no en los de la base.
        porQue: e.reason === SUYO ? 'La bloqueaste tú' : 'Viene de un reporte',
        cuando: e.created_at,
        sePuedeQuitar: e.reason === SUYO,
      }
    }),
  })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = quitar.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [a, b] = par(user.id, parsed.data.aQuien)

  // El `reason` en el filtro es la protección, no un adorno: sin él, esta
  // ruta desharía también los bloqueos que vinieron de un reporte.
  const { error, count } = await admin
    .from('exclusions')
    .delete({ count: 'exact' })
    .eq('profile_a', a)
    .eq('profile_b', b)
    .eq('reason', SUYO)

  if (error) {
    console.error('[mis-exclusiones] quitar', error)
    return NextResponse.json({ error: 'No pudimos quitarlo.' }, { status: 500 })
  }
  if (!count) {
    return NextResponse.json({ error: 'Ese bloqueo no se puede quitar.' }, { status: 409 })
  }

  // Y la señal de la mesa, que es lo otro que mira el reparto.
  await admin
    .from('peer_feedback')
    .delete()
    .eq('rater_id', user.id)
    .eq('rated_id', parsed.data.aQuien)
    .eq('signal', 'avoid')
    .eq('flag_conduct', false)

  return NextResponse.json({ estado: 'quitado' })
}
