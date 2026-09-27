/**
 * La capa de sesión de la app contra `aro.club/api` de verdad.
 *
 * Usa `crearApi` —el mismo código que corre en el celular— con el SDK de
 * Supabase en Node en lugar del llavero. Entra con la cuenta desechable del
 * banco de pruebas, que hay que crear antes y borrar después:
 *
 *   node ../scripts/banco-pruebas.mjs
 *   npm run prueba:api
 *   node ../scripts/banco-pruebas.mjs borrar
 *
 * Solo hace lecturas.
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { crearApi } from '../src/sesion/api.ts'

const leerEnv = (f) =>
  Object.fromEntries(
    fs.readFileSync(new URL(f, import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = leerEnv('../.env.local').EXPO_PUBLIC_SUPABASE_ANON_KEY

const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error) {
  console.log('✗ no se pudo entrar. ¿Está creada la cuenta del banco?', error.message)
  process.exit(1)
}

let fallos = 0
const ok = (cond, texto) => {
  console.log((cond ? '✓ ' : '✗ ') + texto)
  if (!cond) fallos++
}

let refrescos = 0
function conSesion(obtener) {
  return crearApi({
    base: app.api,
    urlSupabase: app.supabaseUrl,
    version: 'prueba/0',
    obtenerSesion: obtener,
    async refrescar() {
      refrescos++
      const { data: d } = await sdk.auth.refreshSession()
      return d.session
    },
  })
}

// 1 · Lo normal: sesión vigente.
const vigente = data.session
const a = conSesion(async () => vigente)
let r = await a.json('/mi-cuenta')
ok(r.status === 200 && typeof r.datos.estado === 'string', `/mi-cuenta con sesión → ${r.status}, estado «${r.datos.estado}»`)
r = await a.json('/mi-mesa')
ok(r.status === 200, `/mi-mesa → ${r.status}, fase «${r.datos.fase}»`)
ok(refrescos === 0, 'con sesión vigente no se refresca')

// 2 · Sin sesión: 401 y no se inventa nada.
r = await conSesion(async () => null).json('/mi-cuenta')
ok(r.status === 401, `/mi-cuenta sin sesión → ${r.status}`)

// 3 · Token a punto de caducar: se refresca ANTES de mandarlo.
refrescos = 0
const casiCaducada = { ...vigente, expires_at: Math.floor(Date.now() / 1000) + 60 }
r = await conSesion(async () => casiCaducada).json('/mi-cuenta')
ok(r.status === 200 && refrescos === 1, `a 60 s de caducar → refresca antes (${refrescos}) y ${r.status}`)

// 4 · El servidor rechaza el token: refresca una vez y reintenta.
refrescos = 0
const rota = { ...vigente, access_token: vigente.access_token.slice(0, -4) + 'AAAA' }
r = await conSesion(async () => rota).json('/mi-cuenta')
ok(r.status === 200 && refrescos === 1, `token rechazado → reintenta una vez (${refrescos}) y ${r.status}`)

// 5 · El refresh del SDK sigue vivo: el servidor no rotó nada a escondidas.
const { error: e } = await sdk.auth.refreshSession()
ok(!e, 'el refresh token del SDK sigue vivo al final')

await sdk.auth.signOut()
console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo en orden')
process.exit(fallos ? 1 : 0)
