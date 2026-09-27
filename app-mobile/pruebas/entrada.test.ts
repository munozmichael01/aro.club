/**
 * La entrada: la puerta sale de reglas.js (PUERTA) y las zonas de /api/zonas;
 * se guarda por código.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { completa, cuerpoDeRespuestas, destinoDeRepetido, enTope, inicial, reducir, type Estado } from '../src/entrada/maquina'
import { preguntasDeEntrada } from '../src/entrada/preguntas'
import { reglas, type PreguntaPuerta } from '../src/reglas'
import { enumerar } from '../src/texto/entrada'

const PUERTA: Record<string, PreguntaPuerta> = {
  arraigo: { clave: 'arraigo', etiqueta: 'ARRAIGO', tipo: 'unica', pregunta: '¿Cuál?', ayuda: 'Una sola.', opciones: [['Volví', 'volvio'], ['De paso', 'visita']] },
  zonas: { clave: 'zonas', etiqueta: 'ZONAS', tipo: 'multi', max: 5, pregunta: '¿Dónde?', ayuda: 'Hasta cinco.', opciones: [] },
  dias: { clave: 'dias', etiqueta: 'DÍAS', tipo: 'multi', pregunta: '¿Qué días?', ayuda: null, opciones: [['Jueves noche', 'jue'], ['Sábado noche', 'sab']] },
  temas: {
    clave: 'temas', etiqueta: 'CONVERSACIÓN', tipo: 'multi', min: 2, max: 4, pregunta: '¿De qué?', ayuda: null,
    opciones: [['Cocina', 'cocina'], ['Viajes', 'viajes'], ['Cine', 'cine'], ['Música', 'musica'], ['Libros', 'libros']],
  },
}
const ORDEN = ['arraigo', 'zonas', 'dias', 'temas']
const ZONAS = ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => ({ slug: s, nombre: s.toUpperCase() }))
const P = preguntasDeEntrada(PUERTA, ORDEN, ZONAS)!

test('el PUERTA real de reglas.js da las cuatro, con su forma', () => {
  const reales = preguntasDeEntrada(reglas.PUERTA, reglas.ORDEN_PUERTA, ZONAS)
  assert.ok(reales, 'PUERTA de reglas.js no se deja leer')
  assert.deepEqual(reales!.map((p) => p.clave), ['arraigo', 'zonas', 'dias', 'temas'])
  assert.equal(reales![1].max, 5, 'el tope de zonas de la puerta viene de reglas.js')
  assert.deepEqual([reales![3].min, reales![3].max], [2, 4])
})

test('las zonas son las de /api/zonas, por slug', () => {
  assert.deepEqual(P[1].opciones.slice(0, 2), [{ valor: 'a', label: 'A' }, { valor: 'b', label: 'B' }])
})

test('sin zonas, o con un tipo desconocido, no se pinta a medias', () => {
  assert.equal(preguntasDeEntrada(PUERTA, ORDEN, []), null)
  assert.equal(preguntasDeEntrada({ ...PUERTA, dias: { ...PUERTA.dias, tipo: 'mapa' as never } }, ORDEN, ZONAS), null)
  assert.equal(preguntasDeEntrada(PUERTA, [...ORDEN, 'nueva'], ZONAS), null)
})

test('se guarda por CÓDIGO', () => {
  let e: Estado = { ...inicial('ana@ejemplo.com'), fase: 'quiz' }
  const [arraigo, zonas, dias, temas] = P
  e = reducir(e, { tipo: 'marcar', pregunta: arraigo, valor: 'visita' })
  e = reducir(e, { tipo: 'marcar', pregunta: zonas, valor: 'c' })
  e = reducir(e, { tipo: 'marcar', pregunta: dias, valor: 'sab' })
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cine' })
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cocina' })
  assert.deepEqual(cuerpoDeRespuestas(e, 'tok'), {
    correo: 'ana@ejemplo.com', token: 'tok', arraigo: 'visita', zonas: ['c'], dias: ['sab'], temas: ['cine', 'cocina'],
  })
})

test('una de una sola sustituye; una de varias alterna', () => {
  const [arraigo, , , temas] = P
  let e = inicial()
  e = reducir(e, { tipo: 'marcar', pregunta: arraigo, valor: 'volvio' })
  e = reducir(e, { tipo: 'marcar', pregunta: arraigo, valor: 'visita' })
  assert.deepEqual(e.respuestas.arraigo, ['visita'])
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cine' })
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cine' })
  assert.deepEqual(e.respuestas.temas, [])
})

test('temas: entre dos y cuatro, y la quinta no entra', () => {
  const temas = P[3]
  let e = inicial()
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cocina' })
  assert.equal(completa(e, temas), false)
  for (const v of ['viajes', 'cine', 'musica']) e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: v })
  assert.equal(completa(e, temas), true)
  assert.equal(enTope(e, temas, 'libros'), true)
  assert.equal(reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'libros' }), e)
})

test('zonas: tope de cinco en la puerta', () => {
  const zonas = P[1]
  let e = inicial()
  for (const z of ZONAS) e = reducir(e, { tipo: 'marcar', pregunta: zonas, valor: z.slug })
  assert.deepEqual(e.respuestas.zonas, ['a', 'b', 'c', 'd', 'e'])
})

test('repetido lleva a su fase; un fallo vuelve al correo con el mensaje del servidor', () => {
  assert.equal(reducir({ ...inicial('a@b.co'), fase: 'enviando' }, { tipo: 'guardado', repetido: true }).fase, 'repetido')
  const f = reducir({ ...inicial('a@b.co'), fase: 'enviando' }, { tipo: 'fallo', error: 'Ese correo no se ve completo.' })
  assert.deepEqual([f.fase, f.error], ['correo', 'Ese correo no se ve completo.'])
})

test('si no se pudieron guardar las respuestas, NO se dice «tienes puesto»', () => {
  assert.equal(reducir({ ...inicial('a@b.co'), fase: 'guardando' }, { tipo: 'falloAlTerminar', error: 'x' }).fase, 'quiz')
})

test('quien vuelve va a lo que le falta; sin token, a «ya estás registrado»', () => {
  assert.equal(destinoDeRepetido({ quizCompletado: false }, true), 'quiz')
  assert.equal(destinoDeRepetido({ quizCompletado: true }, true), 'datos')
  assert.equal(destinoDeRepetido({ quizCompletado: false }, false), 'repetido')
})

test('enumerar zonas como la web', () => {
  assert.equal(enumerar([], 'tu zona'), 'tu zona')
  assert.equal(enumerar(['Chacao', 'Altamira', 'El Rosal'], ''), 'Chacao, Altamira y El Rosal')
})
