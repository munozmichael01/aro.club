/**
 * «Cómo funciona», sin React: qué tarjetas, con qué voz y qué foto. Fotos
 * solo en cena: las que hay son de noche (entrega como-funciona).
 */

import { reglas } from '../reglas'
import * as T from '../texto/como'
import * as F from '../texto/fechas'

export type Plan = { formato?: string | null; empiezaEn?: string | null; revelaEn?: string | null; zonaHoraria?: string | null }
export type Tarjeta = { clave: 'antes' | 'durante' | 'despues'; etiqueta: string; titulo: string; cuerpo: string }

/** Cuándo se revela, dicho en frase: vive en `texto/fechas.ts`, el único sitio que escribe días. */
export const cuandoSeSabe = F.cuandoSeRevelaPlan

export function vista(p: Plan) {
  const formato = p.formato ?? 'dinner'
  const esMesa = reglas.vozDe(formato).unidad !== 'grupo'
  const conFotos = reglas.DE_CENA.includes(formato)
  const voz = reglas.vozDe(formato) as unknown as Record<string, string>
  // El mismo criterio que la web: `tipoDe` de reglas.js.
  const tipo: T.Tipo = T.tipoDe(formato)
  const tarjetas: Tarjeta[] = T.tarjetas(tipo, cuandoSeSabe(p)).map((t) => ({ clave: t.clave, titulo: t.titulo, cuerpo: t.cuerpo, etiqueta: T.etiquetas[t.clave] }))
  return { tarjetas, conFotos, esMesa, tipo, miMesa: voz.mia ?? 'Mi mesa' }
}

/** Se abre sola una vez (HANDOFF). En el teléfono hasta que el servidor lo guarde en la cuenta. */
export const CLAVE_VISTA = 'como-funciona:visto'
