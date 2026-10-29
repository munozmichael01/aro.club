/**
 * Cambiar de fecha y los arraigos de la mesa (29-10): lo que se ofrece lo
 * dice el servidor; la app solo decide cómo decirlo.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as C from '../src/cambiar/maquina'
import * as M from '../src/mesa/maquina'

const Z = 'America/Caracas'

test('Mi mesa enseña el enlace, el porqué o nada', async () => {
  const { reglas } = await import('../src/reglas')
  const d = { eventoId: 'a', empiezaEn: '2026-11-01T00:00:00Z', zonaHoraria: Z }
  assert.deepEqual(C.enMiMesa({ puede: true, reservaId: 'r', destinos: [d] }), { enlace: true })
  // Sin saber qué reserva se mueve, no se ofrece moverla (un servidor de antes de 7f93e05).
  assert.equal(C.enMiMesa({ puede: true, destinos: [d] }), null)
  assert.deepEqual(C.enMiMesa({ puede: false, motivo: 'tarde', destinos: [] }), { nota: `Ya no puedes cambiar de fecha: faltan menos de ${reglas.HORAS_DE_MARGEN} horas.` })
  assert.ok('nota' in (C.enMiMesa({ puede: false, motivo: 'sin-destinos', destinos: [] }) ?? {}))
  // «puede» sin destinos es lo mismo que no tener a dónde ir.
  assert.ok('nota' in (C.enMiMesa({ puede: true, destinos: [] }) ?? {}))
  assert.equal(C.enMiMesa({ puede: false, motivo: 'revelada', destinos: [] }), null)
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

test('los arraigos se etiquetan desde reglas.js y un código desconocido no se pinta', () => {
  assert.deepEqual(M.arraigos({ fase: 'abierta', arraigos: ['volvio', 'no-existe'] }), ['Me fui del país y volví'])
  assert.deepEqual(M.arraigos({ fase: 'abierta' }), [])
})
