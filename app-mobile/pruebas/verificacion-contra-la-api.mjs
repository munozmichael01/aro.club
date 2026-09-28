/**
 * La verificación contra aro.club/api: el contrato de subida y los estados,
 * con la cuenta del banco de pruebas y una imagen GENERADA (nunca un
 * documento de verdad). Borra al terminar las filas y los ficheros del
 * almacenamiento.
 *
 *   node ../scripts/banco-pruebas.mjs && npm run prueba:verificacion; node ../scripts/banco-pruebas.mjs borrar
 *
 * Lo que NO prueba: la forma en que React Native adjunta un fichero local
 * ({ uri, name, type }). Eso solo se ve en un teléfono.
 */
import fs from 'node:fs'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

import { desdeServidor, inicial, subida, subiendo, conFoto, empezar } from '../src/verificacion/maquina.ts'
import { crearApi } from '../src/sesion/api.ts'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })

const IMAGEN = process.env.IMAGEN
if (!IMAGEN || !fs.existsSync(IMAGEN)) { console.log('✗ falta IMAGEN=<ruta a un jpg generado>'); process.exit(1) }

const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error) { console.log('✗ no se pudo entrar. ¿Está creada la cuenta del banco?', error.message); process.exit(1) }
const userId = data.user.id
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }
const estado = async () => { const r = await api.pedir('/verificacion'); return { status: r.status, d: await r.json() } }
const subir = async (tipo) => {
  const f = new FormData()
  f.append('tipo', tipo)
  f.append('archivo', new Blob([fs.readFileSync(IMAGEN)], { type: 'image/jpeg' }), `${tipo}.jpg`)
  const r = await api.pedir('/verificacion', { method: 'POST', body: f })
  return { status: r.status, d: await r.json() }
}

try {
  const sinSesion = await crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => null, refrescar: async () => null }).pedir('/verificacion')
  ok(sinSesion.status === 401, `sin sesión → ${sinSesion.status}`)

  let e0 = await estado()
  let e = desdeServidor(inicial(), e0.d)
  ok(e0.status === 200 && e.fase === 'intro', `al empezar: ${e0.d.estado} → la app enseña «${e.fase}»`)

  e = conFoto(empezar(e), 'file://cedula.jpg')
  const c = await subir('cedula')
  ok(c.status === 200 && c.d.estado === 'recibida', `cédula → ${c.status} ${JSON.stringify(c.d)}`)
  e = subida(subiendo(e))
  const e1 = await estado()
  ok(e1.d.cedulaLista === true && e1.d.selfieLista === false, 'el servidor tiene la cédula y no la selfie')
  ok(desdeServidor(inicial(), e1.d).toma === 1 && e.toma === 1, 'la app sigue por la selfie (y quien vuelve, entra directo en ella)')

  const noEsFoto = await (async () => {
    const f = new FormData(); f.append('tipo', 'selfie'); f.append('archivo', new Blob(['hola'], { type: 'text/plain' }), 'x.txt')
    const r = await api.pedir('/verificacion', { method: 'POST', body: f }); return { status: r.status, d: await r.json() }
  })()
  ok(noEsFoto.status === 400, `algo que no es una foto → ${noEsFoto.status} «${noEsFoto.d.error}»`)

  const s = await subir('selfie')
  ok(s.status === 200, `selfie → ${s.status}`)
  e = subida(subiendo(conFoto(e, 'file://selfie.jpg')))
  const e2 = await estado()
  ok(e2.d.estado === 'revision' && e.fase === 'revision', `con las dos: servidor «${e2.d.estado}», app «${e.fase}»`)
} finally {
  const { data: ficheros } = await admin.storage.from('verificaciones').list(userId)
  const rutas = (ficheros ?? []).map((f) => `${userId}/${f.name}`)
  if (rutas.length) await admin.storage.from('verificaciones').remove(rutas)
  await admin.from('verifications').delete().eq('profile_id', userId)
  console.log(`  limpieza: ${rutas.length} fichero(s) y las filas de verificación borrados`)
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo en orden')
process.exit(fallos ? 1 : 0)
