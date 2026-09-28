/**
 * Mi mesa contra aro.club/api, en el estado que monte el banco. Solo lee:
 * «Voy tarde» y lo de después mandan correos, bloqueos y reportes a gente
 * real, así que de ellos solo se prueba el «no» (avisar antes de que se
 * abra la mesa), que no manda nada.
 *
 *   node ../scripts/banco-pruebas.mjs lista mesa && ESPERA=cerrada npm run prueba:mesa; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/mesa/maquina.ts'
import { crearServicioMesa } from '../src/mesa/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'
import * as F from '../src/texto/fechas.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error) { console.log('✗ no se pudo entrar. ¿Está creada la cuenta del banco?', error.message); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioMesa(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

const r = await s.mesa()
ok(r.ok, `mi-mesa responde: fase ${r.ok ? r.datos.fase : r.error}`)
if (!r.ok) process.exit(1)
const d = r.datos
const espera = process.env.ESPERA
if (espera) ok(M.fase(d) === espera, `fase en pantalla: ${M.fase(d)} (se esperaba ${espera})`)

const f = M.fase(d)
if (f === 'vacia') console.log('  ', M.vacia(d).sello, '·', M.vacia(d).titulo)
if (f === 'cerrada') {
  console.log('  ', F.selloSeAbre(d.revelaEn, d.zonaHoraria, Date.now()), '·', F.tienesPuesto(d.empiezaEn, d.zonaHoraria), '·', F.cuentaMesa(d.revelaEn, Date.now()))
  ok(!!d.zonaHoraria, `la fecha trae su zona: ${d.zonaHoraria}`)
  const t = await s.tarde(20)
  ok(!t.ok && t.status === 409, `avisar antes de que se abra se niega y no manda nada: «${t.ok ? '' : t.error}»`)
}
if (f === 'abierta' || f === 'pasada') {
  ok(!!d.mesaId && Array.isArray(d.companeros), `con mesa ${M.numero(d)} en ${d.restaurante}, ${d.companeros.length} compañeros`)
  console.log('  ', F.cuandoMesa(d.empiezaEn, d.zonaHoraria, Date.now()), '· mapa:', M.mapa(d, 'ios') ? 'sí' : 'no')
  const ya = M.yaHecho(d)
  console.log('   ya hecho:', JSON.stringify(ya))
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
