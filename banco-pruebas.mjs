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
  fs.readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CORREO = 'banco-pruebas@aro.club'
const CLAVE = 'Prueba-8x1'

async function cuentaExistente() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === CORREO) || null
}

async function limpiar() {
  const u = await cuentaExistente()
  if (!u) return null
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

console.log('lista ' + id + (resto.length ? ' · ' + resto.join(', ') : ''))
console.log('   ' + CORREO + ' / ' + CLAVE)
