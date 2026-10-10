/**
 * Mi mesa: la fase la dice el servidor; los días se calculan en la zona de
 * la fecha; lo de después solo manda lo que se contestó.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/mesa/maquina'
import * as F from '../src/texto/fechas'

const Z = 'America/Caracas'
// Sábado 3 de octubre, 20:00 en Caracas; revela ese día a las 12:00.
const CENA = '2026-10-04T00:00:00Z'
const REVELA = '2026-10-03T16:00:00Z'

test('las fechas de la mesa, en la hora de la ciudad', () => {
  assert.equal(F.tienesPuesto(CENA, Z), 'Tienes puesto el sábado.')
  assert.equal(F.cenaCorta('Cena', CENA, Z), 'Cena · sábado 3')
  assert.equal(F.selloSeAbre(REVELA, Z, new Date('2026-09-30T12:00:00Z').getTime()), 'SE ABRE EL SÁBADO A LAS 12:00 P.M.')
  assert.equal(F.selloSeAbre(REVELA, Z, new Date('2026-10-03T13:00:00Z').getTime()), 'SE ABRE HOY A LAS 12:00 P.M.')
  assert.equal(F.cuandoMesa(CENA, Z, new Date('2026-10-03T20:00:00Z').getTime()), 'Hoy · 8:00 p.m.', 'hoy en Caracas aunque en UTC ya sea domingo')
  assert.equal(F.cuandoMesa(CENA, Z, new Date('2026-10-01T20:00:00Z').getTime()), 'Sábado · 8:00 p.m.')
  assert.equal(F.cuentaMesa(REVELA, new Date('2026-10-01T13:47:00Z').getTime()), '2d 02h 13m')
  assert.equal(F.cuentaMesa(REVELA, new Date('2026-10-03T13:59:30Z').getTime()), '02:00:30')
  assert.equal(F.elMismoDia(CENA, Z), 'el mismo sábado')
})

test('las fases: la dice el servidor, y sin mesa son tres casos distintos', () => {
  assert.equal(M.fase({ fase: 'cerrada' }), 'cerrada')
  assert.equal(M.fase({ fase: 'sin-mesa' }), 'vacia')
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'pending_verification' }).sello, 'EN REVISIÓN')
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'pending_verification' }).accion, null, 'quien espera la revisión no tiene nada que hacer')
  assert.match(M.vacia({ fase: 'sin-mesa', empiezaEn: CENA, zonaHoraria: Z }).bajada, /el mismo sábado\.$/)
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'active' }).accion, 'Ver la próxima fecha')
})

test('mesa o grupo según el formato; la actividad solo en movimiento', () => {
  assert.equal(M.esMesa({ fase: 'abierta', formato: 'dinner' }), true)
  assert.equal(M.voz({ fase: 'abierta', formato: 'walk' }).TU, 'TU GRUPO')
  const act = M.actividad({ fase: 'abierta', formato: 'walk', actividad: { ruta: 'La Silla', km: 7, nivel: 'medio' } })
  assert.deepEqual(act, { titulo: 'La Silla', nota: '7 km · nivel medio' })
  assert.equal(M.actividad({ fase: 'abierta', formato: 'dinner', actividad: { ruta: 'x' } }), null)
  assert.equal(M.numero({ fase: 'abierta', numeroMesa: 4 }), '04')
})

test('cómo llegar: Apple Maps en iOS, Google en Android', () => {
  const d = { fase: 'abierta', mapa: 'https://google', mapaApple: 'https://apple' }
  assert.equal(M.mapa(d, 'ios'), 'https://apple')
  assert.equal(M.mapa(d, 'android'), 'https://google')
  assert.equal(M.mapa({ fase: 'abierta', mapa: 'https://google' }, 'ios'), 'https://google')
})

test('lo de después: solo lo contestado, índices de mejor a peor, y lo ya hecho se recupera', () => {
  const v = M.valoracionVacia()
  assert.equal(M.algoQueContar(v), false, 'enviar en blanco no es contar nada')
  assert.deepEqual(M.cuerpoValorar('m', { ...v, mesa: 0, sitio: { comida: 3, ambiente: -1 }, volveria: 1 }), {
    accion: 'valorar', mesaId: 'm', mesa: 0, sitio: { comida: 3 }, volveriaAAro: true,
  })
  assert.equal(M.algoQueContar({ ...v, bloqueados: ['x'] }), true)
  assert.deepEqual(M.alternar(['a', 'b'], 'a'), ['b'])
  const ya = M.yaHecho({ fase: 'pasada', yaValoro: true, yaReporto: 'b', yaBloqueados: ['b', 'fuera'], companeros: [{ id: 'b', nombre: 'B', sector: null }] })
  assert.deepEqual(ya, { contado: true, reportadoA: 'b', bloqueados: ['b'] })
})

test('la única mesa del sitio no lleva número', async () => {
  const T = await import('../src/texto/mesa')
  assert.equal(M.conNumero({ fase: 'abierta', numeroMesa: 1, mesaUnica: true } as M.DeServidor), false)
  assert.equal(M.conNumero({ fase: 'abierta', numeroMesa: 2 } as M.DeServidor), true)
  assert.equal(T.abierta.llegada(true, '', 6), 'Di que vas a la mesa de Aro. Está reservada a tu nombre y el restaurante ya sabe que son seis.')
  assert.match(T.abierta.llegada(true, '02', 6), /la 02\./)
  assert.match(T.pasada.bajada(true, 'Madre', 'mesa', ''), /^Cenaste en Madre\. /)
})
