/**
 * El cuestionario: catálogo, por código, exclusivas y «cualquier zona» por
 * código, fecha que solo se guarda entera y adulta.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  aReenviar,
  alternar,
  armar,
  contestada,
  desdeServidor,
  elegir,
  enTope,
  faltantes,
  inicial,
  nombresDe,
  obligatorias,
  ponerFecha,
  textoContinuar,
  todasMarcadas,
  visibles,
  type Estado,
} from '../src/cuestionario/maquina'

const op = (...v: string[]) => v.map((x) => ({ valor: x, label: x.toUpperCase() }))
const CAT = [
  { clave: 'nacimiento', enunciado: '¿Cuándo naciste?', ayuda: null, tipo: 'date', opciones: [], min: null, max: null, obligatoria: true, pantalla: 1 },
  { clave: 'genero', enunciado: 'Género', ayuda: null, tipo: 'single', opciones: op('mujer', 'hombre'), min: null, max: null, obligatoria: true, pantalla: 1 },
  { clave: 'sector', enunciado: 'Sector', ayuda: null, tipo: 'single', layout: 'compacta', opciones: op('salud', 'tec'), min: null, max: null, obligatoria: true, pantalla: 1 },
  { clave: 'empleador', enunciado: 'Dónde', ayuda: null, tipo: 'text', opciones: [], autocomplete: ['Banesco', 'Polar'], min: null, max: null, obligatoria: true, pantalla: 1 },
  { clave: 'romance', enunciado: 'Romance', ayuda: null, tipo: 'single', opciones: op('no', 'si'), min: null, max: null, obligatoria: false, pantalla: 2 },
  { clave: 'temas', enunciado: 'Temas', ayuda: null, tipo: 'multi', opciones: op('a', 'b', 'c', 'd', 'e'), min: 2, max: 4, obligatoria: true, pantalla: 3 },
  { clave: 'evitar', enunciado: 'Evitar', ayuda: null, tipo: 'multi', opciones: op('politica', 'religion', 'ninguno'), min: null, max: null, exclusiva: 'ninguno', obligatoria: false, pantalla: 3 },
  { clave: 'zonas', enunciado: 'Zonas', ayuda: null, tipo: 'multi', opciones: op('mercedes', 'chacao', 'rosal'), min: 1, max: null, obligatoria: true, pantalla: 5 },
  { clave: 'idiomas', enunciado: 'Idiomas', ayuda: null, tipo: 'multi', opciones: op('es', 'en'), min: 1, max: null, obligatoria: true, pantalla: 5 },
]
const P = armar(CAT, [{ slug: 'chacao', nombre: 'Chacao' }, { slug: 'mercedes', nombre: 'Las Mercedes' }])!
const q = (clave: string) => P.find((x) => x.clave === clave)!
const HOY = new Date(2026, 8, 27)

test('del catálogo: tipos, pantallas 0–4, sugerencias y el sector en fichas', () => {
  assert.deepEqual(P.map((x) => [x.clave, x.tipo, x.pantalla]).slice(0, 4), [
    ['nacimiento', 'fecha', 0], ['genero', 'unica', 0], ['sector', 'ficha', 0], ['empleador', 'texto', 0],
  ])
  assert.deepEqual(q('empleador').sugerencias, ['Banesco', 'Polar'])
  assert.equal(armar([{ ...CAT[1], tipo: 'mapa' }], null), null, 'un tipo desconocido no se pinta')
})

test('las zonas, en el orden de /api/zonas, sin perder ninguna del catálogo', () => {
  assert.deepEqual(q('zonas').opciones.map((o) => o.valor), ['chacao', 'mercedes', 'rosal'])
})

test('la exclusiva deja solo a sí misma, por CÓDIGO', () => {
  let e = inicial()
  e = alternar(e, q('evitar'), 'politica')
  e = alternar(e, q('evitar'), 'religion')
  e = alternar(e, q('evitar'), 'ninguno')
  assert.deepEqual(e.r.evitar, ['ninguno'])
  e = alternar(e, q('evitar'), 'politica')
  assert.deepEqual(e.r.evitar, ['politica'], 'marcar otra quita «ninguno»')
})

test('«cualquier zona» marca las reales y no se guarda como zona', () => {
  let e = inicial()
  e = alternar(e, q('zonas'), null)
  assert.deepEqual(e.r.zonas, ['chacao', 'mercedes', 'rosal'])
  assert.equal(todasMarcadas(e, q('zonas')), true)
  e = alternar(e, q('zonas'), 'rosal')
  assert.equal(todasMarcadas(e, q('zonas')), false, 'quitar una desmarca el atajo')
  e = alternar(e, q('zonas'), 'rosal')
  assert.equal(todasMarcadas(e, q('zonas')), true, 'marcarlas todas a mano lo marca')
  assert.deepEqual(alternar(e, q('zonas'), null).r.zonas, [], 'y pulsarlo con todas las quita')
})

test('temas: tope de cuatro, la quinta no entra y se atenúa', () => {
  let e = inicial()
  for (const v of ['a', 'b', 'c', 'd']) e = alternar(e, q('temas'), v)
  assert.equal(alternar(e, q('temas'), 'e'), e)
  assert.equal(enTope(e, q('temas'), 'e'), true)
})

test('la fecha solo se guarda entera y adulta', () => {
  let r = ponerFecha(inicial(), { dia: '7', mes: 3 }, HOY)
  assert.equal(r.guardar, null)
  r = ponerFecha(r.e, { anio: '19' }, HOY)
  assert.equal(r.guardar, null, '«19» mientras teclea no se guarda')
  r = ponerFecha(r.e, { anio: '2015' }, HOY)
  assert.equal(r.guardar, null, 'un menor no se guarda')
  r = ponerFecha(r.e, { anio: '1994' }, HOY)
  assert.equal(r.guardar, '1994-03-07')
})

test('el botón nombra lo que falta; la opcional no cuenta', () => {
  let e: Estado = inicial()
  assert.equal(textoContinuar(e, P, HOY), 'Faltan 4 en esta pantalla')
  e = ponerFecha(e, { dia: '7', mes: 3, anio: '1994' }, HOY).e
  e = elegir(e, q('genero'), 'mujer')
  e = elegir(e, q('sector'), 'salud')
  assert.equal(textoContinuar(e, P, HOY), 'Falta dónde trabajas')
  e = { ...e, empleador: 'Polar' }
  assert.equal(textoContinuar(e, P, HOY), 'Continuar')
  assert.equal(contestada({ ...e, pantalla: 1 }, q('romance'), HOY), true, 'opcional')
})

test('lo guardado vuelve por código; lo que ya no existe no se pinta', () => {
  const e = desdeServidor(
    inicial(),
    { respuestas: { genero: 'mujer', temas: ['a', 'zzz'], empleador: 'Polar', nacimiento: '1994-03-07', sector: 'viejo' }, pantalla: 2, heredadas: ['genero'] },
    P,
  )
  assert.equal(e.r.genero, 'mujer')
  assert.deepEqual(e.r.temas, ['a'])
  assert.equal(e.r.sector, undefined, 'un código que ya no está en el catálogo no se da por contestado')
  assert.deepEqual([e.dia, e.mes, e.anio, e.empleador], ['7', 3, '1994', 'Polar'])
  assert.deepEqual([e.pantalla, e.retomada], [2, true])
  assert.deepEqual(e.heredadas, ['genero'], 'la heredada completa se salta')
  assert.deepEqual(e.r.idiomas, ['es'], 'idiomas premarcado con el primero, como la web')
  assert.ok(!visibles({ ...e, pantalla: 0 }, P).some((x) => x.clave === 'genero'))
})

test('completado va al cierre; se reenvía lo premarcado de la pantalla', () => {
  const e = desdeServidor(inicial(), { respuestas: {}, completado: true, donde: 'cuenta' }, P)
  assert.equal(e.fin, true)
  const logistica = { ...desdeServidor(inicial(), { respuestas: {} }, P), pantalla: 4 }
  assert.deepEqual(aReenviar(logistica, P).map((x) => x.clave), ['idiomas'])
})

test('el cierre cuenta las obligatorias del catálogo, y lo que falta se nombra', () => {
  assert.equal(obligatorias(P), 7)
  assert.deepEqual(nombresDe(['sector', 'zonas']), ['tu sector', 'tus zonas'])
  assert.equal(faltantes({ ...inicial(), pantalla: 2 }, P, HOY).length, 1)
})
