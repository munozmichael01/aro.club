/**
 * El Inicio contra aro.club/api: lo que devuelve el servidor pasa por la
 * misma máquina que la pantalla, en el estado que haya montado el banco.
 *
 *   node ../scripts/banco-pruebas.mjs <estados> && ESPERA=<estado> npm run prueba:cuenta; node ../scripts/banco-pruebas.mjs borrar
 *
 * Reservar se prueba SOLO por el lado del «no» (sin créditos): no crea nada.
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/cuenta/maquina.ts'
import { crearServicioCuenta } from '../src/cuenta/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })

const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error) { console.log('✗ no se pudo entrar. ¿Está creada la cuenta del banco?', error.message); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioCuenta(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

const sinSesion = await crearServicioCuenta(crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => null, refrescar: async () => null })).cuenta()
ok(!sinSesion.ok && sinSesion.status === 401, `sin sesión → ${sinSesion.status}`)

const c = await s.cuenta()
ok(c.ok, 'mi-cuenta responde')
if (!c.ok) process.exit(1)
const d = c.datos
const m = await s.mesa()
const x = await s.exclusiones()
ok(m.ok, `mi-mesa responde (${m.ok ? m.datos.fase ?? 'con mesa' : m.error})`)
ok(x.ok && Array.isArray(x.datos.exclusiones), 'mis-exclusiones responde')

const espera = process.env.ESPERA
if (espera) ok(d.estado === espera, `estado: ${d.estado} (se esperaba ${espera})`)

const t = M.tarjeta(d, m.ok && m.datos.mesaId ? m.datos : null, Date.now())
console.log(`  [${t.sello}] ${t.titulo}\n  ${t.cuerpo}\n  → ${t.accion} (${t.destino})${t.reloj ? '  · ' + t.reloj : ''}`)
ok(t.titulo && t.cuerpo && t.accion, 'la tarjeta tiene titular, cuerpo y acción')
if (d.estado === 'abierta') ok(!!t.mesa, `con la mesa revelada: ${t.mesa?.sitio} · mesa ${t.mesa?.numero}`)

const g = M.agenda(d.agenda, null, Date.now())
console.log('  agenda:', g.map((x) => `${x.semana}: ${x.filas.map((f) => `${f.tipo} ${f.cuando} (${f.estado})`).join('; ')}`).join(' | ') || 'vacía')
console.log('  polaroids:', M.filtros(d.agenda, null).map((f) => `${f.nombre}=${f.detalle}`).join(', '))
console.log('  lo próximo:', M.proximos(d.planes).map((p) => `${p.sitio} ${p.cuando} ${p.estado}`).join('; ') || 'nada')
console.log('  atajos:', M.atajos(d, x.ok ? x.datos.exclusiones.length : null).map((a) => `${a.titulo}: ${a.pie}`).join(' · '))
if (d.porValorar) console.log('  por valorar:', d.porValorar.sitio)
// Solo los textos: un `mesa: null` del objeto no se pinta, un «null» dentro de una frase sí.
const textos = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(textos) : [])
const malos = textos([t, g, M.filtros(d.agenda, null), M.proximos(d.planes), M.atajos(d, 0)]).filter((x) => /undefined|null|NaN/.test(x))
ok(!malos.length, `ni «undefined», ni «null», ni «NaN» en lo que se pinta${malos.length ? ': ' + malos.join(' | ') : ''}`)

const abierta = d.agenda.find((a) => !a.cerrada && !a.mia)
if (abierta && d.creditos === 0 && d.verif === 'ok') {
  const r = await s.reservar(abierta.id)
  ok(!r.ok && r.error, `reservar sin créditos se niega con motivo: «${r.ok ? '' : r.error}»`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
