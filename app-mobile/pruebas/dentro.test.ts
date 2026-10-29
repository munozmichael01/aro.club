/**
 * «Estás dentro» (entrega estas-dentro, 29-10): el momento, la voz por
 * formato, el calendario y el mensaje de compartir.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { destinoDe } from '../src/avisos/maquina'
import * as M from '../src/dentro/maquina'
import * as T from '../src/texto/dentro'

const Z = 'America/Caracas'
// Viernes 30 a las 7:00 p.m. en Caracas; se revela ese día a mediodía.
const CENA: M.Plan = { empiezaEn: '2026-10-30T23:00:00Z', revelaEn: '2026-10-30T16:00:00Z', zonaHoraria: Z, formato: 'dinner', zonas: ['Chacao', 'Los Palos Grandes'] }

test('A y B dicen lo de la entrega, en la hora de la ciudad', () => {
  const a = M.vista(CENA, 'A', null)
  assert.equal(a.sello, 'PAGO EN REVISIÓN')
  assert.equal(a.PLAN, 'CENA')
  assert.equal(a.dia, 'Viernes 30')
  assert.match(a.hora, /^7:00 p\.m\./)
  assert.equal(a.zona, 'Chacao o Los Palos Grandes')
  const b = M.vista(CENA, 'B', 'credito')
  assert.equal(b.sello, 'RESERVA CONFIRMADA')
  assert.equal(b.bajada, 'Pagaste con crédito. No hace falta nada más.')
  assert.equal(b.seAbre, 'EL VIERNES A MEDIODÍA')
  assert.equal(M.vista(CENA, 'B', 'confirmado').sello, 'PAGO CONFIRMADO')
  // Al reportar ya está dentro, pero no se dice «confirmado» (Michael, 29-10).
  const r = M.vista(CENA, 'B', 'reportado')
  assert.equal(r.sello, 'PUESTO APARTADO')
  assert.equal(r.bajada, 'Reportaste tu pago. Lo cuadramos con el banco y, si algo no cuadra, te escribimos.')
  // Sin saber cómo pagó, no se le dice que pagó con crédito.
  assert.equal(M.vista(CENA, 'B', null).bajada, null)
})

test('en un plan sin mesa se dice grupo', () => {
  const v = M.vista({ ...CENA, formato: 'walk' }, 'B', null)
  assert.match(v.cancela, /el grupo ya está armado/)
  assert.match(M.vista(CENA, 'B', null).cancela, /la mesa ya está armada/)
})

test('el calendario lleva la hora en UTC, dos horas, y nunca el restaurante', () => {
  const u = new URL(M.enlaceCalendario(CENA))
  assert.equal(u.searchParams.get('text'), 'Aro Club · Cena')
  assert.equal(u.searchParams.get('dates'), '20261030T230000Z/20261031T010000Z')
  assert.equal(u.searchParams.get('location'), 'Chacao o Los Palos Grandes')
  assert.equal(u.searchParams.get('details'), 'El sitio se abre el viernes a mediodía. Los detalles están en Mi mesa.')
})

test('el mensaje de compartir es el aprobado, y sin código no promete descuento', () => {
  assert.match(T.mensaje('ANDREA7KQ'), /20% de descuento: aro\.club\/i\/ANDREA7KQ$/)
  assert.doesNotMatch(T.mensaje(null), /descuento|código/)
})

test('la push de pago confirmado abre «Estás dentro»', () => {
  assert.equal(destinoDe({ tipo: 'pago_confirmado' }), '/estas-dentro')
})
