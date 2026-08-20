import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
const env = Object.fromEntries(
  fs.readFileSync(fileURLToPath(new URL('../.env.local', import.meta.url)), 'utf8')
    .split('\n').filter((l) => l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
const { evento } = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../.escena.json', import.meta.url)),'utf8'))
const { error } = await a.from('scheduled_emails').update({ send_at: new Date().toISOString() }).eq('event_id', evento).eq('kind','sin_mesa')
console.log('adelantado:', error?.message || 'ok')
