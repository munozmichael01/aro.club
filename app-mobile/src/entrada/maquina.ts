import type { Pregunta } from './preguntas'

/**
 * La entrada como máquina de estados: las mismas cinco fases que la portada
 * web (correo → enviando → quiz → final, o repetido), sin React, para
 * probarla en Node.
 *
 * Las respuestas se guardan por CÓDIGO (`valor` del catálogo), nunca por
 * posición.
 */

export type Fase = 'correo' | 'enviando' | 'quiz' | 'guardando' | 'final' | 'repetido'

export type Estado = {
  fase: Fase
  correo: string
  error: string
  paso: number
  respuestas: Record<string, string[]>
}

export const inicial = (correo = ''): Estado => ({ fase: 'correo', correo, error: '', paso: 0, respuestas: {} })

export type Accion =
  | { tipo: 'escribir'; correo: string }
  | { tipo: 'enviar' }
  | { tipo: 'guardado'; repetido: boolean }
  | { tipo: 'fallo'; error: string }
  | { tipo: 'marcar'; pregunta: Pregunta; valor: string }
  | { tipo: 'siguiente'; total: number }
  | { tipo: 'atras' }
  | { tipo: 'terminar' }
  | { tipo: 'terminado' }
  | { tipo: 'falloAlTerminar'; error: string }
  | { tipo: 'reiniciar' }

export function marcadas(e: Estado, clave: string): string[] {
  return e.respuestas[clave] ?? []
}

/** Si la pregunta ya deja seguir: una en las de una sola, el mínimo en las demás. */
export function completa(e: Estado, p: Pregunta): boolean {
  return marcadas(e, p.clave).length >= p.min
}

/** Si una opción no marcada queda fuera por el tope. Se atenúa, no se esconde. */
export function enTope(e: Estado, p: Pregunta, valor: string): boolean {
  const sel = marcadas(e, p.clave)
  return !p.unica && p.max != null && sel.length >= p.max && !sel.includes(valor)
}

export function reducir(e: Estado, a: Accion): Estado {
  switch (a.tipo) {
    case 'escribir':
      return { ...e, correo: a.correo, error: '' }
    case 'enviar':
      return { ...e, fase: 'enviando', error: '' }
    case 'guardado':
      return { ...e, fase: a.repetido ? 'repetido' : 'quiz', paso: 0 }
    case 'fallo':
      return { ...e, fase: 'correo', error: a.error }
    case 'marcar': {
      const p = a.pregunta
      const sel = marcadas(e, p.clave)
      let nueva: string[]
      if (p.unica) nueva = [a.valor]
      else if (sel.includes(a.valor)) nueva = sel.filter((v) => v !== a.valor)
      else if (p.max != null && sel.length >= p.max) return e
      else nueva = [...sel, a.valor]
      return { ...e, error: '', respuestas: { ...e.respuestas, [p.clave]: nueva } }
    }
    case 'siguiente':
      return { ...e, paso: Math.min(a.total - 1, e.paso + 1) }
    case 'atras':
      return { ...e, paso: Math.max(0, e.paso - 1), error: '' }
    case 'terminar':
      return { ...e, fase: 'guardando', error: '' }
    case 'terminado':
      return { ...e, fase: 'final' }
    case 'falloAlTerminar':
      return { ...e, fase: 'quiz', error: a.error }
    case 'reiniciar':
      return inicial()
  }
}

/**
 * Lo que se manda a `/api/lead` al terminar: cada respuesta por su código.
 * `arraigo` va suelto porque es de una sola; las demás, como lista.
 */
export function cuerpoDeRespuestas(e: Estado, token: string | null) {
  return {
    correo: e.correo.trim(),
    // Obligatorio desde el 27-09: sin él, 403.
    ...(token ? { token } : {}),
    arraigo: marcadas(e, 'arraigo')[0] ?? null,
    zonas: marcadas(e, 'zonas'),
    dias: marcadas(e, 'dias'),
    temas: marcadas(e, 'temas'),
  }
}
