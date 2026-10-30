/**
 * El empujón a quien se verificó y nunca se ha sentado.
 *
 * Michael lo escribió el 30-10 de madrugada y dijo a quién va: «verificados
 * que nunca han cenado y no tienen reserva activa». Eso es más amplio que
 * «nunca ha reservado»: entra también quien reservó una vez, canceló y no ha
 * vuelto, que es justo a quien hay que empujar.
 *
 * Las fechas van como IDS en el payload: lo que se manda a las ocho es lo que
 * esté abierto a las ocho, no lo que estaba a las tres de la madrugada.
 *
 *   node scripts/empujon-del-viernes.mjs                      dice a quién, sin escribir
 *   node scripts/empujon-del-viernes.mjs muestra CORREO       una sola, para verla
 *   node scripts/empujon-del-viernes.mjs aplicar 08:00        encola para esa hora de Caracas
 *
 * `aplicar` BORRA antes las filas sin enviar de `resumen_semanal` con la
 * clave `finde-30-10`: son el envío que yo encolé por error, y dejar los dos
 * sería mandar dos correos a la misma gente la misma mañana.
 */
import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } })

const CARACAS = 4
const ACTIVAS = ['held', 'pending_payment', 'confirmed']

async function todas(tabla, select, clave = 'id') {
  const out = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await admin.from(tabla).select(select).order(clave).range(desde, desde + 999)
    if (error) throw new Error(`${tabla}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

/** La próxima vez que den esas horas y minutos en Caracas. */
function aLasDeCaracas(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hhmm).trim())
  if (!m) return null
  const ahora = new Date()
  const ccs = new Date(ahora.getTime() - CARACAS * 3600_000)
  const hoy = Date.UTC(ccs.getUTCFullYear(), ccs.getUTCMonth(), ccs.getUTCDate(), Number(m[1]), Number(m[2]))
  const cuando = new Date(hoy + CARACAS * 3600_000)
  return cuando.getTime() > ahora.getTime() ? cuando : new Date(cuando.getTime() + 24 * 3600_000)
}

// --- las fechas que se ofrecen ---------------------------------------
const ahoraIso = new Date().toISOString()
const { data: fechas, error: eF } = await admin
  .from('events')
  .select('id, format, starts_at, booking_closes_at, city_slug, idioma, age_band_min')
  .eq('status', 'open')
  .eq('es_prueba', false)
  .gt('booking_closes_at', ahoraIso)
  .order('starts_at')
if (eF) throw new Error('events: ' + eF.message)
if (!fechas.length) { console.log('No hay ninguna fecha abierta. No se encola nada.'); process.exit(0) }

const car = (s) => new Date(new Date(s).getTime() - CARACAS * 3600e3).toISOString().slice(0, 16).replace('T', ' ')
console.log('fechas que llevaria el correo:')
for (const f of fechas) console.log('  ', car(f.starts_at), f.format, (f.idioma ? 'en ' + f.idioma : ''), (f.age_band_min ? '+' + f.age_band_min : ''), '| cierra', car(f.booking_closes_at))

// --- a quien ---------------------------------------------------------
const [perfiles, verificados, reservas, bajas, cola] = await Promise.all([
  todas('profiles', 'id, email, deleted_at, es_prueba, city_slug, notificaciones'),
  todas('v_verified_profiles', 'id'),
  todas('bookings', 'profile_id, status'),
  todas('bajas_correo', 'correo, deshecha_at', 'correo'),
  todas('scheduled_emails', 'id, profile_id, email, kind, sent_at, payload'),
])

const esVerificado = new Set(verificados.map((v) => v.id).filter(Boolean))
const deBaja = new Set(bajas.filter((b) => !b.deshecha_at).map((b) => String(b.correo).trim().toLowerCase()))
const suyas = new Map()
for (const r of reservas) {
  if (!r.profile_id) continue
  if (!suyas.has(r.profile_id)) suyas.set(r.profile_id, [])
  suyas.get(r.profile_id).push(r.status)
}
const correoDe = (p) => String(p.email ?? '').trim().toLowerCase()

const destinatarios = perfiles.filter((p) => {
  if (p.deleted_at || p.es_prueba || !correoDe(p)) return false
  if (p.city_slug && p.city_slug !== 'caracas') return false
  if (!esVerificado.has(p.id)) return false
  if (deBaja.has(correoDe(p))) return false
  // Encendido por defecto: solo se salta a quien lo apago a proposito.
  if (((p.notificaciones ?? {}).resumen_semanal) === false) return false
  const e = suyas.get(p.id) ?? []
  // «Nunca han cenado y no tienen reserva activa», las dos cosas.
  if (e.includes('attended')) return false
  if (e.some((x) => ACTIVAS.includes(x))) return false
  return true
})

// --- cuanta gente ya se sento ----------------------------------------
const { data: evsReales } = await admin.from('events').select('id').eq('es_prueba', false)
const reales = new Set((evsReales ?? []).map((e) => e.id))
const vivos = new Set(perfiles.filter((p) => !p.es_prueba).map((p) => p.id))
const sentados = new Set(
  reservas.filter((r) => r.status === 'attended' && vivos.has(r.profile_id)).map((r) => r.profile_id),
)
void reales

console.log('\ndestinatarios (verificados, sin haber cenado, sin reserva activa, de Caracas):', destinatarios.length)
console.log('personas que ya se sentaron:', sentados.size, '-> el correo dira «Más de ' + Math.floor(sentados.size / 10) * 10 + '»')

const sobrantes = cola.filter((r) => !r.sent_at && r.kind === 'resumen_semanal' && r.payload?.semana === 'finde-30-10')
console.log('filas de resumen_semanal sin enviar que se borrarian:', sobrantes.length)

const orden = process.argv[2]
const payload = { fechas: fechas.map((f) => f.id), sentados: sentados.size }

if (orden === 'muestra') {
  const correo = String(process.argv[3] ?? '').trim().toLowerCase()
  const quien = perfiles.find((p) => correoDe(p) === correo)
  if (!quien) { console.log('\nNo hay cuenta viva con ese correo.'); process.exit(1) }
  const { error } = await admin.from('scheduled_emails').insert({
    profile_id: quien.id, email: correo, kind: 'te_falta_sentarte', event_id: null,
    send_at: new Date().toISOString(), payload,
  })
  console.log(error ? '\nERROR: ' + error.message : '\nEncolada una muestra para ' + correo + '. Sale en la proxima vuelta de la cola.')
  process.exit(error ? 1 : 0)
}

if (orden !== 'aplicar') {
  console.log('\n(en seco: no se ha escrito nada. `aplicar 08:00` para encolar)')
  process.exit(0)
}

const cuando = aLasDeCaracas(process.argv[3] ?? '08:00')
if (!cuando) { console.log('\nLa hora se escribe como 08:00.'); process.exit(1) }

if (sobrantes.length) {
  const { error } = await admin.from('scheduled_emails').delete().in('id', sobrantes.map((r) => r.id)).is('sent_at', null)
  if (error) { console.log('\nERROR al borrar las del resumen: ' + error.message); process.exit(1) }
  console.log('\nborradas ' + sobrantes.length + ' filas de resumen_semanal sin enviar')
}

const filas = destinatarios.map((p) => ({
  profile_id: p.id, email: correoDe(p), kind: 'te_falta_sentarte', event_id: null,
  send_at: cuando.toISOString(), payload,
}))
for (let i = 0; i < filas.length; i += 200) {
  const { error } = await admin.from('scheduled_emails').insert(filas.slice(i, i + 200))
  if (error) { console.log('ERROR al encolar: ' + error.message); process.exit(1) }
}
console.log('encoladas ' + filas.length + ' para ' + car(cuando.toISOString()) + ' de Caracas')
