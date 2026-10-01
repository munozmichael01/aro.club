/**
 * La verificación: se sube solo al pulsar «Usar esta», se arranca y se
 * repite lo que el servidor dice que falta.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { atascado, barras, conFoto, desdeServidor, empezar, falloAlSubir, inicial, pasosRevision, repetir, subida, subiendo } from '../src/verificacion/maquina'

test('sin empezar: la intro, con las dos pendientes', () => {
  const e = desdeServidor(inicial(), { estado: 'sin-empezar', cedulaLista: false, selfieLista: false })
  assert.deepEqual([e.fase, e.pendientes], ['intro', [0, 1]])
  assert.deepEqual([empezar(e).fase, empezar(e).toma], ['captura', 0])
})

test('con la cédula ya mandada: directo a la selfie, sin intro', () => {
  const e = desdeServidor(inicial(), { estado: 'sin-empezar', cedulaLista: true, selfieLista: false })
  assert.deepEqual([e.fase, e.toma, e.pendientes], ['captura', 1, [1]])
})

test('repetir ANTES de enviar no toca nada: la foto solo se va al usarla', () => {
  let e = empezar(inicial())
  e = conFoto(e, 'file://una.jpg')
  assert.equal(e.previa, 'file://una.jpg')
  e = repetir(e)
  assert.deepEqual([e.previa, e.pendientes], [null, [0, 1]], 'repetir no marca nada como enviado')
})

test('usar la cédula lleva a la selfie; usar la selfie, a revisión', () => {
  let e = subida(subiendo(conFoto(empezar(inicial()), 'file://cedula.jpg')))
  assert.deepEqual([e.fase, e.toma, e.pendientes, e.previa], ['captura', 1, [1], null])
  assert.deepEqual(barras(e), ['hecha', 'actual'])
  e = subida(subiendo(conFoto(e, 'file://selfie.jpg')))
  assert.equal(e.fase, 'revision')
})

test('si falla la subida, la foto se queda para reintentar; al segundo fallo, otra vía', () => {
  let e = falloAlSubir(subiendo(conFoto(empezar(inicial()), 'file://c.jpg')), 'No pudimos subir la foto.')
  assert.deepEqual([e.previa, e.pendientes, atascado(e)], ['file://c.jpg', [0, 1], false])
  e = falloAlSubir(subiendo(e), 'x')
  assert.equal(atascado(e), true)
  assert.equal(subida(subiendo(e)).intentos, 0, 'un acierto limpia la cuenta')
})

test('rechazada: se repite SOLO lo que el servidor rechazó', () => {
  const soloSelfie = desdeServidor(inicial(), {
    estado: 'rechazada', cedulaLista: true, selfieLista: false, motivo: { mensaje: 'Se ve borrosa.', permiteReintento: true },
  })
  assert.equal(soloSelfie.fase, 'rechazo')
  assert.deepEqual([empezar(soloSelfie).toma, empezar(soloSelfie).pendientes], [1, [1]])
  const ambas = desdeServidor(inicial(), { estado: 'rechazada', cedulaLista: false, selfieLista: false })
  assert.deepEqual(empezar(ambas).pendientes, [0, 1])
})

test('en revisión y aprobada', () => {
  assert.equal(desdeServidor(inicial(), { estado: 'revision', cedulaLista: true, selfieLista: true }).fase, 'revision')
  const h = desdeServidor(inicial(), { estado: 'aprobada', cedulaLista: true, selfieLista: true, revisadaEl: '3 de octubre de 2026', seBorraEl: '1 de enero de 2027' })
  assert.deepEqual([h.fase, h.revisadaEl, h.seBorraEl], ['hecha', '3 de octubre de 2026', '1 de enero de 2027'])
})

test('la foto se encoge a 1600 de lado largo, sin agrandar las pequeñas', async () => {
  const { reescalado } = await import('../src/verificacion/tamano')
  assert.deepEqual(reescalado(4032, 3024), { width: 1600 }, 'horizontal (la cédula)')
  assert.deepEqual(reescalado(3024, 4032), { height: 1600 }, 'vertical (la selfie)')
  assert.equal(reescalado(1200, 900), null)
})

test('en revisión no da el perfil por completo si faltan preguntas', () => {
  // Pasó el 01-10-2026: cuenta nueva con 12 preguntas pendientes y la pantalla
  // decía «Tu perfil está completo».
  assert.equal(pasosRevision(12)[0].titulo, 'Te faltan 12 preguntas')
  assert.equal(pasosRevision(12)[0].hecho, false)
  assert.equal(pasosRevision(1)[0].titulo, 'Te falta 1 pregunta')
  assert.equal(pasosRevision(0)[0].titulo, 'Tu perfil está completo')
  // Si no se sabe, no se afirma nada.
  assert.ok(pasosRevision(null).every((p) => p.titulo !== 'Tu perfil está completo'))
})
