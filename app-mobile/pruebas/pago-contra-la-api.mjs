/**
 * Pago contra aro.club/api, SOLO con la cuenta del banco. Lee la fecha
 * abierta, prueba un código que no existe (no escribe nada) y, con
 * REPORTAR=1, reporta un Pago Móvil inventado: eso APARTA un puesto y le
 * llega a operación, así que el banco lo borra al terminar (pagos y reservas).
 * La captura no se sube: dejaría un fichero que el banco no limpia.
 *
 *   node ../scripts/banco-pruebas.mjs lista && REPORTAR=1 npm run prueba:pago; node ../scripts/banco-pruebas.mjs borrar
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import * as M from '../src/pago/maquina.ts'
import { crearServicioPago } from '../src/pago/servicio.ts'
import { crearApi } from '../src/sesion/api.ts'

const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
const { data, error } = await sdk.auth.signInWithPassword({ email: 'banco-pruebas@aro.club', password: 'Prueba-8x1' })
if (error || data.user.email !== 'banco-pruebas@aro.club') { console.log('✗ no se pudo entrar con la cuenta del banco'); process.exit(1) }
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => data.session, refrescar: async () => null })
const s = crearServicioPago(api)

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

const cuenta = await (await api.pedir('/mi-cuenta')).json()
const ev = cuenta.agenda.find((a) => !a.cerrada && !a.mia)
if (!ev) { console.log('✗ no hay fecha abierta a la que apuntarse'); process.exit(1) }

let r = await s.cargar(ev.id)
ok(r.ok, 'GET /api/pago responde')
if (!r.ok) process.exit(1)
let d = r.datos
const pm = d.metodos.find((m) => m.id === 'pm')
ok(d.verificada && pm?.activo && pm.datos.length > 0, `verificada y con Pago Móvil encendido (${pm?.datos.length} datos para copiar)`)
ok(pm.datos.every((x) => x.valor && x.copiar), 'cada dato trae lo que se pinta y lo que se copia')
console.log('  ', M.cabecera(d).nombre, '·', M.montoDe(d, pm), '·', M.etiquetaTasa(d, Date.now()), '· fase', M.faseDeServidor(d))

const c = await s.cupon(ev.id, 'NOEXISTE-' + Date.now().toString(36).toUpperCase())
ok(!c.ok && c.error, `un código que no existe se niega junto al campo: «${c.ok ? '' : c.error}»`)

if (process.env.REPORTAR) {
  const hoy = new Date(Date.now() - 4 * 3600_000).toISOString().slice(0, 10).split('-').reverse().join('/')
  const rep = { doc_tipo: 'V', tel: '4141234567', doc: '12345678', banco: '0105', ref: '123456', fecha: hoy }
  const e = M.estadoReporte(pm, rep, false, Date.now())
  ok(e.ok, `el reporte está completo para la pantalla (${JSON.stringify(e)})`)
  const rr = await s.reportar(M.cuerpoReporte(d, pm, rep, null))
  ok(rr.ok && rr.datos.estado === 'reportado', `reportar: ${rr.ok ? rr.datos.estado : rr.error}`)
  r = await s.cargar(ev.id)
  ok(r.ok && M.faseDeServidor(r.datos) === 'pendiente', `al volver, en qué va: ${r.ok ? M.faseDeServidor(r.datos) : r.error}`)
  const otra = await s.reportar(M.cuerpoReporte(d, pm, rep, null))
  ok(!otra.ok, `un segundo reporte del mismo puesto se niega: «${otra.ok ? '' : otra.error}»`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo bien')
process.exit(fallos ? 1 : 0)
