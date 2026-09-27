/**
 * Las fechas en la zona de la ciudad, esté donde esté el celular.
 *
 * Se ejecuta con TZ de Madrid y de UTC a propósito (ver `npm test`): el caso
 * real es alguien que vuelve con el teléfono aún en hora de allá, y el
 * servidor en Vercel corre en UTC.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { reglas } from '../src/reglas'
import { cuentaAtras } from '../src/texto/fechas'
import { ZONA_PRODUCTO, zonaDe } from '../src/texto/zona'

/** La cena abierta el 27-09: sábado 3 de octubre a las 20:00 en Caracas. */
const CENA = '2026-10-04T00:00:00+00:00'

test('la cena del sábado a las 20:00 de Caracas es sábado, con el reloj del celular donde sea', () => {
  // Esta prueba corre dos veces, con TZ de Madrid y de UTC: en esas zonas el
  // instante ya es domingo. diaDe (reglas.js, el de la web) no mira el reloj.
  assert.equal(reglas.diaDe(CENA), 'sábado')
  assert.equal(reglas.ZONA, 'America/Caracas')
})

test('la zona sale de la fecha si la trae, y si no, de un único sitio', () => {
  assert.equal(zonaDe({ zonaHoraria: 'Europe/Madrid' }), 'Europe/Madrid')
  assert.equal(zonaDe({}), ZONA_PRODUCTO)
  assert.equal(zonaDe(null), ZONA_PRODUCTO)
})

test('la cuenta atrás habla como la web', () => {
  const ahora = Date.parse('2026-10-01T20:00:00Z')
  assert.equal(cuentaAtras('2026-10-02T23:00:00Z', ahora), '1 día y 3 h')
  assert.equal(cuentaAtras('2026-10-06T20:00:00Z', ahora), '5 días y 0 h')
  assert.equal(cuentaAtras('2026-10-01T23:12:00Z', ahora), '3 h 12 min')
  assert.equal(cuentaAtras('2026-10-01T19:00:00Z', ahora), '0 h 0 min')
})

test('la hora y el cuándo se revela, calculados de la fecha real', async () => {
  const { cuandoSeRevela } = await import('../src/texto/fechas')
  const hora = (iso: string, _zona: string) => reglas.horaDe(iso)
  const REVELA = '2026-10-03T16:00:00+00:00' // 12:00 en Caracas
  assert.equal(hora(REVELA, 'America/Caracas'), '12:00 p.m.')
  assert.equal(hora(CENA, 'America/Caracas'), '8:00 p.m.')
  assert.equal(cuandoSeRevela({ empiezaEn: CENA, revelaEn: REVELA }), 'el sábado a las 12:00 p.m.')
  assert.equal(cuandoSeRevela({ empiezaEn: CENA }), 'el sábado')
  assert.equal(cuandoSeRevela(null), null)
  // Movida a un martes, dice martes sin tocar código (criterio 9.5).
  assert.equal(cuandoSeRevela({ empiezaEn: '2026-10-07T00:00:00+00:00' }), 'el martes')
})
