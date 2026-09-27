/**
 * La entrada: el catálogo manda, y se guarda por código.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { completa, cuerpoDeRespuestas, enTope, inicial, reducir, type Estado } from '../src/entrada/maquina'
import { preguntasDeEntrada, type PreguntaCatalogo } from '../src/entrada/preguntas'
import { enumerar } from '../src/texto/entrada'

const op = (...pares: [string, string][]) => pares.map(([valor, label]) => ({ valor, label }))
const CATALOGO: { preguntas: PreguntaCatalogo[] } = {
  preguntas: [
    { clave: 'nacimiento', enunciado: '¿Cuándo naciste?', ayuda: null, tipo: 'date', opciones: [], min: null, max: null },
    { clave: 'temas', enunciado: '¿De qué podrías hablar?', ayuda: null, tipo: 'multi', opciones: op(['cocina', 'Cocina y restaurantes'], ['viajes', 'Viajes'], ['cine', 'Cine'], ['musica', 'Música'], ['libros', 'Libros']), min: 2, max: 4 },
    { clave: 'arraigo', enunciado: '¿Te suena alguna?', ayuda: null, tipo: 'single', opciones: op(['volvio', 'Me fui y volví'], ['visita', 'Estoy de paso']), min: null, max: null },
    { clave: 'dias', enunciado: '¿Qué días?', ayuda: null, tipo: 'multi', opciones: op(['jue', 'Jueves noche'], ['sab', 'Sábado noche']), min: 1, max: null },
    { clave: 'zonas', enunciado: '¿Qué zonas?', ayuda: null, tipo: 'multi', opciones: op(['chacao', 'Chacao'], ['mercedes', 'Las Mercedes']), min: 1, max: null },
  ],
}

const P = preguntasDeEntrada(CATALOGO)!

test('las cuatro, en el orden del pedido, aunque el catálogo venga en otro', () => {
  assert.deepEqual(P.map((p) => p.clave), ['arraigo', 'zonas', 'dias', 'temas'])
})

test('si falta una, o trae un tipo desconocido, no se pinta a medias', () => {
  assert.equal(preguntasDeEntrada({ preguntas: CATALOGO.preguntas.filter((p) => p.clave !== 'dias') }), null)
  const raro = CATALOGO.preguntas.map((p) => (p.clave === 'zonas' ? { ...p, tipo: 'mapa' } : p))
  assert.equal(preguntasDeEntrada({ preguntas: raro }), null)
})

test('se guarda por CÓDIGO, aunque la etiqueta cambie o se reordene', () => {
  let e: Estado = { ...inicial('ana@ejemplo.com'), fase: 'quiz' }
  const [arraigo, zonas, dias, temas] = P
  e = reducir(e, { tipo: 'marcar', pregunta: arraigo, valor: 'visita' })
  e = reducir(e, { tipo: 'marcar', pregunta: zonas, valor: 'mercedes' })
  e = reducir(e, { tipo: 'marcar', pregunta: dias, valor: 'sab' })
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cine' })
  e = reducir(e, { tipo: 'marcar', pregunta: temas, valor: 'cocina' })
  assert.deepEqual(cuerpoDeRespuestas(e, 'tok'), {
    correo: 'ana@ejemplo.com', token: 'tok', arraigo: 'visita', zonas: ['mercedes'], dias: ['sab'], temas: ['cine', 'cocina'],
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

test('repetido lleva a su fase y no al quiz; un fallo vuelve al correo con el mensaje del servidor', () => {
  assert.equal(reducir({ ...inicial('a@b.co'), fase: 'enviando' }, { tipo: 'guardado', repetido: true }).fase, 'repetido')
  const f = reducir({ ...inicial('a@b.co'), fase: 'enviando' }, { tipo: 'fallo', error: 'Ese correo no se ve completo.' })
  assert.deepEqual([f.fase, f.error], ['correo', 'Ese correo no se ve completo.'])
})

test('si no se pudieron guardar las respuestas, NO se dice «tienes puesto»', () => {
  const e = reducir({ ...inicial('a@b.co'), fase: 'guardando' }, { tipo: 'falloAlTerminar', error: 'x' })
  assert.equal(e.fase, 'quiz')
})

test('enumerar zonas como la web', () => {
  assert.equal(enumerar([], 'tu zona'), 'tu zona')
  assert.equal(enumerar(['Chacao'], ''), 'Chacao')
  assert.equal(enumerar(['Chacao', 'Altamira', 'El Rosal'], ''), 'Chacao, Altamira y El Rosal')
})
