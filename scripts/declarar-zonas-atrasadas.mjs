/**
 * Declara la zona de las reservas que se hicieron antes de que esto existiera.
 *
 * Desde el 22 de agosto de 2026, apuntarse a una fecha declara interés en su
 * zona: `/api/pago` lo hace al apartar el puesto. Las reservas anteriores no
 * pasaron por ahí, así que su gente sigue fuera del reparto de esa fecha sin
 * que nadie lo haya decidido.
 *
 * Caso de hoy: Valeria tiene reserva pagada en la cena del 25, que solo abre
 * El Rosal, y sus zonas son Las Mercedes y Chacao.
 *
 * Hace exactamente lo mismo que la ruta —la misma regla, solo si la
 * intersección está vacía— pero sobre lo que ya existe. Escribe en la
 * respuesta `zonas` y NO en `profile_traits`, que es derivada y se recalcula.
 *
 *   node scripts/declarar-zonas-atrasadas.mjs           enseña lo que haría
 *   node scripts/declarar-zonas-atrasadas.mjs --hazlo   lo escribe
 *
 * Es idempotente: en cuanto la zona está declarada, la intersección deja de
 * estar vacía y no vuelve a tocar nada.
 */
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
)
const B = env.NEXT_PUBLIC_SUPABASE_URL
const K = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: K, Authorization: `Bearer ${K}`, 'Content-Type': 'application/json' }
const HAZLO = process.argv.includes('--hazlo')

const get = (p) => fetch(`${B}/rest/v1/${p}`, { headers: H }).then((r) => r.json())

// Solo reservas VIVAS: cancelada o no presentada no declara nada.
const VIVAS = ['held', 'pending_payment', 'confirmed', 'waitlisted', 'attended']

const [version] = await get('questionnaire_versions?select=id&is_active=eq.true')
if (!version) { console.error('No hay versión activa del cuestionario.'); process.exit(1) }

const reservas = await get(
  `bookings?select=id,event_id,profile_id,status,events(starts_at,status)&status=in.(${VIVAS.join(',')})`)
const sedes = await get('event_venues?select=event_id,zone_slug')
const respuestas = await get(`answers?select=profile_id,value&question_key=eq.zonas&version_id=eq.${version.id}`)
const perfiles = await get('profiles?select=id,display_name,full_name&deleted_at=is.null')
const zonas = await get('zones?select=slug,name')

const nombre = new Map(perfiles.map((p) => [p.id, p.display_name || p.full_name || p.id.slice(0, 8)]))
const zonaNombre = new Map(zonas.map((z) => [z.slug, z.name]))
const suyas = new Map(respuestas.map((r) => [r.profile_id, Array.isArray(r.value) ? r.value : []]))

let tocadas = 0
for (const b of reservas) {
  // Solo fechas que todavía no han pasado: cambiarle las zonas a alguien por
  // una cena de hace tres semanas no arregla nada y le ensucia el perfil.
  const ev = b.events
  if (!ev || new Date(ev.starts_at).getTime() < Date.now()) continue

  const abiertas = [...new Set(sedes.filter((s) => s.event_id === b.event_id).map((s) => s.zone_slug))]
  if (!abiertas.length) continue

  const tiene = suyas.get(b.profile_id) ?? []
  if (tiene.some((z) => abiertas.includes(z))) continue

  const nuevas = [...new Set([...tiene, ...abiertas])]
  const anadidas = abiertas.filter((z) => !tiene.includes(z))

  console.log(`${nombre.get(b.profile_id)} · ${ev.starts_at.slice(0, 10)}`)
  console.log(`   tenía:  ${tiene.map((z) => zonaNombre.get(z) ?? z).join(', ') || '(ninguna)'}`)
  console.log(`   se añade: ${anadidas.map((z) => zonaNombre.get(z) ?? z).join(', ')}`)

  if (!HAZLO) { tocadas++; continue }

  const r = await fetch(`${B}/rest/v1/answers?on_conflict=profile_id,version_id,question_key`, {
    method: 'POST',
    headers: { ...H, Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      profile_id: b.profile_id, version_id: version.id,
      question_key: 'zonas', value: nuevas,
    }),
  })
  if (!r.ok) { console.error('   ✗ no se pudo:', r.status, await r.text()); continue }

  await fetch(`${B}/rest/v1/booking_zones?booking_id=eq.${b.id}`, { method: 'DELETE', headers: H })
  const rz = await fetch(`${B}/rest/v1/booking_zones`, {
    method: 'POST', headers: H,
    body: JSON.stringify(nuevas.map((z) => ({ booking_id: b.id, zone_slug: z }))),
  })
  if (!rz.ok) console.error('   ✗ booking_zones:', rz.status, await rz.text())

  suyas.set(b.profile_id, nuevas)
  tocadas++
  console.log('   ✓ escrito')
}

console.log(`\n${tocadas} ${tocadas === 1 ? 'reserva' : 'reservas'}${HAZLO ? ' actualizadas' : ' por actualizar (nada escrito: falta --hazlo)'}`)
