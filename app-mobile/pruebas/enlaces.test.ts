/**
 * Los enlaces de aro.club que abren la app: a qué pantalla va cada uno, y que
 * la lista de rutas es la misma que la de `app.json`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { RUTAS_DE_LA_WEB, rutaDeEnlace } from '../src/enlaces'

const EV = '3f2a1c9e-1111-4222-8333-944455556666'

test('cada ruta de la web va a su pantalla', () => {
  assert.equal(rutaDeEnlace('https://aro.club/cuenta'), '/cuenta')
  assert.equal(rutaDeEnlace('https://aro.club/mi-mesa'), '/mesa')
  assert.equal(rutaDeEnlace('https://www.aro.club/perfil/'), '/perfil')
  assert.equal(rutaDeEnlace('https://aro.club/cuestionario'), '/')
})

test('solo pasan los parámetros conocidos, y con un id válido', () => {
  assert.equal(rutaDeEnlace(`https://aro.club/pago?evento=${EV}&utm_source=correo`), `/pago?evento=${EV}`)
  assert.equal(rutaDeEnlace('https://aro.club/pago?evento=../../x'), '/pago')
})

test('lo que no es de aro.club se deja como llega', () => {
  assert.equal(rutaDeEnlace('aroclub://mesa'), 'aroclub://mesa')
  assert.equal(rutaDeEnlace('/juego?mesa=1'), '/juego?mesa=1')
  assert.equal(rutaDeEnlace('https://otra.com/cuenta'), 'https://otra.com/cuenta')
})

test('una ruta desconocida de aro.club va al inicio', () => {
  assert.equal(rutaDeEnlace('https://aro.club/operacion'), '/')
})

test('app.json reclama exactamente las rutas que la app sabe abrir', () => {
  const app = JSON.parse(readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo
  assert.deepEqual(app.ios.associatedDomains, ['applinks:aro.club'])
  const rutas = app.android.intentFilters[0].data.map((d: { path: string }) => d.path).sort()
  assert.deepEqual(rutas, Object.keys(RUTAS_DE_LA_WEB).sort())
})
