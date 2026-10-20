import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
global.window = {}
await import('../public/reglas.js')
const R = global.window.AroReglas
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: ev } = await a.from('events').select('id,starts_at,booking_closes_at,format').eq('status','open').gte('starts_at', new Date().toISOString()).order('starts_at')
for (const e of ev ?? []) {
  const nuevo = R.cierreDe(e.starts_at)
  if (!nuevo || nuevo === new Date(e.booking_closes_at).toISOString()) { console.log('igual ', e.starts_at.slice(0,16), e.format); continue }
  const { error } = await a.from('events').update({ booking_closes_at: nuevo }).eq('id', e.id)
  console.log(error ? 'ERROR ' + error.message : 'movido', e.starts_at.slice(0,16), e.format.padEnd(7), e.booking_closes_at.slice(0,16), '->', nuevo.slice(0,16))
}
// y si Michael recibe el correo de ingles
const MI = '5da8a7f4-da6f-4efd-ba8f-d9bdd67ec878'
const { data: idi } = await a.from('answers').select('value').eq('question_key','idiomas').eq('profile_id', MI)
const { data: ver } = await a.from('v_verified_profiles').select('id').eq('id', MI)
const { data: res } = await a.from('bookings').select('event_id,status').eq('profile_id', MI).in('status',['pending_payment','confirmed'])
console.log('\nMichael · idiomas:', JSON.stringify(idi?.[0]?.value), '· verificado:', (ver??[]).length > 0, '· reservas vivas:', (res??[]).length)
