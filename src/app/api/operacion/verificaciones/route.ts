import { NextResponse } from 'next/server'
import { z } from 'zod'

import { exigirOps } from '@/lib/ops'
import { createAdminClient } from '@/lib/supabase/admin'
import { anotar } from '@/lib/auditoria'
import { encolar } from '@/lib/correos'

/**
 * La cola de verificación (HANDOFF-4 §4.4).
 *
 * Las fotos no se sirven: se firma una URL que caduca a los cinco minutos,
 * el tiempo de mirarla. Una ruta que devolviera la imagen dejaría un enlace
 * permanente en el historial del navegador de quien revisa.
 */

const decision = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('aprobar'),
    profileId: z.string().uuid(),
    nombreCoincide: z.boolean(),
    edadCoincide: z.boolean(),
  }),
  z.object({
    accion: z.literal('rechazar'),
    profileId: z.string().uuid(),
    motivo: z.string().min(1),
    nota: z.string().max(500).optional(),
  }),
])

export async function GET() {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const admin = createAdminClient()

  const { data: cola, error } = await admin
    .from('v_cola_verificacion')
    .select('*')
    .order('espera_desde', { ascending: true })

  if (error) {
    console.error('[verificaciones] cola', error)
    return NextResponse.json({ error: 'No pudimos leer la cola.' }, { status: 500 })
  }

  const ids = (cola ?? []).map((c) => c.profile_id).filter((id): id is string => id != null)

  const { data: fotos } = await admin
    .from('verifications')
    .select('profile_id, kind, storage_path, created_at')
    .in('profile_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    .eq('status', 'pending')

  // Una firma por foto, cinco minutos.
  const firmadas = new Map<string, string>()
  for (const f of fotos ?? []) {
    if (!f.storage_path) continue
    const { data } = await admin.storage
      .from('verificaciones')
      .createSignedUrl(f.storage_path, 300)
    if (data?.signedUrl) firmadas.set(`${f.profile_id}:${f.kind}`, data.signedUrl)
  }

  const { data: motivos } = await admin
    .from('verification_rejection_reasons')
    .select('code, label, allows_retry, message')
    .order('sort_order')

  return NextResponse.json({
    cola: (cola ?? []).map((c) => ({
      profileId: c.profile_id,
      nombre: c.full_name,
      trato: c.display_name,
      // La fecha declarada, para contrastarla con la del documento. Es
      // justo lo que operación tiene que comparar.
      nacimiento: c.birthdate,
      esperaDesde: c.espera_desde,
      rechazosPrevios: c.rechazos_previos,
      cedula: firmadas.get(`${c.profile_id}:id_document`) ?? null,
      selfie: firmadas.get(`${c.profile_id}:selfie`) ?? null,
    })),
    motivos: (motivos ?? []).map((m) => ({
      codigo: m.code,
      label: m.label,
      permiteReintento: m.allows_retry,
      // Lo que le llegará a ella. El panel lo enseña antes de confirmar,
      // para que quien rechaza vea qué está mandando.
      mensaje: m.message,
    })),
  })
}

export async function POST(request: Request) {
  const actor = await exigirOps()
  if (!actor) return new NextResponse(null, { status: 404 })

  const parsed = decision.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const admin = createAdminClient()
  const d = parsed.data
  const ahora = new Date().toISOString()

  if (d.accion === 'aprobar') {
    // Las dos comprobaciones se guardan aunque sean `true`: si dentro de un
    // mes hay un problema, la pregunta es si alguien miró, no si aprobó.
    const { error } = await admin
      .from('verifications')
      .update({
        status: 'approved',
        reviewed_by: actor,
        reviewed_at: ahora,
        name_matches: d.nombreCoincide,
        age_confirmed: d.edadCoincide,
      })
      .eq('profile_id', d.profileId)
      .eq('status', 'pending')

    if (error) {
      console.error('[verificaciones] aprobar', error)
      return NextResponse.json({ error: 'No pudimos aprobarla.' }, { status: 500 })
    }

    // Verificada de las dos formas: ya es miembro de pleno derecho.
    const { data: aprobadas } = await admin
      .from('verifications')
      .select('kind')
      .eq('profile_id', d.profileId)
      .eq('status', 'approved')

    const tipos = new Set((aprobadas ?? []).map((a) => a.kind))
    if (tipos.has('id_document') && tipos.has('selfie')) {
      await admin.from('profiles').update({ status: 'active' }).eq('id', d.profileId)
    }

    await anotar(actor, 'verificacion_aprobada', 'verificacion', d.profileId, {
      nombreCoincide: d.nombreCoincide, edadCoincide: d.edadCoincide,
    })

    // Solo cuando estan las DOS aprobadas: avisar de que "ya puedes
    // reservar" con la selfie aun pendiente seria mentira, y esa pantalla
    // seguiria diciendole que espere.
    if (tipos.has('id_document') && tipos.has('selfie')) {
      await encolar({ perfil: d.profileId }, 'verificacion', { resultado: 'aprobada' })
    }
    return NextResponse.json({ estado: 'aprobada' })
  }

  const { data: motivo } = await admin
    .from('verification_rejection_reasons')
    .select('code')
    .eq('code', d.motivo)
    .maybeSingle()

  if (!motivo) {
    return NextResponse.json({ error: 'Ese motivo no existe.' }, { status: 400 })
  }

  const { error } = await admin
    .from('verifications')
    .update({
      status: 'rejected',
      reviewed_by: actor,
      reviewed_at: ahora,
      rejection_reason: d.motivo,
      // La nota es interna. No sale nunca hacia la persona.
      rejection_note: d.nota ?? null,
    })
    .eq('profile_id', d.profileId)
    .eq('status', 'pending')

  if (error) {
    console.error('[verificaciones] rechazar', error)
    return NextResponse.json({ error: 'No pudimos rechazarla.' }, { status: 500 })
  }

  await anotar(actor, 'verificacion_rechazada', 'verificacion', d.profileId, { motivo: d.motivo })

  // El rechazo tambien se avisa. Sin esto, quien no pasa se queda en "en
  // revision" para siempre, esperando un correo que nadie iba a mandar.
  await encolar({ perfil: d.profileId }, 'verificacion', { resultado: 'rechazada', motivo: d.motivo })
  return NextResponse.json({ estado: 'rechazada' })
}
