/**
 * Cancelar contra aro.club/api, SOLO con la cuenta del banco y su reserva
 * de pruebas (`lista mesa`: dentro de dos días, con margen). Cancela de
 * verdad y comprueba que el crédito vuelve; el banco lo borra al terminar.
 *
 *   node ../scripts/banco-pruebas.mjs lista mesa && npm run prueba:cancelar; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/cancelar/maquina.ts'
import { crearServicioCancelar } from '../src/cancelar/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error || data.user.email !== 'banco-pruebas@aro.club') { console.log('✗ no se pudo entrar con la cuenta del banco'); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioCancelar(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

const r = await s.leer()
ok(r.ok, `GET /api/cancelar: ${r.ok ? `faltan ${r.datos.horasQueFaltan} h, con margen: ${r.datos.conMargen}` : r.error}`)
if (!r.ok) process.exit(1)
const c = M.queCena(r.datos)
console.log('  ', c.titulo, '·', c.detalle)
ok(r.datos.restaurante === null, 'sin revelar, no dice el sitio')
const antes = await s.creditos()
const x = await s.cancelar(r.datos.reservaId, 'Me surgió algo')
ok(x.ok && x.datos.creditoDevuelto === r.datos.conMargen, `cancelar: ${x.ok ? `crédito devuelto ${x.datos.creditoDevuelto}` : x.error}`)
const despues = await s.creditos()
ok(despues === antes + (r.datos.conMargen ? 1 : 0), `créditos: ${antes} → ${despues}`)
const otra = await s.cancelar(r.datos.reservaId, null)
ok(!otra.ok, `cancelar dos veces se niega: «${otra.ok ? '' : otra.error}»`)

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
