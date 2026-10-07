/**
 * El Inicio: el copy sale del estado que dice el servidor, y ningún día ni
 * hora se escribe: se calcula de la fecha, en la hora de Caracas, esté
 * donde esté el celular (el script corre con TZ de Madrid y de UTC).
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/cuenta/maquina'
import * as F from '../src/texto/fechas'
import { reglas } from '../src/reglas'

// Sábado 3 de octubre de 2026, 20:00 en Caracas (UTC-4) = domingo 00:00 UTC.
const CENA = '2026-10-04T00:00:00+00:00'
// Revela el sábado a mediodía de Caracas.
const REVELA = '2026-10-03T16:00:00+00:00'
const CIERRA = '2026-10-02T00:00:00+00:00' // jueves 20:00 en Caracas
const AHORA = new Date('2026-09-28T12:00:00Z').getTime()

const base = (x: Partial<M.MiCuenta> = {}): M.MiCuenta => ({
  nombre: 'Ana',
  esOps: false,
  porValorar: null,
  planes: [],
  agenda: [],
  proximaFecha: { empiezaEn: CENA, cierraEn: CIERRA, revelaEn: REVELA, zona: 'Las Mercedes', apuntados: 8 },
  estado: 'reservar',
  verif: 'ok',
  motivoRechazo: null,
  respuestas: { faltan: 0, total: 14 },
  creditos: 0,
  reserva: null,
  ...x,
})

test('las fechas se dicen en la hora de la ciudad, no en la del celular', () => {
  assert.equal(F.fechaCorta(CENA), 'Sábado 3 · 8:00 p.m.')
  assert.equal(F.fechaLarga(CENA), 'Sábado 3 de octubre · 8:00 p.m.')
  assert.equal(F.titularDeReserva(CENA), 'Sábado 3, ocho de la noche.')
  assert.equal(F.cuandoSeSabe(REVELA), 'el sábado a mediodía')
  assert.equal(F.cuandoSeSabe('2026-10-03T19:30:00Z'), 'el sábado a las 3:30 p.m.')
  assert.equal(F.cuandoSeSabe(null), 'cuando se abra la mesa')
  assert.equal(F.relojDeRevelacion(REVELA, AHORA), 'ABRE EN 5D 04:00')
  assert.equal(F.relojDeRevelacion(null, AHORA), '')
  // Con la zona de la fecha (`zonaHoraria`), se dice en la de SU ciudad.
  assert.equal(F.fechaCorta(CENA, 'Asia/Tokyo'), 'Domingo 4 · 9:00 a.m.')
  assert.equal(F.fechaCorta(CENA, 'America/Caracas'), 'Sábado 3 · 8:00 p.m.')
  assert.equal(F.titularDeReserva(CENA, 'Europe/Madrid'), 'Domingo 4, dos de la noche.')
  assert.equal(F.diasDe([CENA, '2026-10-02T23:30:00Z', CENA].map((iso) => ({ iso }))), 'Viernes y sábado')
})

test('lista para reservar: titular y cuerpo desde la próxima fecha real', () => {
  const t = M.tarjeta(base(), null, AHORA)
  assert.equal(t.titulo, 'Hay cena el sábado en Las Mercedes.')
  assert.equal(
    t.cuerpo,
    'Ya van 8 apuntados y se cierra el jueves. Te apuntas a la fecha, pagas en bolívares, y el sábado a mediodía sabes en qué mesa te tocó y con quién.',
  )
  assert.deepEqual([t.accion, t.destino, t.oscuro], ['Elegir mi fecha', '#agenda', false])
})

test('pocos apuntados no se enseñan; sin fecha, ni día ni reloj', () => {
  const pocos = M.tarjeta(base({ proximaFecha: { ...base().proximaFecha!, apuntados: 2 } }), null, AHORA)
  assert.match(pocos.cuerpo, /^Recién abierta y se cierra el jueves\./)
  const sin = M.tarjeta(base({ proximaFecha: null }), null, AHORA)
  assert.deepEqual([sin.titulo, sin.accion, sin.reloj], ['Todavía no hay fecha abierta.', 'Ver la agenda', ''])
})

test('el sello de preguntas: el número solo si son pocas (01-10-2026)', () => {
  assert.equal(M.tarjeta(base({ estado: 'perfil', respuestas: { faltan: 1, total: 14 } }), null, AHORA).sello, 'TE FALTAN 1 PREGUNTA')
  assert.equal(M.tarjeta(base({ estado: 'perfil', respuestas: { faltan: 13, total: 14 } }), null, AHORA).sello, 'UN PASO MÁS')
  assert.equal(M.tarjeta(base({ estado: 'perfil', respuestas: { faltan: 3, total: 14 } }), null, AHORA).sello, 'TE FALTAN 3 PREGUNTAS')
})

test('con mesa reservada: su fecha como titular, en oscuro, y la mesa solo si /api/mi-mesa la trae', () => {
  const reserva = { id: 'r', formato: 'dinner', empiezaEn: CENA, revelaEn: REVELA, revelado: false }
  const t = M.tarjeta(base({ estado: 'reservada', reserva }), null, AHORA)
  assert.equal(t.titulo, 'Sábado 3, ocho de la noche.')
  assert.match(t.cuerpo, /El sábado a mediodía se abre todo/)
  assert.equal(t.oscuro, true)
  assert.equal(M.tarjeta(base({ estado: 'abierta', reserva }), null, AHORA).mesa, null)
  const m = M.tarjeta(base({ estado: 'abierta', reserva }), {
    mesaId: 'x', numeroMesa: 4, restaurante: 'Casa', direccion: 'Calle 1', empiezaEn: CENA,
    companeros: [{ id: '1', nombre: 'luis', sector: 'Salud' }],
  }, AHORA).mesa
  assert.deepEqual([m?.numero, m?.otros[0].inicial, m?.cuando], ['04', 'L', 'Sábado 3 · 8:00 p.m.'])
})

test('movimiento habla de grupo', () => {
  const reserva = { id: 'r', formato: 'walk', empiezaEn: CENA, revelaEn: REVELA, revelado: true }
  assert.equal(M.tarjeta(base({ estado: 'abierta', reserva }), null, AHORA).titulo, 'Sábado 3, ocho de la noche.')
  assert.equal(reglas.vozDe(reserva.formato).mia, 'Mi grupo', 'y la pestaña se llama «Mi grupo»')
})

test('la agenda: polaroids derivadas, grupos por semana y el estado de cada fecha', () => {
  const fecha = (id: string, x: Partial<M.FechaAgenda>): M.FechaAgenda => ({
    id, formato: 'dinner', empiezaEn: CENA, cierraEn: CIERRA, creditos: 1, zonas: ['Chacao', 'Altamira'], apuntados: 4, cerrada: false, mia: false, ...x,
  })
  const ag = [fecha('a', {}), fecha('b', { empiezaEn: '2026-10-10T00:00:00Z', apuntados: 13 }), fecha('c', { mia: true }), fecha('d', { cerrada: true, apuntados: 1 })]
  const fl = M.filtros(ag, null)
  // Un solo formato con fechas: escaparate, sin «Todos» ni filtro, y cenas solo con su nombre.
  assert.deepEqual(fl.map((f) => [f.nombre, f.detalle, f.hay, f.toca]), [
    ['Cenas', '', true, false], ['Drinks', 'Próximamente', false, false], ['Movimiento', 'Próximamente', false, false], ['Coffee', 'Próximamente', false, false],
  ])
  const g = M.agenda(ag, null, AHORA)
  assert.deepEqual(g.map((x) => x.semana), ['Esta semana', 'La semana que viene'])
  assert.deepEqual(g[0].filas.map((f) => f.estado), ['4 apuntados · faltan 2 para la primera mesa', 'Ya tienes puesto', 'Cerrada · 1 apuntado'])
  assert.equal(g[1].filas[0].estado, '13 apuntados · 3 mesas')
  assert.equal(g[0].filas[0].zona, 'Chacao o Altamira')
  assert.deepEqual(M.agenda(ag, 'drinks', AHORA), [])
})

test('reservar: el botón dice lo que va a pasar según quién lo pulsa', () => {
  assert.deepEqual(M.botonReservar(base({ verif: 'revision' }), false), { accion: 'nada', texto: 'Te avisamos al aprobarla' })
  assert.equal(M.botonReservar(base({ verif: 'sin' }), false).accion, 'verificar')
  assert.equal(M.botonReservar(base({ creditos: 0 }), false).accion, 'pagar')
  assert.deepEqual(M.botonReservar(base({ creditos: 2 }), false), { accion: 'reservar', texto: 'Reservar mi puesto · 1 encuentro' })
  assert.equal(M.botonReservar(base(), true).texto, 'Apuntándote')
})

test('reservar: sin preguntas o datos no se reserva, y se va a completarlos (no a verificarse)', () => {
  // Pasó el 01-10-2026: con 12 preguntas pendientes, el botón mandaba a verificarse.
  const sinPreguntas = M.botonReservar(base({ estado: 'perfil', verif: 'sin', respuestas: { faltan: 12, total: 17 } }), false)
  assert.deepEqual(sinPreguntas, { accion: 'completar', texto: 'Termina tu perfil para reservar', destino: '/cuestionario' })
  // Aunque la verificación esté en revisión: las preguntas van antes.
  assert.equal(M.botonReservar(base({ estado: 'perfil', verif: 'revision', respuestas: { faltan: 1, total: 17 } }), false).texto, 'Termina tu perfil para reservar')
  assert.equal(M.botonReservar(base({ estado: 'datos' }), false).destino, '/datos')
  // Con los campos del embudo, manda `paso`/`donde` del servidor.
  const conPaso = M.botonReservar(base({ paso: 'preguntas', donde: '/cuestionario', puedeReservar: false, respuestas: { faltan: 3, total: 17 } }), false)
  assert.deepEqual(conPaso, { accion: 'completar', texto: 'Termina tu perfil para reservar', destino: '/cuestionario' })
})

test('lo próximo: solo lo vivo, y el pago reportado no es confirmada', () => {
  const plan = (x: Partial<M.Plan>): M.Plan => ({ empiezaEn: CENA, formato: 'dinner', estado: 'confirmed', cancelada: false, pasada: false, restaurante: null, numeroMesa: null, ...x })
  const p = M.proximos([plan({}), plan({ estado: 'pending_payment' }), plan({ pasada: true }), plan({ cancelada: true }), plan({ restaurante: 'Casa', numeroMesa: 3 })])
  assert.deepEqual(p.map((x) => [x.sitio, x.estado]), [['Cena', 'Confirmada'], ['Cena', 'Por confirmar'], ['Casa · mesa 03', 'Confirmada']])
  assert.equal(p[0].cuando, 'Sábado 3 de octubre · 8:00 p.m.')
})

test('los atajos cuentan de verdad: créditos, cenas que ocurrieron y exclusiones', () => {
  const planes: M.Plan[] = [
    { empiezaEn: CENA, formato: 'dinner', estado: 'attended', cancelada: false, pasada: true, restaurante: null, numeroMesa: null },
    { empiezaEn: CENA, formato: 'dinner', estado: 'cancelled', cancelada: true, pasada: true, restaurante: null, numeroMesa: null },
  ]
  const a = M.atajos(base({ planes, creditos: 1, verif: 'revision', respuestas: { faltan: 3, total: 14 } }), null)
  assert.deepEqual(a.map((x) => x.pie), ['3 pendientes', '1 crédito', 'En revisión', 'Cargando', '1 cena'])
  assert.match(a[0].cuerpo, /^Las 14 del cuestionario/)
  assert.equal(M.atajos(base(), 0)[3].pie, 'Ninguna')
  assert.doesNotMatch(M.atajos(base({ reserva: { id: 'r', formato: 'dinner', empiezaEn: CENA, revelaEn: REVELA, revelado: false } }), 0)[1].cuerpo, /sábado/i)
})

test('las polaroids como filtro: «Todos» aparece cuando hay más de un formato con fechas (entrega 19)', () => {
  const base = { cierraEn: null, creditos: 1, zonas: [], apuntados: 3, cerrada: false, mia: false }
  const ag = [
    { ...base, id: 'a', formato: 'dinner', empiezaEn: '2026-10-10T23:30:00Z' },
    { ...base, id: 'b', formato: 'drinks', empiezaEn: '2026-10-14T00:30:00Z' },
  ] as M.FechaAgenda[]
  const todos = M.filtros(ag, null)
  assert.deepEqual(todos.map((f) => [f.formato, f.elegido, f.toca, f.apagada]), [
    ['todos', true, true, false], ['dinner', false, true, false], ['drinks', false, true, false], ['movement', false, false, true], ['coffee', false, false, true],
  ])
  assert.equal(todos[0].detalle, 'Todo lo que viene')
  assert.notEqual(todos[1].detalle, '', 'con filtro, cada formato lleva sus días')
  // Elegido drinks: se marca, las otras con fechas pierden color pero siguen tocables.
  const dr = M.filtros(ag, 'drinks')
  assert.deepEqual(dr.map((f) => [f.formato, f.elegido, f.apagada, f.toca]), [
    ['todos', false, false, true], ['dinner', false, true, true], ['drinks', true, false, true], ['movement', false, true, false], ['coffee', false, true, false],
  ])
  assert.equal(M.agenda(ag, 'drinks', Date.parse('2026-10-07T12:00:00Z')).flatMap((g) => g.filas).length, 1)
  assert.equal(M.agenda(ag, M.TODOS, Date.parse('2026-10-07T12:00:00Z')).flatMap((g) => g.filas).length, 2)
  // Un elegido sin fechas no filtra: vuelve a «Todos».
  assert.equal(M.filtros(ag, 'coffee')[0].elegido, true)
})
