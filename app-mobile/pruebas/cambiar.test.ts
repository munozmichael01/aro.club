/**
 * Cambiar de fecha y los arraigos de la mesa (29-10): lo que se ofrece lo
 * dice el servidor; la app solo decide cómo decirlo.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as C from '../src/cambiar/maquina'
import * as M from '../src/mesa/maquina'

const Z = 'America/Caracas'

test('Mi mesa solo enseña el enlace si hay fechas a las que irse', () => {
  const d = { eventoId: 'a', empiezaEn: '2026-11-01T00:00:00Z', zonaHoraria: Z }
  assert.deepEqual(C.enMiMesa({ puede: true, reservaId: 'r', destinos: [d] }), { enlace: true })
  // Sin saber qué reserva se mueve, no se ofrece moverla (un servidor de antes de 7f93e05).
  assert.equal(C.enMiMesa({ puede: true, destinos: [d] }), null)
  for (const motivo of ['tarde', 'sin-destinos', 'revelada']) assert.equal(C.enMiMesa({ puede: false, motivo, reservaId: 'r', destinos: [] }), null)
  assert.equal(C.enMiMesa({ puede: true, reservaId: 'r', destinos: [] }), null)
  assert.equal(C.enMiMesa(undefined), null)
})

test('cada destino se dice en SU zona horaria, con el plan, las zonas y el idioma', () => {
  // Sábado 31 a las 7:00 p.m. en Caracas, que es domingo 1 en UTC.
  const f = C.fila({ eventoId: 'a', empiezaEn: '2026-11-01T00:00:00Z', zonaHoraria: Z, formato: 'dinner', idioma: 'en', zonas: ['Chacao', 'Los Palos Grandes', 'Altamira'] })
  assert.match(f.titulo, /^Sábado 31 de octubre · 8:00 p\.m\./)
  assert.equal(f.detalle, 'Cena · Chacao, Los Palos Grandes o Altamira')
  assert.equal(f.ingles, true)
  assert.equal(C.diaDe({ eventoId: 'a', empiezaEn: '2026-11-01T00:00:00Z', zonaHoraria: Z }), 'sábado 31')
})

test('el arraigo va con cada persona; sin contestar o desconocido, no se pinta', () => {
  const o = M.otros({ fase: 'abierta', companeros: [
    { id: 'a', nombre: 'Luis', sector: 'Salud', arraigo: 'volvio' },
    { id: 'b', nombre: 'Ana', sector: 'Diseño', arraigo: null },
    { id: 'c', nombre: 'Leo', sector: 'Finanzas', arraigo: 'no-existe' },
  ] })
  assert.equal(o[0].arraigo, 'Volvió al país')
  assert.equal(o[1].arraigo, null)
  assert.equal(o[2].arraigo, null)
})
