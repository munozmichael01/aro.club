/**
 * «Cómo funciona» (entrega como-funciona, 29-10): la revelación dicha en
 * frase, en la zona de la fecha, y la voz por formato.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/como/maquina'

const Z = 'America/Caracas'

test('la cena se revela el mismo día a mediodía; el brunch, la víspera', () => {
  // Sábado 31 a las 7:00 p.m. en Caracas.
  assert.equal(M.cuandoSeSabe({ formato: 'dinner', empiezaEn: '2026-10-31T23:00:00Z', zonaHoraria: Z }), 'El día de la cena, al mediodía')
  // Domingo 1 a las 11:00 a.m.: se revela el sábado a las 6:00 p.m. (como en la base).
  const brunch = M.cuandoSeSabe({ formato: 'brunch', empiezaEn: '2026-11-01T15:00:00Z', revelaEn: '2026-10-31T22:00:00Z', zonaHoraria: Z })
  assert.match(brunch, /^La víspera, a las seis/)
})

test('tres tarjetas; fotos solo en cena; grupo en los planes de movimiento', () => {
  const cena = M.vista({ formato: 'dinner', empiezaEn: '2026-10-31T23:00:00Z', zonaHoraria: Z })
  assert.deepEqual(cena.tarjetas.map((t) => t.clave), ['antes', 'durante', 'despues'])
  assert.equal(cena.conFotos, true)
  assert.equal(cena.tarjetas[0].titulo, 'Llega y pregunta por la mesa de Aro')
  assert.match(cena.tarjetas[0].cuerpo, /^El día de la cena, al mediodía, te decimos/)
  assert.equal(M.vista({ formato: 'brunch' }).conFotos, false)
  const paseo = M.vista({ formato: 'walk', empiezaEn: '2026-11-01T13:00:00Z', zonaHoraria: Z })
  assert.equal(paseo.esMesa, false)
  assert.equal(paseo.tarjetas[0].titulo, 'Llega al punto de encuentro')
  assert.equal(paseo.miMesa, 'Mi grupo')
})

test('los textos y el tipo salen de reglas.js, los mismos que la web (f0e8a7e)', () => {
  const { reglas } = require('../src/reglas') as typeof import('../src/reglas')
  const brunch = M.vista({ formato: 'brunch', empiezaEn: '2026-11-01T15:00:00Z', revelaEn: '2026-10-31T22:00:00Z', zonaHoraria: Z })
  assert.equal(brunch.tipo, 'brunch')
  const web = reglas.COMO_FUNCIONA.tarjetas('brunch', reglas.cuandoSeRevela('2026-11-01T15:00:00Z', Z, '2026-10-31T22:00:00Z', 'brunch'))
  assert.deepEqual(brunch.tarjetas.map((t) => [t.titulo, t.cuerpo]), web.map((t) => [t.titulo, t.cuerpo]))
  assert.equal(M.cuandoSeSabe({ formato: 'dinner' }), 'Antes del plan')
})

test('drinks y café no tienen «Cómo funciona» todavía: abrían las tarjetas de cena y la app se cerraba (31-10)', () => {
  assert.equal(M.tieneComoFunciona('drinks'), false)
  assert.equal(M.tieneComoFunciona('coffee'), false)
  for (const f of ['dinner', 'women_dinner', 'brunch', 'walk', null]) assert.equal(M.tieneComoFunciona(f), true, String(f))
})
