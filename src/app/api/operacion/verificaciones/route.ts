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

/**
 * Hasta qué momento se miró.
 *
 * Es la hora de la foto más nueva que la cola tenía CUANDO SE PINTÓ. Si
 * mientras tanto llega otra, el servidor lo ve y no deja decidir.
 *
 * Pasó de verdad el 12-10: a Daniel Castro se le rechazó por «selfie
 * borrosa» CINCO SEGUNDOS después de que llegara su selfie, desde una vista
 * que solo tenía la cédula. Nadie la vio; el rechazo se la llevó por delante
 * igual, porque el update va por `profile_id` y pilla todas sus filas
 * pendientes. Con Aghata Quintero iba a pasar lo mismo tres minutos después.
 *
 * Obligatorio a propósito. Sin él no hay forma de saber si quien decide está
 * mirando lo que hay ahora o una foto de hace diez minutos, y una pestaña
 * vieja es justo el caso que esto viene a cortar.
 */
const vistoHasta = z
  .string()
  .datetime({ offset: true })
  .describe('la foto más nueva que se vio')

const decision = z.discriminatedUnion('accion', [
  z.object({
    accion: z.literal('aprobar'),
    profileId: z.string().uuid(),
    // Opcionales, y con eso se arregla un fallo que dejó la cola muerta: el
    // panel manda solo `accion` y `profileId` —no tiene las dos casillas—
    // así que exigirlas aquí hacía que TODA aprobación se cayera con un 400.
    // Michael aprobó una y las dos filas siguieron en `pending`.
    //
    // Ausente se guarda como null, que no es lo mismo que `false`: la ficha
    // del miembro ya distingue «Nombre y edad coincidían» de «Sin comprobar
    // todavía». Escribir `true` por defecto sería dejar dicho que alguien
    // comprobó algo que nadie comprobó, y ese registro es justo el que se
    // mira cuando algo sale mal.
    nombreCoincide: z.boolean().optional(),
    edadCoincide: z.boolean().optional(),
    vistoHasta,
  }),
  z.object({
    accion: z.literal('rechazar'),
    profileId: z.string().uuid(),
    motivo: z.string().min(1),
    nota: z.string().max(500).optional(),
    vistoHasta,
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

  /**
   * Las fotos que VALEN, que no son solo las pendientes.
   *
   * Esto pedía `status = 'pending'` y nada más, y por eso la cola enseñaba
   * «Sin cédula» de gente que la tenía subida: a Daniela Esis se le había
   * APROBADO la cédula y tenía la selfie pendiente, así que la cola la
   * enseñaba sin documento con el que compararla, mientras su ficha la
   * enseñaba perfectamente. La misma foto, dos pantallas, dos respuestas.
   *
   * Vale la ÚLTIMA de cada tipo que no esté caducada ni rechazada: es lo
   * mismo que mira la ficha. Una persona que repite la foto deja la vieja
   * como `expired`, y emparejar con esa es enseñar la que ya no cuenta.
   */
  const { data: fotos } = await admin
    .from('verifications')
    .select('profile_id, kind, storage_path, created_at, status')
    .in('profile_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    .not('status', 'in', '(expired,rejected)')
    .order('created_at', { ascending: true })

  // La última de cada tipo, y solo esa. Firmar también las viejas sería una
  // llamada a Storage por foto repetida para enseñar la que no cuenta.
  const vigente = new Map<string, { storage_path: string | null; created_at: string }>()
  for (const f of fotos ?? []) {
    if (!f.profile_id) continue
    const k = `${f.profile_id}:${f.kind}`
    const previa = vigente.get(k)
    if (!previa || f.created_at > previa.created_at) {
      vigente.set(k, { storage_path: f.storage_path, created_at: f.created_at })
    }
  }

  // Una firma por foto, cinco minutos.
  const firmadas = new Map<string, string>()
  for (const [k, f] of vigente) {
    if (!f.storage_path) continue
    const { data } = await admin.storage
      .from('verificaciones')
      .createSignedUrl(f.storage_path, 300)
    if (data?.signedUrl) firmadas.set(k, data.signedUrl)
  }

  // La foto más nueva de cada persona, que es «hasta dónde se miró». Vuelve
  // en la decisión y el servidor la compara con lo que haya entonces: si
  // entre medias llegó otra, no se decide.
  const ultimaFoto = new Map<string, string>()
  for (const f of fotos ?? []) {
    if (!f.profile_id || !f.created_at) continue
    const previa = ultimaFoto.get(f.profile_id)
    if (!previa || f.created_at > previa) ultimaFoto.set(f.profile_id, f.created_at)
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
      // Con una sola foto no se decide: la otra puede estar subiéndose en
      // este momento, que es como se rechazó una selfie cinco segundos
      // después de que llegara.
      completa:
        !!firmadas.get(`${c.profile_id}:id_document`) && !!firmadas.get(`${c.profile_id}:selfie`),
      vistoHasta: c.profile_id ? (ultimaFoto.get(c.profile_id) ?? null) : null,
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
    // Casi siempre es un panel viejo, de antes de que `vistoHasta` existiera.
    // Decirle que recargue es más útil que «petición inválida».
    return NextResponse.json(
      { error: 'Recarga el panel: esta vista es de una versión anterior.', motivo: 'recarga' },
      { status: 400 },
    )
  }

  const admin = createAdminClient()
  const d = parsed.data
  const ahora = new Date().toISOString()

  // --- lo que hay AHORA, que no tiene por qué ser lo que se miró ---------
  //
  // Las dos comprobaciones de aquí abajo nacen del mismo rechazo: el update
  // va por `profile_id` y se lleva TODAS las filas pendientes, así que
  // decidir con una vista incompleta o vieja resuelve fotos que nadie abrió.
  // Las que VALEN, con el mismo criterio que la cola y que la ficha: la
  // última de cada tipo que no esté caducada ni rechazada.
  //
  // Pedía solo las `pending`, y eso bloqueaba un caso real: a Daniela Esis
  // se le había aprobado la cédula y le quedaba la selfie, así que «faltan
  // las dos fotos» decía que le faltaba la cédula que ya estaba aprobada, y
  // su selfie no se podía resolver desde el panel.
  const { data: suyas } = await admin
    .from('verifications')
    .select('kind, created_at, status')
    .eq('profile_id', d.profileId)
    .not('status', 'in', '(expired,rejected)')
    .order('created_at', { ascending: true })

  const vigentes = new Map<string, string>()
  for (const v of suyas ?? []) vigentes.set(v.kind, v.created_at)

  // 1 · Con una sola foto no se decide. La otra puede estar subiéndose.
  if (!vigentes.has('id_document') || !vigentes.has('selfie')) {
    const falta = !vigentes.has('selfie') ? 'la selfie' : 'la cédula'
    return NextResponse.json(
      {
        error: vigentes.size
          ? `Todavía falta ${falta}. No se decide con una sola foto.`
          : 'Esta verificación ya no está pendiente. Recarga el panel.',
        motivo: 'incompleta',
      },
      { status: 409 },
    )
  }

  // 2 · Y si llegó algo después de pintarse la cola, tampoco: lo que se
  //     estaba mirando ya no es lo que se va a resolver.
  const masNueva = [...vigentes.values()]
    .map((t) => new Date(t).getTime())
    .reduce((a, b) => Math.max(a, b), 0)

  if (masNueva > new Date(d.vistoHasta).getTime()) {
    return NextResponse.json(
      {
        error: 'Llegó una foto nueva después de que abrieras esto. Recarga y míralas otra vez.',
        motivo: 'recarga',
      },
      { status: 409 },
    )
  }

  if (d.accion === 'aprobar') {
    // Las dos comprobaciones se guardan aunque sean `true`: si dentro de un
    // mes hay un problema, la pregunta es si alguien miró, no si aprobó.
    const { error } = await admin
      .from('verifications')
      .update({
        status: 'approved',
        reviewed_by: actor,
        reviewed_at: ahora,
        name_matches: d.nombreCoincide ?? null,
        age_confirmed: d.edadCoincide ?? null,
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
      await encolar({ perfil: d.profileId }, 'verificacion', {})
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
  await encolar({ perfil: d.profileId }, 'verificacion_rechazada', { motivo: d.motivo })
  return NextResponse.json({ estado: 'rechazada' })
}
