/** Cancelar: la fecha en la zona de la ciudad, y el sitio solo si ya se reveló. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/cancelar/maquina'

const base: M.DeServidor = {
  reservaId: 'r', empiezaEn: '2026-10-04T00:00:00Z', formato: 'dinner', zona: 'Las Mercedes',
  restaurante: null, horasQueFaltan: 80, conMargen: true, yaTieneMesa: false,
}

test('qué cena se cancela, dicho en Caracas', () => {
  assert.deepEqual(M.queCena(base), { titulo: 'Cena · sábado 3 de octubre', detalle: '8:00 p.m. · Las Mercedes', dia: 'sábado' })
  assert.equal(M.queCena({ ...base, restaurante: 'Casa' }).detalle, '8:00 p.m. · Casa', 'revelada: el sitio')
  assert.deepEqual(M.queCena({ ...base, empiezaEn: null }), { titulo: 'Cena', detalle: 'Las Mercedes', dia: null })
})

test('cancelar con el pago en revisión no dice que el crédito se pierde', async () => {
  const T = await import('../src/texto/cancelar')
  assert.equal(M.credito({ creditoDevuelto: true }), 'devuelto')
  assert.equal(M.credito({ creditoDevuelto: false, creditoEnEspera: true }), 'esperando')
  assert.equal(M.credito({ creditoDevuelto: false }), 'perdido')
  assert.match(T.hecho.resumen('esperando'), /abonamos entero/)
  assert.doesNotMatch(T.hecho.resumen('esperando'), /se pierde/)
})
