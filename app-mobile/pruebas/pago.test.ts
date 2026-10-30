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
  // El permiso de grabación solo viaja en una fecha que se graba (18-10).
  assert.equal('permiteGrabacion' in M.cuerpoReporte(REAL, PM, rep, null, true), false)
  const grabada = { ...REAL, evento: { ...REAL.evento, grabamos: true, permisoObligatorio: true } }
  assert.equal('permiteGrabacion' in M.cuerpoReporte({ ...REAL, evento: { ...REAL.evento, grabamos: true } }, PM, rep, null, true), false, 'opcional: no se pide al pagar')
  assert.equal(M.cuerpoReporte(grabada, PM, rep, null, true).permiteGrabacion, true)
  assert.equal('permiteGrabacion' in M.cuerpoReporte(grabada, PM, rep, null, false), false)
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

test('el día del pago se puede escribir y borrar (testers, Android, 06-10-2026)', () => {
  // Escribir «1» y luego «5»: el campo guarda lo tecleado, sin cero delante.
  let f = M.fechaPagoDePartes({ dia: '1', mes: 10, anio: '2026' })
  assert.equal(M.partesDeFechaPago(f).dia, '1')
  f = M.fechaPagoDePartes({ ...M.partesDeFechaPago(f), dia: '15' })
  assert.equal(M.partesDeFechaPago(f).dia, '15')
  // Borrar hasta vaciar: no aparece un «00» imposible de quitar.
  f = M.fechaPagoDePartes({ ...M.partesDeFechaPago(f), dia: '' })
  assert.equal(M.partesDeFechaPago(f).dia, '')
  // Al validar y al enviar, con su cero.
  assert.equal(M.conCeros('5/10/2026'), '05/10/2026')
  assert.equal(M.conCeros('27/09/2026'), '27/09/2026')
  const PM = REAL.metodos.find((m) => m.campos.some((c) => c.tipo === 'fecha'))!
  const campo = PM.campos.find((c) => c.tipo === 'fecha')!
  assert.ok(M.cumple(campo, '5/09/2026'))
})

// --- El código parcial (98b3728) ------------------------------------------------

const PARCIAL = (d: M.DeServidor) =>
  ({
    estado: 'descuento',
    codigo: 'ANDREA7KQ',
    pct: 20,
    nombre: 'Andrea',
    montoPleno: d.montoUsd,
    montoUsd: d.montoUsd * 0.8,
    tasa: d.tasa,
    tasaDe: d.tasaDe,
    montoLocal: d.montoLocal != null ? d.montoLocal * 0.8 : null,
    // Solo los encendidos, y al revés: emparejarlos por posición sería el fallo.
    metodos: d.metodos.filter((m) => m.activo).reverse().map((m) => ({ id: m.id, datos: [{ campo: 'Monto', valor: `rebajado-${m.id}`, copiar: `rebajado-${m.id}` }] })),
    puestoApartado: false,
  }) as const

test('el descuento sustituye los datos de cada método POR ID, nunca por posición', () => {
  const d = M.conDescuento(REAL, PARCIAL(REAL))
  for (const m of d.metodos) {
    if (m.activo) assert.equal(m.datos[0].valor, `rebajado-${m.id}`)
    else assert.deepEqual(m.datos, REAL.metodos.find((x) => x.id === m.id)!.datos)
  }
  assert.equal(d.montoUsd, REAL.montoUsd * 0.8)
})

test('la fila del recibo dice de quién es el código y cuánto quita; «Un puesto» sigue en el precio pleno', () => {
  const d = M.conDescuento({ ...REAL, montoUsd: 10 }, { ...PARCIAL({ ...REAL, montoUsd: 10 }) })
  assert.deepEqual(M.filaDescuento(d), { texto: 'Código de Andrea · −20%', cifra: '−2,00 ref' })
  assert.equal(M.precioPleno(d), 10)
  assert.equal(M.filaDescuento(M.conDescuento(REAL, { ...PARCIAL(REAL), nombre: null }))!.texto, 'Tu código · −20%')
  assert.equal(M.filaDescuento(REAL), null)
})

test('al reportar viaja el CÓDIGO, no el importe; sin descuento no viaja nada', () => {
  const m = REAL.metodos.find((x) => x.activo)!
  assert.equal(M.cuerpoReporte(M.conDescuento(REAL, PARCIAL(REAL)), m, {}, null).codigo, 'ANDREA7KQ')
  assert.equal('codigo' in M.cuerpoReporte(REAL, m, {}, null), false)
})

test('quien llegó invitada: el GET trae el descuento con montoPleno en la raíz, sale la fila y al reportar NO viaja el código', () => {
  const d = M.normalizar({ ...REAL, montoUsd: 8, montoPleno: 10, descuento: { codigo: 'ANDREA7KQ', pct: 20, nombre: 'Andrea' } } as any)
  assert.deepEqual(M.filaDescuento(d), { texto: 'Código de Andrea · −20%', cifra: '−2,00 ref' })
  assert.equal(M.precioPleno(d), 10)
  const m = REAL.metodos.find((x) => x.activo)!
  assert.equal('codigo' in M.cuerpoReporte(d, m, {}, null), false)
  assert.equal(M.normalizar({ ...REAL, descuento: null } as any).descuento, null)
})
