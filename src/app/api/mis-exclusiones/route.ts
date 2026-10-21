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

/**
 * Y UNA SEGUNDA CERRADURA, que no depende de `reason`.
 *
 * `reason` es una columna que se sobrescribe, y el 20-10 se sobrescribió:
 * reportar dejaba `reason: 'reporte'` y la encuesta que iba detrás lo
 * degradaba a «bloqueo del miembro», así que la persona a la que habías
 * reportado se podía desbloquear desde aquí. El origen está tapado en
 * `/api/despues`, pero no se puede dejar la única defensa en un campo que
 * cualquier escritura puede pisar.
 *
 * `incident_reports` sí es un registro de lo que pasó, no un estado: si hay
 * un reporte entre estas dos personas, en cualquier dirección, ese bloqueo
 * no se quita y punto. Y también repara lo ya degradado en la base sin
 * tocar ni una fila.
 */
async function hayReporteEntre(
  admin: ReturnType<typeof createAdminClient>,
  yo: string,
  otros: string[],
): Promise<Set<string>> {
  if (!otros.length) return new Set()
  const { data } = await admin
    .from('incident_reports')
    .select('reporter_id, subject_id')
    .or(`reporter_id.eq.${yo},subject_id.eq.${yo}`)

  const con = new Set<string>()
  for (const r of data ?? []) {
    const otro = r.reporter_id === yo ? r.subject_id : r.reporter_id
    if (otro && otros.includes(otro)) con.add(otro)
  }
  return con
}

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

  const conReporte = await hayReporteEntre(admin, user.id, otros)

  return NextResponse.json({
    exclusiones: (data ?? []).map((e) => {
      const otro = e.profile_a === user.id ? e.profile_b : e.profile_a
      // El reporte manda sobre lo que diga `reason`: la pantalla no puede
      // ofrecer un botón que el DELETE va a negar.
      const delMiembro = e.reason === SUYO && !conReporte.has(otro)
      return {
        id: otro,
        nombre: nombreDe.get(otro) ?? 'Alguien',
        // Por qué está puesta, en sus términos y no en los de la base.
        porQue: delMiembro ? 'La bloqueaste tú' : 'Viene de un reporte',
        cuando: e.created_at,
        sePuedeQuitar: delMiembro,
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

  // Primero el registro de lo que pasó, que no se puede sobrescribir.
  const conReporte = await hayReporteEntre(admin, user.id, [parsed.data.aQuien])
  if (conReporte.size) {
    return NextResponse.json({ error: 'Ese bloqueo no se puede quitar.' }, { status: 409 })
  }

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

  return NextResponse.json({ estado: 'quitado' })
}
