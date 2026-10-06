/**
 * El juego de la mesa: la ventana, el recorrido y que todos los teléfonos ven
 * lo mismo. Los números (preguntas por ronda, ventana) se leen de reglas.js:
 * se ajustan allí y la prueba los sigue.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { atras, empezarEn, inicial, preguntas, siguiente, ventana, vista, type Estado } from '../src/juego/maquina'
import { reglas } from '../src/reglas'

const J = reglas.JUEGO
const N = J.porRonda
const MESA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CENA = '2026-10-10T23:00:00.000Z'
const t = (min: number) => Date.parse(CENA) + min * 60_000

test('la ventana sale de reglas.js (abreMin, cierraMin)', () => {
  assert.equal(ventana(CENA, t(J.abreMin - 1)), 'antes')
  assert.equal(ventana(CENA, t(J.abreMin)), 'abierto')
  assert.equal(ventana(CENA, t(J.cierraMin)), 'abierto')
  assert.equal(ventana(CENA, t(J.cierraMin + 1)), 'cerrado')
  assert.equal(ventana(null, t(0)), 'cerrado')
})

test('las mismas preguntas en todos los teléfonos de la mesa, y distintas entre rondas', () => {
  const r1 = preguntas(MESA, 1)
  assert.equal(r1.length, N)
  assert.deepEqual(preguntas(MESA, 1), r1)
  assert.deepEqual(reglas.preguntasDeRonda(MESA, J.rondas[1].clave), r1)
  const todas = J.rondas.flatMap((_, r) => preguntas(MESA, r))
  assert.equal(new Set(todas).size, N * J.rondas.length)
})

test('el recorrido: reglas, N preguntas por ronda con su cambio, y el final', () => {
  let e: Estado = inicial
  const pasos: string[] = []
  for (let i = 0; i < 50 && e.paso !== 'final'; i++) {
    e = siguiente(e, MESA)
    pasos.push(e.paso === 'pregunta' ? `p${e.ronda}.${e.indice}` : e.paso)
  }
  const esperado = J.rondas.flatMap((_, r) => [...(r ? ['cambio'] : []), ...Array.from({ length: N }, (_, i) => `p${r}.${i}`)])
  assert.deepEqual(pasos, [...esperado, 'final'])
  assert.equal(vista(e, MESA).final, J.final)
})

test('atrás deshace el camino, y otro teléfono puede seguir en su ronda', () => {
  const ult = J.rondas.length - 1
  assert.deepEqual(atras({ paso: 'final', ronda: ult, indice: N - 1 }, MESA), { paso: 'pregunta', ronda: ult, indice: N - 1 })
  assert.deepEqual(atras({ paso: 'pregunta', ronda: 1, indice: 0 }, MESA), { paso: 'cambio', ronda: 1, indice: 0 })
  assert.deepEqual(atras({ paso: 'cambio', ronda: 1, indice: 0 }, MESA), { paso: 'pregunta', ronda: 0, indice: N - 1 })
  assert.deepEqual(atras({ paso: 'pregunta', ronda: 0, indice: 0 }, MESA), inicial)
  const otro = empezarEn(1)
  assert.equal(vista(otro, MESA).pregunta, preguntas(MESA, 1)[0])
  assert.equal(vista(otro, MESA).ronda.titulo, J.rondas[1].titulo)
})
