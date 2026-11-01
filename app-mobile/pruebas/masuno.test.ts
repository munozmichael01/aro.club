/**
 * +1 acompañante (entrega mas-uno, 01-11): los dúos de «Con quién cenas», la
 * línea de la agenda y el crédito que alcanza o no.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('los dúos: el tuyo primero, cada pareja junta, y el suelto solo', async () => {
  const { duos } = await import('../src/masuno/maquina')
  const g = duos([
    { id: 'b', nombre: 'Beto', sector: '', vieneCon: 'c' },
    { id: 'c', nombre: 'Cata', sector: '', vieneCon: 'b' },
    { id: 'l', nombre: 'Laura', sector: '', vieneCon: 'yo' },
    { id: 'd', nombre: 'Dani', sector: '', vieneCon: null },
  ])
  assert.equal(g.length, 3)
  assert.equal(g[0].tuyo, true)
  assert.deepEqual(g[0].gente.map((x) => ('yo' in x ? 'yo' : x.id)), ['yo', 'l'])
  assert.deepEqual(g[1].gente.map((x) => ('yo' in x ? 'yo' : x.id)), ['b', 'c'])
  assert.deepEqual(g[2].gente.map((x) => ('yo' in x ? 'yo' : x.id)), ['d'])
})

test('la agenda de una +1 cuenta dúos, y con un crédito no alcanza para dos puestos', async () => {
  const M = await import('../src/cuenta/maquina')
  const fecha = { id: 'f', formato: 'dinner', empiezaEn: '2099-11-06T23:00:00Z', cierraEn: '2099-11-05T23:00:00Z', creditos: 2, zonas: ['Chacao'], apuntados: 4, cerrada: false, mia: false, zonaHoraria: 'America/Caracas', masUno: true }
  const fila = M.agenda([fecha], null, Date.parse('2099-11-01T00:00:00Z'))[0].filas[0]
  assert.equal(fila.masUno, true)
  assert.equal(fila.estado, 'Falta un dúo para la primera mesa')
  assert.equal(fila.creditos, 2)
  assert.equal(fila.plazo, 'jueves 5 a las 7:00 p.m.')
  const d = { creditos: 1, verif: 'ok', estado: 'activo', respuestas: { faltan: 0, total: 1 } } as unknown as Parameters<typeof M.botonReservar>[0]
  assert.equal(M.botonReservar(d, false, '20 ref', undefined, 2).accion, 'pagar')
  assert.equal(M.botonReservar({ ...d, creditos: 2 }, false, '20 ref', undefined, 2).accion, 'reservar')
})
