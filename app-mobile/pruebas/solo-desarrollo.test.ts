/**
 * Lo que es solo para desarrollo NO puede llegar a la app publicada
 * (decisión de Michael, 29-09): hoy, el atajo de mantener pulsado el logo de
 * Entrar para volver a ver la bienvenida. Tiene que ir siempre detrás de
 * `__DEV__`, que en una build de producción es `false`.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

const leer = (f: string) => fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8')

test('el atajo de olvidar la bienvenida solo se conecta con __DEV__', () => {
  const pantalla = leer('entrar/Entrar.tsx')
  const usos = pantalla.match(/onLongPress=\{[^}]*\}/g) ?? []
  assert.ok(usos.length > 0, 'el atajo existe')
  for (const u of usos) assert.match(u, /__DEV__\s*\?/, `sin __DEV__: ${u}`)
  const ruta = leer('app/entrar.tsx')
  assert.match(ruta, /alOlvidarBienvenida=\{\s*__DEV__\s*\?/, 'la ruta solo lo pasa en desarrollo')
})
