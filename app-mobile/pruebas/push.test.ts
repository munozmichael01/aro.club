/**
 * Las push: a qué pantalla lleva cada una, cuándo se manda el token y la
 * llamada al servidor (con una `api` de mentira).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { debePreguntar, destinoDe, hayQueMandar, SEMANA, zonaParaPregunta } from '../src/avisos/maquina'
import { crearServicioPush } from '../src/avisos/servicio'

const EV = '3f2a1c9e-1111-4222-8333-944455556666'

test('cada tipo abre su pantalla (los mismos nombres que los correos)', () => {
  assert.equal(destinoDe({ tipo: 'mesa_asignada' }), '/mesa')
  assert.equal(destinoDe({ tipo: 'llego_tarde' }), '/mesa')
  assert.equal(destinoDe({ tipo: 'verificacion_rechazada' }), '/verificacion')
  assert.equal(destinoDe({ tipo: 'abrimos_zona' }), '/cuenta')
  assert.equal(destinoDe({ tipo: 'algo_nuevo' }), null)
  assert.equal(destinoDe(null), null)
})

test('pago: con su fecha, o al Inicio si no la trae', () => {
  assert.equal(destinoDe({ tipo: 'pago_no_cuadra', eventoId: EV }), `/pago?evento=${EV}`)
  assert.equal(destinoDe({ tipo: 'pago_no_cuadra' }), '/cuenta')
  assert.equal(destinoDe({ tipo: 'pago_no_cuadra', eventoId: 'x&evil=1' }), '/cuenta')
})

test('la ruta del servidor manda, pero solo si es de la lista', () => {
  assert.equal(destinoDe({ tipo: 'abrimos_zona', ruta: '/perfil' }), '/perfil')
  assert.equal(destinoDe({ tipo: 'abrimos_zona', ruta: 'https://otro.sitio' }), '/cuenta')
  assert.equal(destinoDe({ ruta: '/operacion' }), null)
})

test('el token se manda si cambió o pasó una semana', () => {
  const ahora = 1_000_000_000_000
  assert.ok(hayQueMandar(null, 'a', ahora))
  assert.ok(!hayQueMandar({ token: 'a', en: ahora - 1000 }, 'a', ahora))
  assert.ok(hayQueMandar({ token: 'a', en: ahora - 1000 }, 'b', ahora))
  assert.ok(hayQueMandar({ token: 'a', en: ahora - SEMANA - 1 }, 'a', ahora))
})

test('registrar y olvidar: el contrato, y un 404 no rompe nada', async () => {
  const llamadas: { ruta: string; method?: string; cuerpo: unknown }[] = []
  let status = 200
  const api = {
    pedir: async (ruta: string, init: RequestInit = {}) => {
      llamadas.push({ ruta, method: init.method, cuerpo: JSON.parse(String(init.body)) })
      return new Response('{}', { status })
    },
  } as never
  const s = crearServicioPush(api)
  assert.equal(await s.registrar('ExponentPushToken[x]', 'ios', '0.1.0'), true)
  assert.deepEqual(llamadas[0], { ruta: '/push/token', method: 'POST', cuerpo: { token: 'ExponentPushToken[x]', plataforma: 'ios', version: '0.1.0' } })
  assert.equal(await s.olvidar('ExponentPushToken[x]'), true)
  assert.deepEqual(llamadas[1], { ruta: '/push/token', method: 'DELETE', cuerpo: { token: 'ExponentPushToken[x]' } })
  status = 404
  assert.equal(await s.registrar('t', 'android', '0.1.0'), false)
  const caida = crearServicioPush({ pedir: async () => { throw new Error('sin red') } } as never)
  assert.equal(await caida.registrar('t', 'android', '0.1.0'), false)
})

test('la pregunta previa: tres momentos, cada uno una vez, y nunca si el sistema ya respondió', () => {
  const sin = { estado: 'undetermined' as const, puedePreguntar: true }
  assert.ok(debePreguntar(sin, [], 'alta'))
  assert.ok(!debePreguntar(sin, ['alta'], 'alta'))
  // Dijo «Ahora no» en el alta: se le vuelve a ofrecer al verificar y al reservar.
  assert.ok(debePreguntar(sin, ['alta'], 'verificacion'))
  assert.ok(debePreguntar(sin, ['alta', 'verificacion'], 'reserva'))
  // Con el sí o el no del sistema, nunca más.
  assert.ok(!debePreguntar({ estado: 'granted', puedePreguntar: true }, [], 'reserva'))
  assert.ok(!debePreguntar({ estado: 'denied', puedePreguntar: false }, [], 'alta'))
  assert.ok(!debePreguntar({ estado: 'undetermined', puedePreguntar: false }, [], 'alta'))
  // Android sin preguntar todavía: «denied» pero se puede preguntar.
  assert.ok(debePreguntar({ estado: 'denied', puedePreguntar: true }, [], 'alta'))
})

test('la zona de la pregunta del alta', () => {
  assert.equal(zonaParaPregunta(['Chacao']), 'Chacao')
  assert.equal(zonaParaPregunta(['Chacao', 'Altamira']), 'Chacao y otras')
  assert.equal(zonaParaPregunta([]), null)
})

test('la push del juego abre el juego de su mesa', () => {
  const MESA = '3f2a1c9e-1111-4222-8333-944455556666'
  assert.equal(destinoDe({ tipo: 'juego', ruta: '/juego', mesaId: MESA }), `/juego?mesa=${MESA}`)
  assert.equal(destinoDe({ tipo: 'juego' }), '/mesa')
  assert.equal(destinoDe({ tipo: 'juego', mesaId: 'x?y=1' }), '/mesa')
})
