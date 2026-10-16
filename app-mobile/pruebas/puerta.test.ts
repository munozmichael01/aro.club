/** El alta de la app: la puerta de los 18 antes de crear nada, y las respuestas por código. */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/puerta/maquina'

const HOY = new Date(2026, 8, 29)
const con = (dia: string, mes: number, anio: string): M.Borrador => ({ respuestas: {}, nacimiento: { dia, mes, anio } })

test('la fecha: a medias, rara, menor o válida', () => {
  assert.equal(M.estadoFecha(con('', 0, ''), HOY), 'incompleta')
  assert.equal(M.estadoFecha(con('31', 2, '1990'), HOY), 'rara', 'el 31 de febrero no existe')
  assert.equal(M.estadoFecha(con('12', 5, '2010'), HOY), 'menor')
  assert.equal(M.estadoFecha(con('30', 9, '2008'), HOY), 'menor', 'cumple 18 mañana')
  assert.equal(M.estadoFecha(con('29', 9, '2008'), HOY), 'ok', 'cumple 18 hoy')
  assert.equal(M.nacimientoISO(con('5', 3, '1990'), HOY), '1990-03-05')
})

test('lo que va a /api/cuestionario: arraigo suelto, listas, y el nacimiento', () => {
  const b: M.Borrador = { respuestas: { arraigo: ['volvi'], zonas: ['chacao'], dias: ['sab-noche'], temas: ['cine', 'viajes'] }, nacimiento: { dia: '12', mes: 5, anio: '1990' } }
  assert.deepEqual(M.envios(b, HOY), [
    { clave: 'arraigo', valor: 'volvi' },
    { clave: 'zonas', valor: ['chacao'] },
    { clave: 'dias', valor: ['sab-noche'] },
    { clave: 'temas', valor: ['cine', 'viajes'] },
    { clave: 'nacimiento', valor: '1990-05-12' },
  ])
  assert.deepEqual(M.envios(M.vacio(), HOY), [], 'lo no respondido no se manda')
})

test('después, a donde diga el embudo', () => {
  assert.equal(M.destinoDeEstado('datos'), '/datos')
  assert.equal(M.destinoDeEstado('perfil'), '/cuestionario')
  assert.equal(M.destinoDeEstado('verificar'), '/verificacion')
  assert.equal(M.destinoDeEstado('reservar'), '/cuenta')
  assert.equal(M.destinoDeEstado(null), '/cuenta')
})

test('en una ciudad cerrada la puerta termina en la ciudad: no se manda nada de la puerta', async () => {
  const b = { ...M.vacio(), respuestas: { arraigo: ['volvio'], zonas: ['chacao'], dias: ['sabado-noche'], temas: ['viajes'] }, ciudad: 'valencia' }
  const cs = [{ slug: 'caracas', nombre: 'Caracas', abierta: true }, { slug: 'valencia', nombre: 'Valencia', abierta: false }, { slug: 'otra', nombre: 'Otra ciudad', abierta: false }]
  assert.ok(M.esFuera(b, cs))
  assert.deepEqual(M.envios(b, new Date('2026-10-07T12:00:00Z'), cs).map((e) => e.clave), [])
  assert.ok(!M.esFuera({ ...b, ciudad: 'caracas' }, cs))
  // Lo que decide es si está abierta, no el nombre: el día que abra Valencia, sigue la puerta.
  assert.ok(!M.esFuera(b, cs.map((c) => (c.slug === 'valencia' ? { ...c, abierta: true } : c))))
  // La pregunta de la ciudad, con las de /api/ciudades, y la frase de reglas.js.
  const { preguntaCiudad } = await import('../src/entrada/preguntas')
  const { reglas } = await import('../src/reglas')
  assert.deepEqual(preguntaCiudad(reglas.PUERTA, cs)?.opciones.map((o) => o.valor), ['caracas', 'valencia', 'otra'])
  assert.equal(preguntaCiudad(reglas.PUERTA, []), null)
  assert.deepEqual(reglas.pasosDePuerta(false), ['ciudad'])
  assert.equal(reglas.CIUDAD_CERRADA('Valencia', 'valencia').titulo, 'Valencia todavía no.')
  assert.equal(M.nombreDeCiudad(cs, 'valencia'), 'Valencia')
  assert.equal(M.nombreDeCiudad(cs, 'otra'), 'tu ciudad')
})
