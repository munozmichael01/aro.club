import type { PreguntaPuerta } from '../reglas'

/**
 * Las cuatro preguntas de la puerta.
 *
 * Salen de `reglas.js` (`PUERTA` y `ORDEN_PUERTA`), el mismo sitio del que
 * las saca la web: textos, códigos, mínimos y topes, una vez para las dos
 * (decisión del 27-09). Las opciones van como pares [texto, código], nunca en
 * dos listas emparejadas por posición. Las zonas no están ahí: vienen de
 * `/api/zonas`, que son las activas.
 *
 * El catálogo (`/api/questions`) sigue siendo el de las diecisiete del
 * cuestionario; `comprobar-cuestionario.mjs` vigila que la puerta no invente
 * códigos que la base no tenga.
 */

/** La forma de una pregunta del catálogo. La usa el cuestionario (y los datos, para el género). */
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
  etiqueta: string
  enunciado: string
  ayuda: string | null
  unica: boolean
  opciones: { valor: string; label: string }[]
  min: number
  max: number | null
}

export type Zona = { slug: string; nombre: string }

/**
 * De `PUERTA` y las zonas activas a las preguntas, en el orden de
 * `ORDEN_PUERTA`. `null` si falta alguna, trae un tipo que la app no sabe
 * pintar o se queda sin opciones: mejor no enseñar la pregunta que enseñar
 * una que no se puede contestar bien (PROPUESTA §e.1).
 */
export function preguntasDeEntrada(puerta: Record<string, PreguntaPuerta>, orden: string[], zonas: Zona[]): Pregunta[] | null {
  const salida: Pregunta[] = []
  for (const clave of orden) {
    const p = puerta[clave]
    if (!p || (p.tipo !== 'unica' && p.tipo !== 'multi')) return null
    const opciones =
      clave === 'zonas' ? zonas.map((z) => ({ valor: z.slug, label: z.nombre })) : p.opciones.map(([label, valor]) => ({ valor, label }))
    if (!opciones.length) return null
    const unica = p.tipo === 'unica'
    salida.push({
      clave,
      etiqueta: p.etiqueta,
      enunciado: p.pregunta,
      ayuda: p.ayuda ?? null,
      unica,
      opciones,
      min: unica ? 1 : Math.max(1, p.min ?? 1),
      max: unica ? 1 : (p.max ?? null),
    })
  }
  return salida
}
