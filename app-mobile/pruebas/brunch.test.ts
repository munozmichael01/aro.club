import { test } from 'node:test'
import assert from 'node:assert/strict'

/**
 * El brunch con la Mi mesa completa (Michael, 24-10: «juego sí, bares no»).
 * La cena tiene que decir palabra por palabra lo de antes; el brunch, lo suyo.
 */

test('la cena dice lo de siempre', async () => {
  const { reglas } = await import('../src/reglas')
  const T = await import('../src/texto/mesa')
  const TJ = await import('../src/texto/juego')
  const v = reglas.vozDe('dinner')
  assert.equal(T.grabacion.cuerpo(v), 'Esta noche estamos grabando contenido por la zona. Si dices que no, no te grabamos y no pasa nada: la cena es igual.')
  assert.equal(T.grabacion.pie(v), 'Puedes cambiarlo cuando quieras, también en la cena.')
  assert.equal(T.cena.conQuien.titulo(v), 'Con quién cenas')
  assert.match(T.ajustes.cancelo('cinco', v), /con quién cenabas\./)
  assert.equal(TJ.tarjeta.resumenCerrado(v.delPlan), '3 rondas · se abre a la hora de la cena')
  assert.equal(T.pasada.sello(1, undefined, undefined, v.ayer), 'ANOCHE')
})

test('el brunch habla de brunch, con juego y sin bares', async () => {
  const { reglas } = await import('../src/reglas')
  const T = await import('../src/texto/mesa')
  const TJ = await import('../src/texto/juego')
  const J = await import('../src/juego/maquina')
  const Gu = await import('../src/mesa/guion')
  const v = reglas.vozDe('brunch')
  assert.ok(J.hayJuego('brunch'))
  assert.ok(!J.hayJuego('walk'))
  assert.equal(T.cena.conQuien.titulo(v), 'Con quién vas')
  assert.equal(T.grabacion.cuerpo(v), 'Hoy estamos grabando contenido por la zona. Si dices que no, no te grabamos y no pasa nada: el brunch es igual.')
  assert.equal(TJ.tarjeta.seAbre('11:35', v.delPlan), 'Se abre a las 11:35, a la hora del brunch.')
  assert.match(T.ajustes.cancelo('cinco', v), /con quién ibas\./)
  assert.equal(T.pasada.sello(1, undefined, undefined, v.ayer), 'AYER')
  const ps = Gu.pasos('2026-10-25T15:00:00Z', 'America/Caracas', 'brunch')
  assert.match(ps.find((p) => p.momento === 'llegada')!.texto, /^Pidan un café o un jugo si quieren\./)
  assert.equal(ps.find((p) => p.momento === 'despedida')!.texto, 'Si hay ganas de seguir, un café o una vuelta cerca. Si alguien te cayó bien, díselo.')
  for (const t of [T.grabacion.cuerpo(v), T.grabacion.pie(v), TJ.tarjeta.resumenCerrado(v.delPlan)]) assert.doesNotMatch(t, /undefined|cena/)
  // La cena sigue con sus textos.
  const pc = Gu.pasos('2026-10-25T23:00:00Z', 'America/Caracas', 'dinner')
  assert.match(pc.find((p) => p.momento === 'despedida')!.texto, /busquen un sitio cerca/)
})
