import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Captación de la lista de espera desde la landing.
 *
 * Va con `service_role` a propósito: `waitlist` tiene RLS y no expone
 * ninguna política de inserción, así que nadie puede escribir en la tabla
 * desde el navegador. Todo pasa por aquí, que valida antes de escribir.
 *
 * Se llama dos veces:
 *   1. Al enviar el correo. Crea la fila y dice si ya existía.
 *   2. Al terminar el quiz. Completa las respuestas sobre esa misma fila.
 */

const ZONAS = [
  'las_mercedes', 'el_rosal', 'bello_monte', 'chacao', 'altamira',
  'la_castellana', 'los_palos_grandes', 'sebucan', 'chuao',
  'el_cafetal', 'los_naranjos', 'la_trinidad', 'el_hatillo',
] as const

const ARRAIGO = ['returnee', 'stayed', 'relocated', 'foreigner', 'visiting'] as const

// Gruesos a propósito: la landing pregunta cuatro cosas, no nueve (ver
// el comentario de la columna en la migración).
const FORMATOS = ['dinner', 'drinks', 'movement', 'coffee'] as const

const TEMAS = [
  'food', 'travel', 'film', 'music', 'books', 'sports',
  'entrepreneurship', 'art', 'ai', 'parenting',
] as const

const schema = z.object({
  email: z.string().trim().toLowerCase().min(5).max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  rootedness: z.enum(ARRAIGO).optional(),
  zones: z.array(z.enum(ZONAS)).max(3).optional(),
  formats: z.array(z.enum(FORMATOS)).max(4).optional(),
  conversationTopics: z.array(z.enum(TEMAS)).max(4).optional(),
  // Trampa para robots: es un campo oculto, una persona nunca lo rellena.
  website: z.string().max(0).optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    // El error del correo lo lee una persona; el resto solo puede fallar si
    // la landing manda un valor que no está en el catálogo, y eso es un bug
    // nuestro, no algo que el usuario pueda corregir.
    const esCorreo = parsed.error.issues.some((i) => i.path[0] === 'email')
    if (!esCorreo) {
      console.error('[waitlist] valor fuera de catálogo', parsed.error.issues)
    }
    return NextResponse.json(
      {
        error: esCorreo
          ? 'Ese correo no se ve completo. Revisa que tenga arroba y punto.'
          : 'Algo no cuadró de nuestro lado. Vuelve a intentarlo en un momento.',
      },
      { status: 400 },
    )
  }

  const { email, rootedness, zones, formats, conversationTopics } = parsed.data
  const supabase = createAdminClient()

  const { data: existente, error: errorLectura } = await supabase
    .from('waitlist')
    .select('id, quiz_completed_at')
    .eq('email', email)
    .maybeSingle()

  if (errorLectura) {
    console.error('[waitlist] lectura falló', errorLectura)
    return NextResponse.json(
      { error: 'No pudimos guardar tu correo. Inténtalo otra vez en un momento.' },
      { status: 500 },
    )
  }

  // Segunda llamada: la persona terminó el quiz.
  const traeRespuestas =
    rootedness !== undefined ||
    zones !== undefined ||
    formats !== undefined ||
    conversationTopics !== undefined

  if (traeRespuestas) {
    const { error } = await supabase
      .from('waitlist')
      .update({
        rootedness: rootedness ?? null,
        zones: zones ?? [],
        formats: formats ?? [],
        conversation_topics: conversationTopics ?? [],
        quiz_completed_at: new Date().toISOString(),
      })
      .eq('email', email)

    if (error) {
      console.error('[waitlist] actualización falló', error)
      return NextResponse.json(
        { error: 'No pudimos guardar tus respuestas.' },
        { status: 500 },
      )
    }

    return NextResponse.json({ status: 'completado' })
  }

  // Primera llamada: solo el correo.
  if (existente) {
    return NextResponse.json({
      status: 'repetido',
      quizCompletado: existente.quiz_completed_at !== null,
    })
  }

  const { error } = await supabase
    .from('waitlist')
    .insert({ email, source: 'landing' })

  if (error) {
    console.error('[waitlist] inserción falló', error)
    return NextResponse.json(
      { error: 'No pudimos guardar tu correo. Inténtalo otra vez en un momento.' },
      { status: 500 },
    )
  }

  return NextResponse.json({ status: 'nuevo' })
}
