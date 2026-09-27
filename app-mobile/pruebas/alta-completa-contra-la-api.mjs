/**
 * El alta ENTERA contra aro.club/api, con el código de la app: correo →
 * las cuatro de la puerta → las preguntas del cuestionario, una a una → los
 * datos → la cuenta → entrar con el SDK. Todo con una cuenta desechable que
 * se borra al terminar, pase lo que pase.
 *
 *   npm run prueba:alta
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { crearServicio } from '../src/entrada/servicio.ts'
import { crearServicioDatos } from '../src/datos/servicio.ts'
import { crearServicioCuestionario } from '../src/cuestionario/servicio.ts'
import { armar, obligatorias } from '../src/cuestionario/maquina.ts'
import { cuerpoGuardar, inicial as datosInicial } from '../src/datos/maquina.ts'
import { crearApi } from '../src/sesion/api.ts'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const ANON = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim()
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => null, refrescar: async () => null })
const entrada = crearServicio(api), datos = crearServicioDatos(api), cuest = crearServicioCuestionario(api)

const CORREO = `banco-alta-${Date.now()}@aro.club`
const TEL = '412' + String(Math.floor(1e6 + Math.random() * 8.9e6))
let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

/** Una respuesta válida para cada tipo, sacada del propio catálogo. */
function respuesta(q) {
  if (q.tipo === 'fecha') return '1994-03-07'
  if (q.tipo === 'texto') return 'Polar'
  if (q.tipo === 'unica' || q.tipo === 'ficha') return q.opciones[0].valor
  const normales = q.opciones.filter((o) => o.valor !== q.exclusiva)
  return normales.slice(0, Math.max(q.min || 1, 1)).map((o) => o.valor)
}

try {
  const alta = await entrada.dejarCorreo(CORREO)
  const lead = { correo: CORREO, token: alta.ok ? alta.datos.token : '' }
  ok(!!lead.token, 'correo nuevo, con token')

  const [cat, zonas] = await Promise.all([cuest.catalogo(), cuest.zonas()])
  const P = cat.ok ? armar(cat.datos.preguntas, zonas.ok ? zonas.datos.zonas : null) : null
  ok(!!P, `catálogo ${cat.ok ? cat.datos.version : '—'}: ${P?.length} preguntas, ${P ? obligatorias(P) : '—'} obligatorias`)

  const antes = await cuest.cargar(lead)
  ok(antes.ok && !antes.datos.completado, `al empezar: ${antes.ok ? antes.datos.faltan?.length : '—'} por contestar`)

  let ultimo = null
  for (const q of P) {
    const r = await cuest.enviar(lead, q.clave, respuesta(q), q.pantalla)
    if (!r.ok) { ok(false, `${q.clave} → ${r.status} «${r.error}»`); continue }
    ultimo = r.datos
  }
  ok(ultimo && ultimo.completo === true && (ultimo.faltan ?? []).length === 0, `tras las ${P.length}: completo=${ultimo?.completo}, faltan=${JSON.stringify(ultimo?.faltan)}`)

  const sinToken = await cuest.enviar(null, 'genero', 'mujer', 0)
  ok(!sinToken.ok && sinToken.status === 403, `sin sesión ni lead no se guarda → ${sinToken.status}`)
  const malo = await cuest.enviar(lead, 'genero', 'no-existe', 0)
  ok(!malo.ok && malo.status === 400, `un código que no existe → ${malo.status} «${malo.ok ? '' : malo.error}»`)

  const vuelta = await cuest.cargar(lead)
  ok(vuelta.ok && vuelta.datos.completado === true, `al volver: completado, donde=${vuelta.ok ? vuelta.datos.donde : '—'}`)

  const e = { ...datosInicial(), nombre: 'Banco Alta', trato: 'Banco', dia: '7', mes: 3, anio: '1994', genero: 'mujer', telefono: TEL }
  const g = await datos.guardar(lead, cuerpoGuardar(e))
  ok(g.ok, `datos guardados → ${g.ok ? 'ok' : g.error}`)
  const d = await datos.cargar(lead)
  ok(d.ok && d.datos.puedeCuenta === true, 'con preguntas y datos, ya se puede crear la cuenta')

  const cuenta = await datos.crearCuenta(lead, 'una-clave-larga')
  ok(cuenta.ok && cuenta.datos.estado?.startsWith('creada'), `cuenta → ${cuenta.ok ? cuenta.datos.estado : cuenta.error}`)

  const sdk = createClient(app.supabaseUrl, ANON, { auth: { persistSession: false } })
  const dentro = await sdk.auth.signInWithPassword({ email: CORREO, password: 'una-clave-larga' })
  ok(!dentro.error && !!dentro.data.session, 'el SDK entra con esa cuenta')

  const conSesion = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => dentro.data.session, refrescar: async () => null })
  const mc = await conSesion.json('/mi-cuenta')
  ok(mc.status === 200, `con sesión, /mi-cuenta → ${mc.status}, estado «${mc.datos.estado}», verif «${mc.datos.verif}»`)
  const cs = await crearServicioCuestionario(conSesion).cargar(null)
  ok(cs.ok && cs.datos.completado === true, 'y el cuestionario sigue completo, ahora por la sesión de la cuenta')
} finally {
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const u = data?.users?.find((x) => x.email === CORREO)
  if (u) {
    for (const t of ['payments', 'credit_ledger', 'bookings', 'answers', 'verifications']) await admin.from(t).delete().eq('profile_id', u.id)
    await admin.from('profiles').delete().eq('id', u.id)
    await admin.auth.admin.deleteUser(u.id)
  }
  const { error } = await admin.from('waitlist').delete().eq('email', CORREO)
  console.log(`  limpieza: ${u ? 'cuenta y perfil borrados; ' : ''}${error ? '✗ ' + error.message : 'fila borrada'}`)
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo en orden')
process.exit(fallos ? 1 : 0)
