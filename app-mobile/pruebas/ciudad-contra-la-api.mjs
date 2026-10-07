/**
 * Fuera de Caracas, contra aro.club/api y con el correo del banco: cuenta
 * nueva → su ciudad (Valencia) en el perfil → `/api/mi-cuenta` sin agenda ni
 * próxima fecha. Y una ciudad que no existe, rechazada.
 *
 *   node ../scripts/banco-pruebas.mjs borrar && npm run prueba:ciudad; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { crearServicioPuerta } from '../src/puerta/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const CORREO = 'banco-pruebas@aro.club'
const CLAVE = 'Prueba-8x1'
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

let sesion = null
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => sesion, refrescar: async () => null })
const s = crearServicioPuerta(api)

const cs = await s.ciudades()
ok(cs.ok && cs.datos.ciudades.some((c) => c.slug === 'valencia' && !c.abierta), `ciudades: ${cs.ok ? cs.datos.ciudades.map((c) => c.slug).join(', ') : cs.error}`)

const c = await s.crearCuenta(CORREO, CLAVE, 'no se creó')
ok(c.ok, `cuenta: ${c.ok ? c.datos.estado : c.error}`)
sesion = (await sdk.auth.signInWithPassword({ email: CORREO, password: CLAVE })).data.session

const mala = await s.ponerCiudad('atlantida', 'x')
ok(!mala.ok && mala.status === 400, `ciudad inventada: ${mala.ok ? 'ACEPTADA' : mala.status + ' ' + mala.error}`)
const buena = await s.ponerCiudad('valencia', 'x')
ok(buena.ok, `Valencia: ${buena.ok ? 'guardada' : buena.error}`)

const mc = await (await api.pedir('/mi-cuenta')).json()
ok(mc.ciudad?.slug === 'valencia' && mc.ciudad?.abierta === false, `mi-cuenta.ciudad: ${JSON.stringify(mc.ciudad)}`)
ok(Array.isArray(mc.agenda) && mc.agenda.length === 0 && mc.proximaFecha == null, `sin agenda ni próxima fecha: ${mc.agenda?.length}, ${JSON.stringify(mc.proximaFecha)}`)

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
