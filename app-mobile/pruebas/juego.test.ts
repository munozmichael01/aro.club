/**
 * El juego de la mesa (entrega 20): la ventana, el recorrido nuevo, el avance
 * guardado por mesa y que todos los teléfonos ven lo mismo. Los números
 * (preguntas por ronda, ventana) se leen de reglas.js: se ajustan allí y la
 * prueba los sigue.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/juego/maquina'
import { reglas } from '../src/reglas'

const J = reglas.JUEGO
const N = J.porRonda
const MESA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const CENA = '2026-10-10T23:00:00.000Z'
const t = (min: number) => Date.parse(CENA) + min * 60_000

test('la ventana sale de reglas.js (abreMin, cierraMin)', () => {
  assert.equal(M.ventana(CENA, t(J.abreMin - 1)), 'antes')
  assert.equal(M.ventana(CENA, t(J.abreMin)), 'abierto')
  assert.equal(M.ventana(CENA, t(J.cierraMin)), 'abierto')
  assert.equal(M.ventana(CENA, t(J.cierraMin + 1)), 'cerrado')
  assert.equal(M.ventana(null, t(0)), 'cerrado')
})

test('las mismas preguntas en todos los teléfonos de la mesa, y distintas entre rondas', () => {
  const r1 = M.preguntas(MESA, 1)
  assert.equal(r1.length, N)
  assert.deepEqual(M.preguntas(MESA, 1), r1)
  assert.deepEqual(reglas.preguntasDeRonda(MESA, J.rondas[1].clave), r1)
  const todas = J.rondas.flatMap((_, r) => M.preguntas(MESA, r))
  assert.equal(new Set(todas).size, N * J.rondas.length)
})

test('el recorrido: reglas → ronda 1 → «Ahora, a comer» → ronda 2 → pausa → ronda 3 → final', () => {
  let g = M.guardadoVacio()
  const pasos: string[] = [g.e.paso]
  const avanza = () => {
    g = M.siguiente(g, MESA)
    pasos.push(g.e.paso)
  }
  avanza() // primera pregunta
  for (let i = 1; i < N; i++) avanza()
  avanza() // fin de la ronda 1
  assert.equal(g.e.paso, 'finRonda1')
  assert.deepEqual(g.hechas, [true, false, false])
  assert.deepEqual(M.puntero(g), { ronda: 1, indice: 0 })
  g = M.seguirCon(g, 1)
  for (let i = 1; i < N; i++) avanza()
  avanza() // pausa antes de la 3
  assert.equal(g.e.paso, 'pausa')
  assert.equal(g.e.ronda, 2)
  g = M.seguirCon(g, 2)
  for (let i = 1; i < N; i++) avanza()
  avanza()
  assert.equal(g.e.paso, 'final')
  assert.deepEqual(g.hechas, [true, true, true])
  assert.equal(M.jugadas(g), 3)
  assert.equal(M.puntero(g), null)
})

test('«Terminar aquí» en la pausa: el final con dos rondas', () => {
  const g = M.terminar({ e: { paso: 'pausa', ronda: 2, indice: 0 }, hechas: [true, true, false], empezado: true })
  assert.equal(g.e.paso, 'final')
  assert.equal(M.jugadas(g), 2)
})

test('la tarjeta: Ir, n de 2 y Hecha; y «Seguir» retoma donde quedó', () => {
  let g = M.guardadoVacio()
  assert.deepEqual(M.estadoRonda(g, 0, MESA), { tipo: 'ir' })
  assert.equal(M.puntero(g), null)
  g = M.irARonda(g, 1)
  g = M.siguiente(g, MESA)
  assert.deepEqual(M.estadoRonda(g, 1, MESA), { tipo: 'ahora', n: 2, de: N })
  assert.deepEqual(M.puntero(g), { ronda: 1, indice: 1 })
  // Salir y volver con «Seguir»: la misma pregunta.
  const vuelta = M.entrar(g, 'seguir')
  assert.deepEqual(vuelta.e, { paso: 'pregunta', ronda: 1, indice: 1 })
  // Ir a la ronda que estaba a medias retoma; a otra, empieza por la primera.
  assert.deepEqual(M.irARonda(g, 1).e, { paso: 'pregunta', ronda: 1, indice: 1 })
  assert.deepEqual(M.irARonda(g, 2).e, { paso: 'pregunta', ronda: 2, indice: 0 })
})

test('saltar a la ronda 2 sin jugar la 1 lleva a la pausa al acabarla; con la 3 hecha, al final', () => {
  let g = M.irARonda(M.guardadoVacio(), 1)
  for (let i = 0; i < N; i++) g = M.siguiente(g, MESA)
  assert.equal(g.e.paso, 'pausa')
  let h = M.irARonda({ ...M.guardadoVacio(), hechas: [false, false, true], empezado: true }, 1)
  for (let i = 0; i < N; i++) h = M.siguiente(h, MESA)
  assert.equal(h.e.paso, 'final')
})

test('atrás: de la primera pregunta de la ronda 1 a las reglas; de otra ronda, a la anterior', () => {
  const r1 = M.atras(M.irARonda(M.guardadoVacio(), 0), MESA)
  assert.equal(r1.e.paso, 'reglas')
  const r2 = M.atras(M.irARonda(M.guardadoVacio(), 1), MESA)
  assert.deepEqual(r2.e, { paso: 'pregunta', ronda: 0, indice: N - 1 })
})

test('lo guardado roto o de la versión anterior empieza de cero', () => {
  assert.deepEqual(M.leer(null), M.guardadoVacio())
  assert.deepEqual(M.leer('2'), M.guardadoVacio())
  assert.deepEqual(M.leer('{roto'), M.guardadoVacio())
  const g = M.leer(JSON.stringify({ e: { paso: 'pregunta', ronda: 9, indice: 1 }, hechas: [true], empezado: true }))
  assert.equal(g.e.ronda, J.rondas.length - 1)
  assert.deepEqual(g.hechas, [true, false, false])
})

test('solo las cenas tienen juego', () => {
  assert.ok(M.hayJuego('dinner'))
  assert.ok(M.hayJuego('women_dinner'))
  assert.ok(!M.hayJuego('walk'))
  assert.ok(!M.hayJuego(null))
})
