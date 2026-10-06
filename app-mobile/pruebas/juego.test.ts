/** El juego de la mesa: la ventana, el recorrido y que todos los teléfonos ven lo mismo. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { atras, empezarEn, inicial, preguntas, siguiente, ventana, vista, type Estado } from '../src/juego/maquina'
import { reglas } from '../src/reglas'

const MESA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CENA = '2026-10-10T23:00:00.000Z'
const t = (min: number) => Date.parse(CENA) + min * 60_000

test('se abre media hora antes y se cierra cuatro horas después', () => {
  assert.equal(ventana(CENA, t(-31)), 'antes')
  assert.equal(ventana(CENA, t(-30)), 'abierto')
  assert.equal(ventana(CENA, t(240)), 'abierto')
  assert.equal(ventana(CENA, t(241)), 'cerrado')
  assert.equal(ventana(null, t(0)), 'cerrado')
})

test('las mismas cuatro preguntas en todos los teléfonos de la mesa, y distintas entre rondas', () => {
  const r1 = preguntas(MESA, 1)
  assert.equal(r1.length, 4)
  assert.deepEqual(preguntas(MESA, 1), r1)
  assert.deepEqual(reglas.preguntasDeRonda(MESA, 'lo-que-te-mueve'), r1)
  const todas = [0, 1, 2].flatMap((r) => preguntas(MESA, r))
  assert.equal(new Set(todas).size, 12)
})

test('el recorrido: reglas, 4 preguntas por ronda con su cambio, y el final', () => {
  let e: Estado = inicial
  const pasos: string[] = []
  for (let i = 0; i < 20 && e.paso !== 'final'; i++) {
    e = siguiente(e, MESA)
    pasos.push(e.paso === 'pregunta' ? `p${e.ronda}.${e.indice}` : e.paso)
  }
  assert.deepEqual(pasos, ['p0.0', 'p0.1', 'p0.2', 'p0.3', 'cambio', 'p1.0', 'p1.1', 'p1.2', 'p1.3', 'cambio', 'p2.0', 'p2.1', 'p2.2', 'p2.3', 'final'])
  assert.equal(vista(e, MESA).final, 'Hasta aquí el juego. Lo demás es suyo.')
})

test('atrás deshace el camino, y otro teléfono puede seguir en su ronda', () => {
  const fin: Estado = { paso: 'final', ronda: 2, indice: 3 }
  assert.deepEqual(atras(fin, MESA), { paso: 'pregunta', ronda: 2, indice: 3 })
  assert.deepEqual(atras({ paso: 'pregunta', ronda: 1, indice: 0 }, MESA), { paso: 'cambio', ronda: 1, indice: 0 })
  assert.deepEqual(atras({ paso: 'cambio', ronda: 1, indice: 0 }, MESA), { paso: 'pregunta', ronda: 0, indice: 3 })
  assert.deepEqual(atras({ paso: 'pregunta', ronda: 0, indice: 0 }, MESA), inicial)
  const otro = empezarEn(1)
  assert.equal(vista(otro, MESA).pregunta, preguntas(MESA, 1)[0])
  assert.equal(vista(otro, MESA).ronda.titulo, reglas.JUEGO.rondas[1].titulo)
})
