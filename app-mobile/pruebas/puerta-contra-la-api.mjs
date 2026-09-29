/**
 * El alta de la app contra aro.club/api, con la cuenta del banco: las cuatro
 * de la puerta y el nacimiento van por `/api/cuestionario` con la SESIÓN (sin
 * lead ni token), y después el embudo dice dónde sigue.
 *
 *   node ../scripts/banco-pruebas.mjs && npm run prueba:puerta; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/puerta/maquina.ts'
import { crearServicioPuerta } from '../src/puerta/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error || data.user.email !== 'banco-pruebas@aro.club') { console.log('✗ no se pudo entrar con la cuenta del banco'); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioPuerta(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

const zonas = (await (await api.pedir('/zonas')).json()).zonas
const reglas = (await import('../../public/reglas.js')).default
const cod = (clave, n) => reglas.PUERTA[clave].opciones.slice(0, n).map((o) => o[1])
const b = {
  respuestas: { arraigo: cod('arraigo', 1), zonas: [zonas[0].slug], dias: cod('dias', 2), temas: cod('temas', 2) },
  nacimiento: { dia: '12', mes: 5, anio: '1990' },
}
const antes = await s.estado()
console.log('   antes:', antes.ok ? antes.datos.estado : antes.error)
const envios = M.envios(b, new Date())
console.log('   envíos:', envios.map((e) => e.clave).join(', '))
const r = await s.guardar(envios, 'no se guardó')
ok(r.ok, `las cinco respuestas por /api/cuestionario con la sesión: ${r.ok ? 'guardadas' : r.error}`)
const despues = await s.estado()
ok(despues.ok, `después: ${despues.ok ? despues.datos.estado : despues.error} → ${M.destinoDeEstado(despues.ok ? despues.datos.estado : null)}`)
const perfil = await (await api.pedir('/mi-perfil')).json()
ok(perfil.base?.nacimiento === '1990-05-12', `el nacimiento llegó también al perfil: ${perfil.base?.nacimiento}`)

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
