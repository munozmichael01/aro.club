/**
 * El correo que pide probadores de Android.
 *
 * Google no publica en Play hasta que doce personas tengan la app instalada
 * catorce días seguidos. El 26-10 salió a 37 personas y se apuntaron 8, así
 * que el reloj sigue corriendo y hay que volver a pedirlo.
 *
 * El criterio es el MISMO del 26-10, y lo fijó Michael el 30-10 a la una de
 * la mañana: quien verificó desde Android, no lo ha recibido, tiene una
 * reserva confirmada o asistida y NINGUNA cancelación, ni suya ni nuestra.
 * «Nadie más.» Pedirle un favor a quien nunca ha venido, o a quien nos dejó
 * colgada una mesa, es gastar el único correo que le vas a mandar.
 *
 * No hay ruta para esto a propósito: no es un cron, es un favor que se pide
 * a mano cuando hace falta. Pero tampoco se vuelve a escribir cada vez, que
 * es como el del 26-10 acabó siendo imposible de repetir igual.
 *
 *   node scripts/probadores-android.mjs              dice a quién, sin escribir
 *   node scripts/probadores-android.mjs aplicar      encola de verdad
 *   node scripts/probadores-android.mjs aplicar 2026-10-31T14:00:00Z
 *
 * Sin hora, encola para YA, y encolar es mandar: esta base es la de
 * producción. La hora se escribe en UTC porque es lo que guarda la columna;
 * las 10:00 de Caracas son las 14:00 UTC.
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

/** Por tramos: `bookings` crece una fila por cada persona que cena, para siempre. */
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

const BUENAS = new Set(['confirmed', 'attended'])
// `no_show` cuenta como cancelación: dejó la silla vacía sin avisar, que para
// la mesa es peor que cancelar.
const CANCELADAS = new Set(['cancelled_by_user', 'cancelled_by_ops', 'no_show'])

const [perfiles, verificados, reservas, bajas, yaFue] = await Promise.all([
  todas('profiles', 'id, email, dispositivo_verificacion, deleted_at, es_prueba'),
  todas('v_verified_profiles', 'id'),
  todas('bookings', 'profile_id, status'),
  // `bajas_correo` va por dirección, no tiene `id`: la clave es el correo.
  todas('bajas_correo', 'correo, deshecha_at', 'correo'),
  todas('scheduled_emails', 'profile_id, email, kind'),
])

const esVerificado = new Set(verificados.map((v) => v.id).filter(Boolean))
const deBaja = new Set(bajas.filter((b) => !b.deshecha_at).map((b) => String(b.correo).trim().toLowerCase()))
const probadores = yaFue.filter((f) => f.kind === 'probadores_android')
const yaLoTiene = new Set(probadores.map((f) => f.profile_id).filter(Boolean))
const yaLoTieneCorreo = new Set(probadores.map((f) => String(f.email ?? '').trim().toLowerCase()).filter(Boolean))

const suyas = new Map()
for (const r of reservas) {
  if (!r.profile_id) continue
  if (!suyas.has(r.profile_id)) suyas.set(r.profile_id, [])
  suyas.get(r.profile_id).push(r.status)
}

const correoDe = (p) => String(p.email ?? '').trim().toLowerCase()

const elegidos = perfiles.filter((p) => {
  if (p.deleted_at || p.es_prueba || !correoDe(p)) return false
  if (p.dispositivo_verificacion !== 'android') return false
  if (!esVerificado.has(p.id)) return false
  if (yaLoTiene.has(p.id) || yaLoTieneCorreo.has(correoDe(p))) return false
  if (deBaja.has(correoDe(p))) return false
  const estados = suyas.get(p.id) ?? []
  return estados.some((e) => BUENAS.has(e)) && !estados.some((e) => CANCELADAS.has(e))
})

const android = perfiles.filter((p) => !p.deleted_at && !p.es_prueba && p.dispositivo_verificacion === 'android')
console.log(`verificaron desde Android: ${android.length}`)
console.log(`  de esos, verificados: ${android.filter((p) => esVerificado.has(p.id)).length}`)
console.log(`  y sin el correo del 26-10 ni baja: ${android.filter((p) => esVerificado.has(p.id)
  && !yaLoTiene.has(p.id) && !yaLoTieneCorreo.has(correoDe(p)) && !deBaja.has(correoDe(p))).length}`)
console.log(`\nCUMPLEN EL CRITERIO ENTERO: ${elegidos.length}`)
console.log(`ya lo recibieron antes: ${probadores.length}`)

const aplicar = process.argv[2] === 'aplicar'
const cuando = process.argv[3] || null

if (!aplicar) {
  console.log('\n(en seco: no se ha escrito nada. `aplicar` para encolar)')
  process.exit(0)
}
if (!elegidos.length) {
  console.log('\nNo hay a quién escribirle. No se encola nada.')
  process.exit(0)
}

const send_at = cuando ? new Date(cuando) : new Date()
if (Number.isNaN(send_at.getTime())) {
  console.log('\nLa hora no se entiende. Se escribe como 2026-10-31T14:00:00Z.')
  process.exit(1)
}

const filas = elegidos.map((p) => ({
  profile_id: p.id,
  email: correoDe(p),
  kind: 'probadores_android',
  event_id: null,
  send_at: send_at.toISOString(),
  payload: {},
}))

const { error } = await admin.from('scheduled_emails').insert(filas)
if (error) {
  console.log('\nERROR al encolar:', error.message)
  process.exit(1)
}
console.log(`\nEncoladas ${filas.length} para ${send_at.toISOString()}`)
console.log('La cola de correos pasa cada quince minutos y las saca a su hora.')
