/**
 * Los datos personales contra `aro.club/api`, con el mismo código del
 * celular. Deja una fila en `waitlist` con un correo desechable y la borra
 * al terminar; si por lo que sea se llegara a crear cuenta, también la borra.
 *
 *   npm run prueba:datos
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { crearServicioDatos } from '../src/datos/servicio.ts'
import { PASO_FIN, cuerpoGuardar, desdeServidor, inicial } from '../src/datos/maquina.ts'
import { crearApi } from '../src/sesion/api.ts'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => null, refrescar: async () => null })
const s = crearServicioDatos(api)

const CORREO = `banco-datos-${Date.now()}@aro.club`
// Único en profiles: uno al azar para no chocar con nadie.
const TEL = '412' + String(Math.floor(1e6 + Math.random() * 8.9e6))

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

try {
  const alta = await s.dejarCorreo(CORREO)
  ok(alta.ok && alta.datos.token, `alta nueva → ${alta.ok ? alta.datos.estado : alta.error}`)
  const lead = { correo: CORREO, token: alta.datos.token }

  const vacio = await s.cargar(lead)
  ok(vacio.ok && desdeServidor(inicial(), vacio.datos).paso === 0, 'sin datos todavía → paso 1')

  const sinLead = await s.cargar(null)
  ok(!sinLead.ok && sinLead.status === 401, `sin sesión ni lead → ${sinLead.ok ? 'ok' : sinLead.status} (la app pide el correo)`)

  const e = { ...inicial(), nombre: 'Banco Datos', trato: 'Banco', dia: '7', mes: 3, anio: '1994', genero: 'no-binario', telefono: TEL }
  const g = await s.guardar(lead, cuerpoGuardar(e))
  ok(g.ok, `guardar los cuatro → ${g.ok ? 'ok' : g.error}`)

  const menor = await s.guardar(lead, cuerpoGuardar({ ...e, anio: '2015' }))
  ok(!menor.ok, `un menor de edad lo para el servidor también → «${menor.ok ? '' : menor.error}»`)

  const lleno = await s.cargar(lead)
  const d = lleno.ok ? desdeServidor(inicial(), lleno.datos) : null
  ok(d?.paso === PASO_FIN, 'con los cuatro guardados → aterriza en el resumen')
  ok(d && d.nombre === 'Banco Datos' && d.dia === '7' && d.mes === 3 && d.anio === '1994' && d.genero === 'no-binario', 'los datos vuelven tal cual')
  ok(d && d.prefijo === '+58' && d.telefono === TEL, `el teléfono vuelve partido: ${d?.prefijo} ${d?.telefono}`)
  ok(lleno.ok && lleno.datos.puedeCuenta === false, 'sin el cuestionario, todavía no se puede crear cuenta')

  const cuenta = await s.crearCuenta(lead, 'una-clave-larga')
  ok(!cuenta.ok && cuenta.status === 409, `crear cuenta antes del cuestionario → ${cuenta.ok ? cuenta.datos.estado : `${cuenta.status} «${cuenta.error}»`}`)

  const corta = await s.crearCuenta(lead, '123')
  ok(!corta.ok, `contraseña corta → «${corta.ok ? '' : corta.error}»`)
} finally {
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 })
  const u = data?.users?.find((x) => x.email === CORREO)
  if (u) {
    await admin.from('profiles').delete().eq('id', u.id)
    await admin.auth.admin.deleteUser(u.id)
    console.log('  limpieza: se había creado cuenta y se borró')
  }
  const { error } = await admin.from('waitlist').delete().eq('email', CORREO)
  console.log(error ? `✗ limpieza: ${error.message}` : '  limpieza: fila borrada')
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo en orden')
process.exit(fallos ? 1 : 0)
