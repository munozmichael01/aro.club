import { NextResponse } from 'next/server'
import { z } from 'zod'

import { verificar } from '@/lib/lead-token'
import { leerCatalogo, validar } from '@/lib/questionnaire/catalogo'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Guardado incremental del cuestionario, pregunta a pregunta.
 *
 * El contrato pide por pregunta y no por pantalla (HANDOFF §2.4): quien
 * responde tres de las cuatro de una pantalla y cierra, no pierde las tres.
 *
 * GET devuelve lo guardado más lo que se hereda de la landing, para que la
 * pantalla sepa qué esconder y dónde retomar.
 */

const CORREO = z.string().trim().toLowerCase().email().max(254)

/** Las cuatro de la landing viven en columnas propias, no en el jsonb. */
const HEREDABLES = ['arraigo', 'zonas', 'dias', 'temas'] as const

type FilaLead = {
  rootedness: string | null
  zones: string[] | null
  days: string[] | null
  conversation_topics: string[] | null
  profile_answers: Record<string, unknown> | null
  questionnaire_screen: number
  profile_completed_at: string | null
}

function heredadasDe(fila: FilaLead): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  if (fila.rootedness) out.arraigo = fila.rootedness
  if (fila.zones?.length) out.zonas = fila.zones
  if (fila.days?.length) out.dias = fila.days
  if (fila.conversation_topics?.length) out.temas = fila.conversation_topics
  return out
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const correoCrudo = url.searchParams.get('correo')
  const token = url.searchParams.get('token')

  const parsed = CORREO.safeParse(correoCrudo)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
  }
  const correo = parsed.data

  if (!verificar(correo, token)) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('waitlist')
    .select('rootedness, zones, days, conversation_topics, profile_answers, questionnaire_screen, profile_completed_at')
    .eq('email', correo)
    .maybeSingle<FilaLead>()

  if (error) {
    console.error('[cuestionario] lectura falló', error)
    return NextResponse.json({ error: 'No pudimos recuperar tus respuestas.' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const heredadas = heredadasDe(data)

  return NextResponse.json({
    respuestas: { ...heredadas, ...(data.profile_answers ?? {}) },
    // Cuáles vienen de la landing: el cuestionario las esconde y lo avisa.
    heredadas: Object.keys(heredadas),
    pantalla: data.questionnaire_screen,
    completado: data.profile_completed_at !== null,
  })
}

const cuerpo = z.object({
  correo: CORREO,
  token: z.string().min(1),
  clave: z.string().min(1).max(40),
  valor: z.union([z.string(), z.array(z.string()), z.null()]),
  /** Pantalla en la que está, para poder retomar. */
  pantalla: z.number().int().min(0).max(4).optional(),
  /** Marca el final; a partir de ahí el cuestionario está completo. */
  fin: z.boolean().optional(),
})

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 })
  }

  const parsed = cuerpo.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Petición inválida.' }, { status: 400 })
  }

  const { correo, token, clave, valor, pantalla, fin } = parsed.data

  if (!verificar(correo, token)) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const catalogo = await leerCatalogo()
  if (!catalogo) {
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  const pregunta = catalogo.porClave.get(clave)
  if (!pregunta) {
    return NextResponse.json({ error: `Pregunta desconocida: ${clave}` }, { status: 400 })
  }

  // Un valor a medias es válido mientras se responde: el mínimo solo se
  // exige al cerrar, no en cada tecla.
  if (valor !== null) {
    const problema = validar(pregunta, valor)
    if (problema) {
      console.error('[cuestionario] respuesta inválida', problema)
      return NextResponse.json({ error: 'Esa respuesta no cuadra.' }, { status: 400 })
    }
  }

  const supabase = createAdminClient()

  const { data: actual, error: errorLectura } = await supabase
    .from('waitlist')
    .select('profile_answers, questionnaire_screen')
    .eq('email', correo)
    .maybeSingle<{ profile_answers: Record<string, unknown> | null; questionnaire_screen: number }>()

  if (errorLectura || !actual) {
    return NextResponse.json({ error: 'Sesión no válida.' }, { status: 403 })
  }

  const respuestas = { ...(actual.profile_answers ?? {}) }

  // Las cuatro de la landing tienen columna propia: se escriben ahí para que
  // el panel y el matcher las vean donde esperan, no duplicadas en el jsonb.
  const enColumna: Record<string, unknown> = {}
  if ((HEREDABLES as readonly string[]).includes(clave)) {
    if (clave === 'arraigo') enColumna.rootedness = valor
    if (clave === 'zonas') enColumna.zones = valor ?? []
    if (clave === 'dias') enColumna.days = valor ?? []
    if (clave === 'temas') enColumna.conversation_topics = valor ?? []
    delete respuestas[clave]
  } else if (valor === null) {
    delete respuestas[clave]
  } else {
    respuestas[clave] = valor
  }

  const { error } = await supabase
    .from('waitlist')
    .update({
      ...enColumna,
      profile_answers: respuestas as never,
      questionnaire_screen: Math.max(pantalla ?? 0, actual.questionnaire_screen),
      ...(fin ? { profile_completed_at: new Date().toISOString() } : {}),
    })
    .eq('email', correo)

  if (error) {
    console.error('[cuestionario] no se guardó', error)
    return NextResponse.json({ error: 'No pudimos guardar tu respuesta.' }, { status: 500 })
  }

  return NextResponse.json({ estado: 'guardado' })
}
