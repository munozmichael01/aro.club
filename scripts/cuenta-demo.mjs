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

if (existente) {
  // Se borra siempre antes de crear: reponerla es más fiable que remendarla,
  // y así el estado de partida es el mismo cada vez.
  await admin.from('profiles').delete().eq('id', existente.id)
  await admin.auth.admin.deleteUser(existente.id)
  console.log('cuenta anterior borrada')
}

if (borrar) process.exit(0)

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
