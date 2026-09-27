/**
 * Las fechas en la zona de la ciudad, esté donde esté el celular.
 *
 * Se ejecuta con TZ de Madrid y de UTC a propósito (ver `npm test`): el caso
 * real es alguien que vuelve con el teléfono aún en hora de allá, y el
 * servidor en Vercel corre en UTC.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { cuentaAtras, nombreDia } from '../src/texto/fechas'
import { ZONA_PRODUCTO, zonaDe } from '../src/texto/zona'

/** La cena abierta el 27-09: sábado 3 de octubre a las 20:00 en Caracas. */
const CENA = '2026-10-04T00:00:00+00:00'

test('la cena del sábado a las 20:00 de Caracas es sábado, con el reloj del celular donde sea', () => {
  assert.equal(nombreDia(CENA, 'America/Caracas'), 'sábado')
})

test('en la zona de Madrid ese instante ya es domingo: por eso nunca se usa la del celular', () => {
  assert.equal(nombreDia(CENA, 'Europe/Madrid'), 'domingo')
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
