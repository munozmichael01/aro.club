/**
 * La cuenta de operacion para pruebas. `node scripts/ops-test.mjs borrar`
 * la quita. Rol 'ops' y no 'admin': puede operar y no puede tocar roles.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url).pathname,'utf8').split('\n')
  .filter(l=>l.includes('=')).map(l=>[l.slice(0,l.indexOf('=')).trim(), l.slice(l.indexOf('=')+1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth:{ autoRefreshToken:false, persistSession:false }})

const CORREO = 'operacion-test@aro.club'
const CLAVE  = 'AroTest-Ops-2608'

const { data: l } = await admin.auth.admin.listUsers({ perPage: 200 })
const ya = l.users.find(u => u.email === CORREO)

if (process.argv[2] === 'borrar') {
  if (ya) { await admin.from('profiles').delete().eq('id', ya.id); await admin.auth.admin.deleteUser(ya.id) }
  console.log(ya ? 'borrada' : 'no existia'); process.exit(0)
}

if (ya) { await admin.from('profiles').delete().eq('id', ya.id); await admin.auth.admin.deleteUser(ya.id) }
const { data, error } = await admin.auth.admin.createUser({ email: CORREO, password: CLAVE, email_confirm: true })
if (error) { console.log('✗', error.message); process.exit(1) }

// role 'ops', no 'admin': puede operar y no puede tocar roles ni cuentas.
const { error: ep } = await admin.from('profiles').insert({
  id: data.user.id, email: CORREO, full_name: 'Operación (pruebas)', display_name: 'Ops',
  city_slug: 'caracas', gender: 'sin-decir', status: 'active', role: 'ops', locale: 'es-VE',
})
console.log(ep ? '✗ ' + ep.message : 'creada · ' + CORREO + ' / ' + CLAVE)
