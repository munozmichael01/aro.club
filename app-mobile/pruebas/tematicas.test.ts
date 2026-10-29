/**
 * El juego por temáticas (entrega tematicas, 29-10): sin orden, con memoria
 * de por dónde va cada una, y lo que queda después de terminar una.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/tematicas/maquina'

const T: M.Tematica[] = [
  { clave: 'a', nombre: 'Rápido', linea: '', preguntas: ['1', '2', '3', '4', '5'] },
  { clave: 'b', nombre: 'Historias', linea: '', preguntas: ['1', '2', '3', '4', '5'] },
  { clave: 'c', nombre: 'Para cerrar', linea: '', preguntas: ['1', '2', '3'] },
]

test('nueva, a medias y jugada', () => {
  let m = M.vacia()
  assert.deepEqual(M.estado(T[0], m), { tipo: 'nueva' })
  m = M.avanzar(m, T[1], 2)
  assert.deepEqual(M.estado(T[1], m), { tipo: 'aMedias', en: 3, de: 5 })
  assert.equal(M.empiezaEn(T[1], m), 2)
  m = M.avanzar(m, T[1], 5)
  assert.deepEqual(M.estado(T[1], m), { tipo: 'jugada' })
  // Jugada se puede repetir, y empieza por la primera.
  assert.equal(M.empiezaEn(T[1], m), 0)
})

test('después de terminar: primero a medias, luego nuevas, al final las jugadas; sin la recién terminada', () => {
  let m = M.vacia()
  m = M.avanzar(m, T[0], 5) // jugada
  m = M.avanzar(m, T[2], 1) // a medias
  m = M.avanzar(m, T[1], 5) // la recién terminada
  assert.deepEqual(M.queQueda(T, m, 'b').map((t) => t.clave), ['c', 'a'])
  assert.equal(M.todasJugadas(T, m), false)
})

test('el resumen de la tarjeta y una memoria rota no rompen nada', () => {
  let m = M.avanzar(M.vacia(), T[0], 5)
  m = M.avanzar(m, T[1], 2)
  assert.deepEqual(M.resumen(T, m), { jugadas: 1, aMedias: { nombre: 'Historias', en: 3, de: 5 } })
  assert.deepEqual(M.leer('{roto'), M.vacia())
  assert.deepEqual(M.leer(null), M.vacia())
})

// El mazo V3 (Michael, 29-10; reglas.js 951c8ab): cinco de cinco, en el orden de los iconos.
test('el mazo de reglas.js: cinco temáticas de cinco preguntas, con clave única', () => {
  const mazo = M.delMazo()
  assert.deepEqual(mazo.map((t) => t.clave), ['rapido', 'aqui', 'historias', 'ysi', 'temueve'])
  for (const t of mazo) {
    assert.equal(t.preguntas.length, 5, t.clave)
    assert.ok(t.nombre && t.linea, t.clave)
    assert.ok(t.preguntas.every((p) => !p.includes('—')), `${t.clave}: sin guiones largos`)
  }
})

// Los colores salen de reglas.js, los mismos que la web (bcc26e9): ninguna copia en la app.
test('el color y el icono de cada temática son los de su estilo en reglas.js, no los de su posición', () => {
  for (const [i, t] of M.delMazo().entries()) {
    assert.ok(t.estilo, `${t.clave} sin estilo en reglas.js`)
    assert.equal(M.estiloDe(i, t).fondo, t.estilo!.fondo)
    assert.equal(M.estiloDe(i, t).icono, t.estilo!.icono)
  }
})
