/**
 * Las cuatro preguntas de la entrada, sacadas del catálogo (`/api/questions`).
 *
 * El catálogo es el autoritativo: trae cada opción con su CÓDIGO, así que la
 * app guarda por código por construcción. La portada web las tiene escritas
 * a mano en dos listas —textos y códigos— emparejadas por posición, que es
 * justo la trampa que ya corrompió respuestas en el cuestionario.
 */

export type OpcionCatalogo = { valor: string | null; label: string }

export type PreguntaCatalogo = {
  clave: string
  enunciado: string
  ayuda: string | null
  tipo: 'single' | 'multi' | string
  opciones: OpcionCatalogo[]
  min: number | null
  max: number | null
}

export type Pregunta = {
  clave: string
  enunciado: string
  ayuda: string | null
  unica: boolean
  opciones: { valor: string; label: string }[]
  min: number
  max: number | null
}

/** El orden de la entrada, el del pedido: arraigo, zonas, días y temas. */
export const CLAVES_ENTRADA = ['arraigo', 'zonas', 'dias', 'temas'] as const

/**
 * Del catálogo a las cuatro preguntas. Devuelve `null` si falta alguna o
 * trae un tipo que la app no sabe pintar: mejor no enseñar la pregunta que
 * enseñar una que no se puede guardar bien (PROPUESTA §e.1).
 */
export function preguntasDeEntrada(catalogo: { preguntas: PreguntaCatalogo[] }): Pregunta[] | null {
  const salida: Pregunta[] = []
  for (const clave of CLAVES_ENTRADA) {
    const p = catalogo.preguntas.find((x) => x.clave === clave)
    if (!p || (p.tipo !== 'single' && p.tipo !== 'multi')) return null
    salida.push({
      clave,
      enunciado: p.enunciado,
      ayuda: p.ayuda,
      unica: p.tipo === 'single',
      // Una opción sin código es, a propósito, «no es una respuesta» (hoy
      // «Cualquier zona de la ciudad» en el cuestionario). Aquí no hay
      // ninguna; si apareciera, no se ofrece antes de saber qué hace.
      opciones: p.opciones.filter((o): o is { valor: string; label: string } => typeof o.valor === 'string'),
      min: p.tipo === 'single' ? 1 : Math.max(1, p.min ?? 1),
      max: p.tipo === 'single' ? 1 : p.max,
    })
  }
  return salida
}
