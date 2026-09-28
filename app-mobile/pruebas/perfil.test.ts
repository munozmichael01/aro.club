/**
 * Perfil: las opciones salen del catálogo, se guarda por código, y las
 * fechas de nacimiento no pasan por `Date` (medianoche UTC es el día
 * anterior en Caracas).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { test } from 'node:test'

import * as M from '../src/perfil/maquina'
import * as F from '../src/texto/fechas'

// La respuesta REAL de /api/mi-perfil con la cuenta del banco (prueba:perfil con GUARDAR).
const REAL = JSON.parse(fs.readFileSync(new URL('./datos/mi-perfil.json', import.meta.url), 'utf8')) as M.DeServidor

test('la fecha de nacimiento se lee del texto, sin corrimiento de zona', () => {
  assert.equal(F.fechaDeNacimiento('1990-05-12'), '12 de mayo de 1990')
  assert.equal(F.fechaDeNacimiento('1990-01-01'), '1 de enero de 1990')
  assert.equal(F.fechaDeNacimiento(''), null)
  assert.equal(F.fechaNumerica('2026-10-04T00:00:00Z', 'America/Caracas'), '03/10/2026')
  assert.equal(F.fechaCompleta('2026-10-04T00:00:00Z', 'America/Caracas'), '3 de octubre de 2026')
})

test('los campos: los cinco base y las preguntas del catálogo, cada una en su sección', () => {
  const c = M.campos(REAL)
  assert.deepEqual(c.filter((x) => x.seccion === 0).map((x) => x.clave), ['trato', 'nombre', 'nacimiento', 'genero', 'telefono'])
  assert.equal(c.filter((x) => x.clave === 'nacimiento').length, 1, 'el nacimiento del catálogo no se duplica')
  assert.ok(c.every((x) => x.seccion >= 0 && x.seccion <= 5))
  assert.ok(c.filter((x) => x.tipo === 'unica' || x.tipo === 'multi').every((x) => x.opciones.every(([t, cod]) => t && cod)))
})

test('cómo se lee cada valor', () => {
  const c = M.campos(REAL)
  const v = M.valores(REAL)
  const de = (k: string) => M.texto(c.find((x) => x.clave === k)!, v[k] ?? null)
  assert.equal(de('nacimiento'), '12 de mayo de 1990')
  assert.equal(de('genero'), 'Mujer')
  assert.equal(de('telefono'), '+58 412 1234567')
  const multi = c.find((x) => x.tipo === 'multi')!
  assert.equal(M.texto(multi, []), 'Sin responder')
})

test('editar una múltiple: tope, exclusiva y mínimo', () => {
  const c: M.Campo = { clave: 'z', seccion: 5, etiqueta: '', ayuda: null, tipo: 'multi', opciones: [['A', 'a'], ['B', 'b'], ['C', 'c'], ['Cualquiera', 'todo']], min: 1, max: 2, exclusiva: 'todo' }
  let b: M.Valor = []
  assert.equal(M.falta(c, b), 'Elige al menos 1')
  b = M.marcar(c, b, 'a')
  b = M.marcar(c, b, 'b')
  assert.deepEqual(M.marcar(c, b, 'c'), ['a', 'b'], 'el tope no deja pasar una tercera')
  assert.deepEqual(M.marcar(c, b, 'todo'), ['todo'], 'la exclusiva limpia las demás')
  assert.deepEqual(M.marcar(c, ['todo'], 'a'), ['a'], 'y otra quita la exclusiva')
  assert.equal(M.falta(c, b), null)
})

test('lo que se guarda: códigos, teléfono en E.164 y fechas completas', () => {
  const c = M.campos(REAL)
  assert.equal(M.paraGuardar(c.find((x) => x.clave === 'telefono')!, '4141234567'), '+584141234567')
  assert.equal(M.paraGuardar(c.find((x) => x.clave === 'genero')!, 'hombre'), 'hombre')
  const f = c.find((x) => x.clave === 'nacimiento')!
  assert.equal(M.falta(f, '1990--12'), 'Completa la fecha')
  assert.equal(M.juntarFecha({ ...M.partesFecha('1990-05-12'), mes: 7 }), '1990-07-12')
})

test('credenciales, historial y baja', () => {
  assert.deepEqual(M.credenciales(REAL).map((x) => x.texto), ['Identidad verificada', 'Perfil completo', '0 créditos'])
  assert.equal(M.credenciales({ ...REAL, completo: false, faltanBase: 1, faltanPreguntas: 0 })[1].texto, 'Falta un dato personal')
  const h = M.historial(REAL)
  assert.equal(h[0].estado, 'Fuiste')
  assert.match(h[0].sitio, / · mesa 01$/)
  assert.equal(M.puedeBaja(' baja '), true)
  assert.equal(M.puedeBaja('bajas'), false)
})
