/**
 * El alta de la app entera, contra aro.club/api, con el correo del banco:
 * cuenta con contraseña SIN lead (`origen: 'app'`) → entrar con el SDK →
 * las cinco respuestas por `/api/cuestionario` → el embudo. Comprueba que no
 * se fabrica ningún lead y que la atribución llega a `profiles.source`.
 *
 *   node ../scripts/banco-pruebas.mjs borrar && npm run prueba:alta-app; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as C from '../src/cuestionario/maquina.ts'
import * as M from '../src/puerta/maquina.ts'
import { crearServicioPuerta } from '../src/puerta/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const CORREO = 'banco-pruebas@aro.club'
const CLAVE = 'Prueba-8x1'
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const env = Object.fromEntries(fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

let sesion = null
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => sesion, refrescar: async () => null })
const s = crearServicioPuerta(api)

const c = await s.crearCuenta(CORREO, CLAVE, 'no se creó')
ok(c.ok && c.datos.estado === 'creada', `cuenta sin lead: ${c.ok ? c.datos.estado : c.error}`)
const { data, error } = await sdk.auth.signInWithPassword({ email: CORREO, password: CLAVE })
ok(!error && data.session, 'entra con el SDK y hay sesión')
sesion = data.session

const zonas = (await (await api.pedir('/zonas')).json()).zonas
const reglas = (await import('../../public/reglas.js')).default
const cod = (clave, n) => reglas.PUERTA[clave].opciones.slice(0, n).map((o) => o[1])
const b = { respuestas: { arraigo: cod('arraigo', 1), zonas: [zonas[0].slug], dias: cod('dias', 2), temas: cod('temas', 2) }, nacimiento: { dia: '12', mes: 5, anio: '1990' } }
const g = await s.guardar(M.envios(b, new Date()), 'no se guardó')
ok(g.ok, `las cinco respuestas: ${g.ok ? 'guardadas' : g.error}`)
const e = await s.estado()
ok(e.ok && e.datos.estado === 'datos', `el embudo manda a: ${e.ok ? e.datos.estado : e.error} → ${M.destinoDeEstado(e.ok ? e.datos.estado : null)}`)

// El cuestionario de la app, con el catálogo real: no vuelve a preguntar las cinco.
const cat = await (await api.pedir('/questions')).json()
const preguntas = C.armar(cat.preguntas, zonas)
const guardado = await (await api.pedir('/cuestionario')).json()
const est = C.desdeServidor(C.inicial(), guardado, preguntas)
ok(['arraigo', 'zonas', 'dias', 'temas', 'nacimiento'].every((k) => est.heredadas.includes(k)), `heredadas: ${est.heredadas.join(', ')}`)
const repetidas = preguntas.filter((q) => ['arraigo', 'zonas', 'dias', 'temas', 'nacimiento'].includes(q.clave) && !est.heredadas.includes(q.clave))
ok(repetidas.length === 0, `ninguna de las cinco se vuelve a enseñar${repetidas.length ? ': ' + repetidas.map((q) => q.clave).join(', ') : ''}`)
console.log('   faltan según el servidor:', guardado.faltan?.length)

const { data: lead } = await admin.from('waitlist').select('id').eq('email', CORREO).maybeSingle()
ok(!lead, 'no se fabricó ningún lead')
const { data: perfil } = await admin.from('profiles').select('source, birthdate').eq('id', data.user.id).maybeSingle()
ok(perfil?.source === 'app', `atribución en el perfil: ${perfil?.source}`)
ok(perfil?.birthdate === '1990-05-12', `nacimiento en el perfil: ${perfil?.birthdate}`)

const otra = await s.crearCuenta(CORREO, CLAVE, 'x')
ok(otra.ok && otra.datos.estado === 'ya_existe' || !otra.ok, `crearla otra vez: ${otra.ok ? otra.datos.estado : `${otra.status} ${otra.error}`}`)

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
