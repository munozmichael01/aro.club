import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * El catálogo del cuestionario, leído de la versión activa.
 *
 * Es la única autoridad sobre qué preguntas existen y qué códigos admite
 * cada una. Nada de listas paralelas en el código: si la landing y el
 * servidor tuvieran cada uno su copia, tarde o temprano divergen y el error
 * no falla, guarda la respuesta equivocada en silencio.
 */

export type OpcionCat = { valor: string; label: string }

export type PreguntaCat = {
  clave: string
  enunciado: string
  ayuda: string | null
  tipo: 'single' | 'multi' | 'text'
  opciones: OpcionCat[]
  min: number | null
  max: number | null
  obligatoria: boolean
  /** Código que se excluye con el resto: marcarlo desmarca los demás. */
  exclusiva: string | null
  layout: string | null
  autocomplete: string[] | null
  pantalla: number
}

export type Catalogo = {
  version: string
  preguntas: PreguntaCat[]
  /** Índice por clave, para validar sin recorrer. */
  porClave: Map<string, PreguntaCat>
}

type FilaOpcion = { value: string; label: string }

// El cuestionario cambia cuando operaciones lo cambia, no en cada request.
const TTL_MS = 60_000
let cache: { en: number; dato: Catalogo } | null = null

export async function leerCatalogo(): Promise<Catalogo | null> {
  const ahora = Date.now()
  if (cache && ahora - cache.en < TTL_MS) return cache.dato

  const supabase = createAdminClient()

  const { data: version } = await supabase
    .from('questionnaire_versions')
    .select('id, version')
    .eq('is_active', true)
    .maybeSingle()

  if (!version) return null

  const { data, error } = await supabase
    .from('questions')
    // En una sola cadena literal: concatenar rompe la inferencia de tipos
    // de Supabase y todo el resultado degrada a error genérico.
    .select('key, prompt, help_text, input_type, options, min_select, max_select, is_required, exclusive_value, layout, autocomplete, screen, sort_order')
    .eq('version_id', version.id)
    .order('screen')
    .order('sort_order')

  if (error || !data) return null

  const preguntas: PreguntaCat[] = data.map((q) => ({
    clave: q.key,
    enunciado: q.prompt,
    ayuda: q.help_text,
    tipo: q.input_type as PreguntaCat['tipo'],
    opciones: ((q.options ?? []) as FilaOpcion[]).map((o) => ({ valor: o.value, label: o.label })),
    min: q.min_select,
    max: q.max_select,
    obligatoria: q.is_required,
    exclusiva: q.exclusive_value,
    layout: q.layout,
    autocomplete: (q.autocomplete ?? null) as string[] | null,
    pantalla: q.screen,
  }))

  const dato: Catalogo = {
    version: version.version,
    preguntas,
    porClave: new Map(preguntas.map((p) => [p.clave, p])),
  }
  cache = { en: ahora, dato }
  return dato
}

/** Devuelve el problema encontrado, o null si la respuesta es válida. */
export function validar(pregunta: PreguntaCat, valor: unknown): string | null {
  if (pregunta.tipo === 'text') {
    if (typeof valor !== 'string') return `${pregunta.clave}: se esperaba texto`
    if (valor.length > 120) return `${pregunta.clave}: texto demasiado largo`
    return null
  }

  const lista = Array.isArray(valor) ? valor : [valor]
  if (lista.some((v) => typeof v !== 'string')) {
    return `${pregunta.clave}: los valores tienen que ser códigos`
  }

  if (pregunta.tipo === 'single' && lista.length > 1) {
    return `${pregunta.clave}: admite una sola respuesta`
  }
  if (pregunta.max && lista.length > pregunta.max) {
    return `${pregunta.clave}: máximo ${pregunta.max}`
  }
  if (pregunta.min && lista.length > 0 && lista.length < pregunta.min) {
    return `${pregunta.clave}: mínimo ${pregunta.min}`
  }

  const validos = new Set(pregunta.opciones.map((o) => o.valor))
  for (const v of lista as string[]) {
    if (!validos.has(v)) return `${pregunta.clave}: código fuera de catálogo (${v})`
  }

  // La exclusiva no convive con nada: o va sola, o no va.
  if (pregunta.exclusiva && lista.length > 1 && lista.includes(pregunta.exclusiva)) {
    return `${pregunta.clave}: "${pregunta.exclusiva}" no se combina con otras`
  }
  return null
}

/** Valida un conjunto clave→valor. Lista vacía si todo cuadra. */
export function validarConjunto(
  respuestas: Record<string, unknown>,
  catalogo: Catalogo,
): string[] {
  const problemas: string[] = []
  for (const [clave, valor] of Object.entries(respuestas)) {
    const pregunta = catalogo.porClave.get(clave)
    if (!pregunta) {
      problemas.push(`clave desconocida: ${clave}`)
      continue
    }
    const problema = validar(pregunta, valor)
    if (problema) problemas.push(problema)
  }
  return problemas
}
