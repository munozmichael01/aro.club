import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * F11 · Después de la cena.
 *
 * Tres caminos INDEPENDIENTES, y esa independencia es el diseño:
 *
 *  - **Valorar**: si volvería. Alimenta el emparejamiento.
 *  - **Bloquear**: con quién no quiere volver a coincidir. Va al lado de
 *    valorar, sin ceremonia, y nadie se entera. No es una denuncia: es una
 *    preferencia, y tratarla como denuncia haría que nadie la usara.
 *  - **Reportar**: pasó algo. Lo lee una persona el mismo día, nombra a
 *    quién, y bloquea de paso.
 *
 * Enviar uno no cierra los otros. Quien valora puede reportar después, y
 * quien reporta no tiene por qué valorar.
 */

const accion = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('valorar'),
    mesaId: z.string().uuid(),
    // 0 = no del todo, 1 = estuvo bien, 2 = sí sin dudarlo.
    volveria: z.number().int().min(0).max(2),
  }),
  z.object({
    accion: z.literal('bloquear'),
    mesaId: z.string().uuid(),
    aQuien: z.array(z.string().uuid()),
  }),
  z.object({
    accion: z.literal('reportar'),
    mesaId: z.string().uuid(),
    aQuien: z.string().uuid(),
    motivo: z.string().min(1).max(60),
  }),
])

/** La exclusión se guarda ordenada: el CHECK exige profile_a < profile_b. */
const par = (a: string, b: string) => (a < b ? [a, b] : [b, a])

async function estaEnLaMesa(
  admin: ReturnType<typeof createAdminClient>,
  mesaId: string,
  quien: string,
) {
  const { data } = await admin
    .from('table_members')
    .select('profile_id')
    .eq('table_id', mesaId)
    .eq('profile_id', quien)
    .maybeSingle()
  return !!data
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Sin sesión.' }, { status: 401 })

  const parsed = accion.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data

  // Solo se opina de una mesa en la que se estuvo. Sin esto, cualquiera con
  // un id de mesa podría bloquear a gente que no conoce.
  if (!(await estaEnLaMesa(admin, d.mesaId, user.id))) {
    return NextResponse.json({ error: 'Esa no es tu mesa.' }, { status: 404 })
  }

  if (d.accion === 'valorar') {
    const { error } = await admin.from('table_feedback').upsert(
      {
        table_id: d.mesaId,
        profile_id: user.id,
        would_repeat: d.volveria >= 1,
        // De tres opciones a la escala de cinco de la tabla, para poder
        // promediarlo por restaurante después.
        conversation_rating: [1, 3, 5][d.volveria],
      },
      { onConflict: 'table_id,profile_id' },
    )

    if (error) {
      console.error('[despues] valorar', error)
      return NextResponse.json({ error: 'No pudimos guardarlo.' }, { status: 500 })
    }
    return NextResponse.json({ estado: 'valorada' })
  }

  if (d.accion === 'bloquear') {
    for (const otro of d.aQuien) {
      if (otro === user.id) continue
      if (!(await estaEnLaMesa(admin, d.mesaId, otro))) continue

      const [a, b] = par(user.id, otro)
      await admin.from('exclusions').upsert(
        {
          profile_a: a,
          profile_b: b,
          // El motivo NUNCA se le enseña a la otra persona. Solo distingue
          // un bloqueo de una exclusión puesta por operación.
          reason: 'bloqueo del miembro',
          created_by: user.id,
        },
        { onConflict: 'profile_a,profile_b' },
      )

      // Y se anota en el feedback de la mesa, que es lo que el reparto
      // mira además de la exclusión.
      await admin.from('peer_feedback').upsert(
        { table_id: d.mesaId, rater_id: user.id, rated_id: otro, signal: 'avoid' },
        { onConflict: 'table_id,rater_id,rated_id' },
      )
    }

    return NextResponse.json({ estado: 'bloqueados', cuantos: d.aQuien.length })
  }

  // --- reportar ---------------------------------------------------------
  if (!(await estaEnLaMesa(admin, d.mesaId, d.aQuien))) {
    return NextResponse.json({ error: 'Esa persona no estaba en tu mesa.' }, { status: 404 })
  }

  const { data: mesa } = await admin
    .from('dinner_tables')
    .select('event_id')
    .eq('id', d.mesaId)
    .maybeSingle()

  const { error } = await admin.from('incident_reports').insert({
    reporter_id: user.id,
    subject_id: d.aQuien,
    event_id: mesa?.event_id ?? null,
    // Alto por defecto: lo lee una persona el mismo día. Bajarlo es una
    // decisión de quien lo lee, no del formulario.
    severity: 'high',
    description: d.motivo,
  })

  if (error) {
    console.error('[despues] reportar', error)
    return NextResponse.json({ error: 'No pudimos registrarlo.' }, { status: 500 })
  }

  // Reportar bloquea de paso, y para siempre. Quien reporta no tiene que
  // acordarse además de bloquear.
  const [a, b] = par(user.id, d.aQuien)
  await admin.from('exclusions').upsert(
    { profile_a: a, profile_b: b, reason: 'reporte', created_by: user.id },
    { onConflict: 'profile_a,profile_b' },
  )

  await admin.from('peer_feedback').upsert(
    { table_id: d.mesaId, rater_id: user.id, rated_id: d.aQuien, signal: 'avoid', flag_conduct: true },
    { onConflict: 'table_id,rater_id,rated_id' },
  )

  return NextResponse.json({ estado: 'reportado' })
}
