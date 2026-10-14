/** El guion de la noche: horas de cada momento y el paso en curso. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DURACION_POR_DEFECTO, enCurso, pasos } from '../src/mesa/guion'

const EMPIEZA = '2026-10-16T23:30:00Z' // 7:30 p.m. en Caracas

test('cinco momentos, con la hora de esa mesa', () => {
  const p = pasos(EMPIEZA)
  assert.deepEqual(p.map((x) => x.momento), ['llegada', 'pedir', 'juego', 'ultima', 'cierre'])
  assert.equal(p[1].en, '2026-10-16T23:45:00.000Z')
  assert.equal(Date.parse(p[4].en) - Date.parse(EMPIEZA), DURACION_POR_DEFECTO * 60_000)
})

test('si el restaurante nos da hasta una hora, el cierre y la última ronda la siguen', () => {
  const p = pasos(EMPIEZA, '2026-10-17T02:00:00Z') // 10:00 p.m.
  assert.equal(p[4].en, '2026-10-17T02:00:00.000Z')
  assert.equal(p[3].en, '2026-10-17T01:30:00.000Z')
})

test('un cierre absurdo (antes de una hora) se ignora', () => {
  const p = pasos(EMPIEZA, '2026-10-16T23:40:00Z')
  assert.equal(Date.parse(p[4].en) - Date.parse(EMPIEZA), DURACION_POR_DEFECTO * 60_000)
})

test('sin hora no hay guion; antes de la cena no hay paso en curso', () => {
  assert.deepEqual(pasos(null), [])
  const p = pasos(EMPIEZA)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) - 60_000), -1)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) + 20 * 60_000), 1)
})
