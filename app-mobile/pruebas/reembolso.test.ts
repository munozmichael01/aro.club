/** El reembolso del crédito por lista de espera (21-10): qué se ve y qué se manda. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/reembolso/maquina'

test('qué se ve: el estado manda sobre puede', () => {
  assert.equal(M.fase({ puede: false, estado: null }), 'nada')
  assert.equal(M.fase({ puede: true, estado: null }), 'pedir')
  assert.equal(M.fase({ puede: false, estado: 'pendiente' }), 'pendiente', 'con solicitud, el acuse y no el botón')
  assert.equal(M.fase({ puede: true, estado: 'pendiente' }), 'pendiente')
  assert.equal(M.fase({ puede: false, estado: 'reembolsado' }), 'hecho')
})

test('lo que se manda: teléfono con su cero, cédula con la letra, y la tasa que vio', () => {
  const rep = { tel: '4141234567', doc_tipo: 'E', doc: '12345678', banco: '0102' }
  assert.equal(M.listo(rep), true)
  assert.deepEqual(M.cuerpo(rep, 993.176), { telefono: '04141234567', cedula: 'E12345678', banco: '0102', tasaVista: 993.176 })
  assert.equal(M.listo({ ...rep, banco: '' }), false)
})

test('los bolívares, con coma decimal y dos cifras', () => {
  assert.match(M.bs(9931.76), /^9\.931,76$/)
  assert.equal(M.bs(null), '')
})
