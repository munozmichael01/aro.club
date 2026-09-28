/**
 * Perfil contra aro.club/api, SOLO con la cuenta del banco de pruebas: edita
 * un dato y una respuesta y los lee de vuelta, alterna un aviso, y con
 * BAJA=1 da de baja la cuenta (que es la del banco: para eso existe).
 *
 *   node ../scripts/banco-pruebas.mjs lista && BAJA=1 npm run prueba:perfil; node ../scripts/banco-pruebas.mjs borrar
 *
 * Con GUARDAR=<fichero> deja la respuesta de /api/mi-perfil para el catálogo.
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/perfil/maquina.ts'
import { crearServicioPerfil } from '../src/perfil/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error) { console.log('✗ no se pudo entrar. ¿Está creada la cuenta del banco?', error.message); process.exit(1) }
if (data.user.email !== 'banco-pruebas@aro.club') { console.log('✗ no es la cuenta del banco'); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioPerfil(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

let r = await s.perfil()
ok(r.ok, 'mi-perfil responde')
if (!r.ok) process.exit(1)
if (process.env.GUARDAR) fs.writeFileSync(process.env.GUARDAR, JSON.stringify(r.datos, null, 2))
let d = r.datos
const campos = M.campos(d)
const vals = M.valores(d)
console.log('  credenciales:', M.credenciales(d).map((c) => c.texto).join(' · '))
console.log('  campos por sección:', [0, 1, 2, 3, 4, 5].map((i) => campos.filter((c) => c.seccion === i).length).join('/'))
const malos = campos.map((c) => M.texto(c, vals[c.clave] ?? null)).filter((t) => /undefined|null|NaN/.test(t))
ok(!malos.length, `ningún valor se lee «undefined» o «null»${malos.length ? ': ' + malos.join(' | ') : ''}`)
ok(campos.filter((c) => c.tipo !== 'texto' && c.tipo !== 'fecha').every((c) => c.opciones.length > 0), 'toda pregunta de elegir trae opciones del catálogo')

// Un dato base y una respuesta múltiple, guardados por código, leídos de vuelta.
const g1 = await s.guardar('trato', 'Bancoprueba')
const multi = campos.find((c) => c.tipo === 'multi' && c.opciones.length >= 3 && !c.exclusiva)
let borrador = []
for (const [, cod] of multi.opciones.slice(0, Math.max(multi.min ?? 1, 1))) borrador = M.marcar(multi, borrador, cod)
const g2 = await s.guardar(multi.clave, M.paraGuardar(multi, borrador))
r = await s.perfil()
d = r.datos
ok(g1.ok && d.base.trato === 'Bancoprueba', `el trato se guarda: «${d.base.trato}»`)
ok(g2.ok && JSON.stringify(M.valores(d)[multi.clave]) === JSON.stringify(borrador), `«${multi.clave}» se guarda por código: ${JSON.stringify(M.valores(d)[multi.clave])}`)
const tel = await s.guardar('telefono', M.paraGuardar(campos.find((c) => c.clave === 'telefono'), '4141234567'))
r = await s.perfil()
ok(tel.ok && r.datos.base.telefono === '+584141234567', `el teléfono se guarda en E.164: ${r.datos.base.telefono}`)

const a = await s.avisos()
ok(a.ok && a.datos.avisos.length > 0, `mis-avisos: ${a.ok ? a.datos.avisos.map((x) => `${x.clave}${x.fijo ? '(fijo)' : ''}=${x.encendido}`).join(', ') : a.error}`)
const libre = a.ok && a.datos.avisos.find((x) => !x.fijo && x.clave !== 'whatsapp')
if (libre) {
  const t = await s.aviso(libre.clave, !libre.encendido)
  const a2 = await s.avisos()
  ok(t.ok && a2.datos.avisos.find((x) => x.clave === libre.clave).encendido === !libre.encendido, `el aviso «${libre.clave}» se alterna`)
  await s.aviso(libre.clave, libre.encendido)
}
const x = await s.exclusiones()
ok(x.ok, `mis-exclusiones: ${x.ok ? x.datos.exclusiones.length : x.error}`)

if (process.env.BAJA) {
  const b = await s.baja()
  ok(b.ok && b.datos.estado === 'baja', `la baja de la cuenta del banco: ${b.ok ? b.datos.estado : b.error}`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
