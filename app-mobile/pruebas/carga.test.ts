/**
 * La carga (entrega carga, 03-11): los tiempos de la app son los de
 * `AroReglas.CARGA`, los mismos que usa la web. `tokens.ts` los copia para
 * que `diseno/` no dependa de `reglas.js`; esto vigila que no se separen.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { tiempo } from '../src/diseno/tokens'
import { reglas } from '../src/reglas'

test('los tiempos de la app son los de reglas.js', () => {
  const t = reglas.CARGA.tiempo
  assert.equal(tiempo.umbral, t.umbral)
  assert.equal(tiempo.minimoVisible, t.minimoVisible)
  assert.equal(tiempo.tarda, t.tarda)
  assert.equal(tiempo.veloTope, t.veloTope)
  assert.equal(tiempo.transicion, t.transicion)
  assert.equal(tiempo.escalon, t.escalon)
  assert.equal(tiempo.latido, t.latido)
  assert.equal(tiempo.vueltaAro, t.vueltaAro)
  assert.equal(tiempo.listo, t.check)
})

test('la franja no dice «p.m..» y sabe decir un día', () => {
  assert.equal(reglas.CARGA.texto.franja('las 3:40 p.m.'), 'Sin conexión. Esto es de las 3:40 p.m.')
  assert.equal(reglas.CARGA.texto.franja('el lunes 2'), 'Sin conexión. Esto es del lunes 2.')
})
