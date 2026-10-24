import { reglas } from '../reglas'

/**
 * El juego de la mesa, sin React. El mazo y las rondas viven en `reglas.js`
 * (`AroReglas.JUEGO`, `preguntasDeRonda`): la app y la web leen lo mismo, y
 * todos los teléfonos de la mesa ven las mismas preguntas en el mismo orden.
 * Aquí solo va el recorrido.
 *
 * Entrega 20 (Design, 15-10-2026): reglas → preguntas en orden → fin de la
 * ronda 1 (que devuelve al paso a paso) → pausa antes de la ronda 3, con
 * «Terminar aquí» → final. Sin selector de rondas dentro del juego: para
 * saltar se usa la tarjeta de Mi mesa, que puede ir a cualquier ronda.
 *
 * El avance se guarda por mesa en ESE teléfono (`Guardado`): lo lleva una sola
 * persona y no se sincroniza.
 */

const MIN = 60_000

export type Ventana = 'antes' | 'abierto' | 'cerrado'

/**
 * Se abre en `abreMin` y se cierra en `cierraMin` (minutos respecto al
 * inicio). Desde la entrega 20 la tarjeta ya no depende de esto —el juego
 * está disponible en cuanto la mesa se abre—, pero la ventana sigue siendo la
 * idea compartida de cuándo se da una cena por terminada.
 */
export function ventana(empiezaEn: string | null | undefined, ahora: number): Ventana {
  const t = empiezaEn ? Date.parse(empiezaEn) : NaN
  if (!Number.isFinite(t)) return 'cerrado'
  if (ahora < t + reglas.JUEGO.abreMin * MIN) return 'antes'
  if (ahora > t + reglas.JUEGO.cierraMin * MIN) return 'cerrado'
  return 'abierto'
}

/** Es solo para las cenas por ahora (entrega 18): café y movimiento tendrán su versión. */
/** El juego va con la Mi mesa completa: las cenas y el brunch (Michael, 24-10: «juego sí»). */
export const hayJuego = (formato: string | null | undefined) => reglas.tieneMesaCompleta(formato)

export const preguntas = (mesaId: string, ronda: number) => reglas.preguntasDeRonda(mesaId, ronda)

export const RONDAS = () => reglas.JUEGO.rondas.length

export type Paso = 'reglas' | 'pregunta' | 'finRonda1' | 'pausa' | 'final'
export type Estado = { paso: Paso; ronda: number; indice: number }

/** Lo que se guarda en el teléfono: dónde quedó y qué rondas se hicieron. */
export type Guardado = { e: Estado; hechas: boolean[]; empezado: boolean }

export const inicial: Estado = { paso: 'reglas', ronda: 0, indice: 0 }
export const guardadoVacio = (): Guardado => ({ e: inicial, hechas: Array(RONDAS()).fill(false), empezado: false })

const pregunta = (ronda: number, indice = 0): Estado => ({ paso: 'pregunta', ronda, indice })

/** Pasa a un estado nuevo y anota lo que eso supone (ronda hecha, juego empezado). */
function con(g: Guardado, e: Estado, hecha?: number): Guardado {
  const hechas = [...g.hechas]
  if (hecha != null) hechas[hecha] = true
  return { e, hechas, empezado: g.empezado || e.paso === 'pregunta' }
}

/** «Siguiente»: la próxima pregunta, o lo que viene al acabar la ronda. */
export function siguiente(g: Guardado, mesaId: string): Guardado {
  const { e } = g
  if (e.paso === 'reglas') return con(g, pregunta(0))
  if (e.paso !== 'pregunta') return g
  if (e.indice + 1 < preguntas(mesaId, e.ronda).length) return con(g, pregunta(e.ronda, e.indice + 1))
  const ultima = RONDAS() - 1
  // La ronda 1 devuelve a la mesa: «Ahora, a comer.».
  if (e.ronda === 0) return con(g, { paso: 'finRonda1', ronda: 0, indice: 0 }, 0)
  // La última se pregunta, no se impone (si no está hecha ya).
  if (e.ronda === ultima - 1 && !g.hechas[ultima]) return con(g, { paso: 'pausa', ronda: ultima, indice: 0 }, e.ronda)
  return con(g, { paso: 'final', ronda: e.ronda, indice: 0 }, e.ronda)
}

/** «Atrás»: la pregunta anterior; desde la primera, las reglas o la ronda anterior. */
export function atras(g: Guardado, mesaId: string): Guardado {
  const { e } = g
  if (e.paso !== 'pregunta') return g
  if (e.indice > 0) return con(g, pregunta(e.ronda, e.indice - 1))
  if (e.ronda === 0) return { ...g, e: inicial }
  return con(g, pregunta(e.ronda - 1, Math.max(0, preguntas(mesaId, e.ronda - 1).length - 1)))
}

/** Ir a una ronda desde la tarjeta o desde «¿Ya empezaron?». Si es la que estaba a medias, retoma. */
export function irARonda(g: Guardado, ronda: number): Guardado {
  const r = Math.max(0, Math.min(ronda, RONDAS() - 1))
  const p = puntero(g)
  return con(g, p && p.ronda === r ? pregunta(r, p.indice) : pregunta(r))
}

/** «Seguir con la ronda n» desde el fin de la ronda 1 o desde la pausa. */
export const seguirCon = (g: Guardado, ronda: number) => con(g, pregunta(ronda))

/** «Terminar aquí»: el final sin jugar la última. */
export const terminar = (g: Guardado): Guardado => con(g, { paso: 'final', ronda: g.e.ronda, indice: 0 })

/** Dónde retomaría el botón «Seguir», o null si no hay avance o ya terminó. */
export function puntero(g: Guardado): { ronda: number; indice: number } | null {
  if (!g.empezado) return null
  const { e } = g
  if (e.paso === 'pregunta') return { ronda: e.ronda, indice: e.indice }
  if (e.paso === 'finRonda1') return { ronda: 1, indice: 0 }
  if (e.paso === 'pausa') return { ronda: e.ronda, indice: 0 }
  if (e.paso === 'reglas') return { ronda: 0, indice: 0 }
  return null
}

export const terminado = (g: Guardado) => g.e.paso === 'final'

/** Rondas jugadas, para el final («Dos rondas» si se terminó antes). */
export const jugadas = (g: Guardado) => Math.max(1, g.hechas.filter(Boolean).length)

export type EstadoRonda = { tipo: 'ir' | 'hecha' | 'ahora'; n?: number; de?: number }

/** El estado de cada ronda en la tarjeta: «Ir», «Hecha» o «n de 2». */
export function estadoRonda(g: Guardado, ronda: number, mesaId: string): EstadoRonda {
  if (g.hechas[ronda]) return { tipo: 'hecha' }
  if (g.empezado && g.e.paso === 'pregunta' && g.e.ronda === ronda) {
    return { tipo: 'ahora', n: g.e.indice + 1, de: preguntas(mesaId, ronda).length }
  }
  return { tipo: 'ir' }
}

/** Cómo se abre el juego desde Mi mesa (`/juego?ir=`). */
export type Entrada = 'empezar' | 'seguir' | `ronda-${number}`

export function entrar(g: Guardado, ir: string | undefined): Guardado {
  if (ir && ir.startsWith('ronda-')) return irARonda(g, Number(ir.slice(6)) || 0)
  if (ir === 'seguir') {
    const p = puntero(g)
    return p ? con(g, pregunta(p.ronda, p.indice)) : { ...g, e: inicial }
  }
  // «Empezar la ronda 1»: las reglas primero.
  return { ...g, e: inicial }
}

/** Lo guardado, leído con cuidado: un formato viejo o roto empieza de cero. */
export function leer(crudo: string | null): Guardado {
  try {
    const g = crudo ? (JSON.parse(crudo) as Guardado) : null
    const pasos: Paso[] = ['reglas', 'pregunta', 'finRonda1', 'pausa', 'final']
    if (!g || !g.e || !pasos.includes(g.e.paso) || !Array.isArray(g.hechas)) return guardadoVacio()
    const n = RONDAS()
    const hechas = Array.from({ length: n }, (_, i) => !!g.hechas[i])
    const ronda = Math.max(0, Math.min(Number(g.e.ronda) || 0, n - 1))
    return { e: { paso: g.e.paso, ronda, indice: Math.max(0, Number(g.e.indice) || 0) }, hechas, empezado: !!g.empezado }
  } catch {
    return guardadoVacio()
  }
}

/** La clave por mesa. «v2» porque la entrega 20 cambió lo que se guarda. */
export const CLAVE = (mesa: string) => `aro.juego.v2.${mesa}`
