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

test('las páginas del catálogo no se abren en la app publicada', () => {
  const dir = new URL('../src/app/', import.meta.url)
  const catalogos = fs.readdirSync(dir).filter((f) => /^catalogo.*\.tsx$/.test(f))
  assert.ok(catalogos.length > 0, 'hay catálogos')
  for (const f of catalogos) {
    const s = leer(`app/${f}`)
    assert.match(s, /export default soloDesarrollo\(Pantalla\)/, `${f} se exporta sin soloDesarrollo`)
    assert.equal((s.match(/export default/g) ?? []).length, 1, `${f}: un solo export default`)
  }
  // Y la envoltura solo deja pasar en desarrollo.
  assert.match(leer('util/soloDesarrollo.tsx'), /if \(__DEV__\) return Pantalla/)
})

test('ninguna pantalla de producción importa un catálogo', () => {
  const todos = (d: string): string[] =>
    fs.readdirSync(new URL(`../src/${d}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? todos(`${d}${e.name}/`) : /\.tsx?$/.test(e.name) ? [`${d}${e.name}`] : []))
  const culpables = todos('').filter((f) => !/^app\/catalogo/.test(f) && /from ['"][^'"]*app\/catalogo/.test(leer(f)))
  assert.deepEqual(culpables, [])
})
