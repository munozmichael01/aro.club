/**
 * El guion de la noche: los momentos de una cena, con la hora real de ESA
 * mesa (Michael, 14-10). Sustituye al anfitrión que no podemos pagar: lo ve
 * toda la mesa, y quien lo lleva (`anfitrion` del servidor) lo tiene destacado.
 *
 * Genérico a propósito: nada de horas fijas ni de bares. Las horas salen de
 * `empiezaEn` y de `cierraMesaEn` (lo que el restaurante nos deja la mesa);
 * si el servidor no lo manda, la mesa dura `DURACION_POR_DEFECTO`.
 */

const MIN = 60_000

/** Si el restaurante no nos dijo cuánto nos deja la mesa: dos horas y media. */
export const DURACION_POR_DEFECTO = 150

export type Momento = 'llegada' | 'pedir' | 'juego' | 'ultima' | 'cierre'
export type Paso = { momento: Momento; en: string }

/** Los cinco momentos, con su hora. Sin `empiezaEn` válido, no hay guion. */
export function pasos(empiezaEn: string | null | undefined, cierraMesaEn?: string | null): Paso[] {
  const t = empiezaEn ? Date.parse(empiezaEn) : NaN
  if (!Number.isFinite(t)) return []
  const c = cierraMesaEn ? Date.parse(cierraMesaEn) : NaN
  const fin = Number.isFinite(c) && c > t + 60 * MIN ? c : t + DURACION_POR_DEFECTO * MIN
  const iso = (ms: number) => new Date(ms).toISOString()
  return [
    { momento: 'llegada', en: iso(t) },
    { momento: 'pedir', en: iso(t + 15 * MIN) },
    { momento: 'juego', en: iso(t + 30 * MIN) },
    { momento: 'ultima', en: iso(fin - 30 * MIN) },
    { momento: 'cierre', en: iso(fin) },
  ]
}

/** El paso en curso: el último que ya empezó. Antes de la cena, ninguno (-1). */
export function enCurso(ps: Paso[], ahora: number): number {
  let i = -1
  ps.forEach((p, k) => {
    if (Date.parse(p.en) <= ahora) i = k
  })
  return i
}
