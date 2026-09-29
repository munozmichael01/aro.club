/**
 * Los datos personales: reglas de `reglas.js`, edad bien contada, lo que se
 * enseña es lo que se guarda.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  PASO_CORREO,
  PASO_FIN,
  avisoEdad,
  cuerpoGuardar,
  desdeServidor,
  edad,
  errorTelefono,
  estadoClave,
  inicial,
  resumen,
  telefonoBonito,
  validar,
  type Estado,
} from '../src/datos/maquina'

const HOY = new Date(2026, 8, 27) // 27 de septiembre de 2026
const con = (x: Partial<Estado>): Estado => ({ ...inicial(), ...x })

test('la edad se cuenta bien, cumpleaños incluido', () => {
  assert.equal(edad({ dia: '27', mes: 9, anio: '2008' }, HOY), 18)
  assert.equal(edad({ dia: '28', mes: 9, anio: '2008' }, HOY), 17)
  assert.equal(edad({ dia: '31', mes: 2, anio: '1990' }, HOY), null, 'el 31 de febrero no existe')
  assert.equal(edad({ dia: '7', mes: 0, anio: '1990' }, HOY), null, 'sin mes, sin edad')
})

test('menores de 18: no pasan, y el aviso lo dice', () => {
  const e = con({ paso: 1, dia: '28', mes: 9, anio: '2008' })
  assert.deepEqual(validar(e, HOY), { listo: false, falta: 'Aro es para mayores de 18' })
  assert.match(avisoEdad(e, HOY)!, /mayores de 18/)
})

test('fecha a medias: «Completa día, mes y año» (la web decía «Revisa la fecha» sin mes)', () => {
  assert.equal(validar(con({ paso: 1, dia: '7', anio: '1990' }), HOY).falta, 'Completa día, mes y año')
})

test('el teléfono sale de reglas.js: el cero de delante se va, y se enseña lo que se guarda', () => {
  const e = con({ prefijo: '+58', telefono: '04121234567' })
  assert.equal(cuerpoGuardar(e).telefono, '+584121234567')
  assert.equal(telefonoBonito(e), '+58 412 1234567')
  assert.equal(errorTelefono(con({ telefono: '41212345' })), 'Ese número no se ve completo. Revisa el prefijo y las cifras.')
  assert.equal(errorTelefono(con({ telefono: '4121' })), null, 'con pocas cifras todavía no se juzga')
})

test('la fecha va en ISO por reglas.js, y el género por código', () => {
  const c = cuerpoGuardar(con({ nombre: ' Ana Pérez ', trato: 'Ana', dia: '7', mes: 3, anio: '1994', genero: 'no-binario', telefono: '4121234567' }))
  assert.deepEqual(c, { nombre: 'Ana Pérez', trato: 'Ana', nacimiento: '1994-03-07', genero: 'no-binario', telefono: '+584121234567' })
})

test('quien ya tiene los cuatro datos aterriza en el resumen', () => {
  const d = { nombre: 'Ana Pérez', trato: 'Ana', nacimiento: '1994-03-07', genero: 'mujer', telefono: '+584121234567', puedeCuenta: true }
  const e = desdeServidor(inicial(), d)
  assert.equal(e.paso, PASO_FIN)
  assert.deepEqual([e.dia, e.mes, e.anio, e.prefijo, e.telefono], ['7', 3, '1994', '+58', '4121234567'])
  assert.equal(desdeServidor(inicial(), { ...d, telefono: null }).paso, 0, 'con uno a medias, al paso 1')
  assert.equal(desdeServidor(con({ paso: PASO_CORREO }), d).paso, PASO_CORREO, 'no se salta el correo')
})

test('la contraseña usa la regla de reglas.js y avisa junto al campo', () => {
  assert.equal(estadoClave(con({ clave: '1234567' })).boton, 'Al menos ocho caracteres')
  assert.equal(estadoClave(con({ clave: '12345678' })).boton, 'Repite la contraseña')
  const d = estadoClave(con({ clave: '12345678', clave2: '12345679' }))
  assert.deepEqual([d.boton, d.dispares, d.lista], ['No coinciden', true, false])
  assert.equal(estadoClave(con({ clave: '12345678', clave2: '12345678' })).lista, true)
})

test('el resumen: el correo no se edita; cada fila vuelve a su paso; el trato cae al primer nombre', () => {
  const filas = resumen(con({ nombre: 'Ana Pérez', dia: '7', mes: 3, anio: '1994', telefono: '4121234567' }), 'ana@x.co', 'Mujer', HOY)
  assert.deepEqual(filas.map((f) => f.editar), [null, 0, 0, 1, 2, 3])
  assert.equal(filas[2].valor, 'Ana')
  assert.equal(filas[3].valor, '32 años')
  assert.equal(filas.filter((f) => f.loVen).length, 1, 'solo el trato lo ven los cinco')
})

test('el nacimiento que ya dio en el alta no se vuelve a preguntar', async () => {
  const { desdeServidor, inicial, pasoSiguiente, pasoAnterior, pasosVisibles } = await import('../src/datos/maquina')
  const e = desdeServidor(inicial(), { nacimiento: '1990-05-12' })
  assert.equal(e.nacimientoDado, true)
  assert.deepEqual(pasosVisibles(e), [0, 2, 3])
  assert.equal(pasoSiguiente({ ...e, paso: 0 }), 2, 'del nombre salta al género')
  assert.equal(pasoAnterior({ ...e, paso: 2 }), 0, 'y al volver, al nombre')
  const sin = desdeServidor(inicial(), {})
  assert.deepEqual(pasosVisibles(sin), [0, 1, 2, 3], 'sin nacimiento, se pregunta')
})
