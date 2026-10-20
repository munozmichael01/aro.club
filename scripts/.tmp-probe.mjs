import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url).pathname, 'utf8').split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const MI = '5da8a7f4-da6f-4efd-ba8f-d9bdd67ec878'
const { data: orig } = await a.from('scheduled_emails').select('payload').eq('kind','resumen_semanal').eq('profile_id', MI).limit(1)
const { data, error } = await a.from('scheduled_emails').insert({
  profile_id: MI, kind: 'resumen_semanal', payload: orig[0].payload, send_at: '2027-01-01T00:00:00Z',
}).select('id')
console.log(error ? error.message : data[0].id)
