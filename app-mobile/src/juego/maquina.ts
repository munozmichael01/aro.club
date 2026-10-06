import { reglas } from '../reglas'

/**
 * El juego de la mesa, sin React (mazo y reglas: JUEGO.md, aprobado por
 * Michael el 05-10-2026). El mazo, la ventana y el orden de las preguntas
 * viven en `reglas.js` (`AroReglas.JUEGO`, `preguntasDeRonda`): la app y la
 * web leen lo mismo, y todos los teléfonos de la mesa ven las mismas
 * preguntas en el mismo orden. Aquí solo va el recorrido.
 *
 * Nadie pasa su teléfono: quien lleva el juego lo lleva en el suyo, y otra
 * persona puede seguir desde el suyo en la ronda que toca (`empezarEn`).
 */

const MIN = 60_000

export type Ventana = 'antes' | 'abierto' | 'cerrado'

/** Se abre `abreMin` antes de la cena y se cierra `cierraMin` después. */
export function ventana(empiezaEn: string | null | undefined, ahora: number): Ventana {
  const t = empiezaEn ? Date.parse(empiezaEn) : NaN
  if (!Number.isFinite(t)) return 'cerrado'
  if (ahora < t + reglas.JUEGO.abreMin * MIN) return 'antes'
  if (ahora > t + reglas.JUEGO.cierraMin * MIN) return 'cerrado'
  return 'abierto'
}

export type Paso = 'reglas' | 'pregunta' | 'cambio' | 'final'
export type Estado = { paso: Paso; ronda: number; indice: number }

export const inicial: Estado = { paso: 'reglas', ronda: 0, indice: 0 }

/** Para seguir desde otro teléfono: directamente en una ronda, sin repetir las reglas. */
export const empezarEn = (ronda: number): Estado => ({ paso: 'pregunta', ronda: Math.max(0, Math.min(ronda, reglas.JUEGO.rondas.length - 1)), indice: 0 })

export const preguntas = (mesaId: string, ronda: number) => reglas.preguntasDeRonda(mesaId, ronda)

export function siguiente(e: Estado, mesaId: string): Estado {
  if (e.paso === 'reglas') return { paso: 'pregunta', ronda: 0, indice: 0 }
  if (e.paso === 'cambio') return { paso: 'pregunta', ronda: e.ronda, indice: 0 }
  if (e.paso === 'final') return e
  const total = preguntas(mesaId, e.ronda).length
  if (e.indice + 1 < total) return { ...e, indice: e.indice + 1 }
  const otra = e.ronda + 1
  return otra < reglas.JUEGO.rondas.length ? { paso: 'cambio', ronda: otra, indice: 0 } : { paso: 'final', ronda: e.ronda, indice: e.indice }
}

export function atras(e: Estado, mesaId: string): Estado {
  if (e.paso === 'reglas') return e
  if (e.paso === 'final') return { paso: 'pregunta', ronda: e.ronda, indice: preguntas(mesaId, e.ronda).length - 1 }
  if (e.paso === 'cambio') return { paso: 'pregunta', ronda: e.ronda - 1, indice: preguntas(mesaId, e.ronda - 1).length - 1 }
  if (e.indice > 0) return { ...e, indice: e.indice - 1 }
  return e.ronda > 0 ? { paso: 'cambio', ronda: e.ronda, indice: 0 } : { paso: 'reglas', ronda: 0, indice: 0 }
}

/** Lo que pinta la pantalla en cada paso. */
export function vista(e: Estado, mesaId: string) {
  const r = reglas.JUEGO.rondas[e.ronda]
  const lista = preguntas(mesaId, e.ronda)
  return {
    ronda: { numero: e.ronda + 1, total: reglas.JUEGO.rondas.length, titulo: r?.titulo ?? '', bajada: r?.bajada ?? '' },
    pregunta: e.paso === 'pregunta' ? lista[e.indice] ?? '' : null,
    posicion: { actual: e.indice + 1, total: lista.length },
    reglas: reglas.JUEGO.reglas,
    final: reglas.JUEGO.final,
  }
}
