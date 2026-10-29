/** El guion de la mesa (reglas.js desde el 15-10): horas, textos y el momento en curso. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { DURACION_POR_DEFECTO, enCurso, momentoDeCena, pasos, sinSufijo } from '../src/mesa/guion'

const EMPIEZA = '2026-10-16T23:30:00Z' // 7:30 p.m. en Caracas
const ZONA = 'America/Caracas'
const hora = (p: ReturnType<typeof pasos>, m: string) => p.find((x) => x.momento === m)!.en

test('los momentos, en orden y con la hora de esa mesa (la tabla aprobada el 14-10)', () => {
  const p = pasos(EMPIEZA, ZONA)
  assert.deepEqual(p.map((x) => x.momento), ['llegada', 'pedir', 'vuelta', 'hielo', 'tema', 'cuenta', 'despedida'])
  assert.deepEqual(p.map((x) => sinSufijo(x.hora)), ['7:30', '7:45', '7:50', '8:05', '8:30', '9:00', '9:30'])
  assert.equal(DURACION_POR_DEFECTO, 120)
})

test('la mesa dura dos horas, siempre: la despedida a +120 y la cuenta a +90', () => {
  const p = pasos(EMPIEZA, ZONA)
  assert.equal(Date.parse(hora(p, 'despedida')) - Date.parse(EMPIEZA), 120 * 60_000)
  assert.equal(Date.parse(hora(p, 'cuenta')) - Date.parse(EMPIEZA), 90 * 60_000)
})

test('los textos salen de reglas.js con el límite puesto, y los dos del juego con su botón', () => {
  const p = pasos(EMPIEZA, ZONA)
  assert.equal(p[0].texto, 'Pidan algo de tomar si quieren. Esperamos a todos hasta las 7:45.')
  assert.equal(p.find((x) => x.momento === 'hielo')!.botonJuego, 'Abrir el juego') // sin rondas desde las temáticas (f14740d)
  assert.equal(p.find((x) => x.momento === 'tema')!.botonJuego, 'Seguir el juego')
  assert.equal(p.find((x) => x.momento === 'pedir')!.botonJuego, '')
})

test('sin hora no hay guion; dos momentos a la misma hora están en curso a la vez', () => {
  assert.deepEqual(pasos(null), [])
  const p = pasos(EMPIEZA, ZONA)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) - 60_000), null)
  assert.equal(enCurso(p, Date.parse(EMPIEZA) + 16 * 60_000), '2026-10-16T23:45:00.000Z')
})

test('el momento de la cena: antes, en curso y terminada desde la despedida', () => {
  const p = pasos(EMPIEZA, ZONA)
  assert.equal(momentoDeCena(p, Date.parse(EMPIEZA) - 1), 'antes')
  assert.equal(momentoDeCena(p, Date.parse(EMPIEZA)), 'curso')
  assert.equal(momentoDeCena(p, Date.parse(hora(p, 'despedida'))), 'terminada')
  assert.equal(sinSufijo('7:30 p.m.'), '7:30')
  assert.equal(sinSufijo('12:05 a.m.'), '12:05')
})
