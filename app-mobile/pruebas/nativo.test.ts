/**
 * La entrada con Apple o Google, del lado de la app: la marca que permite
 * repetir `/api/auth/nativo` si la app muere a mitad, y el aterrizaje por
 * `paso` (lo decide el embudo del servidor, no una lista de la app).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { MARCA, destinoDePaso, hayPendiente, terminarEntrada } from '../src/sesion/nativo'

function almacen() {
  const m = new Map<string, string>()
  return {
    m,
    getItem: async (k: string) => m.get(k) ?? null,
    setItem: async (k: string, v: string) => void m.set(k, v),
    removeItem: async (k: string) => void m.delete(k),
  }
}
const api = (f: () => Promise<Response>) => ({ pedir: f }) as never

test('cada paso lleva a su pantalla; «cuenta» aquí es un fallo', () => {
  assert.equal(destinoDePaso('preguntas'), '/puerta')
  assert.equal(destinoDePaso('contacto'), '/datos')
  assert.equal(destinoDePaso('verificacion'), '/verificacion')
  assert.equal(destinoDePaso('listo'), '/cuenta')
  assert.equal(destinoDePaso('cuenta'), null)
})

test('la marca se pone antes de llamar y se quita con el 200', async () => {
  const a = almacen()
  let habiaMarca = false
  const r = await terminarEntrada(
    api(async () => {
      habiaMarca = a.m.has(MARCA)
      return new Response(JSON.stringify({ paso: 'contacto', relay: true }), { status: 200 })
    }),
    a,
    'x',
  )
  assert.equal(habiaMarca, true, 'si la app muere en la llamada, la marca queda')
  assert.deepEqual(r, { ok: true, datos: { paso: 'contacto', otroCorreo: null, relay: true } })
  assert.equal(await hayPendiente(a), false)
})

test('sin red, la marca se queda para reintentar al abrir; con 401, se quita', async () => {
  const a = almacen()
  const sinRed = await terminarEntrada(api(async () => { throw new Error('red') }), a, 'No pudimos terminar')
  assert.deepEqual([sinRed.ok, await hayPendiente(a)], [false, true])
  const r401 = await terminarEntrada(api(async () => new Response(JSON.stringify({ error: 'Sin sesión.' }), { status: 401 })), a, 'x')
  assert.deepEqual([r401.ok, !r401.ok && r401.status, await hayPendiente(a)], [false, 401, false])
})

test('un 409 trae el motivo del servidor y deja la marca', async () => {
  const a = almacen()
  const r = await terminarEntrada(api(async () => new Response(JSON.stringify({ error: 'No pudimos crear tu perfil.' }), { status: 409 })), a, 'x')
  assert.deepEqual(r, { ok: false, status: 409, error: 'No pudimos crear tu perfil.' })
  assert.equal(await hayPendiente(a), true)
})
