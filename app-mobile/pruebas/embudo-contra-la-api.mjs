/**
 * Sin las preguntas no se reserva (decidido el 01-10-2026), contra aro.club/api
 * y con el correo del banco: cuenta nueva con solo las cinco de la puerta →
 * `/api/mi-cuenta` dice `paso`/`donde`/`puedeReservar`, el botón manda a las
 * preguntas, `/api/verificacion` cuenta las que faltan y `/api/reservar`
 * responde 409 `perfil-incompleto`.
 *
 *   node ../scripts/banco-pruebas.mjs borrar && npm run prueba:embudo; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as Cu from '../src/cuenta/maquina.ts'
import { crearServicioCuenta } from '../src/cuenta/servicio.ts'
import * as M from '../src/puerta/maquina.ts'
import { crearServicioPuerta } from '../src/puerta/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'
import { pasosRevision } from '../src/verificacion/maquina.ts'

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

const c = await s.crearCuenta(CORREO, CLAVE, 'no se creó')
ok(c.ok && c.datos.estado === 'creada', `cuenta: ${c.ok ? c.datos.estado : c.error}`)
const { data } = await sdk.auth.signInWithPassword({ email: CORREO, password: CLAVE })
sesion = data.session

const zonas = (await (await api.pedir('/zonas')).json()).zonas
const reglas = (await import('../../public/reglas.js')).default
const cod = (clave, n) => reglas.PUERTA[clave].opciones.slice(0, n).map((o) => o[1])
const b = { respuestas: { arraigo: cod('arraigo', 1), zonas: [zonas[0].slug], dias: cod('dias', 2), temas: cod('temas', 2) }, nacimiento: { dia: '12', mes: 5, anio: '1990' } }
await s.guardar(M.envios(b, new Date()), 'no se guardó')

const cuenta = crearServicioCuenta(api)
const mc = await cuenta.cuenta()
ok(mc.ok, 'mi-cuenta responde')
const d = mc.datos
console.log(`   paso=${d.paso} donde=${d.donde} puedeReservar=${d.puedeReservar} faltan=${d.respuestas?.faltan}`)
ok(d.puedeReservar === false, 'puedeReservar es false')
const boton = Cu.botonReservar(d, false)
ok(boton.accion === 'completar', `el botón: «${boton.texto}» → ${boton.destino}`)

const v = await (await api.pedir('/verificacion')).json()
ok(typeof v.faltan === 'number' && v.faltan > 0, `verificación cuenta las que faltan: ${v.faltan}`)
ok(pasosRevision(v.faltan)[0].titulo !== 'Tu perfil está completo', `en revisión diría: «${pasosRevision(v.faltan)[0].titulo}»`)

const fecha = (d.agenda ?? []).find((a) => !a.cerrada)
if (!fecha) console.log('   (sin fecha abierta: no se prueba el candado de /api/reservar)')
else {
  const r = await cuenta.reservar(fecha.id)
  ok(!r.ok && r.status === 409 && r.motivo === 'perfil-incompleto', `reservar: ${r.ok ? 'ACEPTÓ' : `${r.status} ${r.motivo} → ${r.donde}`}`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
