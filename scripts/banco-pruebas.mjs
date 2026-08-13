/**
 * Banco de pruebas: crea una cuenta desechable con el estado que le pida,
 * la uso para mirar la pantalla en el navegador, y la borro.
 *
 * Existe porque mis datos de prueba llevan toda la semana saltandose el
 * camino que recorre una persona real, y asi es como se cuelan los fallos
 * que luego encuentra Michael y no yo.
 *
 * Nunca toca cuentas de nadie: solo la suya, y la borra al terminar.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CORREO = 'banco-pruebas@aro.club'
const CLAVE = 'Prueba-8x1'
const RASTRO = new URL('../.banco-pruebas-fechas.json', import.meta.url).pathname

async function cuentaExistente() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === CORREO) || null
}

async function limpiar() {
  const u = await cuentaExistente()
  if (!u) return null
  // Los pagos antes que las reservas: apuntan a ellas y bloquean el borrado.
  await admin.from('payments').delete().eq('profile_id', u.id)
  await admin.from('credit_ledger').delete().eq('profile_id', u.id)
  await admin.from('bookings').delete().eq('profile_id', u.id)
  await admin.from('answers').delete().eq('profile_id', u.id)
  // Y las fechas que monto este banco. Los ids quedan anotados en disco:
  // se borra exactamente lo que creo el banco y nada mas. Filtrar "por
  // fecha pasada" habria barrido eventos reales.
  if (fs.existsSync(RASTRO)) {
    const ids = JSON.parse(fs.readFileSync(RASTRO, 'utf8'))
    for (const ev of ids) await admin.from('events').delete().eq('id', ev)
    fs.unlinkSync(RASTRO)
  }
  await admin.from('verifications').delete().eq('profile_id', u.id)
  await admin.from('profiles').delete().eq('id', u.id)
  await admin.auth.admin.deleteUser(u.id)
  return u.id
}

const [orden, ...resto] = process.argv.slice(2)

if (orden === 'borrar') {
  const id = await limpiar()
  console.log(id ? 'borrada ' + id : 'no habia nada')
  process.exit(0)
}

await limpiar()
const { data: nueva, error } = await admin.auth.admin.createUser({
  email: CORREO, password: CLAVE, email_confirm: true,
})
if (error) { console.log('✗', error.message); process.exit(1) }
const id = nueva.user.id

const { error: ep } = await admin.from('profiles').insert({
  id, full_name: 'Banco Pruebas', email: CORREO, city_slug: 'caracas',
  gender: 'sin-decir', status: 'active', locale: 'es-VE',
})
if (ep) { console.log('✗ perfil:', ep.message); process.exit(1) }

// Estados opcionales, uno por argumento.
if (resto.includes('verificada')) {
  // Revisada hace veinte dias: la fecha de borrado cae dentro de los noventa
  // y se puede comprobar que la pantalla dice la misma que la purga.
  const hace20 = new Date(Date.now() - 20 * 86400_000).toISOString()
  const { error: ev } = await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace20, storage_path: id + '/id.jpg' },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace20, storage_path: id + '/selfie.jpg' },
  ])
  if (ev) { console.log('✗ verificacion:', ev.message); process.exit(1) }
}

if (resto.includes('purgada')) {
  const hace100 = new Date(Date.now() - 100 * 86400_000).toISOString()
  await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace100, storage_path: null },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace100, storage_path: null },
  ])
}


// Historial de cenas: una recien pasada sin valorar (para la tarjeta de
// valorar) y una vieja a la que fue. Se usan eventos y mesas ya existentes
// si los hay; si no, se avisa en vez de inventarlos.
if (resto.includes('cenas')) {
  // Dos fechas pasadas propias del banco, marcadas para poder borrarlas.
  // Antes usaba las que hubiera en la base y no habia ninguna pasada; el
  // resto de datos —restaurante, mesa— sale de lo que ya existe.
  const { data: rest } = await admin.from('restaurants').select('id, name').limit(1)
  const restId = rest?.[0]?.id ?? null

  const hace = (h) => new Date(Date.now() - h * 3600_000).toISOString()
  const nueva = async (horas) => {
    const { data, error } = await admin.from('events').insert({
      format: 'dinner', starts_at: hace(horas),
      booking_closes_at: hace(horas + 48), reveal_at: hace(horas + 12),
      restaurant_id: restId, status: 'completed', price_usd: 8, city_slug: 'caracas',
    }).select('id').single()
    if (error) { console.log('  ! fecha:', error.message); return null }
    const ya = fs.existsSync(RASTRO) ? JSON.parse(fs.readFileSync(RASTRO, 'utf8')) : []
    fs.writeFileSync(RASTRO, JSON.stringify([...ya, data.id]))
    return data.id
  }

  // Una hace 8 horas: ya termino (>5h) y aun dentro de las 48 → por valorar.
  const recien = await nueva(8)
  // Otra hace treinta dias, fuera de la ventana → solo historial.
  const vieja = await nueva(24 * 30)

  if (recien) {
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: recien, status: 'attended' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: recien, table_number: 1, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  cena de hace 8 h, sin valorar')
  }
  if (vieja) {
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: vieja, status: 'attended' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: vieja, table_number: 2, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  cena de hace 30 dias')
  }
}

// Una fecha por delante con su mesa: es lo que hace aparecer la pestaña
// "Mi mesa", que sin reserva no se enseña.
if (resto.includes('mesa') || resto.includes('revelada')) {
  const yaRevelada = resto.includes('revelada')
  const { data: rest } = await admin.from('restaurants').select('id').limit(1)
  const restId = rest?.[0]?.id ?? null
  const en = (h) => new Date(Date.now() + h * 3600_000).toISOString()
  const { data: ev, error: ee } = await admin.from('events').insert({
    format: 'dinner',
    starts_at: yaRevelada ? en(6) : en(48),
    booking_closes_at: yaRevelada ? en(-48) : en(2),
    reveal_at: yaRevelada ? en(-1) : en(24),
    restaurant_id: restId, status: 'open', price_usd: 8, city_slug: 'caracas',
  }).select('id').single()
  if (ee) console.log('  ! fecha:', ee.message)
  else {
    const ya = fs.existsSync(RASTRO) ? JSON.parse(fs.readFileSync(RASTRO, 'utf8')) : []
    fs.writeFileSync(RASTRO, JSON.stringify([...ya, ev.id]))
    const { data: b } = await admin.from('bookings')
      .insert({ profile_id: id, event_id: ev.id, status: 'confirmed' }).select('id').single()
    const { data: t } = await admin.from('dinner_tables')
      .insert({ event_id: ev.id, table_number: 3, restaurant_id: restId }).select('id').single()
    if (b && t) await admin.from('table_members').insert({ table_id: t.id, profile_id: id, booking_id: b.id, seat_order: 1 })
    console.log('  reserva en dos dias')
  }
}

// Perfil completo y verificado, con creditos: lo minimo para llegar al pago.
if (resto.includes('lista')) {
  await admin.from('profiles').update({
    full_name: 'Banco Pruebas', display_name: 'Banco',
    birthdate: '1990-05-12', gender: 'mujer', phone_e164: '+584121234567',
  }).eq('id', id)
  const hace2 = new Date(Date.now() - 2 * 86400_000).toISOString()
  await admin.from('verifications').insert([
    { profile_id: id, kind: 'id_document', status: 'approved', reviewed_at: hace2, storage_path: id + '/id.jpg' },
    { profile_id: id, kind: 'selfie', status: 'approved', reviewed_at: hace2, storage_path: id + '/selfie.jpg' },
  ])
  // Las respuestas obligatorias, con el primer codigo de cada una.
  const { data: v } = await admin.from('questionnaire_versions').select('id').eq('is_active', true).maybeSingle()
  const { data: qs } = await admin.from('questions')
    .select('key, options, input_type').eq('version_id', v.id).eq('is_required', true)
  const filas = (qs || []).map((q) => {
    const cods = (q.options || []).map((o) => o.value)
    const valor = q.input_type === 'multi' ? cods.slice(0, 2) : (cods[0] ?? 'x')
    return { profile_id: id, version_id: v.id, question_key: q.key, value: valor }
  })
  if (filas.length) await admin.from('answers').insert(filas)
  console.log('  perfil completo, verificado, ' + filas.length + ' respuestas')
}

console.log('lista ' + id + (resto.length ? ' · ' + resto.join(', ') : ''))
console.log('   ' + CORREO + ' / ' + CLAVE)
