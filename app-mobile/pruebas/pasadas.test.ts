import assert from 'node:assert/strict'
import { test } from 'node:test'

const en = (dias: number) => new Date(Date.UTC(2026, 9, 29, 23) + dias * 86400000).toISOString()

test('la línea de Próxima: contacto con sus días, o la encuesta con su día (31-10)', async () => {
  const M = await import('../src/pasadas/maquina')
  const base = { mesaId: 'm', empiezaEn: en(0), zonaHoraria: 'America/Caracas', cierraEn: en(7) }
  assert.equal(M.textoLinea({ ...base, tipo: 'contacto', nombres: ['Andrea'] }, Date.parse(en(1))), 'Andrea también quiere seguir en contacto · quedan 6 días')
  assert.equal(M.textoLinea({ ...base, tipo: 'contacto', nombres: ['Andrea', 'Luis'] }, Date.parse(en(1))), 'Andrea y Luis también quieren seguir en contacto · quedan 6 días')
  assert.equal(M.textoLinea({ ...base, tipo: 'encuesta', nombres: [] }, Date.parse(en(1))), 'Te falta contar cómo estuvo el jueves')
})

test('la fila de Pasadas: ficha, título, etiqueta y la línea de lo nuevo solo con el punto', async () => {
  const M = await import('../src/pasadas/maquina')
  const p = { mesaId: 'm', eventoId: 'e', empiezaEn: en(0), zonaHoraria: 'America/Caracas', formato: 'dinner', sitio: 'Cardenal', zona: 'Chacao', numeroMesa: 4, companeros: [], encuesta: { pendiente: false, contadaEn: null }, contacto: { porConfirmar: [], cierraEn: en(7), cruzadas: ['Luis'], nuevo: { tipo: 'cruce' as const, nombres: ['Luis'] } }, pendiente: null, nuevo: true }
  const f = M.filaDe(p)
  assert.deepEqual([f.numero, f.mes, f.titulo, f.sub, f.etiqueta, f.nuevo, f.punto], ['29', 'OCT', 'Cena · jueves', 'Cardenal · Chacao', null, 'Luis te dejó su número', true])
  assert.equal(M.filaDe({ ...p, nuevo: false }).nuevo, null)
  assert.equal(M.filaDe({ ...p, pendiente: 'encuesta' }).etiqueta, 'Encuesta por responder')
  assert.equal(f.sinCena, null)
  assert.equal(M.filaDe({ ...p, estado: 'fue' }).sinCena, null)
  // Las fechas sin cena (31-10): gris, sin abrirse, con lo que pasó.
  const sin = { ...p, mesaId: null, sitio: null, zona: null, contacto: null, nuevo: false }
  assert.equal(M.filaDe({ ...sin, estado: 'cancelada' }).sinCena, 'CANCELASTE')
  assert.equal(M.filaDe({ ...sin, estado: 'no-fue' }).sinCena, 'NO FUISTE')
  assert.equal(M.filaDe({ ...sin, estado: 'sin-mesa' }).sinCena, 'NO HUBO MESA')
  assert.deepEqual(M.cabeceraDe(p), { sello: 'JUEVES 29 DE OCTUBRE · CENA', sitio: 'Cardenal', sub: 'Chacao · 7:00 p.m. · Mesa 04' })
})

test('compartir: los datos una vez, sin arroba, y a quién sí y a quién no', async () => {
  const C = await import('../src/contacto/maquina')
  assert.deepEqual(C.cuerpoCompartir({ telefono: ' +58 412 555 0123 ', instagram: '@vale.gm', tiktok: '' }, ['a'], ['b']), { accion: 'compartir', con: ['a'], sin: ['b'], telefono: '+58 412 555 0123', instagram: 'vale.gm' })
  assert.equal(C.resumen({ telefono: '+58 412', instagram: 'vale.gm', tiktok: null }), '+58 412 · @vale.gm')
})
