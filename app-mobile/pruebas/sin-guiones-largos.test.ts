/**
 * Regla de marca (Michael, 05-10-2026): en el copy que lee la gente no van
 * guiones largos. «Las personas no escribimos con esos guiones, al menos no
 * en español». Se vigila el texto de `src/texto/` y las hojas de `src/avisos/`,
 * fuera de los comentarios. El «—» solo como marca de dato vacío vale, y no
 * vive en `src/texto/`.
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

const DIRS = ['src/texto', 'src/avisos']

test('el copy no lleva guiones largos', () => {
  const malos: string[] = []
  for (const dir of DIRS) {
    for (const f of readdirSync(dir).filter((x) => /\.tsx?$/.test(x))) {
      const lineas = readFileSync(join(dir, f), 'utf8').split('\n')
      lineas.forEach((l, i) => {
        const t = l.trim()
        if (t.startsWith('*') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('{/*')) return
        if (/(['"`])[^'"`]*—[^'"`]*\1/.test(l)) malos.push(`${dir}/${f}:${i + 1}`)
      })
    }
  }
  assert.deepEqual(malos, [], `guion largo en el copy: ${malos.join(', ')}`)
})
