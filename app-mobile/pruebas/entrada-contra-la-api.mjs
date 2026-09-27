/**
 * La entrada contra `aro.club/api` de verdad, con el mismo código que corre
 * en el celular (`servicio` y `maquina`). Escribe una fila de `waitlist` con
 * un correo desechable y la borra al terminar, pase lo que pase.
 *
 *   npm run prueba:entrada
 */
import fs from 'node:fs'

import { createClient } from '@supabase/supabase-js'

import { crearServicio } from '../src/entrada/servicio.ts'
import { cuerpoDeRespuestas, inicial, reducir } from '../src/entrada/maquina.ts'
import { preguntasDeEntrada } from '../src/entrada/preguntas.ts'
import { crearApi } from '../src/sesion/api.ts'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../../.env.local', import.meta.url), 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const app = JSON.parse(fs.readFileSync(new URL('../app.json', import.meta.url), 'utf8')).expo.extra
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const api = crearApi({ base: app.api, urlSupabase: app.supabaseUrl, version: 'prueba/0', obtenerSesion: async () => null, refrescar: async () => null })
const s = crearServicio(api)
const CORREO = `banco-entrada-${Date.now()}@aro.club`

let fallos = 0
const ok = (c, t) => { console.log((c ? '✓ ' : '✗ ') + t); if (!c) fallos++ }

try {
  // El catálogo de verdad da las cuatro.
  const cat = await s.catalogo()
  const P = cat.ok ? preguntasDeEntrada(cat.datos) : null
  ok(!!P, `el catálogo (${cat.ok ? cat.datos.version : 'sin respuesta'}) da las cuatro preguntas: ${P?.map((p) => `${p.clave}(${p.opciones.length})`).join(', ')}`)

  // Correo mal escrito: el mensaje es el del servidor.
  const malo = await s.dejarCorreo('esto-no-es-un-correo')
  ok(!malo.ok && /no se ve completo/.test(malo.error), `correo mal escrito → «${malo.ok ? '' : malo.error}»`)

  // Nuevo: token.
  const nuevo = await s.dejarCorreo(CORREO)
  ok(nuevo.ok && nuevo.datos.estado === 'nuevo' && !!nuevo.datos.token, `correo nuevo → ${nuevo.ok ? nuevo.datos.estado : nuevo.error}, con token`)

  // Las cuatro respuestas, con la máquina: la primera opción de cada una y, en temas, las dos primeras.
  let e = { ...inicial(CORREO), fase: 'quiz' }
  for (const p of P) {
    const cuantas = Math.max(p.min, 1)
    for (const o of p.opciones.slice(0, cuantas)) e = reducir(e, { tipo: 'marcar', pregunta: p, valor: o.valor })
  }
  const cuerpo = cuerpoDeRespuestas(e, nuevo.ok ? nuevo.datos.token : null)

  // Sin token, o con uno ajeno: el servidor no deja sobrescribir las respuestas de nadie.
  const { token: _t, ...sinToken } = cuerpo
  const sinT = await api.pedir('/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...sinToken, origen: 'app' }) })
  ok(sinT.status === 403, `respuestas sin token → ${sinT.status}`)
  const ajeno = await api.pedir('/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...cuerpo, token: 'x'.repeat(43), origen: 'app' }) })
  ok(ajeno.status === 403, `respuestas con un token que no es suyo → ${ajeno.status}`)

  const guardado = await s.guardarRespuestas(cuerpo)
  ok(guardado.ok && guardado.datos.estado === 'completado', `respuestas → ${guardado.ok ? guardado.datos.estado : guardado.error}`)

  // En la base, por código.
  const { data: fila } = await admin.from('waitlist').select('rootedness, zones, days, conversation_topics, quiz_completed_at, source, city_slug').eq('email', CORREO).single()
  ok(fila?.rootedness === cuerpo.arraigo, `arraigo guardado como código: ${fila?.rootedness}`)
  ok(JSON.stringify(fila?.zones) === JSON.stringify(cuerpo.zonas), `zonas: ${JSON.stringify(fila?.zones)}`)
  ok(JSON.stringify(fila?.days) === JSON.stringify(cuerpo.dias), `días: ${JSON.stringify(fila?.days)}`)
  ok(JSON.stringify(fila?.conversation_topics) === JSON.stringify(cuerpo.temas), `temas: ${JSON.stringify(fila?.conversation_topics)}`)
  ok(!!fila?.quiz_completed_at, 'quiz marcado como completado')
  ok(fila?.source === 'app', `origen grabado: ${fila?.source} (ciudad: ${fila?.city_slug})`)

  // Repetido: sin token.
  const otra = await s.dejarCorreo(CORREO)
  ok(otra.ok && otra.datos.estado === 'repetido' && !otra.datos.token, `mismo correo otra vez → ${otra.ok ? otra.datos.estado : otra.error}, sin token`)
  ok(reducir({ ...inicial(CORREO), fase: 'enviando' }, { tipo: 'guardado', repetido: true }).fase === 'repetido', 'y la máquina lo lleva a «repetido», no al quiz')
} finally {
  const { error } = await admin.from('waitlist').delete().eq('email', CORREO)
  console.log(error ? `✗ limpieza: ${error.message}` : '  limpieza: fila borrada')
}

console.log(fallos ? `\n${fallos} fallo(s)` : '\ntodo en orden')
process.exit(fallos ? 1 : 0)
