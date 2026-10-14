/** El guion de la mesa: horas de cada momento y el momento en curso. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DURACION_POR_DEFECTO, enCurso, pasos } from '../src/mesa/guion'

const EMPIEZA = '2026-10-16T23:30:00Z' // 7:30 p.m. en Caracas
const hora = (p: ReturnType<typeof pasos>, m: string) => p.find((x) => x.momento === m)!.en

test('los momentos, en orden y con la hora de esa mesa (la tabla aprobada el 14-10)', () => {
  const p = pasos(EMPIEZA)
  assert.deepEqual(p.map((x) => x.momento), ['llegada', 'voz', 'pedir', 'vuelta', 'hielo', 'tema', 'cuenta', 'despedida'])
  assert.equal(hora(p, 'voz'), '2026-10-16T23:45:00.000Z') // 7:45
  assert.equal(hora(p, 'pedir'), '2026-10-16T23:45:00.000Z') // 7:45
  assert.equal(hora(p, 'vuelta'), '2026-10-16T23:50:00.000Z') // 7:50
  assert.equal(hora(p, 'hielo'), '2026-10-17T00:05:00.000Z') // 8:05
  assert.equal(hora(p, 'tema'), '2026-10-17T00:30:00.000Z') // 8:30
  assert.equal(hora(p, 'cuenta'), '2026-10-17T01:00:00.000Z') // 9:00
  assert.equal(hora(p, 'despedida'), '2026-10-17T01:30:00.000Z') // 9:30
  assert.equal(DURACION_POR_DEFECTO, 120)
})

test('si el restaurante nos da hasta una hora, la cuenta y la despedida la siguen', () => {
  const p = pasos(EMPIEZA, '2026-10-17T02:00:00Z') // 10:00 p.m.
  assert.equal(hora(p, 'despedida'), '2026-10-17T02:00:00.000Z')
  assert.equal(hora(p, 'cuenta'), '2026-10-17T01:30:00.000Z')
})

test('un cierre de menos de hora y media se ignora: la cuenta no puede ir antes del rescate', () => {
  const p = pasos(EMPIEZA, '2026-10-17T00:30:00Z')
  assert.equal(Date.parse(hora(p, 'despedida')) - Date.parse(EMPIEZA), DURACION_POR_DEFECTO * 60_000)
})

test('sin hora no hay guion; dos momentos a la misma hora están en curso a la vez', () => {
  assert.deepEqual(pasos(null), [])
  const p = pasos(EMPIEZA)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) - 60_000), null)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) + 16 * 60_000), '2026-10-16T23:45:00.000Z')
})
