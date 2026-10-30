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
  assert.match(T.mensaje({ codigo: 'ANDREA7KQ', enlace: 'https://aro.club/i/ANDREA7KQ', pct: 20 }), /Con mi código ANDREA7KQ tu primera fecha tiene un 20% de descuento: https:\/\/aro\.club\/i\/ANDREA7KQ$/)
  assert.doesNotMatch(T.mensaje(null), /descuento|código/)
})

test('la push de pago confirmado abre «Estás dentro»', () => {
  assert.equal(destinoDe({ tipo: 'pago_confirmado' }), '/estas-dentro')
})

test('compartir lleva el enlace con https, que es lo que hace a WhatsApp leer la tarjeta', () => {
  assert.match(T.mensaje(null), /https:\/\/aro\.club$/)
  // El enlace con código lo arma el servidor: se usa tal cual.
  assert.match(T.mensaje({ codigo: 'ANDREA', enlace: 'https://aro.club/i/ANDREA', pct: 20 }), /https:\/\/aro\.club\/i\/ANDREA$/)
})

test('la historia lleva los datos de la fecha en su zona, y la revelación como la maqueta', () => {
  const h = M.historia(CENA, null)!
  assert.equal(h.plan, 'Cena')
  assert.equal(h.dia, 'Viernes 30')
  assert.equal(h.numero, '30')
  assert.equal(h.hora, '7:00 p.m.')
  assert.equal(h.zona, 'Chacao o Los Palos Grandes')
  assert.equal(h.revela, '12:00 m.')
  assert.equal(h.revelaSufijo, 'MEDIODÍA')
  const b = M.historia({ ...CENA, formato: 'brunch', empiezaEn: '2026-11-01T15:00:00Z', revelaEn: '2026-11-01T12:00:00Z' }, null)!
  assert.equal(b.plan, 'Brunch')
  assert.equal(b.revela, '8:00 a.m.')
  assert.equal(b.revelaNum, '8:00')
  assert.equal(b.revelaSufijo, 'A.M.')
})

test('sin código no sale la tarjeta 4, que es entera el código; los planes de movimiento no tienen tarjeta', () => {
  assert.deepEqual(M.variantesDe(M.historia(CENA, null)!), [1, 2, 3, 5, 6, 7, 8])
  assert.equal(M.variantesDe(M.historia(CENA, 'ANDREA7KQ')!).length, 8)
  assert.equal(M.historia({ ...CENA, formato: 'walk' }, null), null)
})

test('con un código que cubre la plaza, «Estás dentro» dice que el código la cubre', () => {
  const v = M.vista(CENA, 'B', 'cupon')
  assert.equal(v.sello, 'RESERVA CONFIRMADA')
  assert.match(v.bajada ?? '', /código cubre la plaza/)
})
