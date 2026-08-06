import { NextResponse } from 'next/server'
import { z } from 'zod'

import { firmar } from '@/lib/lead-token'
import { leerCatalogo, validarConjunto } from '@/lib/questionnaire/catalogo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Captación de la landing, en dos tiempos (HANDOFF §2.2).
 *
 *   1. `{ correo, ciudad }` al validar el correo, ANTES de la primera
 *      pregunta. Es el guardado que salva a quien abandona en la dos.
 *   2. `{ correo, arraigo, zonas, dias, temas }` al terminar las cuatro.
 *
 * Va con `service_role`: `waitlist` tiene RLS sin política de inserción, así
 * que nadie escribe en la tabla desde el navegador.
 */

const CORREO = z
  .string()
  .trim()
  .toLowerCase()
  .min(5)
  .max(254)
  .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)

const paso1 = z.object({
  correo: CORREO,
  ciudad: z.string().regex(/^[a-z-]+$/).optional(),
  // Campo oculto: una persona nunca lo rellena.
  website: z.string().max(0).optional(),
})

const paso2 = paso1.extend({
  arraigo: z.string().nullable().optional(),
  zonas: z.array(z.string()).optional(),
  dias: z.array(z.string()).optional(),
  temas: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = paso2.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ese correo no se ve completo. Revisa que tenga arroba y punto.' },
      { status: 400 },
    )
  }

  const { correo, ciudad, arraigo, zonas, dias, temas } = parsed.data
  const supabase = createAdminClient()

  const traeRespuestas =
    arraigo !== undefined || zonas !== undefined || dias !== undefined || temas !== undefined

  // --- Paso 2: las cuatro preguntas -----------------------------------
  if (traeRespuestas) {
    const catalogo = await leerCatalogo()
    if (!catalogo) {
      return NextResponse.json({ error: 'No pudimos validar tus respuestas.' }, { status: 500 })
    }

    const aValidar: Record<string, unknown> = {}
    if (arraigo) aValidar.arraigo = arraigo
    if (zonas?.length) aValidar.zonas = zonas
    if (dias?.length) aValidar.dias = dias
    if (temas?.length) aValidar.temas = temas

    const problemas = validarConjunto(aValidar, catalogo)
    if (problemas.length) {
      console.error('[lead] respuestas fuera de catálogo', problemas)
      return NextResponse.json({ error: 'No pudimos guardar tus respuestas.' }, { status: 400 })
    }

    // Solo se escribe lo que viene. Con `?? []` un guardado parcial vaciaba
    // las otras tres respuestas en silencio.
    const cambios: Record<string, unknown> = { quiz_completed_at: new Date().toISOString() }
    // El código de arraigo y la etiqueta del enum son el mismo valor: el
    // enum se renombró al contrato justo para no traducir aquí.
    if (arraigo !== undefined) cambios.rootedness = arraigo
    if (zonas !== undefined) cambios.zones = zonas
    if (dias !== undefined) cambios.days = dias
    if (temas !== undefined) cambios.conversation_topics = temas

    const { error } = await supabase
      .from('waitlist')
      .update(cambios as never)
      .eq('email', correo)

    if (error) {
      console.error('[lead] no se guardaron las respuestas', error)
      return NextResponse.json({ error: 'No pudimos guardar tus respuestas.' }, { status: 500 })
    }

    return NextResponse.json({ estado: 'completado' })
  }

  // --- Paso 1: correo y ciudad ----------------------------------------
  const ciudadFinal = ciudad ?? 'caracas'

  const { data: ciudadValida } = await supabase
    .from('cities')
    .select('slug')
    .eq('slug', ciudadFinal)
    .maybeSingle()

  if (!ciudadValida) {
    return NextResponse.json({ error: 'Esa ciudad no está en la lista.' }, { status: 400 })
  }

  const { data: existente, error: errorLectura } = await supabase
    .from('waitlist')
    .select('id, quiz_completed_at, profile_completed_at')
    .eq('email', correo)
    .maybeSingle()

  if (errorLectura) {
    console.error('[lead] lectura falló', errorLectura)
    return NextResponse.json(
      { error: 'No pudimos guardar tu correo. Inténtalo otra vez en un momento.' },
      { status: 500 },
    )
  }

  if (existente) {
    // Correo ya registrado no es un error (§3.8). Se actualiza la ciudad por
    // si volvió desde otra, y se le dice por dónde va.
    await supabase.from('waitlist').update({ city: ciudadFinal }).eq('email', correo)
    return NextResponse.json({
      estado: 'repetido',
      token: firmar(correo),
      quizCompletado: existente.quiz_completed_at !== null,
      perfilCompletado: existente.profile_completed_at !== null,
    })
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ email: correo, city: ciudadFinal, source: 'landing' })

  if (error) {
    console.error('[lead] inserción falló', error)
    return NextResponse.json(
      { error: 'No pudimos guardar tu correo. Inténtalo otra vez en un momento.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ estado: 'nuevo', token: firmar(correo) })
}
