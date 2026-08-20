import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const env = Object.fromEntries(
  fs.readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const RASTRO = fileURLToPath(new URL('../.escena.json', import.meta.url))
const en = (h) => new Date(Date.now() + h * 3600_000).toISOString()

if (process.argv[2] === 'ver') {
  const { evento, perfiles } = JSON.parse(fs.readFileSync(RASTRO,'utf8'))
  const { data: cola } = await a.from('scheduled_emails').select('kind, profile_id, send_at').eq('event_id', evento)
  console.log('correos encolados:'); console.table(cola)
  const { data: lib } = await a.from('credit_ledger').select('profile_id, delta, reason, note').in('profile_id', perfiles)
  console.log('libro:'); console.table(lib)
  const { data: aud } = await a.from('ops_audit_log').select('action, entity_id, payload').eq('entity_id', evento).order('created_at')
  console.log('registro:'); console.table(aud)
  process.exit(0)
}
if (process.argv[2] === 'borrar') {
  const { evento, perfiles } = JSON.parse(fs.readFileSync(RASTRO,'utf8'))
  await a.from('scheduled_emails').delete().eq('event_id', evento)
  await a.from('credit_ledger').delete().in('profile_id', perfiles)
  await a.from('table_members').delete().in('profile_id', perfiles)
  const { data: mesas } = await a.from('dinner_tables').select('id').eq('event_id', evento)
  for (const m of mesas ?? []) await a.from('table_members').delete().eq('table_id', m.id)
  await a.from('dinner_tables').delete().eq('event_id', evento)
  await a.from('matching_runs').delete().eq('event_id', evento)
  await a.from('bookings').delete().eq('event_id', evento)
  console.log('evento:', (await a.from('events').delete().eq('id', evento)).error?.message || 'fuera')
  fs.unlinkSync(RASTRO); process.exit(0)
}

// una fecha locked con SIETE apuntados: los seis sembrados + uno más
const { data: rest } = await a.from('restaurants').select('id, zone_slug').limit(1)
const { data: ev } = await a.from('events').insert({
  format:'dinner', starts_at:en(72), booking_closes_at:en(24), reveal_at:en(48),
  restaurant_id:rest[0].id, zone_slug:rest[0].zone_slug, status:'locked', price_usd:8, city_slug:'caracas', seats_per_table:6,
}).select('id').single()

const { data: gente } = await a.from('profiles').select('id, email').like('email','mesa%@prueba.aro.club')
const { data: extra } = await a.from('profiles').select('id, email').eq('email','testcandidato92@gmail.com').maybeSingle()
const perfiles = [...gente.map(g=>g.id), extra.id]
for (const id of perfiles) {
  const { data: b } = await a.from('bookings').insert({ event_id: ev.id, profile_id: id, status: 'confirmed' }).select('id').single()
  // y su pago ya confirmado, con los dos apuntes del libro
  await a.from('credit_ledger').insert([
    { profile_id: id, delta: 1, reason: 'pack_purchase', booking_id: b.id, note: 'Pago por evento' },
    { profile_id: id, delta: -1, reason: 'event_charge', booking_id: b.id, note: 'Pago por evento' },
  ])
}
fs.writeFileSync(RASTRO, JSON.stringify({ evento: ev.id, perfiles }))
console.log('fecha', ev.id, '· apuntados', perfiles.length)
