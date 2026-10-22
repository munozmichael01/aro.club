/**
 * Mi mesa: la fase la dice el servidor; los días se calculan en la zona de
 * la fecha; lo de después solo manda lo que se contestó.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'

import * as M from '../src/mesa/maquina'
import * as F from '../src/texto/fechas'

const Z = 'America/Caracas'
// Sábado 3 de octubre, 20:00 en Caracas; revela ese día a las 12:00.
const CENA = '2026-10-04T00:00:00Z'
const REVELA = '2026-10-03T16:00:00Z'

test('las fechas de la mesa, en la hora de la ciudad', () => {
  assert.equal(F.tienesPuesto(CENA, Z), 'Tienes puesto el sábado.')
  assert.equal(F.cenaCorta('Cena', CENA, Z), 'Cena · sábado 3')
  assert.equal(F.selloSeAbre(REVELA, Z, new Date('2026-09-30T12:00:00Z').getTime()), 'SE ABRE EL SÁBADO A LAS 12:00 P.M.')
  assert.equal(F.selloSeAbre(REVELA, Z, new Date('2026-10-03T13:00:00Z').getTime()), 'SE ABRE HOY A LAS 12:00 P.M.')
  assert.equal(F.cuandoMesa(CENA, Z, new Date('2026-10-03T20:00:00Z').getTime()), 'Hoy · 8:00 p.m.', 'hoy en Caracas aunque en UTC ya sea domingo')
  assert.equal(F.cuandoMesa(CENA, Z, new Date('2026-10-01T20:00:00Z').getTime()), 'Sábado · 8:00 p.m.')
  assert.equal(F.cuentaMesa(REVELA, new Date('2026-10-01T13:47:00Z').getTime()), '2d 02h 13m')
  assert.equal(F.cuentaMesa(REVELA, new Date('2026-10-03T13:59:30Z').getTime()), '02:00:30')
  assert.equal(F.elMismoDia(CENA, Z), 'el mismo sábado')
})

test('las fases: la dice el servidor, y sin mesa son tres casos distintos', () => {
  assert.equal(M.fase({ fase: 'cerrada' }), 'cerrada')
  assert.equal(M.fase({ fase: 'sin-mesa' }), 'vacia')
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'pending_verification' }).sello, 'EN REVISIÓN')
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'pending_verification' }).accion, null, 'quien espera la revisión no tiene nada que hacer')
  // `sin-mesa` es después de la revelación: «Esta vez no entraste», y el crédito lo dice el servidor (17-10).
  const sin = M.vacia({ fase: 'sin-mesa', empiezaEn: CENA, zonaHoraria: Z, creditoDevuelto: true })
  assert.equal(sin.sello, 'ESTA VEZ NO')
  assert.equal(sin.titulo, 'Esta vez no entraste.')
  assert.match(sin.nota, /^Tu crédito volvió entero/)
  assert.equal(sin.accion, 'Apuntarme a la próxima')
  assert.match(M.vacia({ fase: 'sin-mesa', creditoDevuelto: false }).nota, /^Tu crédito sigue descontado/)
  assert.match(M.vacia({ fase: 'sin-mesa' }).nota, /^Tu crédito volvió/, 'sin el campo (servidor viejo), lo de antes')
  assert.equal(M.vacia({ fase: 'sin-reserva', estado: 'active' }).accion, 'Ver la próxima fecha')
})

test('mesa o grupo según el formato; la actividad solo en movimiento', () => {
  assert.equal(M.esMesa({ fase: 'abierta', formato: 'dinner' }), true)
  assert.equal(M.voz({ fase: 'abierta', formato: 'walk' }).TU, 'TU GRUPO')
  const act = M.actividad({ fase: 'abierta', formato: 'walk', actividad: { ruta: 'La Silla', km: 7, nivel: 'medio' } })
  assert.deepEqual(act, { titulo: 'La Silla', nota: '7 km · nivel medio' })
  assert.equal(M.actividad({ fase: 'abierta', formato: 'dinner', actividad: { ruta: 'x' } }), null)
  assert.equal(M.numero({ fase: 'abierta', numeroMesa: 4 }), '04')
})

test('cómo llegar: Apple Maps en iOS, Google en Android', () => {
  const d = { fase: 'abierta', mapa: 'https://google', mapaApple: 'https://apple' }
  // Google Maps manda en los dos (17-10); Apple solo si no hay otro.
  assert.equal(M.mapa(d, 'ios'), 'https://google')
  assert.equal(M.mapa(d, 'android'), 'https://google')
  assert.equal(M.mapa({ fase: 'abierta', mapa: 'https://google' }, 'ios'), 'https://google')
  assert.equal(M.mapa({ fase: 'abierta', mapaApple: 'https://apple' }, 'ios'), 'https://apple')
})

test('lo de después: solo lo contestado, índices de mejor a peor, y lo ya hecho se recupera', () => {
  const v = M.valoracionVacia()
  assert.equal(M.algoQueContar(v), false, 'enviar en blanco no es contar nada')
  assert.deepEqual(M.cuerpoValorar('m', { ...v, mesa: 0, sitio: { comida: 3, ambiente: -1 }, volveria: 1 }), {
    accion: 'valorar', mesaId: 'm', mesa: 0, sitio: { comida: 3 }, volveriaAAro: true, comentario: null, gasto: null, noRepetirSitio: false,
  })
  assert.equal(M.algoQueContar({ ...v, bloqueados: ['x'] }), true)
  assert.equal(M.algoQueContar({ ...v, comentario: 'la música alta' }), true, 'solo un comentario se puede enviar')
  assert.equal(M.algoQueContar({ ...v, comentario: '   ' }), false)
  assert.equal(M.algoQueContar({ ...v, gasto: 0 }), true)
  assert.deepEqual(M.alternar(['a', 'b'], 'a'), ['b'])
  const ya = M.yaHecho({ fase: 'pasada', yaValoro: true, yaReporto: 'b', yaBloqueados: ['b', 'fuera'], companeros: [{ id: 'b', nombre: 'B', sector: null }] })
  assert.deepEqual(ya, { contado: true, reportadoA: 'b', bloqueados: ['b'] })
})

test('la única mesa del sitio no lleva número', async () => {
  const T = await import('../src/texto/mesa')
  assert.equal(M.conNumero({ fase: 'abierta', numeroMesa: 1, mesaUnica: true } as M.DeServidor), false)
  assert.equal(M.conNumero({ fase: 'abierta', numeroMesa: 2 } as M.DeServidor), true)
  assert.equal(T.abierta.llegada(true, '', 6), 'Di que vas a la mesa de Aro. Está reservada a tu nombre y el restaurante ya sabe que son seis.')
  assert.match(T.abierta.llegada(true, '02', 6), /la 02\./)
  assert.match(T.pasada.bajada(M.voz({ fase: 'pasada', formato: 'dinner' } as M.DeServidor).estuviste, 'Madre', 'mesa', ''), /^Cenaste en Madre\. /)
  // Un drinks tiene mesa pero no es una cena (reglas.js, DE_CENA).
  const drinks = M.voz({ fase: 'pasada', formato: 'drinks' } as M.DeServidor)
  assert.match(T.pasada.bajada(drinks.estuviste, 'Madre', 'mesa', ''), /^Estuviste en Madre\. /)
  assert.equal(drinks.conQuien, 'CON QUIÉN VAS')
  assert.equal(T.cerrada.nota(drinks.vasCon), 'Vas con cinco personas. Te avisamos por correo en cuanto se abra.')
})

test('quien se sumó después y el detalle de un sitio para seguir (16-10, como la web)', async () => {
  const M = await import('../src/mesa/maquina')
  const o = M.otros({ fase: 'abierta', companeros: [{ id: 'a', nombre: 'Ana', sector: 'Salud', seUnioDespues: true }, { id: 'b', nombre: 'Beto', sector: null }] } as M.DeServidor)
  assert.deepEqual(o.map((x) => x.seUnio), [true, false])
  const aPie = (n: number) => `${n} min a pie`
  assert.equal(M.detalleSitio({ nombre: 'X', minutosAPie: 3, precio: 'Barato' }, aPie), '3 min a pie · Barato')
  assert.equal(M.detalleSitio({ nombre: 'X', minutosAPie: null, precio: 'Caro' }, aPie), 'Caro')
  assert.equal(M.detalleSitio({ nombre: 'X', minutosAPie: 0, precio: '' }, aPie), '0 min a pie')
  assert.equal(M.detalleSitio({ nombre: 'X' }, aPie), '')
})

test('la encuesta del 17-10: gasto por su punto medio, texto libre y el veto solo tras mala nota', () => {
  const v = M.valoracionVacia()
  assert.equal(M.cuerpoValorar('m', { ...v, gasto: 0 }).gasto, 10)
  assert.equal(M.cuerpoValorar('m', { ...v, gasto: 2 }).gasto, 32)
  assert.equal(M.cuerpoValorar('m', { ...v, gasto: 3 }).gasto, 50)
  assert.equal(M.cuerpoValorar('m', { ...v, comentario: '   ' }).comentario, null, 'vacío se manda como null')
  assert.equal(M.cuerpoValorar('m', { ...v, comentario: 'x'.repeat(700) }).comentario?.length, 600)
  assert.equal(M.puedeVetarSitio({ ...v, sitio: { ambiente: 0, comida: 1 } }), false, 'Excelente y Bien no dejan vetar')
  assert.equal(M.puedeVetarSitio({ ...v, sitio: { servicio: 2 } }), true, 'Regular sí')
  assert.equal(M.puedeVetarSitio({ ...v, sitio: { conversar: 3 } }), true, 'Mal sí')
  assert.equal(M.cuerpoValorar('m', { ...v, noRepetirSitio: true, sitio: { comida: 1 } }).noRepetirSitio, false, 'un veto sin mala nota no se manda')
  assert.equal(M.cuerpoValorar('m', { ...v, noRepetirSitio: true, sitio: { comida: 3 } }).noRepetirSitio, true)
})

test('la grabación: sale sola solo si se graba, en abierta, y no ha contestado (16-10)', () => {
  const d = { fase: 'abierta', grabamos: true, eventoId: 'e', permisoGrabacion: null } as M.DeServidor
  assert.equal(M.preguntarGrabacion(d, null), true)
  assert.equal(M.preguntarGrabacion(d, false), false, 'contestado, aunque sea que no')
  assert.equal(M.preguntarGrabacion({ ...d, fase: 'cerrada' }, null), false)
  assert.equal(M.preguntarGrabacion({ ...d, grabamos: false }, null), false)
  assert.equal(M.lineaGrabacion(d, null), false, 'sin contestar no hay «Dijiste que…»')
  assert.equal(M.lineaGrabacion(d, true), true)
  assert.equal(M.ESPERA_GRABACION, 6000)
})

test('los ajustes de última hora: cuándo salen, qué dicen y con qué se recuerdan (16-10)', () => {
  const base = { fase: 'abierta', mesaId: 'm1' } as M.DeServidor
  const a = (x: M.Ajustes) => ({ ...base, ajustes: { sonCuantos: 5, caben: 6, alguienCancelo: false, seSumoAlguien: false, teMovimos: false, ...x } })
  assert.equal(M.hayAjustes(base), false)
  assert.equal(M.hayAjustes(a({})), false, 'una mesa que salió corta no es un ajuste')
  assert.equal(M.textoAjustes(a({ alguienCancelo: true })), 'Alguien canceló después de decirte con quién cenabas. Son cinco, y el sitio y la hora no cambian.')
  assert.equal(M.textoAjustes(a({ seSumoAlguien: true })), 'Se suma alguien que no estaba esta mañana, y va marcado abajo. Lo demás no cambia.')
  assert.equal(M.textoAjustes(a({ alguienCancelo: true, seSumoAlguien: true, sonCuantos: 6 })), 'Alguien canceló hoy y movimos a otra persona a tu mesa, que va marcada abajo. Son seis.')
  assert.match(M.textoAjustes(a({ teMovimos: true, alguienCancelo: true })), /^Te cambiamos de mesa/, 'a quien movimos se le habla de SU cambio')
  assert.equal(M.claveAjustes(a({ alguienCancelo: true })), 'm1:5:0:1:0', 'la misma clave que la web')
  assert.notEqual(M.claveAjustes(a({ alguienCancelo: true })), M.claveAjustes(a({ alguienCancelo: true, sonCuantos: 4 })), 'si cambia algo, vuelve a salir')
})

test('el sello de la encuesta dice cuándo fue, porque ya no caduca a las 48 h (8dc6b47)', () => {
  const ahora = Date.parse('2026-10-18T18:00:00Z')
  const d = (iso: string) => ({ fase: 'pasada', empiezaEn: iso, zonaHoraria: 'America/Caracas' })
  assert.equal(M.selloPasada(d('2026-10-17T23:30:00Z'), ahora), 'ANOCHE')
  assert.equal(M.selloPasada(d('2026-10-15T23:30:00Z'), ahora), 'HACE 2 DÍAS')
  assert.equal(M.selloPasada(d('2026-09-18T23:30:00Z'), ahora), 'EL 18 DE SEPTIEMBRE')
  assert.equal(M.selloPasada({ fase: 'pasada' }, ahora), 'TU ÚLTIMA MESA')
})

test('el aviso de las dos horas (21-10): sin doble punto, y los sitios solo si hay', async () => {
  const T = await import('../src/texto/mesa')
  const t = T.cena.dosHoras('7:00', '9:00 p.m.', true)
  assert.match(t, /de 7:00 a 9:00 p\.m\. El restaurante/)
  assert.doesNotMatch(t, /\.\./)
  assert.doesNotMatch(T.cena.dosHoras('7:00', '9:00 p.m.', false), /sitios cerca/)
})
