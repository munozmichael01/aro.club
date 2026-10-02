/**
 * Pago: los montos como se escriben en Venezuela, el botón que nombra lo
 * que falta, y el cuerpo que se reporta (solo los campos del método).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

import * as M from '../src/pago/maquina'
import * as F from '../src/texto/fechas'

// La respuesta REAL de GET /api/pago (datos de la cuenta cambiados por inventados).
const REAL = JSON.parse(fs.readFileSync(new URL('./datos/pago.json', import.meta.url), 'utf8')) as M.DeServidor
const PM = REAL.metodos.find((m) => m.id === 'pm')!
const AHORA = new Date('2026-09-28T15:00:00Z').getTime()

test('dinero, tasa y cabecera', () => {
  assert.equal(M.dinero(5999.04, 'Bs'), '5.999,04 Bs')
  assert.equal(M.dinero(7, 'USD'), '7,00 USD')
  assert.equal(M.dinero(null, 'Bs'), '—')
  assert.equal(M.etiquetaTasa({ ...REAL, tasaDe: '2026-09-28' }, AHORA), 'Tasa BCV de hoy')
  assert.equal(M.etiquetaTasa({ ...REAL, tasaDe: '2026-09-26' }, AHORA), 'Tasa BCV del 26 de septiembre')
  assert.equal(M.etiquetaTasa({ ...REAL, tasaDe: '2026-09-28' }, new Date('2026-09-29T02:00:00Z').getTime()), 'Tasa BCV de hoy', 'a las 22 h en Caracas sigue siendo el 28')
  assert.deepEqual(M.cabecera(REAL), { nombre: 'Cena · Sábado 3', detalle: '8:00 p.m.' })
})

test('las fases salen de lo que ya reportó', () => {
  assert.equal(M.faseDeServidor(REAL, AHORA), 'elegir')
  const pago = { metodo: 'pm', reportadoEn: '' }
  assert.equal(M.faseDeServidor({ ...REAL, pago: { ...pago, estado: 'under_review' } }), 'pendiente')
  assert.equal(M.faseDeServidor({ ...REAL, pago: { ...pago, estado: 'confirmed' } }), 'listo')
  assert.equal(M.faseDeServidor({ ...REAL, pago: { ...pago, estado: 'rejected' } }), 'fallo')
  assert.equal(M.metodoInicial(REAL), 0, 'el primero encendido')
})

test('el reporte de Pago Móvil: el botón nombra lo que falta, en orden', () => {
  let rep = M.repInicial()
  assert.equal(M.estadoReporte(PM, rep, false, AHORA).falta, 'Teléfono emisor')
  rep = { ...rep, tel: M.filtrar(PM.campos[0], '0414-123.45.67') }
  assert.equal(rep.tel, '4141234567', 'el 0 de delante y los separadores fuera')
  rep = { ...rep, doc: M.filtrar(PM.campos[1], 'V12345678'), banco: '0105', ref: '123456' }
  assert.equal(M.estadoReporte(PM, rep, false, AHORA).falta, 'Fecha del pago')
  rep = { ...rep, fecha: M.fechaPagoDePartes({ dia: '5', mes: 10, anio: '2026' }) }
  const futura = M.estadoReporte(PM, rep, false, AHORA)
  assert.deepEqual([futura.ok, futura.fechaFutura], [false, true], 'un pago no se reporta antes de hacerlo')
  rep = { ...rep, fecha: '27/09/2026' }
  assert.equal(M.estadoReporte(PM, rep, false, AHORA).ok, true)
  assert.equal(M.estadoReporte(PM, { ...rep, banco: 'Banesquito' }, false, AHORA).falta, 'Banco emisor', 'el banco, de la lista')
})

test('lo que viaja: solo los campos del método, la letra y la tasa vista', () => {
  const rep = { doc_tipo: 'E', tel: '4141234567', doc: '12345678', banco: '0105', ref: '123456', fecha: '27/09/2026', otra: 'x' }
  assert.deepEqual(M.cuerpoReporte(REAL, PM, rep, 'yo/1.jpg'), {
    eventoId: REAL.evento.id,
    metodo: 'pm',
    datos: { tel: '4141234567', doc: '12345678', banco: '0105', ref: '123456', fecha: '27/09/2026', doc_tipo: 'E' },
    captura: 'yo/1.jpg',
    tasaVista: REAL.tasa,
  })
})

test('Bizum exige captura; la fecha va y vuelve entre DD/MM/AAAA y sus partes', () => {
  const bizum = REAL.metodos.find((m) => m.id === 'bizum')!
  const rep = { titular: 'Ana Pérez', tel: '611223344', fecha: '27/09/2026' }
  assert.deepEqual([M.estadoReporte(bizum, rep, false, AHORA).ok, M.estadoReporte(bizum, rep, true, AHORA).ok], [false, true])
  assert.deepEqual(M.partesDeFechaPago('27/09/2026'), { dia: '27', mes: 9, anio: '2026' })
  assert.equal(F.esFutura('28/09/2026', AHORA), false, 'hoy no es futuro')
})

test('el comprobante no inventa: sin zona dice que se sabe al abrirse', () => {
  const c = M.comprobante(REAL, PM, 'pendiente')
  assert.deepEqual(c.map((x) => x.campo), ['Cena', 'Zona', 'Método', 'Tasa aplicada', 'Reportaste'])
  assert.equal(c[1].valor, 'Se sabe al abrirse')
  assert.equal(c[0].valor, 'Sábado 3, 8:00 p.m.')
  assert.equal(M.cuandoSeAbre(REAL), null, 'sin revelaEn no se dice ninguna hora')
})

test('fecha cerrada: no se enseñan los datos para pagar (01-10-2026)', () => {
  const cierra = Date.parse(REAL.evento.cierraEn!)
  assert.equal(M.faseDeServidor(REAL, cierra + 1), 'cerrada')
  assert.equal(M.faseDeServidor(REAL, cierra - 1), 'elegir')
  // Quien ya reportó ve su pago, aunque la fecha haya cerrado después.
  assert.equal(M.faseDeServidor({ ...REAL, pago: { metodo: 'pm', reportadoEn: '', estado: 'under_review' } }, cierra + 1), 'pendiente')
  assert.ok(M.esFechaCerrada({ status: 409, error: 'Esa fecha ya cerró.' }))
  assert.ok(M.esFechaCerrada({ status: 409, motivo: 'fecha-cerrada', error: 'x' }))
  assert.ok(!M.esFechaCerrada({ status: 409, error: 'Ese pago ya está reportado.' }))
})
