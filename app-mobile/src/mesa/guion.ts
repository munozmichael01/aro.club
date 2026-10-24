import { reglas, type PasoDeLaMesa } from '../reglas'

/**
 * El guion de la mesa: los momentos de una cena con la hora real de ESA mesa
 * (Michael, 14-10). Desde el 15-10 vive en `reglas.js` (`AroReglas.GUION`,
 * `pasosDeLaMesa`), que pinta también la web: un solo guion, una sola cuenta
 * de horas. Aquí solo se adapta a la app.
 *
 * La mesa dura dos horas, siempre (Michael, 15-10).
 */

export const DURACION_POR_DEFECTO = reglas.GUION.duracionDeLaMesa

export type Momento = 'llegada' | 'pedir' | 'vuelta' | 'hielo' | 'tema' | 'cuenta' | 'despedida'
export type Paso = PasoDeLaMesa & { momento: Momento }

/** Los momentos de la mesa con su hora y su texto ya puestos. Sin `empiezaEn` válido, no hay guion. */
export function pasos(empiezaEn: string | null | undefined, zona?: string | null): Paso[] {
  return reglas.pasosDeLaMesa(empiezaEn, zona ?? null).map((p) => ({ ...p, momento: p.clave as Momento }))
}

/**
 * La hora del momento en curso: la del último que ya empezó. Va por hora y no
 * por índice porque dos momentos pueden compartirla (la voz y pedir). Antes de
 * la cena, null.
 */
export function enCurso(ps: Paso[], ahora: number): string | null {
  const i = reglas.enCursoDeLaMesa(ps, ahora)
  return i < 0 ? null : ps[i].en
}

export type MomentoCena = 'antes' | 'curso' | 'terminada'

/** Antes de la hora, en curso, o terminada desde la despedida: el sello y qué tarjeta se abre. */
export const momentoDeCena = (ps: Paso[], ahora: number): MomentoCena => reglas.momentoDeLaMesa(ps, ahora)

/** «7:30 p.m.» → «7:30»: en la columna de horas del paso a paso no cabe el sufijo. */
export const sinSufijo = (hora: string) => reglas.horaCorta(hora)
