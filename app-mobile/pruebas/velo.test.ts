/**
 * El suelo del velo: medio segundo, ni menos (parpadeo) ni más (espera de
 * más). El porqué está en `src/diseno/Velo.tsx`.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { tiempo } from '../src/diseno/tokens'
import { esperaParaLevantar } from '../src/diseno/velo-tiempo'

const SUELO = tiempo.veloMinimo

test('el suelo es de medio segundo', () => {
  assert.equal(SUELO, 500)
})

test('una respuesta a los 120 ms espera hasta los 500', () => {
  assert.equal(esperaParaLevantar(0, 120, SUELO), 380)
})

test('una respuesta instantánea espera el medio segundo entero', () => {
  assert.equal(esperaParaLevantar(1000, 1000, SUELO), 500)
})

test('justo en el suelo se levanta al momento', () => {
  assert.equal(esperaParaLevantar(0, 500, SUELO), 0)
})

test('una respuesta lenta no espera ni un milisegundo más', () => {
  assert.equal(esperaParaLevantar(0, 1500, SUELO), 0)
})

test('el tope va por encima del suelo', () => {
  assert.ok(tiempo.veloTope > tiempo.veloMinimo)
})
