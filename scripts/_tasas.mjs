import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const env = Object.fromEntries(
  fs.readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const { data } = await a.from('fx_rates').select('rate_date, usd_to_ves, source, created_at').order('rate_date',{ascending:false}).limit(6)
console.table(data)
const hoyCaracas = new Date(Date.now() - 4*3600_000).toISOString().slice(0,10)
console.log('hoy en Caracas:', hoyCaracas, '· ¿hay fila de hoy?', data.some(d=>d.rate_date===hoyCaracas))
