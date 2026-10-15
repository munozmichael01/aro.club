/**
 * El guion de la mesa: los momentos de una cena, con la hora real de ESA mesa
 * (Michael, 14-10). Sustituye al anfitrión que no podemos pagar: lo ve toda la
 * mesa, y la propia mesa elige a «la voz de Aro», que lo va leyendo. No hay
 * anfitrión elegido por el servidor (se descartó el 14-10: demasiado lío).
 *
 * Genérico a propósito: nada de horas fijas ni de bares. Las horas salen de
 * `empiezaEn` y de `cierraMesaEn` (lo que el restaurante nos deja la mesa);
 * si el servidor no lo manda, la mesa dura `DURACION_POR_DEFECTO`. Otro
 * formato (brunch, café) reutiliza esto con sus propios momentos.
 */

const MIN = 60_000

/** Si el restaurante no nos dijo cuánto nos deja la mesa: dos horas. */
export const DURACION_POR_DEFECTO = 120

/** Más de tres horas no es lo que dura una mesa: es la hora de cierre del local. */
export const MAX_MESA = 180

export type Momento = 'llegada' | 'voz' | 'pedir' | 'vuelta' | 'hielo' | 'tema' | 'cuenta' | 'despedida'
export type Paso = { momento: Momento; en: string }

/** Los momentos del juego: se quitan si la mesa no tiene juego. */
export const DEL_JUEGO: Momento[] = ['hielo', 'tema']

/** Los momentos, con su hora. Sin `empiezaEn` válido, no hay guion. */
export function pasos(empiezaEn: string | null | undefined, cierraMesaEn?: string | null): Paso[] {
  const t = empiezaEn ? Date.parse(empiezaEn) : NaN
  if (!Number.isFinite(t)) return []
  const c = cierraMesaEn ? Date.parse(cierraMesaEn) : NaN
  // `cierraMesaEn` sale de `restaurants.last_seating` (la última hora a la que el
  // sitio sienta gente, 15-10): para una cena es la mesa real, pero para un
  // brunch de las once daría once horas. Fuera de 1 h 30 – 3 h, no es una mesa.
  const fin = Number.isFinite(c) && c >= t + 90 * MIN && c <= t + MAX_MESA * MIN ? c : t + DURACION_POR_DEFECTO * MIN
  const iso = (ms: number) => new Date(ms).toISOString()
  return [
    { momento: 'llegada', en: iso(t) },
    // A los 15 minutos se pide, falte quien falte (con los creadores, el 10-10, se esperó con hambre).
    { momento: 'voz', en: iso(t + 15 * MIN) },
    { momento: 'pedir', en: iso(t + 15 * MIN) },
    { momento: 'vuelta', en: iso(t + 20 * MIN) },
    // El juego en dos tiempos: la ronda ligera mientras llega la comida, y el rescate cuando baja la conversación.
    { momento: 'hielo', en: iso(t + 35 * MIN) },
    { momento: 'tema', en: iso(t + 60 * MIN) },
    { momento: 'cuenta', en: iso(fin - 30 * MIN) },
    { momento: 'despedida', en: iso(fin) },
  ]
}

/**
 * La hora del momento en curso: la del último que ya empezó. Va por hora y no
 * por índice porque dos momentos pueden compartirla (la voz y pedir). Antes de
 * la cena, null.
 */
export function enCurso(ps: Paso[], ahora: number): string | null {
  let en: string | null = null
  for (const p of ps) if (Date.parse(p.en) <= ahora) en = p.en
  return en
}

export type MomentoCena = 'antes' | 'curso' | 'terminada'

/**
 * En qué punto está la cena (entrega 20): antes de la hora, en curso, o
 * terminada desde la despedida. Decide el sello de la tarjeta y qué tarjeta
 * se abre al entrar.
 */
export function momentoDeCena(ps: Paso[], ahora: number): MomentoCena {
  if (!ps.length || ahora < Date.parse(ps[0].en)) return 'antes'
  const fin = ps[ps.length - 1]
  return ahora >= Date.parse(fin.en) ? 'terminada' : 'curso'
}

/** «7:30 p.m.» → «7:30»: en la columna de horas del paso a paso no cabe el sufijo. */
export const sinSufijo = (hora: string) => hora.replace(/\s*[ap]\.\s?m\.$/i, '').trim()
