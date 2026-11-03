/**
 * «Cómo funciona», sin React: qué tarjetas, con qué voz y qué panel.
 */

import { reglas, type FechaPlan } from '../reglas'
import * as T from '../texto/como'
import * as F from '../texto/fechas'

export type Plan = FechaPlan & { formato?: string | null; empiezaEn?: string | null; revelaEn?: string | null; zonaHoraria?: string | null }
export type Tarjeta = { clave: 'antes' | 'durante' | 'despues'; etiqueta: string; titulo: string; cuerpo: string; panel: string; colorIcono: string; iconoPlan: string; marca: string }

/** Cuándo se revela, dicho en frase: vive en `texto/fechas.ts`, el único sitio que escribe días. */
export const cuandoSeSabe = F.cuandoSeRevelaPlan

/**
 * Las tres de ESTA fecha, con lo que cambian sus marcas (entrega «Qué estás
 * reservando», B): `tarjetasDe` de reglas.js, la misma que la web. Sin fotos:
 * cada tarjeta lleva su panel de color y el icono del plan en grande.
 */
export function vista(p: Plan) {
  const formato = p.formato ?? 'dinner'
  const esMesa = reglas.vozDe(formato).unidad !== 'grupo'
  const voz = reglas.vozDe(formato) as unknown as Record<string, string>
  const plan = reglas.COMO_FUNCIONA.planDe(formato)
  const tarjetas: Tarjeta[] = reglas.COMO_FUNCIONA.tarjetasDe({ ...p, formato }, cuandoSeSabe(p)).map((t) => ({
    clave: t.clave,
    titulo: t.titulo,
    cuerpo: t.cuerpo,
    etiqueta: T.etiquetas[t.clave],
    panel: t.panel ?? '#14342A',
    colorIcono: t.colorIcono ?? '#FAF3E4',
    iconoPlan: t.iconoPlan ?? reglas.ICONOS_PLAN[plan],
    marca: t.marca,
  }))
  return { tarjetas, esMesa, plan, miMesa: voz.mia ?? 'Mi mesa' }
}

/**
 * Si el plan tiene tarjetas. Desde el 02-11 las tienen los cinco (drinks y
 * coffee incluidos): antes unos drinks abrían las de una cena y la app se
 * cerraba buscando una foto que no existía (31-10).
 */
export function tieneComoFunciona(formato: string | null | undefined): boolean {
  return !!reglas.COMO_FUNCIONA.planDe(formato ?? 'dinner')
}

/** Se abre sola una vez (HANDOFF). En el teléfono hasta que el servidor lo guarde en la cuenta. */
export const CLAVE_VISTA = 'como-funciona:visto'
