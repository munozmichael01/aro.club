import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'

/**
 * Preguntas del bloque de perfil, leídas de la versión activa.
 *
 * El brief lo exige así: render dinámico desde `questions`, nada
 * hardcodeado. Añadir o reordenar una pregunta es una fila en la base, no
 * un despliegue, y elimina de raíz que la landing y el catálogo se
 * desincronicen.
 */

/** Ya se preguntan en el quiz corto de la landing. */
const EN_EL_QUIZ_CORTO = ['rootedness', 'zones', 'formats', 'conversation_topics']

/**
 * El quiz solo sabe pintar opciones. `employer` es texto libre, así que se
 * queda fuera y se pregunta al crear la cuenta — que además es su sitio
 * natural: pedir dónde trabajas antes de que alguien tenga cuenta es
 * invasivo y se paga en abandono.
 */
const RENDERIZABLES = ['single', 'multi']

type Opcion = { value: string; label: string; help?: string }

export async function GET() {
  const supabase = await createClient()

  const { data: version, error: errorVersion } = await supabase
    .from('questionnaire_versions')
    .select('id, version')
    .eq('is_active', true)
    .maybeSingle()

  if (errorVersion || !version) {
    console.error('[questions] no hay versión activa', errorVersion)
    return NextResponse.json({ error: 'No hay cuestionario activo.' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('questions')
    .select('key, prompt, help_text, input_type, options, min_select, max_select, is_required, screen, sort_order')
    .eq('version_id', version.id)
    .in('input_type', RENDERIZABLES)
    .not('key', 'in', `(${EN_EL_QUIZ_CORTO.join(',')})`)
    .order('screen')
    .order('sort_order')

  if (error) {
    console.error('[questions] lectura falló', error)
    return NextResponse.json({ error: 'No pudimos cargar las preguntas.' }, { status: 500 })
  }

  const preguntas = (data ?? []).map((q) => ({
    clave: q.key,
    pregunta: q.prompt,
    ayuda: q.help_text,
    tipo: q.input_type === 'single' ? 'unica' : 'multi',
    opciones: ((q.options ?? []) as Opcion[]).map((o) => ({ valor: o.value, label: o.label })),
    min: q.min_select,
    max: q.max_select,
    obligatoria: q.is_required,
  }))

  return NextResponse.json(
    { version: version.version, preguntas },
    // Cambia solo cuando operaciones toca el cuestionario.
    { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } },
  )
}
