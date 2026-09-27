/**
 * Ningún estilo de texto recorta la letra.
 *
 * En React Native el `lineHeight` recorta la caja: por debajo de lo que la
 * fuente necesita (medido en sus TTF, ver SUELO_INTERLINEADO) se comen las
 * ascendentes y las tildes. Pasó en el celular de Michael el 27-09 con la
 * portada a 0,94.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { test } from 'node:test'

import { SUELO_INTERLINEADO, tipo } from '../src/diseno/tokens'

test('cada estilo tiene al menos el interlineado que su fuente necesita', () => {
  const cortos = Object.entries(tipo)
    .filter(([, t]) => t.lineHeight < t.fontSize * SUELO_INTERLINEADO[t.fontFamily])
    .map(([k, t]) => `${k}: ${t.fontSize}/${t.lineHeight} (${(t.lineHeight / t.fontSize).toFixed(2)} < ${SUELO_INTERLINEADO[t.fontFamily]})`)
  assert.deepEqual(cortos, [])
})

test('toda familia usada tiene su suelo medido', () => {
  for (const [k, t] of Object.entries(tipo)) assert.ok(SUELO_INTERLINEADO[t.fontFamily], `${k} usa ${t.fontFamily} sin suelo`)
})

/** (ascendente + descendente) / unidades por em, de la tabla `hhea` del TTF. */
function necesita(familia: string): number {
  const b = fs.readFileSync(path.resolve(import.meta.dirname, `../assets/fuentes/${familia}.ttf`))
  const tabla = (tag: string) => {
    for (let i = 0; i < b.readUInt16BE(4); i++) {
      const o = 12 + 16 * i
      if (b.toString('ascii', o, o + 4) === tag) return b.readUInt32BE(o + 8)
    }
    throw new Error(`${familia}: sin ${tag}`)
  }
  const upm = b.readUInt16BE(tabla('head') + 18)
  const hhea = tabla('hhea')
  return (b.readInt16BE(hhea + 4) - b.readInt16BE(hhea + 6)) / upm
}

test('el suelo declarado cubre lo que MIDEN las fuentes empaquetadas', () => {
  for (const [familia, suelo] of Object.entries(SUELO_INTERLINEADO)) {
    const n = necesita(familia)
    assert.ok(suelo >= n - 0.005, `${familia}: el suelo ${suelo} no cubre ${n.toFixed(3)}`)
  }
})
