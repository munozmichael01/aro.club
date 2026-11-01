/**
 * Los enlaces de aro.club que abren la app: a qué pantalla va cada uno, y que
 * la lista de rutas es la misma que la de `app.json`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { PENDIENTES_DE_BUILD, RUTAS_DE_LA_WEB, rutaDeEnlace } from '../src/enlaces'

const EV = '3f2a1c9e-1111-4222-8333-944455556666'

test('cada ruta de la web va a su pantalla', () => {
  assert.equal(rutaDeEnlace('https://aro.club/cuenta'), '/cuenta')
  assert.equal(rutaDeEnlace('https://aro.club/mi-mesa'), '/mesa')
  assert.equal(rutaDeEnlace('https://www.aro.club/perfil/'), '/perfil')
  assert.equal(rutaDeEnlace('https://aro.club/cuestionario'), '/')
  assert.equal(rutaDeEnlace(`https://aro.club/estas-dentro?evento=${EV}`), `/estas-dentro?evento=${EV}`)
  assert.equal(rutaDeEnlace('https://aro.club/agenda?utm_source=correo'), '/cuenta')
  assert.equal(rutaDeEnlace('https://aro.club/reembolso'), '/reembolso')
})

test('los correos de «seguir en contacto» abren esa cena (01-11)', () => {
  assert.equal(rutaDeEnlace(`https://aro.club/mesa?cena=${EV}`), `/mesa?cena=${EV}`)
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
  // Menos las que esperan la próxima build (PENDIENTES_DE_BUILD): solo iPhone de momento.
  assert.deepEqual(rutas, Object.keys(RUTAS_DE_LA_WEB).filter((r) => !PENDIENTES_DE_BUILD.includes(r)).sort())
})

test('/i/<código> y /m/<token>: se reconocen para guardarlos, y la app sigue por el embudo (01-11)', async () => {
  const { deEnlace } = await import('../src/sesion/traido')
  assert.deepEqual(deEnlace('/i/ANDREA7KQ'), { codigo: 'ANDREA7KQ' })
  assert.deepEqual(deEnlace('/m/abcdefghij_KLMNOPQRS-tu'), { token: 'abcdefghij_KLMNOPQRS-tu' })
  assert.equal(deEnlace('/m/corto'), null)
  assert.equal(deEnlace('/i/../x'), null)
  assert.equal(deEnlace('/mesa'), null)
  assert.equal(rutaDeEnlace('https://aro.club/i/ANDREA7KQ'), '/')
  assert.equal(rutaDeEnlace('https://aro.club/m/abcdefghij_KLMNOPQRS-tu'), '/acompanante?t=abcdefghij_KLMNOPQRS-tu')
})
