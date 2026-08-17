/**
 * La cuenta demo de operación.
 *
 * Existe porque para probar el panel hace falta entrar, y entrar hace falta
 * una contraseña que alguien recuerde. Sin esto, cada prueba empieza por
 * recuperar la clave de una cuenta real, que es justo lo que no se quiere
 * estar haciendo cuando lo que se va a mirar es otra cosa.
 *
 * El correo lleva `+demo` a propósito: Gmail entrega los `+loquesea` en la
 * misma bandeja, así que los correos que genere esta cuenta llegan a un
 * buzón de verdad que se puede abrir. Con una dirección inventada no se
 * podría comprobar lo único que importa aquí, que es si el correo llega y
 * cómo se ve al llegar.
 *
 *   node scripts/cuenta-demo.mjs           crea o repone la cuenta
 *   node scripts/cuenta-demo.mjs borrar    la quita
 *
 * No toca ninguna otra cuenta.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CORREO = 'somos.aroclub+demo@gmail.com'
const CLAVE = 'AroDemo-2608'

async function buscar() {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  return data.users.find((u) => u.email === CORREO) || null
}

const borrar = process.argv[2] === 'borrar'
const existente = await buscar()

// --- borrar de verdad -------------------------------------------------
if (borrar) {
  if (!existente) { console.log('no había cuenta demo'); process.exit(0) }

  // El historial de auditoría la referencia —esta cuenta aprueba cosas
  // mientras se prueba— y ese FK bloquea el borrado del perfil. Se quitan solo
  // SUS filas, que son de una cuenta de prueba y no son historial de nadie.
  await admin.from('ops_audit_log').delete().eq('actor_id', existente.id)
  await admin.from('verifications').delete().eq('profile_id', existente.id)
  await admin.from('scheduled_emails').delete().eq('profile_id', existente.id)

  const { error: ep } = await admin.from('profiles').delete().eq('id', existente.id)
  if (ep) { console.error('no se pudo borrar el perfil:', ep.message); process.exit(1) }

  const { error: eu } = await admin.auth.admin.deleteUser(existente.id)
  if (eu) { console.error('no se pudo borrar el usuario:', eu.message); process.exit(1) }

  console.log('cuenta demo borrada')
  process.exit(0)
}

// --- reponerla --------------------------------------------------------
//
// Se repone EN EL SITIO en vez de borrarla y crearla otra vez.
//
// Antes hacía lo segundo, y no funcionaba: en cuanto la cuenta aprueba una
// verificación queda referenciada por `ops_audit_log`, el FK impide borrar el
// perfil, y el alta choca con «already registered». Peor: el guion imprimía
// «cuenta anterior borrada» sin mirar ninguno de los dos errores, así que
// decía que había repuesto la cuenta y no había hecho nada.
//
// Reponer en el sitio no tiene ese problema y deja el mismo estado de partida,
// que es lo único que se le pedía.
if (existente) {
  const { error: ec } = await admin.auth.admin.updateUserById(existente.id, {
    password: CLAVE,
    email_confirm: true,
  })
  if (ec) { console.error('no se pudo poner la contraseña:', ec.message); process.exit(1) }

  const { error: ep } = await admin.from('profiles').upsert({
    id: existente.id,
    email: CORREO,
    full_name: 'Demo Operación',
    display_name: 'Demo',
    role: 'admin',
    status: 'active',
    city_slug: 'caracas',
    birthdate: '1990-01-01',
    gender: 'sin-decir',
    phone_e164: '+584121234567',
  })
  if (ep) { console.error('no se pudo reponer el perfil:', ep.message); process.exit(1) }

  console.log('repuesta:', CORREO, '/', CLAVE)
  process.exit(0)
}

// --- crearla por primera vez ----------------------------------------
const { data: nueva, error } = await admin.auth.admin.createUser({
  email: CORREO,
  password: CLAVE,
  // Sin esto queda pendiente de confirmar y no deja entrar.
  email_confirm: true,
})
if (error) { console.error(error.message); process.exit(1) }

const { error: ep } = await admin.from('profiles').insert({
  id: nueva.user.id,
  email: CORREO,
  full_name: 'Demo Operación',
  display_name: 'Demo',
  // `admin` y no `ops` para que vea también la pestaña de Equipo, que es la
  // única que el panel esconde a quien no lo es.
  role: 'admin',
  status: 'active',
  city_slug: 'caracas',
  birthdate: '1990-01-01',
  gender: 'sin-decir',
  phone_e164: '+584121234567',
})
if (ep) { console.error(ep.message); process.exit(1) }

console.log('lista:', CORREO, '/', CLAVE)
