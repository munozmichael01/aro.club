/**
 * Separa Las Mercedes del viernes 23 y del sabado 24: cada noche queda con
 * su fecha de Chacao + Los Palos Grandes y una nueva de Las Mercedes.
 *
 * `--seco` enseña lo que haria y no toca nada.
 */
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync('/Users/michaelmunoz/Documents/Dev/aro-club/.env.local', 'utf8')
  .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
  .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]))
const U = env.NEXT_PUBLIC_SUPABASE_URL, K = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: K, Authorization: 'Bearer ' + K, 'Content-Type': 'application/json' }
const SECO = process.argv.includes('--seco')

const pedir = async (ruta, opts = {}) => {
  const r = await fetch(`${U}/rest/v1/${ruta}`, { headers: H, ...opts })
  const t = await r.text()
  if (!r.ok) throw new Error(ruta + ' → ' + r.status + ' ' + t)
  return t ? JSON.parse(t) : null
}

const NOCHES = [
  ['viernes 23', '48456727-e0b8-4290-b2de-e4d00aef74f7'],
  ['sábado 24', '311edc72-1e88-415b-8427-00d553d6df18'],
]

for (const [nombre, id] of NOCHES) {
  const [ev] = await pedir(`events?select=*&id=eq.${id}`)
  const sedes = await pedir(`event_venues?select=*&event_id=eq.${id}`)
  const mercedes = sedes.find((v) => v.zone_slug === 'mercedes')
  console.log(`\n=== ${nombre}: ${sedes.map((v) => v.zone_slug).join(', ')}`)

  if (!mercedes) { console.log('   ya está separada, no toco nada'); continue }
  if (mercedes.restaurant_id) { console.log('   ✗ Las Mercedes ya tiene local elegido: paro'); continue }

  // ¿Hay mesas armadas ya en esta fecha? La zona de una mesa sale de su
  // local, así que sin local elegido no hay ninguna mesa en Las Mercedes.
  const mesas = await pedir(`dinner_tables?select=id,restaurant_id&event_id=eq.${id}`)
  if (mesas.length) { console.log(`   · ${mesas.length} mesas ya armadas en esta fecha (ninguna en Las Mercedes: no tiene local)`) }

  if (SECO) {
    console.log('   quitaría la zona mercedes de esta fecha')
    console.log('   crearía una fecha nueva solo de Las Mercedes, callada')
    continue
  }

  // 1 · la fecha nueva, clonada de su hermana: misma noche, misma hora,
  //     mismo cierre, misma revelación, mismo precio.
  const [nueva] = await pedir('events', {
    method: 'POST',
    headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      format: ev.format,
      starts_at: ev.starts_at,
      booking_closes_at: ev.booking_closes_at,
      reveal_at: ev.reveal_at,
      city_slug: ev.city_slug,
      price_usd: ev.price_usd,
      credit_cost: ev.credit_cost,
      seats_per_table: ev.seats_per_table,
      min_tables: ev.min_tables,
      max_seats: ev.max_seats,
      activity: ev.activity,
      age_band_min: ev.age_band_min,
      age_band_max: ev.age_band_max,
      es_prueba: ev.es_prueba,
      status: ev.status,
    }),
  })

  await pedir('event_venues', {
    method: 'POST',
    body: JSON.stringify({ event_id: nueva.id, zone_slug: 'mercedes', restaurant_id: null, max_tables: mercedes.max_tables }),
  })

  // 2 · y Las Mercedes sale de la vieja.
  await pedir(`event_venues?id=eq.${mercedes.id}`, { method: 'DELETE' })

  // 3 · las dos cosas, escritas.
  await pedir('ops_audit_log', {
    method: 'POST',
    body: JSON.stringify([
      { actor_id: null, action: 'fecha_abierta', entity: 'evento', entity_id: nueva.id,
        payload: { zonas: ['mercedes'], de: id, motivo: 'separar Las Mercedes de Chacao y Los Palos Grandes (Michael, 18-10)', avisada: false, quien: 'agente web' } },
      { actor_id: null, action: 'fecha_abierta', entity: 'evento', entity_id: id,
        payload: { zonas: sedes.filter((v) => v.zone_slug !== 'mercedes').map((v) => v.zone_slug), quito: 'mercedes', motivo: 'separar Las Mercedes (Michael, 18-10)', quien: 'agente web' } },
    ]),
  })

  console.log(`   ✓ ${nombre}: queda en ${sedes.filter((v) => v.zone_slug !== 'mercedes').map((v) => v.zone_slug).join(' + ')}`)
  console.log(`   ✓ nueva fecha solo de Las Mercedes: ${nueva.id} (callada)`)
}
